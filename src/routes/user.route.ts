import { Hono } from 'hono'
import {
  getUserProfile,
  updateUserProfile,
  followUser,
  unfollowUser,
  getUserPosts,
} from '../handlers/user.handler'

const userRoute = new Hono()

// User profile endpoints
userRoute.get('/:id', getUserProfile) // Mengambil profil user berdasarkan ID sesuai rencana

// Follow relationship endpoints - menggunakan singular sesuai rencana
userRoute.post('/:id/follow', followUser)
userRoute.delete('/:id/unfollow', unfollowUser)

// User posts endpoint
userRoute.get('/:id/posts', getUserPosts)

export default userRoute