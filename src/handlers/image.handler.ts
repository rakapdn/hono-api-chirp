import { createClient } from "@supabase/supabase-js";
import { Context } from "hono";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

// Supabase dan PostgreSQL client (sama seperti sebelumnya)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

// Fungsi helper simpan metadata gambar ke DB
async function saveImageMetadata({
  userId,
  postId,
  fileName,
  filePath,
  imageType,
}: {
  userId: number;
  postId: number;
  fileName: string;
  filePath: string;
  imageType: string;
}) {
  const query = `
    INSERT INTO images (user_id, post_id, file_name, file_path, image_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [userId, postId, fileName, filePath, imageType];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

// Endpoint upload gambar
export async function uploadImage(c: Context) {
  try {
    // Mengambil file dari form-data field 'file'
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Ambil data userId dan postId dari form-data juga (atau dari autentikasi session)
    const userId = parseInt(formData.get("user_id") as string, 10);
    const postId = parseInt(formData.get("post_id") as string, 10);

    if (!userId || !postId) {
      return c.json({ error: "user_id and post_id are required" }, 400);
    }

    // Membuat nama file unik agar tidak bentrok
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Upload file ke Supabase Storage di bucket 'images'
    const { data, error: uploadError } = await supabase.storage
      .from("images")
      .upload(uniqueFileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      return c.json({ error: uploadError.message }, 500);
    }

    // Simpan metadata ke PostgreSQL
    const insertedImage = await saveImageMetadata({
      userId,
      postId,
      fileName: file.name,
      filePath: data.path,
      imageType: file.type,
    });

    return c.json({
      message: "File uploaded and metadata saved successfully",
      image: insertedImage,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
}
//  Ambil list metadata gambar dari tabel images
export async function getImageList(c: Context) {
  try {
    const { rows } = await pool.query('SELECT * FROM images ORDER BY created_at DESC LIMIT 100');
    const images = rows.map(row => ({
      id: row.id,
      file_name: row.file_name,
      file_path: row.file_path,
      user_id: row.user_id,
      post_id: row.post_id,
      image_type: row.image_type,
      created_at: row.created_at,
    }));
    return c.json({ images });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
}

// Dapatkan signed URL untuk gambar berdasarkan file_name yang ada di tabel images
export async function getImageByFileName(c: Context) {
  const filename = c.req.param("filename");
  try {
    const { rows } = await pool.query('SELECT * FROM images WHERE file_name = $1', [filename]);

    if (rows.length === 0) {
      return c.json({ error: "Image not found" }, 404);
    }

    const image = rows[0];

    // Buat signed URL dari Supabase Storage berdasarkan file_path di DB
    const { data, error } = await supabase.storage.from('images').createSignedUrl(image.file_path, 3600);

    if (error || !data) {
      return c.json({ error: error?.message || "Failed to create signed URL" }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
}
