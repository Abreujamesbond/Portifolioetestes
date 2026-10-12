import { AppError } from "./domain.mjs";

export async function createStore() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    return createNeonStore(neon(process.env.DATABASE_URL));
  }
  if (process.env.VERCEL)
    throw new AppError(
      "Conecte o Neon e configure DATABASE_URL para usar a conta com dados persistentes.",
      503,
    );
  const { createSQLiteStore } = await import("./sqlite-store.mjs");
  return createSQLiteStore();
}

export async function createNeonStore(sql) {
  await sql.transaction([
    sql.query(
      "CREATE TABLE IF NOT EXISTS conecta_users (id INTEGER PRIMARY KEY CHECK(id=1), email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL)",
    ),
    sql.query(
      "CREATE TABLE IF NOT EXISTS conecta_sessions (hash TEXT PRIMARY KEY, expires BIGINT NOT NULL)",
    ),
    sql.query(
      "CREATE TABLE IF NOT EXISTS conecta_workspace (id INTEGER PRIMARY KEY CHECK(id=1), value JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 0)",
    ),
  ]);
  return {
    async hasOwner() {
      return (
        (await sql.query("SELECT id FROM conecta_users WHERE id=1")).length > 0
      );
    },
    async findUser(email) {
      return (
        await sql.query("SELECT * FROM conecta_users WHERE email=$1", [email])
      )[0];
    },
    async createOwner(user, state) {
      try {
        await sql.transaction([
          sql.query(
            "INSERT INTO conecta_users (id,email,salt,hash) VALUES (1,$1,$2,$3)",
            [user.email, user.salt, user.hash],
          ),
          sql.query(
            "INSERT INTO conecta_workspace (id,value) VALUES (1,$1::jsonb)",
            [JSON.stringify(state)],
          ),
        ]);
      } catch (error) {
        if (error.code === "23505")
          throw new AppError("O acesso já foi criado.", 409);
        throw error;
      }
    },
    async hasSession(hash, now) {
      return (
        (
          await sql.query(
            "SELECT hash FROM conecta_sessions WHERE hash=$1 AND expires>$2",
            [hash, now],
          )
        ).length > 0
      );
    },
    async addSession(hash, expires) {
      await sql.transaction([
        sql.query("DELETE FROM conecta_sessions WHERE expires<=$1", [
          Date.now(),
        ]),
        sql.query(
          "INSERT INTO conecta_sessions (hash,expires) VALUES ($1,$2)",
          [hash, expires],
        ),
      ]);
    },
    async deleteSession(hash) {
      await sql.query("DELETE FROM conecta_sessions WHERE hash=$1", [hash]);
    },
    async read() {
      const row = (
        await sql.query("SELECT value FROM conecta_workspace WHERE id=1")
      )[0];
      if (!row) throw new AppError("Crie seu acesso para começar.", 409);
      return row.value;
    },
    async mutate(fn) {
      // Prevent concurrent serverless requests from overwriting sales or stock.
      for (let attempt = 0; attempt < 8; attempt++) {
        const row = (
          await sql.query(
            "SELECT value,revision FROM conecta_workspace WHERE id=1",
          )
        )[0];
        if (!row) throw new AppError("Crie seu acesso para começar.", 409);
        const state = row.value;
        const result = fn(state);
        const saved = await sql.query(
          "UPDATE conecta_workspace SET value=$1::jsonb,revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision",
          [JSON.stringify(state), row.revision],
        );
        if (saved.length) return result;
      }
      throw new AppError(
        "Os dados mudaram em outra janela. Atualize a página e tente novamente.",
        409,
      );
    },
    close() {},
  };
}
