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

export const getAllPosts = async (c: Context) => {
  const userId = getUserIdFromToken(c);

  const posts = await query(`
    SELECT 
        p.id,
        p.content,
        p.image,
        p."createdAt",
        p."updatedAt",
        p."authorId",
        u.username AS author_username,
        u.image AS author_image,
        COUNT(l.id) AS like_count,
        COUNT(r.id) AS reply_count,
        EXISTS (
            SELECT 1 
            FROM "Like" l2 
            WHERE l2."postId" = p.id AND l2."userId" = $1
        ) AS liked_by_me
    FROM "Post" p
    LEFT JOIN "User" u ON p."authorId" = u.id
    LEFT JOIN "Like" l ON p.id = l."postId"
    LEFT JOIN "Reply" r ON p.id = r."postId"
    GROUP BY p.id, u.id
    ORDER BY p."createdAt" DESC
  `, [userId || 0]);

  return c.json(posts);
};

export const getPostById = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  const id = Number(c.req.param('id'));

  const post = await query(`
    SELECT 
        p.id,
        p.content,
        p.image,
        p."createdAt",
        p."updatedAt",
        p."authorId",
        u.username AS author_username,
        u.image AS author_image,
        COUNT(l.id) AS like_count,
        COUNT(r.id) AS reply_count,
        EXISTS (
            SELECT 1 
            FROM "Like" l2 
            WHERE l2."postId" = p.id AND l2."userId" = $1
        ) AS liked_by_me
    FROM "Post" p
    LEFT JOIN "User" u ON p."authorId" = u.id
    LEFT JOIN "Like" l ON p.id = l."postId"
    LEFT JOIN "Reply" r ON p.id = r."postId"
    WHERE p.id = $2
    GROUP BY p.id, u.id
  `, [userId || 0, id]);

  if (post.length === 0) return c.json({ error: 'Post not found' }, 404);

  return c.json(post[0]);
};

export const createPost = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const { content, image } = await c.req.json();

  const post = await query(
    'INSERT INTO "Post" (content, image, "authorId") VALUES ($1, $2, $3) RETURNING *',
    [content, image || null, userId]
  );

  return c.json(post[0], 201);
};

export const deletePost = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const id = Number(c.req.param('id'));

  const post = await query(
    'SELECT "authorId" FROM "Post" WHERE id = $1',
    [id]
  );

  if (post.length === 0 || post[0].authorId !== userId) {
    return c.json({ error: 'Not allowed or Post not found' }, 403);
  }

  await query(
    'DELETE FROM "Post" WHERE id = $1',
    [id]
  );

  return c.json({ message: 'Post deleted successfully' });
};