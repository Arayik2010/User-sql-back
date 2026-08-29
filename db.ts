import { Pool } from "pg";
import "dotenv/config"; // loads variables from .env into process.env

// A Pool manages a small set of reusable connections to PostgreSQL,
// instead of opening/closing a new connection for every query.
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
