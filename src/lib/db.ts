import { Pool } from 'pg';
import { DATABASE_URL } from '../config/env';

// Konfigurasi koneksi database
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Fungsi untuk menjalankan query
export const query = async (text: string, params: any[] = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } catch (error) {
    throw new Error(`Database query error: ${(error as Error).message}`);
  } finally {
    client.release();
  }
};

// Export pool untuk kebutuhan lain (opsional)
export { pool };