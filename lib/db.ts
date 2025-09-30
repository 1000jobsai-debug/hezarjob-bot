// lib/db.ts
import { Pool } from "pg"

// از متغیرهای محیطی (Environment Variables) استفاده می‌کنیم
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // چون Supabase SSL داره
  },
})

export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res
  } finally {
    client.release()
  }
}

export function toPgVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`
}
