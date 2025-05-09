# 🐦 Chirp API

**Chirp** adalah RESTful API untuk aplikasi sosial media ringan seperti Threads. API ini dibangun menggunakan stack modern:

- ⚡ [Bun](https://bun.sh/) — runtime super cepat
- 🧩 [Hono](https://hono.dev/) — web framework ringan berbasis Web Standard
- 🧬 [Prisma](https://www.prisma.io/) — ORM untuk PostgreSQL
- 🛡️ JWT Authentication

## ✨ Fitur

- Autentikasi JWT
- Buat dan hapus postingan
- Like dan unlike postingan
- Balas postingan (reply)
- Follow dan unfollow user
- Lihat profil user & status follow
- Hitung jumlah follower dan following
- Dokumentasi API tersedia di [`doc/api.md`](./doc/api.md)

## 🛠️ Instalasi

```bash
bun install
