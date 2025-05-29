import { Context } from 'hono';
import { z } from 'zod';
import { verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'; 
import { query } from '../lib/db'; 


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

// Skema validasi untuk membuat balasan
const replySchema = z.object({
  content: z.string().min(1, { message: "Content cannot be empty." }),
  // postId akan divalidasi dari parameter path, bukan dari body JSON
});

const pathParamsSchema = z.object({
    postId: z.coerce.number().int().positive({ message: "Post ID must be a positive integer." })
});


/**
 * Fungsi helper untuk mendapatkan userId dari token JWT di header Authorization.
 * (Sama seperti sebelumnya, dengan sedikit perbaikan pada logging error)
 */
function getUserIdFromToken(c: Context): number | null {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return null;
  }
  try {
    const payload = verify(token, JWT_SECRET!) as { id: number; [key: string]: any };
     if (typeof payload.id !== 'number') {
        console.warn('Invalid payload structure: id is not a number or missing.');
        return null;
    }
    return payload.id;
  } catch (error) {
    if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
      // console.warn(`Token verification failed: ${error.message}`); // Aktifkan untuk debug
    } else {
      console.error('Unexpected error during token verification:', error);
    }
    return null;
  }
}

/**
 * Handler untuk membuat balasan baru pada sebuah post.
 */
export const createReply = async (c: Context) => {
  const userId = getUserIdFromToken(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized. User must be logged in to reply.' }, 401);
  }

  try {
    // Validasi postId dari path parameter
    const pathValidationResult = pathParamsSchema.safeParse({ postId: c.req.param('id') });
    if (!pathValidationResult.success) {
        return c.json({ error: pathValidationResult.error.format() }, 400);
    }
    const { postId } = pathValidationResult.data;

    // Validasi content dari body
    const body = await c.req.json();
    const contentValidationResult = replySchema.safeParse(body); 
    if (!contentValidationResult.success) {
      return c.json({ error: contentValidationResult.error.format() }, 400);
    }
    const { content } = contentValidationResult.data;

    // 1. Cek apakah post induk (postId) ada
    const postExistsResult = await query(
      'SELECT id FROM post WHERE id = $1',
      [postId]
    );
    if (postExistsResult.length === 0) {
      return c.json({ error: 'Post not found. Cannot create reply for a non-existent post.' }, 404);
    }

    // 2. Insert balasan baru
    const insertResult = await query(
      'INSERT INTO reply (content, "postId", "authorId") VALUES ($1, $2, $3) RETURNING id, content, "postId", "authorId", "createdAt", "updatedAt"',
      [content, postId, userId]
    );

    if (insertResult.length === 0) {
        return c.json({ error: 'Failed to create reply after insertion.' }, 500);
    }
    
    const createdReply = insertResult[0];

    const authorResult = await query(
        'SELECT username, image FROM users WHERE id = $1', 
        [createdReply.authorId] 
    );
    
    const authorInfo = authorResult.length > 0 ? { author_username: authorResult[0].username, author_image: authorResult[0].image } : { author_username: 'Unknown' };

    return c.json({ ...createdReply, ...authorInfo }, 201); 

  } catch (error: any) {
    if (error instanceof SyntaxError && 'body' in error) { 
        return c.json({ error: 'Invalid JSON format in request body.' }, 400);
    }
    console.error(`Error in createReply:`, error.message, error.stack);
    return c.json({ error: 'Failed to create reply due to a server error.' }, 500);
  }
};

/**
 * Handler untuk mendapatkan semua balasan untuk sebuah post.
 */
export const getRepliesByPost = async (c: Context) => {
  const pathValidationResult = pathParamsSchema.safeParse({ postId: c.req.param('id') });
  if (!pathValidationResult.success) {
      return c.json({ error: pathValidationResult.error.format() }, 400);
  }
  const { postId } = pathValidationResult.data;

  try {
    const postExistsResult = await query(
      'SELECT id FROM post WHERE id = $1', 
      [postId]
    );
    if (postExistsResult.length === 0) {
      return c.json({ error: 'Post not found.' }, 404);
    }

    // 2. Ambil semua balasan untuk postId tersebut
    const replies = await query(`
      SELECT 
          r.id,
          r.content,
          r."postId",      -- Kolom "postId" tetap dikutip
          r."authorId",    -- Kolom "authorId" tetap dikutip
          r."createdAt",   -- Kolom "createdAt" tetap dikutip
          r."updatedAt",   -- Kolom "updatedAt" tetap dikutip
          u.username AS author_username,
          u.image AS author_image 
      FROM reply r        -- Perubahan: "reply" menjadi reply
      JOIN users u ON r."authorId" = u.id -- Perubahan: "users" menjadi users
      WHERE r."postId" = $1
      ORDER BY r."createdAt" ASC
    `, [postId]);

    return c.json(replies);
  } catch (dbError: any) {
    console.error(`Database error in getRepliesByPost (postId: ${postId}):`, dbError.message, dbError.stack);
    return c.json({ error: 'Failed to retrieve replies due to a server error.' }, 500);
  }
};