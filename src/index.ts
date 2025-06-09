import { cors } from 'hono/cors';
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import authRoutes from './routes/auth.route'
import postRoutes from './routes/post.route'
import userRoutes from './routes/user.route'
// import imageRoutes from './routes/image.route';
import 'dotenv/config'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3001'], // Port FE
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}))

// 🛡️ Enable CORS globally
// app.use('*', cors({
//   origin: '*', // untuk development, nanti bisa diubah jadi asal tertentu
//   allowHeaders: ['Content-Type', 'Authorization'],
//   allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
// }))
// untuk login postgresql
// psql "postgresql://postgres.epyhkuddoondjvpynioj:6h6ZzO2Oga2FeAoX@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"


// Public routes
app.route('/api/auth', authRoutes)
// app.route('/api/images', imageRoutes)

// Protected routes middleware
const protectedRoutes = new Hono()
protectedRoutes.use('*', jwt({ secret: process.env.JWT_SECRET! }))

// Protected API resources
protectedRoutes.route('/posts', postRoutes)
protectedRoutes.route('/users', userRoutes)

// Mount protected routes
app.route('/api', protectedRoutes)

export default app