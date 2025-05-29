import { Context } from 'hono';
import { verify } from 'jsonwebtoken';
import { query } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET!;

function getUserIdFromToken(c: Context): number | null {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  try {
    const payload = verify(token, JWT_SECRET) as { id: number };
    return payload.id;
  } catch {
    return null;
  }
}

export const getUserProfile = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  const requestedUserId = Number(c.req.param('id'));

  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const user = await query(
    'SELECT id, username, email, bio, image, "createdAt", "updatedAt" FROM "users" WHERE id = $1',
    [requestedUserId]
  );

  if (user.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  const followerCount = (await query(
    'SELECT COUNT(*) FROM "follow" WHERE "followingId" = $1',
    [requestedUserId]
  ))[0].count;

  const followingCount = (await query(
    'SELECT COUNT(*) FROM "follow" WHERE "followerId" = $1',
    [requestedUserId]
  ))[0].count;

  const isFollowing = (await query(
    'SELECT 1 FROM "follow" WHERE "followerId" = $1 AND "followingId" = $2',
    [userId, requestedUserId]
  )).length > 0;

  return c.json({
    user: user[0],
    followerCount,
    followingCount,
    isFollowing,
  });
};

export const updateUserProfile = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { bio, image } = await c.req.json();

  const user = await query(
    'UPDATE "users" SET bio = $1, image = $2, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [bio || null, image || null, userId]
  );

  return c.json(user[0]);
};

export const followUser = async (c: Context) => {
  const followerId = getUserIdFromToken(c);
  const followingId = Number(c.req.param('id'));

  if (!followerId) return c.json({ error: 'Unauthorized' }, 401);
  if (followerId === followingId) return c.json({ error: 'You cannot follow yourself' }, 400);

  const existing = await query(
    'SELECT 1 FROM "follow" WHERE "followerId" = $1 AND "followingId" = $2',
    [followerId, followingId]
  );

  if (existing.length > 0) {
    return c.json({ error: 'Already following or error occurred' }, 400);
  }

  await query(
    'INSERT INTO "follow" ("followerId", "followingId") VALUES ($1, $2)',
    [followerId, followingId]
  );

  return c.json({ message: 'Followed successfully' });
};

export const unfollowUser = async (c: Context) => {
  const followerId = getUserIdFromToken(c);
  const followingId = Number(c.req.param('id'));

  if (!followerId) return c.json({ error: 'Unauthorized' }, 401);

  await query(
    'DELETE FROM "follow" WHERE "followerId" = $1 AND "followingId" = $2',
    [followerId, followingId]
  );

  return c.json({ message: 'Unfollowed successfully' });
};

export const getUserPosts = async (c: Context) => {
  const userId = Number(c.req.param('id'));

  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  const posts = await query(`
    SELECT 
        p.id,
        p.content,
        p.image,
        p."createdAt",
        p."updatedAt",
        u.id AS author_id,
        u.username AS author_username,
        u.image AS author_image
    FROM "post" p
    LEFT JOIN "users" u ON p."authorId" = u.id
    WHERE p."authorId" = $1
    ORDER BY p."createdAt" DESC
  `, [userId]);

  return c.json(posts);
};