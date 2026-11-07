import express, { Request, Response } from "express";
import cors from "cors";
import { ensureAuthSchema, login, register, requireAuth } from "./auth";
import { pool } from "./db";

const app = express();

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5175",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
].filter((origin): origin is string => Boolean(origin));

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl).
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        if (isProduction) {
          callback(new Error("Not allowed by CORS"));
        } else {
          callback(null, true); // Allow anyway for development
        }
      }
    },
    credentials: true,
  })
);

// Lets Express read a JSON body on incoming requests (req.body).
app.use(express.json());

app.post("/register", register);
app.post("/login", login);

// GET /api/users -> read all rows from the "users" table.
app.get("/", requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users  ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/user_work", requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT users.id, name, work_type, fk_user_work FROM users JOIN user_work ON users.id = user_work.fk_user_work;"

    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/works_salaries", requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT user_work.id, user_work.work_type, users_salaries.salary FROM user_work JOIN users_salaries ON user_work.fk_user_work = users_salaries.user_id;"
    );
    res.json(result.rows)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
})


app.get("/users_salary", requireAuth, async (_req: Request, res: Response) => {
  try {
    const [salariesResult, totalResult] = await Promise.all([
      pool.query(
        "SELECT users.id, users.name, users_salaries.salary FROM users JOIN users_salaries ON users.id = users_salaries.user_id"
      ),
      pool.query("SELECT get_total_salary() AS total_salary"),
    ]);

    res.json({
      salaries: salariesResult.rows,
      total_salary: totalResult.rows[0]?.total_salary ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users salaries" });
  }
});


// POST /api/users -> insert a new row, so the frontend can also send data.
app.post("/", requireAuth, async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at",
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.get("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "invalid id" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, email } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at",
      [name, email || null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.status(202).json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

const PORT = process.env.PORT || 5000;

ensureAuthSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start API", err);
    process.exit(1);
  });
