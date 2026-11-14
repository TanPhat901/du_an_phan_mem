const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Connection Pool
// Hỗ trợ cả Local PostgreSQL và Cloud PostgreSQL (Neon, Supabase, Render, Railway qua DATABASE_URL)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'sportsbooking_db',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };

const pool = new Pool(poolConfig);

let isDbConnected = Boolean(process.env.DATABASE_URL);

// Test DB Connection
const checkDbConnection = async () => {
  try {
    const client = await pool.connect();
    isDbConnected = true;
    client.release();
    console.log('✅ Kết nối cơ sở dữ liệu PostgreSQL thành công!');
    return true;
  } catch (err) {
    isDbConnected = false;
    console.warn('⚠️ Không thể kết nối cơ sở dữ liệu PostgreSQL.');
    console.warn(`   Chi tiết: ${err.message}`);
    return false;
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  isDbConnected: () => isDbConnected,
  checkDbConnection,
};

