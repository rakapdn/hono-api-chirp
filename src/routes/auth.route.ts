import { Hono } from 'hono'
import { register, login, getMe } from '../handlers/auth.handler'
import { jwt } from 'hono/jwt'

const authRoute = new Hono()

// Public auth endpoints
authRoute.post('/register', register)
authRoute.post('/login', login)

// Protected auth endpoint
authRoute.use('/me', jwt({ secret: process.env.JWT_SECRET! }))
authRoute.get('/me', getMe)

export default authRoute