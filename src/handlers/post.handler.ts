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

export const getAllPosts = async (c: Context) => {
  const userId = getUserIdFromToken(c) // untuk cek apakah user sudah like

  const posts = await prisma.post.findMany({
    include: {
      author: {
        select: {
          id: true,
          username: true,
          image: true,
        },
      },
      _count: {
        select: { 
          likes: true, // hitung jumlah like
          replies: true, // hitung jumlah reply
        }, 
      },
      likes: userId ? {
        where: { userId },
        select: { id: true }, // cek apakah user ini sudah like
      } : false,
    },
    orderBy: { createdAt: 'desc' },
  })

  // transform response agar lebih bersih
  const response = posts.map(post => ({
    ...post,
    likeCount: post._count.likes,
    replyCount: post._count.replies,
    likedByMe: userId ? post.likes.length > 0 : false,
  }))

  return c.json(response)
}


export const getPostById = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  const id = Number(c.req.param('id'))

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          image: true,
        },
      },
      _count: {
        select: { 
          likes: true,
          replies: true,
        },
      },
      likes: userId ? {
        where: { userId },
        select: { id: true },
      } : false,
    },
  })

  if (!post) return c.json({ error: 'Post not found' }, 404)

  return c.json({
    ...post,
    likeCount: post._count.likes,
    replyCount: post._count.replies,
    likedByMe: userId ? post.likes.length > 0 : false,
  })
}


export const createPost = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const { content, image } = await c.req.json()
  const post = await prisma.post.create({
    data: {
      content,
      image,
      authorId: userId,
    },
  })
  return c.json(post, 201)
}

export const deletePost = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = Number(c.req.param('id'))

  const post = await prisma.post.findUnique({
    where: { id },
  })

  if (!post || post.authorId !== userId) {
    return c.json({ error: 'Not allowed or Post not found' }, 403)
  }

  await prisma.post.delete({ where: { id } })
  return c.json({ message: 'Post deleted successfully' })
}
