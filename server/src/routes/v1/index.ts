import { Hono } from 'hono'
import { authRoutes } from './auth.routes'
import { programRoutes } from './programs.routes'
import { reportRoutes } from './reports.routes'
import { agentRoutes } from './agents.routes'
import { metricsRoutes } from './metrics.routes'

const v1 = new Hono()

v1.route('/auth', authRoutes)
v1.route('/programs', programRoutes)
v1.route('/reports', reportRoutes)
v1.route('/agents', agentRoutes)
v1.route('/metrics', metricsRoutes)

export { v1 }
