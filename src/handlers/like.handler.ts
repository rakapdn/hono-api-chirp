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

export const likePost = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const postId = Number(c.req.param('id'));
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400);

  const existing = await query(
    'SELECT id FROM "Like" WHERE "userId" = $1 AND "postId" = $2',
    [userId, postId]
  );

  if (existing.length > 0) {
    return c.json({ liked: true });
  }

  await query(
    'INSERT INTO "Like" ("userId", "postId") VALUES ($1, $2) ON CONFLICT ON CONSTRAINT unique_like DO NOTHING',
    [userId, postId]
  );

  return c.json({ liked: true });
};

export const unlikePost = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const postId = Number(c.req.param('id'));
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400);

  await query(
    'DELETE FROM "Like" WHERE "userId" = $1 AND "postId" = $2',
    [userId, postId]
  );

  return c.json({ liked: false });
};