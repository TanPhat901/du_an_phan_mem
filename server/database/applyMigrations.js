require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');
const { pool, checkDbConnection } = require('../config/db');

const MIGRATIONS = [
  'create_sub_courts.sql',
  'enhance_bookings_and_sub_courts.sql',
  'enhance_time_slots_peak.sql',
  'enhance_customer_features.sql',
  'enhance_booking_workflow_flows.sql'
];

async function applyMigrations() {
  const connected = await checkDbConnection();
  if (!connected) {
    console.error('❌ Không thể kết nối PostgreSQL.');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');
  try {
    for (const file of MIGRATIONS) {
      const fullPath = path.join(migrationsDir, file);
      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ Bỏ qua (không tìm thấy): ${file}`);
        continue;
      }
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`🔄 Đang chạy migration: ${file}...`);
      await pool.query(sql);
      console.log(`✅ Đã áp dụng: ${file}`);
    }
    console.log('🎉 Hoàn tất chạy tất cả migrations.');
  } catch (err) {
    console.error('❌ Lỗi khi chạy migration:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

applyMigrations();
