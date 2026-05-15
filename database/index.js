/**
 * Database Module — Public API
 *
 * Single entry point for all database access.
 * Import from anywhere in the backend:
 *
 *   const db = require('../database');
 *
 *   // Then use Prisma's typed client:
 *   const workflow = await db.workflow.create({ data: { prompt: '...' } });
 *   const models   = await db.model.findMany({ where: { is_active: true } });
 *
 * Connection errors (e.g. Neon DB waking from sleep) are handled
 * automatically with exponential backoff reconnection.
 */

const { getPrismaClient, initDatabase, closeDatabase, reconnect } = require('./init');

const RECONNECT_ERRORS = [
  "Can't reach database server",
  'Connection refused',
  'connection timeout',
  'ECONNREFUSED',
  'ENOTFOUND',
  'socket hang up',
];

function isConnectionError(err) {
  const msg = err?.message || '';
  return RECONNECT_ERRORS.some(e => msg.includes(e));
}

/**
 * Wraps a Prisma delegate method call with auto-reconnect on connection failure.
 */
function withReconnect(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isConnectionError(err)) {
        console.warn('  ⚡ DB connection lost — reconnecting...');
        await reconnect();
        return await fn(...args); // retry once after reconnect
      }
      throw err;
    }
  };
}

// Re-export the singleton Prisma client as a smart Proxy
const db = new Proxy(
  {},
  {
    get(_, prop) {
      // Special passthrough functions
      if (prop === 'initDatabase')  return initDatabase;
      if (prop === 'closeDatabase') return closeDatabase;
      if (prop === '$connect')      return (...args) => getPrismaClient().$connect(...args);
      if (prop === '$disconnect')   return (...args) => getPrismaClient().$disconnect(...args);
      if (prop === '$transaction')  return (...args) => getPrismaClient().$transaction(...args);

      // Raw query methods — wrap with reconnect
      if (prop === '$queryRaw') {
        return withReconnect(getPrismaClient().$queryRaw.bind(getPrismaClient()));
      }
      if (prop === '$executeRaw') {
        return withReconnect(getPrismaClient().$executeRaw.bind(getPrismaClient()));
      }

      // Model delegates (workflow, model, subtask, agentOutput, etc.)
      // Wrap each method (findMany, create, update, etc.) with reconnect
      const delegate = getPrismaClient()[prop];
      if (delegate && typeof delegate === 'object') {
        return new Proxy(delegate, {
          get(target, method) {
            const fn = target[method];
            if (typeof fn === 'function') {
              return withReconnect(fn.bind(target));
            }
            return fn;
          },
        });
      }

      return delegate;
    },
  }
);

module.exports = db;
