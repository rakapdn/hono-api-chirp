import { Hono } from 'hono'
import { createPost, deletePost, getAllPosts, getPostById } from '../handlers/post.handler'
import { likePost, unlikePost } from '../handlers/like.handler'
import { createReply, getRepliesByPost } from '../handlers/reply.handler'

const postRoute = new Hono()

// Post CRUD operations
postRoute.get('/', getAllPosts)
postRoute.post('/', createPost)
postRoute.get('/:id', getPostById)
postRoute.delete('/:id', deletePost)

// Likes - menggunakan singular sesuai rencana
postRoute.post('/:id/like', likePost)
postRoute.delete('/:id/unlike', unlikePost)

// Replies
postRoute.get('/:id/replies', getRepliesByPost)
postRoute.post('/:id/reply', createReply) // Menggunakan /reply singular sesuai rencana

export default postRoute