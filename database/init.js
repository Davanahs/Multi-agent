/**
 * Database Initialization
 *
 * This file handles:
 *  1. Connecting to the database via Prisma
 *  2. Dynamically syncing the schema — if tables don't exist, they are created
 *
 * Usage (standalone):
 *   node database/init.js
 *
 * Usage (from server):
 *   const { initDatabase } = require('../database/init');
 *   await initDatabase();
 */

const { PrismaClient } = require('@prisma/client');
const { execSync }     = require('child_process');

// Load env vars FIRST before any Prisma code
require('dotenv').config();

let prisma;

/**
 * Get or create the shared Prisma client instance (singleton).
 * DATABASE_URL is read automatically from process.env by Prisma v7.
 */
function getPrismaClient() {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set. Check your .env file.');
    }
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prisma;
}

/**
 * Reconnect to the database if the connection was lost (Neon DB goes to sleep).
 * Retries up to 3 times with exponential backoff.
 */
async function reconnect(attempt = 0) {
  try {
    prisma = null; // force new instance
    const db = getPrismaClient();
    await db.$connect();
    await db.$queryRaw`SELECT 1`;
    console.log('  ✓ Database reconnected successfully.');
    return db;
  } catch (err) {
    if (attempt < 3) {
      const delay = (attempt + 1) * 1500;
      console.warn(`  ⚠ Reconnect attempt ${attempt + 1}/3 failed — retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return reconnect(attempt + 1);
    }
    throw new Error(`Database reconnection failed after 3 attempts: ${err.message}`);
  }
}

/**
 * Initialize the database:
 *  - Test the connection
 *  - Push the Prisma schema to the database (creates tables if they don't exist)
 *
 * @returns {Promise<PrismaClient>}
 */
async function initDatabase() {
  const db = getPrismaClient();

  // ── Step 1: Test connection ──────────────────────────────────────────────
  try {
    await db.$connect();
    const result = await db.$queryRaw`SELECT NOW() AS server_time`;
    console.log(`  ✓ Database connected — ${result[0].server_time}`);
  } catch (err) {
    console.error('  ✗ Database connection failed:', err.message);
    throw err;
  }

  // ── Step 2: Dynamically sync schema (create tables if not present) ────────
  console.log('  ⏳ Syncing database schema...');
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'pipe',
      cwd: process.cwd(),
    });
    console.log('  ✓ Schema synced — all tables are up to date.');
  } catch (err) {
    console.warn('  ⚠ db push warning:', err.stdout?.toString() || err.message);
  }

  return db;
}

/**
 * Gracefully disconnect from the database.
 */
async function closeDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    console.log('  ✓ Database disconnected.');
    prisma = null;
  }
}

// ── CLI: Run directly to initialize DB ─────────────────────────────────────
if (require.main === module) {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       DATABASE INITIALIZATION            ║');
  console.log('╚══════════════════════════════════════════╝\n');

  initDatabase()
    .then(() => {
      console.log('\n  ✓ Database initialized successfully.\n');
    })
    .catch((err) => {
      console.error('\n  ✗ Initialization failed:', err.message, '\n');
      process.exit(1);
    })
    .finally(() => closeDatabase());
}

module.exports = { getPrismaClient, initDatabase, closeDatabase, reconnect };

