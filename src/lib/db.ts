import { Pool } from 'pg';
import { DATABASE_URL } from '../config/env';

// Konfigurasi koneksi database
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase biasanya menggunakan SSL
  },
});

// Fungsi untuk menjalankan query
export const query = async (text: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    console.log('Menjalankan query:', text, 'dengan params:', params); // Tambahkan log ini
    const result = await client.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Detail error database:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      query: text,
      params,
    });
    throw new Error(`Error query database: ${(error as Error).message}`);
  } finally {
    client.release();
  }
};

// Export pool untuk kebutuhan lain (opsional)
export { pool };