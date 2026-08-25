import { Sequelize } from "sequelize";
import { env } from "./env.js";
import { createLogger } from "../logger.js";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const logger = createLogger("Database");

// Database configuration
const dbConfig = {
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  database: env.DB_NAME,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  dialect: "postgres",
  logging: logger.debug.bind(logger),
  pool: {
    max: 20,
    min: 5,
    idle: 10000,
    acquire: 30000,
  },
};

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: "postgres",
    logging: dbConfig.logging,
    pool: dbConfig.pool,
  },
);

export default sequelize;

export async function initDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info(`Connected to database ${dbConfig.database} successfully`);

    // Check if TimescaleDB extension exists
    const [results]: any = await sequelize.query(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')",
    );

    if (!results[0].exists) {
      logger.warn(
        "TimescaleDB extension is not installed or enabled. Some features may not work correctly.",
      );
    }

    // Run SQL migrations
    await runMigrations();
  } catch (err) {
    logger.error("Failed to connect to database:", err);
    throw err;
  }
}

async function runMigrations(): Promise<void> {
  const migrationsDir = join(process.cwd(), "migrations");

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort(); // relies on naming convention (e.g. 0001_, 0002_...) for order

  if (files.length === 0) {
    logger.info("No migration files found.");
    return;
  }

  // Ensure tracking table exists (in case this runs against a fresh db)
  await sequelize.query(`
    create table if not exists public.migrations
    (
      id         serial primary key,
      name       varchar(255) not null unique,
      applied_at timestamp with time zone default now() not null
    )
  `);

  const [appliedRows]: any = await sequelize.query(
    "SELECT name FROM public.migrations",
  );
  const applied = new Set(appliedRows.map((r: any) => r.name));

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    logger.info("No pending migrations.");
    return;
  }

  for (const file of pending) {
    const filePath = join(migrationsDir, file);
    const sql = await readFile(filePath, "utf-8");

    if (sql.startsWith("--no-tran")) {
      logger.error(`The migration ${filePath} requires manual running, please run it now. Exiting to allow this.`)
      process.exit(1);
    }
    
    const t = await sequelize.transaction();
    try {
      logger.info(`Applying migration ${file}...`);
      await sequelize.query(sql, { transaction: t });
      await sequelize.query(
        "INSERT INTO public.migrations (name) VALUES (:name)",
        { replacements: { name: file }, transaction: t },
      );

      await t.commit();
      logger.info(`Applied migration ${file}`);
    } catch (err) {
      await t.rollback();
      logger.error(`Migration ${file} failed:`, err);
      process.exit(1);
    }
  }

  logger.info(`Applied ${pending.length} migration(s).`);
}
