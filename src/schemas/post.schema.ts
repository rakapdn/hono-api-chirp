// src/schemas/post.schema.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),  // Memastikan konten tidak kosong
});

export const updatePostSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),  // Memastikan konten tidak kosong
});
