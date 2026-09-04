import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { pool } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

type PublicUser = {
  id: number;
  name: string;
  email: string | null;
  created_at?: string;
};

type AuthTokenPayload = {
  sub: number;
  email: string | null;
};

export type AuthedRequest = Request & {
  auth?: AuthTokenPayload;
};

function isPgError(err: unknown): err is { code: string } {
  return typeof err === "object" && err !== null && "code" in err;
}

function signToken(user: PublicUser) {
  return jwt.sign({ sub: String(user.id), email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    if (typeof decoded === "string") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub)) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    (req as AuthedRequest).auth = {
      sub,
      email: typeof decoded.email === "string" ? decoded.email : null,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function ensureAuthSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users_auth (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )
  `);
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const existing = await pool.query(
      "SELECT id FROM users_auth WHERE email = $1",
      [email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users_auth (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );
    const user = result.rows[0] as PublicUser;
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (isPgError(err) && err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to register" });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at, password_hash FROM users_auth WHERE email = $1",
      [email]
    );
    const row = result.rows[0] as
      | (PublicUser & { password_hash: string | null })
      | undefined;

    if (!row?.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user: PublicUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      created_at: row.created_at,
    };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to sign in" });
  }
}
