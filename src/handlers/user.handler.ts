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

export const getUserProfile = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  const requestedUserId = Number(c.req.param('id'))

  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const user = await prisma.user.findUnique({
    where: { id: requestedUserId },
    select: {
      id: true,
      username: true,
      email: true,
      bio: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Cek apakah user yang sedang login sudah mengikuti user yang diminta
  const isFollowing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: requestedUserId,
      },
    },
  })

  // Mengambil jumlah follower
  const followerCount = await prisma.follow.count({
    where: { followingId: requestedUserId },
  })

  // Mengambil jumlah following
  const followingCount = await prisma.follow.count({
    where: { followerId: requestedUserId },
  })

  return c.json({
    user,
    followerCount,
    followingCount,
    isFollowing: isFollowing ? true : false,
  })
}



export const updateUserProfile = async (c: Context) => {
  const userId = getUserIdFromToken(c)
  if (!userId) return c.json({ error: 'Unauthorized' }, 401)

  const { bio, image } = await c.req.json()

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      bio: bio ?? undefined,
      image: image ?? undefined,
    },
  })

  return c.json(user)
}
export const followUser = async (c: Context) => {
  const followerId = getUserIdFromToken(c)
  const followingId = Number(c.req.param('id'))

  if (!followerId) return c.json({ error: 'Unauthorized' }, 401)
  if (followerId === followingId) return c.json({ error: 'You cannot follow yourself' }, 400)

  try {
    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    })
    return c.json({ message: 'Followed successfully' })
  } catch (err) {
    return c.json({ error: 'Already following or error occurred' }, 400)
  }
}

export const unfollowUser = async (c: Context) => {
  const followerId = getUserIdFromToken(c)
  const followingId = Number(c.req.param('id'))

  if (!followerId) return c.json({ error: 'Unauthorized' }, 401)

  await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  })

  return c.json({ message: 'Unfollowed successfully' })
}
export const getUserPosts = async (c: Context) => {
  const userId = Number(c.req.param('id'))

  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400)
  }

  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: {
          id: true,
          username: true,
          image: true,
        },
      },
    },
  })

  return c.json(posts)
}
