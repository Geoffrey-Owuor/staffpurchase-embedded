// db.js
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  waitForConnections: true,
  connectTimeout: 10000,
  connectionLimit: 150, // This is the maximum number of available connections
  queueLimit: 0,
});

// Acquires a connection, runs fn(connection), always releases it.
export async function withConnection(fn) {
  const connection = await pool.getConnection();
  try {
    return await fn(connection);
  } finally {
    connection.release();
  }
}

// Acquires a connection, runs fn(connection) inside a transaction,
// committing on success and rolling back if fn throws.
export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
