import { Pool } from "pg";
import "dotenv/config"; // loads variables from .env into process.env

// Prefer DATABASE_URL (production / hosted Postgres).
// Fall back to individual DB_* vars for local development.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });
