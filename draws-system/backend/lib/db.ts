import { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;

/**
 * Initialise le pool de connexions PostgreSQL.
 * Utilise la variable d'environnement DATABASE_URL.
 */
export function initializePool(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

/**
 * Récupère le pool de connexions.
 * Initialise le pool s'il n'existe pas.
 */
export function getPool(): Pool {
  if (!pool) {
    initializePool();
  }
  return pool!;
}

/**
 * Exécute une requête SQL avec les paramètres fournis.
 * @param query - La requête SQL
 * @param params - Les paramètres de la requête
 * @returns Le résultat de la requête
 */
export async function query(query: string, params?: unknown[]): Promise<any> {
  const client = await getPool().connect();
  try {
    return await client.query(query, params);
  } finally {
    client.release();
  }
}

/**
 * Exécute une transaction SQL.
 * @param callback - Fonction qui exécute les requêtes de la transaction
 * @returns Le résultat de la transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Ferme le pool de connexions.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
