import { Context } from 'hono'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { verify } from 'jsonwebtoken'

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET!

const replySchema = z.object({
  content: z.string().min(1),
  postId: z.number().int(),
})

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

export const createReply = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.json()
  const result = replySchema.safeParse(body)
  if (!result.success) return c.json({ error: result.error.format() }, 400)

  const reply = await prisma.reply.create({
    data: {
      content: result.data.content,
      postId: result.data.postId,
      authorId: userId,
    },
  })

  return c.json(reply)
}
export const getRepliesByPost = async (c: Context) => {
  const postId = Number(c.req.param('id'))
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400)

  const replies = await prisma.reply.findMany({
    where: { postId },
    include: {
      author: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return c.json(replies)
}

