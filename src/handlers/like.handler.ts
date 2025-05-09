import { Context } from 'hono'
import { PrismaClient } from '@prisma/client'
import { verify } from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

function getUserIdFromToken(c: Context): number | null {
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return null
  const token = authHeader.split(' ')[1]
  try {
    const payload = verify(token, JWT_SECRET) as { id: number }
    return payload.id
  } catch {
    return null
  }
}

export const likePost = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const postId = Number(c.req.param('id'))
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400)

  try {
    const existing = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    })

    if (existing) {
      return c.json({ liked: true }) // Sudah like sebelumnya
    }

    await prisma.like.create({
      data: {
        userId,
        postId,
      },
    })
    return c.json({ liked: true })
  } catch {
    return c.json({ error: 'Failed to like post' }, 500)
  }
}

export const unlikePost = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const postId = Number(c.req.param('id'))
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400)

  try {
    await prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    })
    return c.json({ liked: false })
  } catch {
    return c.json({ error: 'Failed to unlike post' }, 500)
  }
}
