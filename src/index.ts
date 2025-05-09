import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import authRoutes from './routes/auth.route'
import postRoutes from './routes/post.route'
import userRoutes from './routes/user.route'
import 'dotenv/config'


const app = new Hono()

// Public routes
app.route('/api/auth', authRoutes)

// Protected routes middleware
const protectedRoutes = new Hono()
protectedRoutes.use('*', jwt({ secret: process.env.JWT_SECRET! }))

// Protected API resources
protectedRoutes.route('/posts', postRoutes)
protectedRoutes.route('/users', userRoutes)

// Mount protected routes
app.route('/api', protectedRoutes)

export default app