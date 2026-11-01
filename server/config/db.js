const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sportsbooking_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});

let isDbConnected = false;

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
    console.warn('⚠️ Chưa kết nối được PostgreSQL (hệ thống sẽ dùng dữ liệu đệm dự phòng).');
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

