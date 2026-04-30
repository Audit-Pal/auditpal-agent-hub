import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Stripe } from 'stripe'
import { prisma } from '../../db/client'
import { authMiddleware } from '../../middleware/auth'
import type { HonoEnv } from '../../types/hono'

export const paymentsRoutes = new Hono<HonoEnv>()

// Use a dummy key if env is not set, or throw in production
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy'
const stripe = new Stripe(stripeKey)

const createCheckoutSchema = z.object({
    amountUsd: z.number().int().min(10).max(10000).default(10),
})

paymentsRoutes.post(
    '/create-checkout-session',
    authMiddleware,
    zValidator('json', createCheckoutSchema),
    async (c) => {
        try {
            const user = c.get('user')
            const { amountUsd } = c.req.valid('json')

            // 1 USD = 100 credits
            const creditsToBuy = amountUsd * 100

            // Create a checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card', 'crypto'],
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `${creditsToBuy} Platform Credits`,
                                description: 'Credits to run AI Agents on AuditPal',
                            },
                            unit_amount: amountUsd * 100, // in cents
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    userId: user.sub,
                    credits: creditsToBuy.toString(),
                },
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?checkout=success`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?checkout=cancel`,
            })

            return c.json({ success: true, data: { url: session.url } })
        } catch (error: unknown) {
            console.error('Stripe Checkout Error:', error)
            const message = error instanceof Error ? error.message : String(error)
            return c.json({ success: false, error: message }, 500)
        }
    }
)

// Webhook endpoint
paymentsRoutes.post('/webhook', async (c) => {
    const sig = c.req.header('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!sig || !webhookSecret) {
        return c.json({ success: false, error: 'Missing signature or webhook secret' }, 400)
    }

    let event: Stripe.Event

    try {
        // Hono req.raw is a native Request. We need the text body.
        const body = await c.req.text()
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`Webhook signature verification failed.`, message)
        return c.json({ success: false, error: message }, 400)
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.metadata?.userId
        const creditsStr = session.metadata?.credits

        if (userId && creditsStr) {
            const creditsToAdd = parseInt(creditsStr, 10)
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        platformCredits: {
                            increment: creditsToAdd,
                        },
                    },
                })
                console.log(`Added ${creditsToAdd} credits to user ${userId}`)
            } catch (dbErr) {
                console.error(`Failed to update user credits:`, dbErr)
                // Might want to queue this or retry in a real app
            }
        }
    }

    return c.json({ received: true })
})
