import { Redis } from '@upstash/redis'

let client: Redis | null = null

export function redis(): Redis {
  if (!client) {
    const url = process.env.KV_REST_API_URL
    const token = process.env.KV_REST_API_TOKEN
    if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not set')
    client = new Redis({ url, token })
  }
  return client
}

export const boardKey = (boardId: string) => `board:${boardId}`
export const metaKey = (boardId: string) => `board:${boardId}:meta`
