-- Local first-time setup only: create the database (run this alone from the
-- default "postgres" database). Skip this on production — the hosted DB
-- already exists.
-- CREATE DATABASE simple_app;

-- Then connect:
--    psql:  \c simple_app
--    pgAdmin: switch to "simple_app", then run the rest below.

-- App list/CRUD table (keep if it already exists).
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Auth/register table — separate from "users".
CREATE TABLE IF NOT EXISTS users_auth (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Seed sample rows for the list table only when those emails are not present.
INSERT INTO users (name, email)
SELECT 'Ada Lovelace', 'ada@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ada@example.com');

INSERT INTO users (name, email)
SELECT 'Alan Turing', 'alan@example.com'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'alan@example.com');
