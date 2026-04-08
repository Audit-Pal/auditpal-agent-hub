import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { v1 } from './routes/v1'

const app = new Hono()

// ── Global middleware ──────────────────────────────────────────────────────────
app.use('*', logger())
app.use('*', prettyJSON())
app.use(
    '*',
    cors({
        origin: ['http://localhost:5173', 'http://localhost:3000'],
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

console.log(`🚀 AuditPal API running on http://localhost:${port}`)
console.log(`   API: http://localhost:${port}/api/v1`)
console.log(`   Health: http://localhost:${port}/health`)

export default {
    port,
    fetch: app.fetch,
}
