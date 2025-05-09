import { Hono, Context } from 'hono'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

// Register Handler
  export const register = async (c: Context) => {
  const { email, username, password } = await c.req.json()

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return c.json({ error: 'User with this email already exists' }, 400)
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const newUser = await prisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
    },
  })

  return c.json({ message: 'User registered successfully', user: newUser })
}

// Login Handler
export const login = async (c: Context) => {
  const { email, password } = await c.req.json()

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  const validPassword = await bcrypt.compare(password, user.password)
  if (!validPassword) {
    return c.json({ error: 'Invalid password' }, 400)
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' })

  return c.json({ message: 'Login successful', token })
}

// Get Me Handler
export const getMe = async (c: Context) => {
  const token = c.req.header('Authorization')?.split(' ')[1]
  if (!token) return c.json({ error: 'No token provided' }, 401)

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number }
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })

    if (!user) return c.json({ error: 'User not found' }, 404)

    return c.json({ user })
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}
