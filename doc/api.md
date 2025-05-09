# Dokumentasi API

## Pendahuluan

Ini adalah dokumentasi untuk REST API yang dibangun menggunakan Hono.js. API ini menyediakan fungsionalitas autentikasi, manajemen pengguna, posts, likes, replies, dan sistem follow.

## Informasi Umum

- Base URL: `/api`
- Format Respons: JSON
- Autentikasi: JWT (JSON Web Token)

## Autentikasi

API ini menggunakan autentikasi berbasis token JWT. Untuk mengakses endpoint terproteksi, sertakan token di header seperti berikut:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Endpoint Autentikasi

#### Daftar Pengguna Baru

**Endpoint:** `POST /api/auth/register`

**Deskripsi:** Mendaftarkan pengguna baru di sistem.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
```

**Respons Sukses (200):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username"
  }
}
```

**Respons Error (400):**
```json
{
  "error": "User with this email already exists"
}
```

#### Login

**Endpoint:** `POST /api/auth/login`

**Deskripsi:** Melakukan autentikasi pengguna dan mendapatkan token JWT.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Respons Sukses (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respons Error (404):**
```json
{
  "error": "User not found"
}
```

**Respons Error (400):**
```json
{
  "error": "Invalid password"
}
```

#### Mendapatkan Informasi Pengguna yang Terautentikasi

**Endpoint:** `GET /api/auth/me`

**Deskripsi:** Mendapatkan informasi pengguna yang sedang login.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username"
  }
}
```

**Respons Error (401):**
```json
{
  "error": "No token provided"
}
```

atau

```json
{
  "error": "Invalid or expired token"
}
```

## Endpoint Terproteksi

Semua endpoint berikut memerlukan autentikasi dengan token JWT.

### Posts

**Base Endpoint:** `/api/posts`

#### Mendapatkan Semua Posts

**Endpoint:** `GET /api/posts`

**Deskripsi:** Mendapatkan daftar semua posts dengan informasi tambahan seperti jumlah likes dan replies.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (opsional)
```

**Respons Sukses (200):**
```json
[
  {
    "id": 1,
    "content": "Ini adalah post pertama",
    "image": "image_url.jpg",
    "createdAt": "2023-05-10T12:00:00Z",
    "updatedAt": "2023-05-10T12:00:00Z",
    "authorId": 1,
    "author": {
      "id": 1,
      "username": "username",
      "image": "profile_image.jpg"
    },
    "likeCount": 5,
    "replyCount": 2,
    "likedByMe": true
  },
  // ... posts lainnya
]
```

#### Mendapatkan Post Berdasarkan ID

**Endpoint:** `GET /api/posts/:id`

**Deskripsi:** Mendapatkan detail post berdasarkan ID.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN (opsional)
```

**Respons Sukses (200):**
```json
{
  "id": 1,
  "content": "Ini adalah post pertama",
  "image": "image_url.jpg",
  "createdAt": "2023-05-10T12:00:00Z",
  "updatedAt": "2023-05-10T12:00:00Z",
  "authorId": 1,
  "author": {
    "id": 1,
    "username": "username",
    "image": "profile_image.jpg"
  },
  "likeCount": 5,
  "replyCount": 2,
  "likedByMe": true
}
```

**Respons Error (404):**
```json
{
  "error": "Post not found"
}
```

#### Membuat Post Baru

**Endpoint:** `POST /api/posts`

**Deskripsi:** Membuat post baru.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "content": "Isi post baru",
  "image": "image_url.jpg"
}
```

**Respons Sukses (201):**
```json
{
  "id": 1,
  "content": "Isi post baru",
  "image": "image_url.jpg",
  "createdAt": "2023-05-10T12:00:00Z",
  "updatedAt": "2023-05-10T12:00:00Z",
  "authorId": 1
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

#### Menghapus Post

**Endpoint:** `DELETE /api/posts/:id`

**Deskripsi:** Menghapus post berdasarkan ID. Hanya pemilik post yang dapat menghapus.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "message": "Post deleted successfully"
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (403):**
```json
{
  "error": "Not allowed or Post not found"
}
```

### Likes

#### Menyukai Post

**Endpoint:** `POST /api/posts/:id/like`

**Deskripsi:** Memberikan like pada post.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "liked": true
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (400):**
```json
{
  "error": "Invalid post ID"
}
```

**Respons Error (500):**
```json
{
  "error": "Failed to like post"
}
```

#### Membatalkan Like pada Post

**Endpoint:** `DELETE /api/posts/:id/unlike`

**Deskripsi:** Membatalkan like pada post.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "liked": false
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (400):**
```json
{
  "error": "Invalid post ID"
}
```

**Respons Error (500):**
```json
{
  "error": "Failed to unlike post"
}
```

### Replies

#### Mendapatkan Replies untuk Post

**Endpoint:** `GET /api/posts/:id/replies`

**Deskripsi:** Mendapatkan semua balasan untuk post tertentu.

**Respons Sukses (200):**
```json
[
  {
    "id": 1,
    "content": "Ini adalah balasan",
    "createdAt": "2023-05-10T12:00:00Z",
    "updatedAt": "2023-05-10T12:00:00Z",
    "postId": 1,
    "authorId": 2,
    "author": {
      "id": 2,
      "username": "another_user"
    }
  },
  // ... replies lainnya
]
```

**Respons Error (400):**
```json
{
  "error": "Invalid post ID"
}
```

#### Membuat Balasan untuk Post

**Endpoint:** `POST /api/posts/:id/reply`

**Deskripsi:** Membuat balasan baru untuk post.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "content": "Isi balasan",
  "postId": 1
}
```

**Respons Sukses (200):**
```json
{
  "id": 1,
  "content": "Isi balasan",
  "createdAt": "2023-05-10T12:00:00Z",
  "updatedAt": "2023-05-10T12:00:00Z",
  "postId": 1,
  "authorId": 2
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (400):**
```json
{
  "error": {
    "content": [
      "Required"
    ],
    "postId": [
      "Required"
    ]
  }
}
```

### Users

**Base Endpoint:** `/api/users`

#### Mendapatkan Profil Pengguna

**Endpoint:** `GET /api/users/:id`

**Deskripsi:** Mendapatkan profil pengguna berdasarkan ID, termasuk informasi pengikut.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "user": {
    "id": 1,
    "username": "username",
    "email": "user@example.com",
    "bio": "Biografi pengguna",
    "image": "profile_image.jpg",
    "createdAt": "2023-05-10T12:00:00Z",
    "updatedAt": "2023-05-10T12:00:00Z"
  },
  "followerCount": 10,
  "followingCount": 5,
  "isFollowing": true
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (404):**
```json
{
  "error": "User not found"
}
```

#### Memperbarui Profil Pengguna

**Endpoint:** `PUT /api/users/profile`

**Deskripsi:** Memperbarui profil pengguna yang sedang login.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Request Body:**
```json
{
  "bio": "Biografi baru",
  "image": "new_profile_image.jpg"
}
```

**Respons Sukses (200):**
```json
{
  "id": 1,
  "username": "username",
  "email": "user@example.com",
  "bio": "Biografi baru",
  "image": "new_profile_image.jpg",
  "createdAt": "2023-05-10T12:00:00Z",
  "updatedAt": "2023-05-10T12:30:00Z"
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

#### Mengikuti Pengguna

**Endpoint:** `POST /api/users/:id/follow`

**Deskripsi:** Mengikuti pengguna lain.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "message": "Followed successfully"
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

**Respons Error (400):**
```json
{
  "error": "You cannot follow yourself"
}
```

atau

```json
{
  "error": "Already following or error occurred"
}
```

#### Berhenti Mengikuti Pengguna

**Endpoint:** `DELETE /api/users/:id/unfollow`

**Deskripsi:** Berhenti mengikuti pengguna lain.

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Respons Sukses (200):**
```json
{
  "message": "Unfollowed successfully"
}
```

**Respons Error (401):**
```json
{
  "error": "Unauthorized"
}
```

#### Mendapatkan Post dari Pengguna

**Endpoint:** `GET /api/users/:id/posts`

**Deskripsi:** Mendapatkan semua post yang dibuat oleh pengguna tertentu.

**Respons Sukses (200):**
```json
[
  {
    "id": 1,
    "content": "Ini adalah post dari pengguna",
    "image": "post_image.jpg",
    "createdAt": "2023-05-10T12:00:00Z",
    "updatedAt": "2023-05-10T12:00:00Z",
    "author": {
      "id": 1,
      "username": "username",
      "image": "profile_image.jpg"
    }
  },
  // ... posts lainnya
]
```

**Respons Error (400):**
```json
{
  "error": "Invalid user ID"
}
```

## Model Data

### User
- `id`: number - ID unik pengguna
- `email`: string - Email pengguna (unik)
- `username`: string - Nama pengguna
- `password`: string - Password yang sudah di-hash
- `bio`: string (opsional) - Biografi pengguna
- `image`: string (opsional) - URL gambar profil
- `createdAt`: Date - Waktu pembuatan akun
- `updatedAt`: Date - Waktu pembaruan terakhir

### Post
- `id`: number - ID unik post
- `content`: string - Konten post
- `image`: string (opsional) - URL gambar post
- `authorId`: number - ID pengguna yang membuat post
- `createdAt`: Date - Waktu pembuatan post
- `updatedAt`: Date - Waktu pembaruan terakhir

### Like
- `id`: number - ID unik like
- `userId`: number - ID pengguna yang memberikan like
- `postId`: number - ID post yang di-like
- `createdAt`: Date - Waktu like

### Reply
- `id`: number - ID unik reply
- `content`: string - Konten balasan
- `authorId`: number - ID pengguna yang membuat balasan
- `postId`: number - ID post yang dibalas
- `createdAt`: Date - Waktu pembuatan balasan
- `updatedAt`: Date - Waktu pembaruan terakhir

### Follow
- `id`: number - ID unik relasi follow
- `followerId`: number - ID pengguna yang mengikuti
- `followingId`: number - ID pengguna yang diikuti
- `createdAt`: Date - Waktu follow

## Struktur Aplikasi

Aplikasi ini dibangun dengan pola MVC (Model-View-Controller) yang dimodifikasi:

### Model Layer
- Menggunakan **Prisma ORM** untuk berinteraksi dengan database
- Model data: User, Post, Like, Reply, Follow

### Controller Layer (Handlers)
- **auth.handler.ts**: Menangani autentikasi (register, login)
- **post.handler.ts**: Menangani operasi CRUD untuk posts
- **like.handler.ts**: Menangani operasi like/unlike pada posts
- **reply.handler.ts**: Menangani operasi terkait balasan pada posts
- **user.handler.ts**: Menangani operasi terkait profil pengguna dan follow

### Router Layer
- **auth.route.ts**: Mendefinisikan endpoint autentikasi
- **post.route.ts**: Mendefinisikan endpoint untuk posts, likes, dan replies
- **user.route.ts**: Mendefinisikan endpoint untuk pengguna dan follow

### Entry Point
- **index.ts**: Mengintegrasikan semua route dan middleware

## Keamanan

- Password di-hash menggunakan bcrypt
- JWT digunakan untuk autentikasi dengan masa berlaku 1 jam
- Endpoint terproteksi memerlukan token JWT yang valid

## Dependensi Utama

- Hono.js - Web framework
- Prisma - ORM untuk database
- bcrypt - Library untuk hashing password
- jsonwebtoken - Library untuk JWT
- zod - Library untuk validasi data
