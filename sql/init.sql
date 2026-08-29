-- Run this against your local PostgreSQL server (via psql or pgAdmin's
-- Query Tool) to create the database, table, and some sample data.

-- 1. Create the database (run this line alone, e.g. from psql connected
--    to the default "postgres" database — you can't create a DB and then
--    use it in the same script/session).
CREATE DATABASE simple_app;

-- 2. Connect to it:
--    psql:  \c simple_app
--    pgAdmin: switch the connection to "simple_app", then run the rest below.

-- 3. Create the table.
-- Naming convention: table names are lowercase, plural ("users"), and
-- multi-word columns use snake_case ("created_at") — this is the standard
-- convention in PostgreSQL, as opposed to camelCase used in JS/TS.
CREATE TABLE users (
  id SERIAL PRIMARY KEY,        -- auto-incrementing integer id
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 4. Seed a couple of rows so GET /api/users returns something immediately.
INSERT INTO users (name, email) VALUES
  ('Ada Lovelace', 'ada@example.com'),
  ('Alan Turing', 'alan@example.com');
