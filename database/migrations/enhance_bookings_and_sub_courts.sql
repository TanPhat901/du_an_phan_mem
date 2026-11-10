-- Migration: enhance bookings, booking_details, court_blocks for sub-court bookings and seed initial sub_courts

-- 1. Extend bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS sub_court_id BIGINT REFERENCES public.sub_courts(sub_court_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'Tại quầy',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS note TEXT;

-- 2. Extend booking_details table with sub_court_id and update active uniqueness index
ALTER TABLE public.booking_details
  ADD COLUMN IF NOT EXISTS sub_court_id BIGINT REFERENCES public.sub_courts(sub_court_id) ON DELETE SET NULL;

ALTER TABLE public.booking_details
  DROP CONSTRAINT IF EXISTS uq_booking_details_active_slot;

CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_details_active_sub_slot
  ON public.booking_details (court_id, COALESCE(sub_court_id, 0), booking_date, slot_id)
  WHERE active_flag = 1;

-- 3. Extend court_blocks table with optional sub_court_id
ALTER TABLE public.court_blocks
  ADD COLUMN IF NOT EXISTS sub_court_id BIGINT REFERENCES public.sub_courts(sub_court_id) ON DELETE CASCADE;

-- 4. Seed realistic sub_courts for existing facilities (idempotent via uq_sub_court_name)
INSERT INTO public.sub_courts (
  court_id, name, sport_type_id, description, surface_type, amenities, image_url, normal_price, peak_price, status, is_visible
) VALUES
  (
    1,
    'Sân Padel 1 (Kính Panoramic Pro)',
    1,
    'Kính cường lực Panoramic',
    'Cỏ nhân tạo WPT chuẩn thi đấu',
    ARRAY['Đèn LED 400W', 'Mặt kính WPT', 'Phòng thay đồ', 'Bãi xe ô tô'],
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
    280000,
    350000,
    'ACTIVE',
    TRUE
  ),
  (
    1,
    'Sân Pickleball A (Ngoài trời)',
    1,
    'Ngoài trời thoáng mát',
    'Sơn Acrylic 5 lớp chuẩn USAPA',
    ARRAY['Lưới chuẩn quốc tế', 'Đèn chiếu ban đêm', 'Nước uống miễn phí'],
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=600&q=80',
    180000,
    240000,
    'ACTIVE',
    TRUE
  ),
  (
    2,
    'Sân Bóng Đá 5 Người - Sân A1',
    2,
    'Sân cỏ nhân tạo 5 người',
    'Cỏ Desso GrassMaster 50mm',
    ARRAY['Đèn cao áp 800W', 'Lưới bao an toàn', 'Bình nước đá miễn phí'],
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
    200000,
    320000,
    'ACTIVE',
    TRUE
  ),
  (
    2,
    'Sân Bóng Đá 7 Người - Sân FIFA Pro',
    2,
    'Sân cỏ nhân tạo 7 người',
    'Cỏ FIFA 2-Star chống trơn trượt',
    ARRAY['Khán đài có mái che', 'Phòng tắm nóng lạnh'],
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80',
    380000,
    550000,
    'ACTIVE',
    TRUE
  ),
  (
    3,
    'Sân Cầu Lông Số 1 - Thảm Yonex',
    3,
    'Trong nhà trần cao 12m',
    'Thảm Yonex 5.0mm BWF Approved',
    ARRAY['Đèn chiếu sáng chống lóa', 'Máy lạnh công suất lớn', 'Căng vợt lấy liền'],
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    140000,
    180000,
    'ACTIVE',
    TRUE
  ),
  (
    3,
    'Sân Cầu Lông Số 2 - Thảm Yonex',
    3,
    'Trong nhà điều hòa',
    'Thảm Yonex 5.0mm',
    ARRAY['Đèn LED chống lóa', 'Phòng thay đồ', 'Căng tin giải khát'],
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=600&q=80',
    140000,
    180000,
    'ACTIVE',
    TRUE
  )
ON CONFLICT (court_id, name) DO NOTHING;
