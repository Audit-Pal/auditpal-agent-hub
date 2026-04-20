import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { v1 } from './routes/v1'

const app = new Hono()

// ── Global middleware ──────────────────────────────────────────────────────────
const isProduction = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test'
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CORS_ORIGIN,
].filter(Boolean) as string[]

app.use('*', logger())
app.use('*', prettyJSON())
app.use(
    '*',
    cors({
        origin: allowedOrigins,
        allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    })
)

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (c) =>
    c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
)

// ── API v1 ─────────────────────────────────────────────────────────────────────
app.route('/api/v1', v1)

// ── 404 fallback ───────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, error: 'Route not found' }, 404))

// ── Global error handler ───────────────────────────────────────────────────────
app.onError((err, c) => {
    console.error('[Error]', err)
    return c.json({ success: false, error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT ?? 3001)
const mode = process.env.NODE_ENV ?? 'development'

console.log(`🚀 AuditPal API running in [${mode}] mode`)
console.log(`   Local: http://localhost:${port}`)
if (process.env.CORS_ORIGIN) {
    console.log(`   Allowed Origin: ${process.env.CORS_ORIGIN}`)
}
console.log(`   API: http://localhost:${port}/api/v1`)
console.log(`   Health: http://localhost:${port}/health`)

export default {
    port,
    fetch: app.fetch,
}

// ── Keep-alive (Self-ping) ───────────────────────────────────────────────────
// This prevents Render's Free Tier from spinning down after 15 mins of inactivity.
const RENDER_URL = process.env.RENDER_EXTERNAL_URL
if (mode === 'production' && RENDER_URL) {
    const url = RENDER_URL.endsWith('/') ? RENDER_URL.slice(0, -1) : RENDER_URL
    
    // Ping every 10 minutes
    setInterval(async () => {
        try {
            const res = await fetch(`${url}/health`)
            if (res.ok) {
                console.log(`[Keep-Alive] Self-ping successful: ${new Date().toISOString()}`)
            }
        } catch (error) {
            console.error('[Keep-Alive] Self-ping failed:', error)
        }
    }, 10 * 60 * 1000)
}
