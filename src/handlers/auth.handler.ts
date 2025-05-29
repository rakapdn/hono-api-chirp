import { Context } from 'hono';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../lib/db'; 

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
}

// Register Handler
export const register = async (c: Context) => {
  try {
    const { email, username, password } = await c.req.json();

    // Validasi input dasar
    if (!email || !username || !password) {
      return c.json({ error: 'Email, username, and password are required' }, 400);
    }
    if (password.length < 6) { // validasi panjang password
        return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Periksa apakah email atau username sudah ada
    const existingUser = await query(
      'SELECT * FROM users WHERE email = $1 OR username = $2', 
      [email, username]
    );

    if (existingUser.length > 0) {
      if (existingUser[0].email === email) {
        return c.json({ error: 'User with this email already exists' }, 409); 
      }
      if (existingUser[0].username === username) {
        return c.json({ error: 'Username already taken' }, 409); 
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Tambah Pengguna Baru
    const newUserResult = await query(
      'INSERT INTO users (email, username, password) VALUES ($1, $2, $3) RETURNING id, email, username', 
      [email, username, hashedPassword]
    );

    if (newUserResult.length === 0) {
        return c.json({ error: 'Failed to register user' }, 500);
    }

    return c.json({ message: 'User registered successfully', user: newUserResult[0] }, 201); 
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: 'An unexpected error occurred during registration' }, 500);
  }
};

// Login Handler
export const login = async (c: Context) => {
  try {
    const { email, password: inputPassword } = await c.req.json();

    if (!email || !inputPassword) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Ambil user berdasarkan email
    const userResult = await query(
      'SELECT id, email, username, password FROM users WHERE email = $1', 
      [email]
    );

    if (userResult.length === 0) {
      // Pesan error generik untuk keamanan
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const user = userResult[0];

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(inputPassword, user.password);

    if (!isPasswordValid) {
      // Pesan error generik untuk keamanan
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Password valid, buat token JWT

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET!, { expiresIn: '1h' }); 

    return c.json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, username: user.username } // Mengembalikan info user dasar
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'An unexpected error occurred during login' }, 500);
  }
};

// Get Me Handler
export const getMe = async (c: Context) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }


    const decoded = jwt.verify(token, JWT_SECRET!) as { id: number; email: string; iat: number; exp: number }; 
    
    const userResult = await query(
      'SELECT id, email, username FROM users WHERE id = $1', 
      [decoded.id]
    );

    if (userResult.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: userResult[0] });
  } catch (error: any) {
    console.error('GetMe error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
};