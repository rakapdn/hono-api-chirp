import { Context } from 'hono';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../lib/db';

const JWT_SECRET = process.env.JWT_SECRET!;

// Register Handler
export const register = async (c: Context) => {
  const { email, username, password } = await c.req.json();

  // Periksa apakah email sudah ada
  const existingUser = await query(
    'SELECT * FROM "users" WHERE email = $1',
    [email]
  );

  if (existingUser.length > 0) {
    return c.json({ error: 'User with this email already exists' }, 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Tambah Pengguna Baru
  const newUser = await query(
    'INSERT INTO "users" (email, username, password) VALUES ($1, $2, $3) RETURNING id, email, username',
    [email, username, hashedPassword]
  );

  return c.json({ message: 'User registered successfully', user: newUser[0] });
};

// Login Handler
export const login = async (c: Context) => {
  const { email, password } = await c.req.json();

  const user = await query(
    'SELECT * FROM "users" WHERE email = $1',
    [email]
  );

  if (user.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  const token = jwt.sign({ id: user[0].id }, JWT_SECRET, { expiresIn: '1h' });

  return c.json({ message: 'Login successful', token });
};

// Get Me Handler
export const getMe = async (c: Context) => {
  const token = c.req.header('Authorization')?.split(' ')[1];
  if (!token) return c.json({ error: 'No token provided' }, 401);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await query(
      'SELECT id, email, username FROM "users" WHERE id = $1',
      [decoded.id]
    );

    if (user.length === 0) return c.json({ error: 'User not found' }, 404);

    return c.json({ user: user[0] });
  } catch (error) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};