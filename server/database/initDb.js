const fs = require('fs');
const path = require('path');
const { pool, checkDbConnection } = require('../config/db');

async function initDatabase() {
  console.log('🔄 Đang kiểm tra kết nối PostgreSQL...');
  const isConnected = await checkDbConnection();
  if (!isConnected) {
    console.error('❌ Không thể kết nối tới PostgreSQL. Vui lòng kiểm tra file server/.env và đảm bảo dịch vụ PostgreSQL đang chạy.');
    process.exit(1);
  }

  try {
    console.log('📦 Đang tạo cấu trúc bảng và Trigger theo schema mới...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schemaSql);
    console.log('✅ Đã tạo cấu trúc bảng (Users, Owner_Profiles, Sport_Types, Courts, Time_Slots, Bookings...) thành công!');

    // 1. Seed Sport Types
    const sportTypesCount = await pool.query('SELECT COUNT(*) FROM sport_types');
    if (parseInt(sportTypesCount.rows[0].count, 10) === 0) {
      console.log('🌱 Đang chèn các môn thể thao (sport_types)...');
      await pool.query(`
        INSERT INTO sport_types (sport_type_id, name, description, status) VALUES
        (1, 'PADEL & PICKLEBALL', 'Bộ môn Padel và Pickleball tiêu chuẩn quốc tế', 'ACTIVE'),
        (2, 'BÓNG ĐÁ & TENNIS', 'Sân cỏ nhân tạo 5-7 người và sân tennis ngoài trời', 'ACTIVE'),
        (3, 'CẦU LÔNG TRONG NHÀ', 'Nhà thi đấu cầu lông thảm Taraflex, điều hòa', 'ACTIVE')
        ON CONFLICT (sport_type_id) DO NOTHING;
      `);
      await pool.query(`SELECT setval('sport_types_sport_type_id_seq', (SELECT MAX(sport_type_id) FROM sport_types));`);
      console.log('✅ Đã chèn 3 môn thể thao mẫu.');
    }

    // 2. Seed Users & Owner Profiles
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(usersCount.rows[0].count, 10) === 0) {
      console.log('🌱 Đang chèn tài khoản người dùng và chủ sân...');
      // Admin
      await pool.query(`
        INSERT INTO users (user_id, full_name, email, password_hash, phone, role, status) VALUES
        (1, 'Quản Trị Viên', 'admin@sportsbooking.vn', 'admin123', '0900000001', 'ADMIN', 'ACTIVE'),
        (2, 'Nguyễn Văn Thảo (Chủ The Yard)', 'theyard@sportsbooking.vn', 'owner123', '0901234567', 'OWNER', 'ACTIVE'),
        (3, 'Trần Minh Celadon', 'celadon@sportsbooking.vn', 'owner123', '0902345678', 'OWNER', 'ACTIVE'),
        (4, 'Lê Hoàng SkyGarden', 'skygarden@sportsbooking.vn', 'owner123', '0903456789', 'OWNER', 'ACTIVE'),
        (5, 'Nguyễn Văn An', 'an.nguyen@example.com', 'password123', '0912345678', 'USER', 'ACTIVE')
        ON CONFLICT (user_id) DO NOTHING;
      `);
      await pool.query(`SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));`);

      // Owner Profiles
      await pool.query(`
        INSERT INTO owner_profiles (owner_id, business_name, tax_code, bank_name, bank_account_no, bank_account_name) VALUES
        (2, 'The Yard Sport Thảo Điền', '0315888999', 'Vietcombank', '1023456789', 'NGUYEN VAN THAO'),
        (3, 'Celadon Sports Center', '0316777888', 'Techcombank', '1903456789', 'TRAN MINH CELADON'),
        (4, 'Sky Garden Arena Q7', '0317666555', 'MBBank', '0903456789', 'LE HOANG SKYGARDEN')
        ON CONFLICT (owner_id) DO NOTHING;
      `);
      console.log('✅ Đã tạo tài khoản mẫu (Admin, Chủ sân và Người chơi).');
    }

    // 3. Seed Courts
    const courtsCount = await pool.query('SELECT COUNT(*) FROM courts');
    if (parseInt(courtsCount.rows[0].count, 10) === 0) {
      console.log('🌱 Đang chèn danh sách cụm sân thể thao (courts)...');
      await pool.query(`
        INSERT INTO courts (court_id, sport_type_id, owner_id, name, address, area, description, price_per_slot, operational_status, is_visible) VALUES
        (1, 1, 2, 'The Yard Sport Arena - Tổ hợp Cỏ Nhân Tạo & Padel Thảo Điền', '28 Đường Quốc Hương, P. Thảo Điền, TP. Thủ Đức', 'TP. Hồ Chí Minh', 'Bãi đỗ ô tô, Phòng tắm nóng lạnh, Café / Quầy nước, Đèn Led ban đêm', 280000, 'ACTIVE', TRUE),
        (2, 2, 3, 'Trung Tâm Celadon Sport Club', 'Đường N1, Sơn Kỳ, Tân Phú, TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'Đèn Led ban đêm, Khán đài có mái, Bảo vệ 24/7', 190000, 'ACTIVE', TRUE),
        (3, 3, 4, 'Sky Garden Arena Phú Mỹ Hưng', 'Phạm Văn Nghị, Tân Phong, Quận 7, TP. HCM', 'TP. Hồ Chí Minh', 'Máy lạnh công suất lớn, Thảm Yonex chuẩn thi đấu', 140000, 'ACTIVE', TRUE)
        ON CONFLICT (court_id) DO NOTHING;
      `);
      await pool.query(`SELECT setval('courts_court_id_seq', (SELECT MAX(court_id) FROM courts));`);
      console.log('✅ Đã chèn các sân thể thao mẫu.');
    }

    // 4. Seed Time Slots
    const slotsCount = await pool.query('SELECT COUNT(*) FROM time_slots');
    if (parseInt(slotsCount.rows[0].count, 10) === 0) {
      console.log('🌱 Đang tạo các khung giờ mẫu (time_slots)...');
      const slots = [
        ['06:00:00', '07:00:00'],
        ['07:00:00', '08:00:00'],
        ['16:00:00', '17:00:00'],
        ['17:00:00', '18:00:00'],
        ['18:00:00', '19:00:00'],
        ['19:00:00', '20:00:00'],
        ['20:00:00', '21:00:00'],
        ['21:00:00', '22:00:00']
      ];

      for (let courtId = 1; courtId <= 3; courtId++) {
        for (const [st, et] of slots) {
          await pool.query(`
            INSERT INTO time_slots (court_id, start_time, end_time, is_active)
            VALUES ($1, $2, $3, TRUE)
            ON CONFLICT DO NOTHING;
          `, [courtId, st, et]);
        }
      }
      console.log('✅ Đã tạo các khung giờ thuê sân (6h - 22h).');
    }

    console.log('\n🎉 KHỞI TẠO CSDL POSTGRESQL THEO SCHEMA CHUẨN THÀNH CÔNG!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi khởi tạo CSDL:', err);
    process.exit(1);
  }
}

initDatabase();
