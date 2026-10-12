import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./domain.mjs";
export function createSQLiteStore() {
  const directory =
    process.env.DATA_DIR ||
    resolve(dirname(fileURLToPath(import.meta.url)), "../data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(directory, "conecta.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);",
  );
  const read = () =>
    JSON.parse(
      db.prepare("SELECT value FROM workspace WHERE id=1").get().value,
    );
  return {
    hasOwner() {
      return Boolean(db.prepare("SELECT id FROM users LIMIT 1").get());
    },
    findUser(email) {
      return db.prepare("SELECT * FROM users WHERE email=?").get(email);
    },
    createOwner(user, state) {
      db.exec("BEGIN IMMEDIATE");
      try {
        if (db.prepare("SELECT id FROM users LIMIT 1").get())
          throw new AppError("O acesso já foi criado.", 409);
        db.prepare("INSERT INTO users VALUES (1,?,?,?)").run(
          user.email,
          user.salt,
          user.hash,
        );
        db.prepare("INSERT INTO workspace VALUES (1,?)").run(
          JSON.stringify(state),
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    hasSession(hash, now) {
      return Boolean(
        db
          .prepare("SELECT hash FROM sessions WHERE hash=? AND expires>?")
          .get(hash, now),
      );
    },
    addSession(hash, expires) {
      db.prepare("DELETE FROM sessions WHERE expires<=?").run(Date.now());
      db.prepare("INSERT INTO sessions VALUES (?,?)").run(hash, expires);
    },
    deleteSession(hash) {
      db.prepare("DELETE FROM sessions WHERE hash=?").run(hash);
    },
    read,
    mutate(fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const state = read();
        const result = fn(state);
        db.prepare("UPDATE workspace SET value=? WHERE id=1").run(
          JSON.stringify(state),
        );
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
