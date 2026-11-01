-- =========================================================
-- DATABASE: SPORTSBOOKING (POSTGRESQL VERSION)
-- Hệ thống quản lý và đặt sân thể thao trực tuyến (Multi-vendor)
-- =========================================================

-- 0. TẠO CÁC KIỂU DỮ LIỆU ENUM (An toàn khi khởi tạo)
-- =========================================================
DO $$ BEGIN
    CREATE TYPE role_enum AS ENUM ('USER', 'OWNER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status_enum AS ENUM ('ACTIVE', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE operational_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- =========================================================
-- 1. USERS & OWNER_PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role role_enum NOT NULL DEFAULT 'USER',
    status account_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_full_name CHECK (LENGTH(TRIM(full_name)) > 0),
    CONSTRAINT chk_users_email CHECK (LENGTH(TRIM(email)) > 0)
);

-- Bảng thông tin thanh toán dành riêng cho Chủ sân
CREATE TABLE IF NOT EXISTS owner_profiles (
    owner_id BIGINT PRIMARY KEY,
    business_name VARCHAR(150),
    tax_code VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(100),
    
    CONSTRAINT fk_owner_profiles_user 
        FOREIGN KEY (owner_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
);


-- =========================================================
-- 2. SPORT_TYPES
-- =========================================================
CREATE TABLE IF NOT EXISTS sport_types (
    sport_type_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT NULL,
    status operational_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_sport_types_name UNIQUE (name),
    CONSTRAINT chk_sport_types_name CHECK (LENGTH(TRIM(name)) > 0)
);


-- =========================================================
-- 3. COURTS (Đã thêm owner_id)
-- =========================================================
CREATE TABLE IF NOT EXISTS courts (
    court_id BIGSERIAL PRIMARY KEY,
    sport_type_id BIGINT NOT NULL,
    owner_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    area VARCHAR(100) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    price_per_slot DECIMAL(12,2) NOT NULL DEFAULT 0,
    operational_status operational_status_enum NOT NULL DEFAULT 'ACTIVE',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_courts_sport_type FOREIGN KEY (sport_type_id) REFERENCES sport_types(sport_type_id) ON DELETE RESTRICT,
    CONSTRAINT fk_courts_owner FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_courts_price CHECK (price_per_slot >= 0),
    CONSTRAINT chk_courts_name CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT chk_courts_address CHECK (LENGTH(TRIM(address)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_courts_sport_type ON courts(sport_type_id);
CREATE INDEX IF NOT EXISTS idx_courts_owner ON courts(owner_id);
CREATE INDEX IF NOT EXISTS idx_courts_area ON courts(area);
CREATE INDEX IF NOT EXISTS idx_courts_status ON courts(operational_status, is_visible);


-- =========================================================
-- 4. TIME_SLOTS
-- =========================================================
CREATE TABLE IF NOT EXISTS time_slots (
    slot_id BIGSERIAL PRIMARY KEY,
    court_id BIGINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_time_slots_court FOREIGN KEY (court_id) REFERENCES courts(court_id) ON DELETE RESTRICT,
    CONSTRAINT chk_time_slots_time CHECK (start_time < end_time),
    CONSTRAINT uq_time_slots_court_time UNIQUE (court_id, start_time, end_time),
    CONSTRAINT uq_time_slots_id_court UNIQUE (slot_id, court_id)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_court_active ON time_slots(court_id, is_active);


-- =========================================================
-- 5. BOOKINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    court_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'CONFIRMED',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    cancelled_at TIMESTAMP DEFAULT NULL,
    cancel_reason VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version INT NOT NULL DEFAULT 1,
    
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_court FOREIGN KEY (court_id) REFERENCES courts(court_id) ON DELETE RESTRICT,
    CONSTRAINT chk_bookings_amount CHECK (total_amount >= 0),
    CONSTRAINT chk_bookings_version CHECK (version >= 1),
    CONSTRAINT chk_bookings_cancelled CHECK (
        (status = 'CANCELLED' AND cancelled_at IS NOT NULL) OR
        (status <> 'CANCELLED' AND cancelled_at IS NULL)
    ),
    CONSTRAINT uq_bookings_id_court UNIQUE (booking_id, court_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON bookings(court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(user_id, booking_date);


-- =========================================================
-- 6. BOOKING_DETAILS
-- =========================================================
CREATE TABLE IF NOT EXISTS booking_details (
    detail_id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    court_id BIGINT NOT NULL,
    slot_id BIGINT NOT NULL,
    booking_date DATE NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    active_flag SMALLINT DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_booking_details_booking FOREIGN KEY (booking_id, court_id) REFERENCES bookings(booking_id, court_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_details_slot FOREIGN KEY (slot_id, court_id) REFERENCES time_slots(slot_id, court_id) ON DELETE RESTRICT,
    CONSTRAINT chk_booking_details_price CHECK (price >= 0),
    CONSTRAINT chk_booking_details_active CHECK (active_flag = 1 OR active_flag IS NULL),
    CONSTRAINT uq_booking_details_booking_slot UNIQUE (booking_id, slot_id),
    CONSTRAINT uq_booking_details_active_slot UNIQUE (court_id, booking_date, slot_id, active_flag)
);

CREATE INDEX IF NOT EXISTS idx_booking_details_booking ON booking_details(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_details_slot ON booking_details(slot_id);
CREATE INDEX IF NOT EXISTS idx_booking_details_court_date ON booking_details(court_id, booking_date);


-- =========================================================
-- 7. COURT_BLOCKS
-- =========================================================
CREATE TABLE IF NOT EXISTS court_blocks (
    block_id BIGSERIAL PRIMARY KEY,
    court_id BIGINT NOT NULL,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_court_blocks_court FOREIGN KEY (court_id) REFERENCES courts(court_id) ON DELETE RESTRICT,
    CONSTRAINT fk_court_blocks_admin FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT chk_court_blocks_time CHECK (start_at < end_at),
    CONSTRAINT chk_court_blocks_reason CHECK (LENGTH(TRIM(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_court_blocks_court_time ON court_blocks(court_id, start_at, end_at);


-- =========================================================
-- 8. BOOKING_STATUS_HISTORY
-- =========================================================
CREATE TABLE IF NOT EXISTS booking_status_history (
    history_id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    old_status booking_status_enum DEFAULT NULL,
    new_status booking_status_enum NOT NULL,
    changed_by BIGINT DEFAULT NULL,
    reason VARCHAR(500) DEFAULT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_booking_history_booking FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    CONSTRAINT fk_booking_history_user FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_booking_history_booking ON booking_status_history(booking_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_booking_history_changed_by ON booking_status_history(changed_by);


-- =========================================================
-- 9. TẠO TRIGGER TỰ ĐỘNG CẬP NHẬT `updated_at`
-- =========================================================

-- Hàm cập nhật timestamp dùng chung
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Gắn trigger vào bảng users
DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Gắn trigger vào bảng courts
DROP TRIGGER IF EXISTS set_updated_at_courts ON courts;
CREATE TRIGGER set_updated_at_courts
BEFORE UPDATE ON courts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Gắn trigger vào bảng bookings
DROP TRIGGER IF EXISTS set_updated_at_bookings ON bookings;
CREATE TRIGGER set_updated_at_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
