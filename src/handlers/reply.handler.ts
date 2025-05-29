import { Context } from 'hono';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import { query } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET!;

const replySchema = z.object({
  content: z.string().min(1),
  postId: z.number().int(),
});

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

export const createReply = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json();
  const result = replySchema.safeParse({ ...body, postId: Number(c.req.param('id')) });
  if (!result.success) return c.json({ error: result.error.format() }, 400);

  const reply = await query(
    'INSERT INTO "reply" (content, "postId", "authorId") VALUES ($1, $2, $3) RETURNING *',
    [result.data.content, result.data.postId, userId]
  );

  return c.json(reply[0]);
};

export const getRepliesByPost = async (c: Context) => {
  const postId = Number(c.req.param('id'));
  if (isNaN(postId)) return c.json({ error: 'Invalid post ID' }, 400);

  const replies = await query(`
    SELECT 
        r.id,
        r.content,
        r."postId",
        r."authorId",
        r."createdAt",
        r."updatedAt",
        u.username AS author_username
    FROM "reply" r
    LEFT JOIN "users" u ON r."authorId" = u.id
    WHERE r."postId" = $1
    ORDER BY r."createdAt" ASC
  `, [postId]);

  return c.json(replies);
};