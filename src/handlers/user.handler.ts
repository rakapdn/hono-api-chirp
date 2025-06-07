import { Context } from 'hono';
import { z }
from 'zod';
import { verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { query } from '../lib/db';

// Catatan: Pastikan JWT_SECRET selalu tersedia dan aman.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    // throw new Error("JWT_SECRET must be set for the application to function securely.");
}

// Skema validasi untuk path parameter ID
const idParamSchema = z.object({
    id: z.coerce.number().int().positive({ message: "User ID must be a positive integer." })
});

// Skema validasi untuk update profil
const updateUserProfileSchema = z.object({
    bio: z.string().max(500, "Bio cannot exceed 500 characters.").optional().nullable(),
    image: z.string().url("Image must be a valid URL.").optional().nullable(),
});


/**
 * Fungsi helper untuk mendapatkan userId dari token JWT di header Authorization.
 */
function getUserIdFromToken(c: Context): number | null {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const payload = verify(token, JWT_SECRET!) as { id: number;[key: string]: any };
        if (typeof payload.id !== 'number') {
            console.warn('Invalid payload structure: id is not a number or missing.');
            return null;
        }
        return payload.id;
    } catch (error) {
        if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
            // console.warn(`Token verification failed: ${error.message}`);
        } else {
            console.error('Unexpected error during token verification:', error);
        }
        return null;
    }
}

/**
 * Handler untuk mendapatkan profil pengguna.
 */
export const getUserProfile = async (c: Context) => {
    const loggedInUserId = getUserIdFromToken(c); 

    const pathValidationResult = idParamSchema.safeParse({ id: c.req.param('id') });
    if (!pathValidationResult.success) {
        return c.json({ error: pathValidationResult.error.format() }, 400);
    }
    const requestedUserId = pathValidationResult.data.id;

    try {
        const userResult = await query(
            'SELECT id, username, "fullName", email, bio, image, "createdAt", "updatedAt" FROM users WHERE id = $1',
            [requestedUserId]
        );

        if (userResult.length === 0) {
            return c.json({ error: 'User not found.' }, 404);
        }
        const userProfile = userResult[0];

        const followerCountResult = await query(
            'SELECT COUNT(*) AS count FROM follow WHERE "followingId" = $1',
            [requestedUserId]
        );
        const followerCount = Number(followerCountResult[0]?.count || 0);

        const followingCountResult = await query(
            'SELECT COUNT(*) AS count FROM follow WHERE "followerId" = $1',
            [requestedUserId]
        );
        const followingCount = Number(followingCountResult[0]?.count || 0);

        let isFollowing = false;
        if (loggedInUserId && loggedInUserId !== requestedUserId) { 
            const isFollowingResult = await query(
                'SELECT 1 FROM follow WHERE "followerId" = $1 AND "followingId" = $2',
                [loggedInUserId, requestedUserId]
            );
            isFollowing = isFollowingResult.length > 0;
        }

        return c.json({
            user: userProfile,
            followerCount,
            followingCount,
            isFollowing: loggedInUserId ? isFollowing : false, 
        });

    } catch (dbError: any) {
        console.error(`Database error in getUserProfile (requestedUserId: ${requestedUserId}):`, dbError.message, dbError.stack);
        return c.json({ error: 'Failed to retrieve user profile due to a server error.' }, 500);
    }
};

/**
 * Handler untuk memperbarui profil pengguna yang sedang login.
 */
export const updateUserProfile = async (c: Context) => {
    const userId = getUserIdFromToken(c);
    if (!userId) {
        return c.json({ error: 'Unauthorized. User must be logged in.' }, 401);
    }

    try {
        const body = await c.req.json();
        const validationResult = updateUserProfileSchema.safeParse(body);

        if (!validationResult.success) {
            return c.json({ error: validationResult.error.format() }, 400);
        }
        const { bio, image } = validationResult.data;

        if (bio === undefined && image === undefined) {
             const currentUser = await query('SELECT * FROM users WHERE id = $1', [userId]); 
             if (currentUser.length > 0) return c.json(currentUser[0]);
             return c.json({message: "No data provided for update"}, 400);
        }

        const updateUserResult = await query(
            'UPDATE users SET bio = COALESCE($1, bio), image = COALESCE($2, image), "updatedAt" = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, username, email, bio, image, "createdAt", "updatedAt"',
            [bio, image, userId]
        );

        if (updateUserResult.length === 0) {
            return c.json({ error: 'User not found or update failed.' }, 404);
        }

        return c.json(updateUserResult[0]);

    } catch (error: any) {
        if (error instanceof SyntaxError && 'body' in error) {
            return c.json({ error: 'Invalid JSON format in request body.' }, 400);
        }
        console.error(`Error in updateUserProfile (userId: ${userId}):`, error.message, error.stack);
        return c.json({ error: 'Failed to update profile due to a server error.' }, 500);
    }
};

/**
 * Handler untuk follow seorang pengguna.
 */
export const followUser = async (c: Context) => {
  const followerId = getUserIdFromToken(c); // Ambil ID pengguna yang login dari token
  const followingId = parseInt(c.req.param('id')); // Ambil ID pengguna yang akan diikuti dari parameter URL

  // Validasi followerId (pengguna harus login)
  if (!followerId) {
    return c.json({ error: 'Unauthorized: You must be logged in to follow a user.' }, 401);
  }

  // Validasi followingId
  if (isNaN(followingId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  // Cegah pengguna mengikuti diri sendiri
  if (followerId === followingId) {
    return c.json({ error: 'You cannot follow yourself.' }, 400);
  }

  try {
    console.log('Mengikuti pengguna dengan followerId:', followerId, 'followingId:', followingId);

    // Periksa apakah pengguna yang akan diikuti ada
    const userExists = await query(
      `SELECT 1 FROM users WHERE id = $1::INTEGER LIMIT 1`,
      [followingId]
    );
    if (userExists.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Periksa apakah sudah mengikuti
    const alreadyFollowing = await query(
      `SELECT 1 FROM follow WHERE "followerId" = $1::INTEGER AND "followingId" = $2::INTEGER LIMIT 1`,
      [followerId, followingId]
    );

    if (alreadyFollowing.length > 0) {
      return c.json({ message: 'You are already following this user.' }, 200);
    }

    // Tambahkan relasi follow
    await query(
      `INSERT INTO follow ("followerId", "followingId") VALUES ($1::INTEGER, $2::INTEGER)`,
      [followerId, followingId]
    );

    return c.json({ message: 'Successfully followed the user.' }, 201);
  } catch (dbError: any) {
    console.error('Error database di followUser:', {
      message: dbError.message,
      stack: dbError.stack,
      query: 'INSERT INTO follow ...',
      params: [followerId, followingId],
    });
    return c.json({ error: 'Failed to follow user due to a server error.' }, 500);
  }
};

/**
 * Handler untuk unfollow seorang pengguna.
 */
export const unfollowUser = async (c: Context) => {
    const followerId = getUserIdFromToken(c); 

    const pathValidationResult = idParamSchema.safeParse({ id: c.req.param('id') });
    if (!pathValidationResult.success) {
        return c.json({ error: pathValidationResult.error.format() }, 400);
    }
    const followingId = pathValidationResult.data.id; 

    if (!followerId) {
        return c.json({ error: 'Unauthorized. User must be logged in to unfollow.' }, 401);
    }
     if (followerId === followingId) { 
        return c.json({ error: 'You cannot unfollow yourself.' }, 400);
    }

    try {
        const deleteResult = await query(
            'DELETE FROM follow WHERE "followerId" = $1 AND "followingId" = $2 RETURNING "id"',
            [followerId, followingId]
        );

        if (deleteResult.length > 0 && deleteResult[0].id) { 
            return c.json({ message: 'Unfollowed successfully.' }); 
        } else {
            return c.json({ message: 'You were not following this user or user does not exist.' }, 200); 
        }

    } catch (dbError: any) {
        console.error(`Database error in unfollowUser (followerId: ${followerId}, followingId: ${followingId}):`, dbError.message, dbError.stack);
        return c.json({ error: 'Failed to unfollow user due to a server error.' }, 500);
    }
};

/**
 * Handler untuk mendapatkan semua post dari seorang pengguna.
 */
export const getUserPosts = async (c: Context) => {
    const pathValidationResult = idParamSchema.safeParse({ id: c.req.param('id') });
    if (!pathValidationResult.success) {
        return c.json({ error: pathValidationResult.error.format() }, 400);
    }
    const authorIdForPosts = pathValidationResult.data.id;

    try {
        const userExists = await query('SELECT id FROM users WHERE id = $1', [authorIdForPosts]);
        if (userExists.length === 0) {
            return c.json({ error: 'User not found, cannot fetch posts.' }, 404);
        }

        const posts = await query(`
            SELECT 
                p.id,
                p.content,
                p.image,
                p."createdAt",
                p."updatedAt",
                p."authorId",
                u.username AS author_username,
                u.image AS author_image
            FROM post p 
            JOIN users u ON p."authorId" = u.id 
            WHERE p."authorId" = $1
            ORDER BY p."createdAt" DESC
        `, [authorIdForPosts]);

        return c.json(posts);

    } catch (dbError: any) {
        console.error(`Database error in getUserPosts (authorIdForPosts: ${authorIdForPosts}):`, dbError.message, dbError.stack);
        return c.json({ error: 'Failed to retrieve user posts due to a server error.' }, 500);
    }
};