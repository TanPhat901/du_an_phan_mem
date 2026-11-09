const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const { pool, isDbConnected } = require('../config/db');

const courtsFilePath = path.join(__dirname, '../data/courts.json');

const getCourtsFromFile = () => {
  const data = fs.readFileSync(courtsFilePath, 'utf-8');
  return JSON.parse(data);
};

const FACILITY_IMAGES = [
  'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80'
];

const formatLocalYMD = (dateObj = new Date()) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isPeakHour = (startTimeStr) => {
  const hour = parseInt(String(startTimeStr || '0').split(':')[0], 10);
  return hour >= 17 && hour < 21;
};

const resolvePeakFlag = (isPeakValue, startTimeStr) => {
  if (typeof isPeakValue === 'boolean') return isPeakValue;
  return isPeakHour(startTimeStr);
};

const calcSlotDurationMinutes = (startHHMM, endHHMM) => {
  const toMins = (t) => {
    const [h, m] = String(t || '').split(':').map(Number);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const s = toMins(startHHMM);
  const e = toMins(endHHMM);
  return s !== null && e !== null && e > s ? e - s : 60;
};

const extractOptionalUser = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return decoded?.userId ? { userId: Number(decoded.userId), role: decoded.role } : null;
  } catch {
    return null;
  }
};

// GET /api/courts/sport-types - Danh sách bộ môn thể thao đang hoạt động
router.get('/sport-types', async (req, res) => {
  if (isDbConnected()) {
    try {
      const result = await pool.query(
        `SELECT sport_type_id, name, description
         FROM sport_types
         WHERE status = 'ACTIVE'
         ORDER BY sport_type_id ASC`
      );
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      console.warn('⚠️ Lỗi lấy sport_types:', err.message);
    }
  }
  return res.json({
    success: true,
    data: [
      { sport_type_id: 1, name: 'PADEL & PICKLEBALL' },
      { sport_type_id: 2, name: 'BÓNG ĐÁ & TENNIS' },
      { sport_type_id: 3, name: 'CẦU LÔNG TRONG NHÀ' }
    ]
  });
});

// GET /api/courts/areas - Danh sách khu vực có sân đang mở
router.get('/areas', async (req, res) => {
  const fallbackAreas = ['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Bình Dương'];
  if (isDbConnected()) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT TRIM(area) AS area
         FROM courts
         WHERE is_visible = TRUE
           AND operational_status = 'ACTIVE'
           AND area IS NOT NULL
           AND TRIM(area) <> ''
         ORDER BY area ASC`
      );
      const dbAreas = result.rows.map((r) => r.area);
      const merged = Array.from(new Set([...dbAreas, ...fallbackAreas]));
      return res.json({ success: true, data: merged });
    } catch (err) {
      console.warn('⚠️ Lỗi lấy danh sách khu vực:', err.message);
    }
  }
  return res.json({ success: true, data: fallbackAreas });
});

// GET /api/courts/favorites/my - Danh sách sân yêu thích của người dùng đang đăng nhập
router.get('/favorites/my', authMiddleware, async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }
  const userId = Number(req.user.userId);
  try {
    const result = await pool.query(
      `SELECT
         c.court_id AS id,
         c.name,
         st.name AS category,
         c.address,
         c.area AS city,
         c.description,
         COALESCE(sc_stats.min_price, c.price_per_slot) AS effective_min_price,
         COALESCE(sc_stats.sub_court_count, 0) AS sub_court_count,
         COALESCE(rv_stats.avg_rating, 0) AS avg_rating,
         COALESCE(rv_stats.review_count, 0) AS review_count,
         ts_stats.open_time_range,
         fc.created_at AS favorited_at
       FROM favorite_courts fc
       JOIN courts c ON c.court_id = fc.court_id
       LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
       LEFT JOIN (
         SELECT court_id,
                COUNT(*) FILTER (WHERE status = 'ACTIVE' AND is_visible = TRUE) AS sub_court_count,
                MIN(normal_price) FILTER (WHERE status = 'ACTIVE' AND is_visible = TRUE) AS min_price
         FROM sub_courts
         GROUP BY court_id
       ) sc_stats ON sc_stats.court_id = c.court_id
       LEFT JOIN (
         SELECT court_id,
                ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                COUNT(*)::int AS review_count
         FROM court_reviews
         GROUP BY court_id
       ) rv_stats ON rv_stats.court_id = c.court_id
       LEFT JOIN (
         SELECT court_id,
                CASE
                  WHEN MIN(start_time) IS NOT NULL AND MAX(end_time) IS NOT NULL
                  THEN TO_CHAR(MIN(start_time), 'HH24:MI') || ' - ' || TO_CHAR(MAX(end_time), 'HH24:MI')
                  ELSE NULL
                END AS open_time_range
         FROM time_slots
         WHERE is_active = TRUE
         GROUP BY court_id
       ) ts_stats ON ts_stats.court_id = c.court_id
       WHERE fc.user_id = $1
         AND c.is_visible = TRUE
         AND c.operational_status = 'ACTIVE'
       ORDER BY fc.created_at DESC`,
      [userId]
    );

    const fallbackCourts = getCourtsFromFile();
    const data = result.rows.map((row) => {
      const idNum = Number(row.id);
      const fallback = fallbackCourts.find((f) => f.id === idNum);
      const minPriceVal = parseFloat(row.effective_min_price || 0);
      const reviewCount = Number(row.review_count || 0);
      const ratingNum = reviewCount > 0 ? parseFloat(row.avg_rating || 0) : 0;

      return {
        id: idNum,
        name: row.name,
        category: row.category || 'THỂ THAO',
        address: row.address,
        city: row.city || 'TP. Hồ Chí Minh',
        pricePerHour: minPriceVal,
        priceFormatted: `${Number(minPriceVal).toLocaleString('vi-VN')}đ`,
        imageUrl: fallback ? fallback.imageUrl : FACILITY_IMAGES[(idNum - 1) % FACILITY_IMAGES.length],
        subCourtCount: Number(row.sub_court_count || 0),
        openTime: row.open_time_range || 'Chưa thiết lập giờ',
        rating: ratingNum,
        ratingFormatted: reviewCount > 0 ? ratingNum.toFixed(1) : 'Mới',
        reviewCount,
        isFavorite: true,
        favoritedAt: row.favorited_at
      };
    });

    return res.json({ success: true, total: data.length, data });
  } catch (err) {
    console.error('❌ Lỗi tải danh sách sân yêu thích:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách sân yêu thích.' });
  }
});

// GET /api/courts - Tìm kiếm & lọc cụm sân công khai (kèm slot trống theo ngày, rating & favorites)
router.get('/', async (req, res) => {
  const {
    keyword,
    city,
    category,
    minPrice,
    maxPrice,
    featured,
    date,
    onlyAvailable,
    favoritesOnly,
    sort
  } = req.query;

  const targetDate =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : formatLocalYMD();

  const authUser = extractOptionalUser(req);
  const userId = authUser ? authUser.userId : null;

  if (isDbConnected()) {
    try {
      const values = [targetDate, userId];
      let valIdx = 3;

      let queryStr = `
        SELECT
          c.court_id AS id,
          c.name,
          st.name AS category,
          c.address,
          c.area AS city,
          c.description,
          c.price_per_slot AS price_per_hour,
          c.operational_status,
          c.is_visible,
          c.created_at,
          COALESCE(sc_stats.sub_court_count, 0) AS sub_court_count,
          COALESCE(sc_stats.min_price, c.price_per_slot) AS effective_min_price,
          ts_stats.open_time_range,
          ts_stats.slot_labels,
          COALESCE(ts_stats.total_slots, 0) AS total_slots,
          COALESCE(avail_stats.available_slot_count, 0) AS available_slot_count,
          COALESCE(rv_stats.avg_rating, 0) AS avg_rating,
          COALESCE(rv_stats.review_count, 0) AS review_count,
          COALESCE(fv_stats.favorites_count, 0) AS favorites_count,
          CASE WHEN user_fv.favorite_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_favorite
        FROM courts c
        LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
        LEFT JOIN (
          SELECT court_id,
                 COUNT(*) FILTER (WHERE status = 'ACTIVE' AND is_visible = TRUE) AS sub_court_count,
                 MIN(normal_price) FILTER (WHERE status = 'ACTIVE' AND is_visible = TRUE) AS min_price
          FROM sub_courts
          GROUP BY court_id
        ) sc_stats ON sc_stats.court_id = c.court_id
        LEFT JOIN (
          SELECT court_id,
                 COUNT(*)::int AS total_slots,
                 CASE
                   WHEN MIN(start_time) IS NOT NULL AND MAX(end_time) IS NOT NULL
                   THEN TO_CHAR(MIN(start_time), 'HH24:MI') || ' - ' || TO_CHAR(MAX(end_time), 'HH24:MI')
                   ELSE NULL
                 END AS open_time_range,
                 ARRAY_AGG(TO_CHAR(start_time, 'HH24:MI') || ' - ' || TO_CHAR(end_time, 'HH24:MI') ORDER BY start_time ASC) AS slot_labels
          FROM time_slots
          WHERE is_active = TRUE
          GROUP BY court_id
        ) ts_stats ON ts_stats.court_id = c.court_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS available_slot_count
          FROM time_slots ts
          WHERE ts.court_id = c.court_id
            AND ts.is_active = TRUE
            AND (
              (
                EXISTS (
                  SELECT 1 FROM sub_courts sc_any
                  WHERE sc_any.court_id = c.court_id AND sc_any.status = 'ACTIVE' AND sc_any.is_visible = TRUE
                )
                AND EXISTS (
                  SELECT 1 FROM sub_courts sc
                  WHERE sc.court_id = c.court_id
                    AND sc.status = 'ACTIVE'
                    AND sc.is_visible = TRUE
                    AND NOT EXISTS (
                      SELECT 1
                      FROM booking_details bd
                      JOIN bookings b ON b.booking_id = bd.booking_id
                      WHERE bd.court_id = c.court_id
                        AND bd.booking_date = $1::date
                        AND bd.slot_id = ts.slot_id
                        AND bd.active_flag = 1
                        AND b.status <> 'CANCELLED'
                        AND (bd.sub_court_id = sc.sub_court_id OR bd.sub_court_id IS NULL)
                    )
                    AND NOT EXISTS (
                      SELECT 1
                      FROM court_blocks cb
                      WHERE cb.court_id = c.court_id
                        AND (cb.sub_court_id IS NULL OR cb.sub_court_id = sc.sub_court_id)
                        AND cb.start_at < ($1::date + ts.end_time)
                        AND cb.end_at > ($1::date + ts.start_time)
                    )
                )
              )
              OR (
                NOT EXISTS (
                  SELECT 1 FROM sub_courts sc_any
                  WHERE sc_any.court_id = c.court_id AND sc_any.status = 'ACTIVE' AND sc_any.is_visible = TRUE
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM booking_details bd
                  JOIN bookings b ON b.booking_id = bd.booking_id
                  WHERE bd.court_id = c.court_id
                    AND bd.booking_date = $1::date
                    AND bd.slot_id = ts.slot_id
                    AND bd.active_flag = 1
                    AND b.status <> 'CANCELLED'
                )
                AND NOT EXISTS (
                  SELECT 1
                  FROM court_blocks cb
                  WHERE cb.court_id = c.court_id
                    AND cb.sub_court_id IS NULL
                    AND cb.start_at < ($1::date + ts.end_time)
                    AND cb.end_at > ($1::date + ts.start_time)
                )
              )
            )
        ) avail_stats ON TRUE
        LEFT JOIN (
          SELECT court_id,
                 ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                 COUNT(*)::int AS review_count
          FROM court_reviews
          GROUP BY court_id
        ) rv_stats ON rv_stats.court_id = c.court_id
        LEFT JOIN (
          SELECT court_id, COUNT(*)::int AS favorites_count
          FROM favorite_courts
          GROUP BY court_id
        ) fv_stats ON fv_stats.court_id = c.court_id
        LEFT JOIN favorite_courts user_fv
          ON user_fv.court_id = c.court_id AND user_fv.user_id = $2
        WHERE c.is_visible = TRUE AND c.operational_status = 'ACTIVE'
      `;

      if (keyword) {
        queryStr += ` AND (LOWER(c.name) LIKE $${valIdx} OR LOWER(st.name) LIKE $${valIdx} OR LOWER(c.address) LIKE $${valIdx} OR LOWER(COALESCE(c.area, '')) LIKE $${valIdx})`;
        values.push(`%${keyword.toLowerCase().trim()}%`);
        valIdx++;
      }

      if (city) {
        queryStr += ` AND (LOWER(COALESCE(c.area, '')) LIKE $${valIdx} OR LOWER(c.address) LIKE $${valIdx})`;
        values.push(`%${city.toLowerCase().trim()}%`);
        valIdx++;
      }

      if (category) {
        queryStr += ` AND LOWER(st.name) LIKE $${valIdx}`;
        values.push(`%${category.toLowerCase().trim()}%`);
        valIdx++;
      }

      if (minPrice) {
        queryStr += ` AND COALESCE(sc_stats.min_price, c.price_per_slot) >= $${valIdx}`;
        values.push(parseInt(minPrice, 10));
        valIdx++;
      }

      if (maxPrice) {
        queryStr += ` AND COALESCE(sc_stats.min_price, c.price_per_slot) <= $${valIdx}`;
        values.push(parseInt(maxPrice, 10));
        valIdx++;
      }

      if (onlyAvailable === 'true') {
        queryStr += ' AND COALESCE(avail_stats.available_slot_count, 0) > 0';
      }

      if (favoritesOnly === 'true') {
        if (!userId) {
          return res.json({
            success: true,
            source: 'PostgreSQL Database',
            total: 0,
            data: []
          });
        }
        queryStr += ' AND user_fv.favorite_id IS NOT NULL';
      }

      switch (sort) {
        case 'price_asc':
          queryStr += ' ORDER BY COALESCE(sc_stats.min_price, c.price_per_slot) ASC, c.court_id ASC';
          break;
        case 'price_desc':
          queryStr += ' ORDER BY COALESCE(sc_stats.min_price, c.price_per_slot) DESC, c.court_id ASC';
          break;
        case 'rating_desc':
          queryStr += ' ORDER BY COALESCE(rv_stats.avg_rating, 0) DESC, COALESCE(rv_stats.review_count, 0) DESC, c.court_id ASC';
          break;
        default:
          queryStr += ' ORDER BY c.court_id ASC';
          break;
      }

      const result = await pool.query(queryStr, values);
      const fallbackCourts = getCourtsFromFile();

      const courts = result.rows.map((row, idx) => {
        const idNum = Number(row.id);
        const fallback = fallbackCourts.find((f) => f.id === idNum) || fallbackCourts[idx % fallbackCourts.length];
        const minPriceVal = parseFloat(row.effective_min_price || row.price_per_hour);
        const reviewCount = Number(row.review_count || 0);
        const ratingNum = reviewCount > 0 ? parseFloat(row.avg_rating || 0) : 0;

        return {
          id: idNum,
          name: row.name,
          category: row.category || 'THỂ THAO',
          sportType: row.category ? row.category.toLowerCase() : 'sport',
          rating: ratingNum,
          ratingFormatted: reviewCount > 0 ? ratingNum.toFixed(1) : 'Mới',
          reviewCount,
          favoritesCount: Number(row.favorites_count || 0),
          isFavorite: Boolean(row.is_favorite),
          address: row.address,
          city: row.city || 'TP. Hồ Chí Minh',
          pricePerHour: minPriceVal,
          priceFormatted: `${Number(minPriceVal).toLocaleString('vi-VN')}đ`,
          imageUrl: fallback ? fallback.imageUrl : FACILITY_IMAGES[(idNum - 1) % FACILITY_IMAGES.length],
          amenities: row.description
            ? row.description.split(',').map((s) => s.trim()).filter(Boolean)
            : (fallback ? fallback.amenities : []),
          subCourtCount: Number(row.sub_court_count || 0),
          openTime: row.open_time_range || 'Chưa thiết lập giờ',
          totalSlots: Number(row.total_slots || 0),
          availableSlotCount: Number(row.available_slot_count || 0),
          availabilityDate: targetDate,
          featured: true,
          availableSlots: Array.isArray(row.slot_labels) ? row.slot_labels : []
        };
      });

      return res.json({
        success: true,
        source: 'PostgreSQL Database',
        total: courts.length,
        data: courts
      });
    } catch (err) {
      console.warn('⚠️ Lỗi truy vấn PostgreSQL courts, dùng fallback:', err.message);
    }
  }

  // Fallback
  try {
    let courts = getCourtsFromFile();
    if (featured === 'true') courts = courts.filter((c) => c.featured);
    if (keyword) {
      const kw = keyword.toLowerCase().trim();
      courts = courts.filter(
        (c) =>
          c.name.toLowerCase().includes(kw) ||
          c.category.toLowerCase().includes(kw) ||
          (c.sportType && c.sportType.toLowerCase().includes(kw)) ||
          c.address.toLowerCase().includes(kw)
      );
    }
    if (city) {
      const c = city.toLowerCase().trim();
      courts = courts.filter((court) => court.city.toLowerCase().includes(c));
    }
    if (category) {
      courts = courts.filter((court) => court.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (minPrice) courts = courts.filter((court) => court.pricePerHour >= parseInt(minPrice, 10));
    if (maxPrice) courts = courts.filter((court) => court.pricePerHour <= parseInt(maxPrice, 10));

    res.json({ success: true, source: 'JSON Fallback', total: courts.length, data: courts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu sân', error: err.message });
  }
});

// GET /api/courts/:id/availability?date=YYYY-MM-DD&subCourtId=...
router.get('/:id/availability', async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }

  const date = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
    ? req.query.date
    : formatLocalYMD();
  const subCourtId = req.query.subCourtId ? parseInt(req.query.subCourtId, 10) : null;

  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  try {
    const courtRes = await pool.query(
      `SELECT court_id, price_per_slot, operational_status, is_visible
       FROM courts
       WHERE court_id = $1`,
      [courtId]
    );
    if (courtRes.rowCount === 0 || !courtRes.rows[0].is_visible || courtRes.rows[0].operational_status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Cụm sân hiện không khả dụng.' });
    }
    const basePrice = Number(courtRes.rows[0].price_per_slot || 200000);

    let normalPrice = basePrice;
    let peakPrice = basePrice;
    let subCourtUnavailable = false;

    if (subCourtId && Number.isSafeInteger(subCourtId)) {
      const scRes = await pool.query(
        `SELECT normal_price, peak_price, status, is_visible
         FROM sub_courts
         WHERE sub_court_id = $1 AND court_id = $2`,
        [subCourtId, courtId]
      );
      if (scRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy sân con.' });
      }
      normalPrice = Number(scRes.rows[0].normal_price);
      peakPrice = Number(scRes.rows[0].peak_price);
      if (scRes.rows[0].status !== 'ACTIVE' || !scRes.rows[0].is_visible) {
        subCourtUnavailable = true;
      }
    }

    const slotsRes = await pool.query(
      `SELECT
         slot_id,
         TO_CHAR(start_time, 'HH24:MI') AS start_label,
         TO_CHAR(end_time, 'HH24:MI') AS end_label,
         TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
         TO_CHAR(end_time, 'HH24:MI:SS') AS end_full,
         is_peak
       FROM time_slots
       WHERE court_id = $1 AND is_active = TRUE
       ORDER BY start_time ASC`,
      [courtId]
    );

    const bookedRes = await pool.query(
      `SELECT bd.slot_id, bd.sub_court_id
       FROM booking_details bd
       JOIN bookings b ON b.booking_id = bd.booking_id
       WHERE bd.court_id = $1
         AND bd.booking_date = $2::date
         AND bd.active_flag = 1
         AND b.status <> 'CANCELLED'
         AND ($3::bigint IS NULL OR bd.sub_court_id = $3 OR bd.sub_court_id IS NULL)`,
      [courtId, date, subCourtId]
    );
    const bookedSlotIds = new Set(bookedRes.rows.map((r) => Number(r.slot_id)));

    const blocksRes = await pool.query(
      `SELECT
         TO_CHAR(start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_str,
         TO_CHAR(end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_str,
         reason
       FROM court_blocks
       WHERE court_id = $1
         AND start_at < ($2::date + INTERVAL '1 day')
         AND end_at > $2::date
         AND (sub_court_id IS NULL OR $3::bigint IS NULL OR sub_court_id = $3)`,
      [courtId, date, subCourtId]
    );

    const slots = slotsRes.rows.map((s) => {
      const slotId = Number(s.slot_id);
      const peak = resolvePeakFlag(s.is_peak, s.start_full);
      const durationMinutes = calcSlotDurationMinutes(s.start_label, s.end_label);
      const price = peak ? peakPrice : normalPrice;
      const slotLabel = `${s.start_label} - ${s.end_label}`;
      const slotStartStr = `${date} ${s.start_full}`;
      const slotEndStr = `${date} ${s.end_full}`;

      const blockMatch = blocksRes.rows.find(
        (bl) => bl.start_at_str < slotEndStr && bl.end_at_str > slotStartStr
      );

      let status = 'available';
      let label = `Trống • ${Math.round(price / 1000)}k`;

      if (subCourtUnavailable) {
        status = 'blocked';
        label = 'Đang bảo trì';
      } else if (bookedSlotIds.has(slotId)) {
        status = 'booked';
        label = 'Đã kín chỗ';
      } else if (blockMatch) {
        status = 'blocked';
        label = blockMatch.reason ? `Khóa: ${blockMatch.reason}` : 'Đã khóa lịch';
      }

      return {
        slotId,
        slot: slotLabel,
        startTime: s.start_label,
        endTime: s.end_label,
        durationMinutes,
        isPeak: peak,
        price,
        priceFormatted: `${price.toLocaleString('vi-VN')}đ`,
        status,
        label
      };
    });

    return res.json({
      success: true,
      data: {
        courtId,
        subCourtId,
        date,
        slots
      }
    });
  } catch (err) {
    console.error('Lỗi kiểm tra lịch trống:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể kiểm tra khung giờ trống.' });
  }
});

// GET /api/courts/:id/reviews - Danh sách đánh giá & điểm trung bình thật từ PostgreSQL
router.get('/:id/reviews', async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  const authUser = extractOptionalUser(req);

  try {
    const courtExists = await pool.query(
      'SELECT court_id, is_visible, operational_status FROM courts WHERE court_id = $1',
      [courtId]
    );
    if (courtExists.rowCount === 0 || !courtExists.rows[0].is_visible || courtExists.rows[0].operational_status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cụm sân.' });
    }

    const summaryRes = await pool.query(
      `SELECT
         COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating,
         COUNT(*)::int AS total_reviews,
         COUNT(*) FILTER (WHERE rating = 5)::int AS star_5,
         COUNT(*) FILTER (WHERE rating = 4)::int AS star_4,
         COUNT(*) FILTER (WHERE rating = 3)::int AS star_3,
         COUNT(*) FILTER (WHERE rating = 2)::int AS star_2,
         COUNT(*) FILTER (WHERE rating = 1)::int AS star_1
       FROM court_reviews
       WHERE court_id = $1`,
      [courtId]
    );

    const listRes = await pool.query(
      `SELECT
         r.review_id,
         r.court_id,
         r.user_id,
         r.booking_id,
         r.rating,
         r.comment,
         r.created_at,
         r.updated_at,
         u.full_name AS author_name
       FROM court_reviews r
       JOIN users u ON u.user_id = r.user_id
       WHERE r.court_id = $1
       ORDER BY r.updated_at DESC, r.review_id DESC
       LIMIT 50`,
      [courtId]
    );

    let canReview = false;
    let myReview = null;

    if (authUser) {
      const eligibilityRes = await pool.query(
        `SELECT booking_id
         FROM bookings
         WHERE user_id = $1 AND court_id = $2 AND status IN ('CONFIRMED', 'COMPLETED')
         ORDER BY booking_id DESC
         LIMIT 1`,
        [authUser.userId, courtId]
      );
      canReview = eligibilityRes.rowCount > 0;

      const foundMine = listRes.rows.find((r) => Number(r.user_id) === authUser.userId);
      if (foundMine) {
        myReview = {
          reviewId: Number(foundMine.review_id),
          rating: Number(foundMine.rating),
          comment: foundMine.comment,
          updatedAt: foundMine.updated_at
        };
      }
    }

    const sumRow = summaryRes.rows[0];
    const totalReviews = Number(sumRow.total_reviews || 0);
    const avgRating = totalReviews > 0 ? parseFloat(sumRow.avg_rating || 0) : 0;

    return res.json({
      success: true,
      data: {
        courtId,
        avgRating,
        reviewCount: totalReviews,
        breakdown: {
          5: Number(sumRow.star_5 || 0),
          4: Number(sumRow.star_4 || 0),
          3: Number(sumRow.star_3 || 0),
          2: Number(sumRow.star_2 || 0),
          1: Number(sumRow.star_1 || 0)
        },
        canReview,
        myReview,
        reviews: listRes.rows.map((r) => ({
          reviewId: Number(r.review_id),
          userId: Number(r.user_id),
          authorName: r.author_name || 'Người chơi',
          rating: Number(r.rating),
          comment: r.comment,
          verifiedBooking: Boolean(r.booking_id),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          isMine: authUser ? Number(r.user_id) === authUser.userId : false
        }))
      }
    });
  } catch (err) {
    console.error('❌ Lỗi tải đánh giá sân:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách đánh giá.' });
  }
});

// POST /api/courts/:id/reviews - Gửi hoặc cập nhật đánh giá sân (chỉ người đã đặt sân tại cụm sân này)
router.post('/:id/reviews', authMiddleware, async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  const userId = Number(req.user.userId);
  const ratingNum = Number(req.body?.rating);
  const commentText = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';

  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, message: 'Vui lòng chọn số sao đánh giá từ 1 đến 5.' });
  }
  if (commentText.length < 5 || commentText.length > 1000) {
    return res.status(400).json({ success: false, message: 'Nội dung đánh giá cần từ 5 đến 1.000 ký tự.' });
  }

  try {
    const courtRes = await pool.query(
      'SELECT court_id FROM courts WHERE court_id = $1 AND is_visible = TRUE AND operational_status = \'ACTIVE\'',
      [courtId]
    );
    if (courtRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Cụm sân không tồn tại hoặc đã ngưng hoạt động.' });
    }

    const bookingRes = await pool.query(
      `SELECT booking_id
       FROM bookings
       WHERE user_id = $1 AND court_id = $2 AND status IN ('CONFIRMED', 'COMPLETED')
       ORDER BY booking_date DESC, booking_id DESC
       LIMIT 1`,
      [userId, courtId]
    );
    if (bookingRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bạn cần có ít nhất 1 lịch đặt hợp lệ tại cụm sân này để gửi đánh giá.'
      });
    }

    const linkedBookingId = Number(bookingRes.rows[0].booking_id);
    const savedRes = await pool.query(
      `INSERT INTO court_reviews (court_id, user_id, booking_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (court_id, user_id)
       DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         booking_id = COALESCE(EXCLUDED.booking_id, court_reviews.booking_id),
         updated_at = NOW()
       RETURNING review_id, rating, comment, created_at, updated_at`,
      [courtId, userId, linkedBookingId, ratingNum, commentText]
    );

    const summaryRes = await pool.query(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating, COUNT(*)::int AS review_count
       FROM court_reviews WHERE court_id = $1`,
      [courtId]
    );

    const saved = savedRes.rows[0];
    const sum = summaryRes.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá trải nghiệm sân!',
      data: {
        reviewId: Number(saved.review_id),
        rating: Number(saved.rating),
        comment: saved.comment,
        avgRating: Number(sum.review_count) > 0 ? parseFloat(sum.avg_rating) : 0,
        reviewCount: Number(sum.review_count || 0),
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      }
    });
  } catch (err) {
    console.error('❌ Lỗi lưu đánh giá sân:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể lưu đánh giá lúc này.' });
  }
});

// DELETE /api/courts/:id/reviews/my - Xóa đánh giá của bản thân
router.delete('/:id/reviews/my', authMiddleware, async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  try {
    const delRes = await pool.query(
      'DELETE FROM court_reviews WHERE court_id = $1 AND user_id = $2 RETURNING review_id',
      [courtId, Number(req.user.userId)]
    );
    if (delRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Bạn chưa có đánh giá nào tại cụm sân này.' });
    }

    const summaryRes = await pool.query(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating, COUNT(*)::int AS review_count
       FROM court_reviews WHERE court_id = $1`,
      [courtId]
    );
    const sum = summaryRes.rows[0];

    return res.json({
      success: true,
      message: 'Đã xóa đánh giá của bạn.',
      data: {
        avgRating: Number(sum.review_count) > 0 ? parseFloat(sum.avg_rating) : 0,
        reviewCount: Number(sum.review_count || 0)
      }
    });
  } catch (err) {
    console.error('❌ Lỗi xóa đánh giá:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể xóa đánh giá lúc này.' });
  }
});

// POST /api/courts/:id/favorite - Lưu sân yêu thích
router.post('/:id/favorite', authMiddleware, async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  const userId = Number(req.user.userId);
  try {
    const existsRes = await pool.query(
      'SELECT court_id FROM courts WHERE court_id = $1 AND is_visible = TRUE AND operational_status = \'ACTIVE\'',
      [courtId]
    );
    if (existsRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Cụm sân không tồn tại.' });
    }

    await pool.query(
      `INSERT INTO favorite_courts (user_id, court_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, court_id) DO NOTHING`,
      [userId, courtId]
    );

    const cntRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM favorite_courts WHERE court_id = $1', [courtId]);
    return res.json({
      success: true,
      message: 'Đã thêm vào danh sách sân yêu thích.',
      data: { courtId, isFavorite: true, favoritesCount: Number(cntRes.rows[0].cnt || 0) }
    });
  } catch (err) {
    console.error('❌ Lỗi lưu sân yêu thích:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể lưu sân yêu thích.' });
  }
});

// DELETE /api/courts/:id/favorite - Bỏ lưu sân yêu thích
router.delete('/:id/favorite', authMiddleware, async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã cụm sân không hợp lệ.' });
  }
  if (!isDbConnected()) {
    return res.status(503).json({ success: false, message: 'Không thể kết nối cơ sở dữ liệu.' });
  }

  const userId = Number(req.user.userId);
  try {
    await pool.query(
      'DELETE FROM favorite_courts WHERE user_id = $1 AND court_id = $2',
      [userId, courtId]
    );
    const cntRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM favorite_courts WHERE court_id = $1', [courtId]);
    return res.json({
      success: true,
      message: 'Đã xóa khỏi danh sách sân yêu thích.',
      data: { courtId, isFavorite: false, favoritesCount: Number(cntRes.rows[0].cnt || 0) }
    });
  } catch (err) {
    console.error('❌ Lỗi bỏ lưu sân yêu thích:', err.message);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật sân yêu thích.' });
  }
});

// GET /api/courts/:id - Lấy chi tiết cụm sân + sân con + khung giờ + đánh giá + bank thanh toán
router.get('/:id', async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã sân không hợp lệ.' });
  }

  const authUser = extractOptionalUser(req);
  const userId = authUser ? authUser.userId : null;

  if (isDbConnected()) {
    try {
      const result = await pool.query(`
        SELECT
          c.court_id AS id,
          c.name,
          st.name AS category,
          c.address,
          c.area AS city,
          c.description,
          c.price_per_slot AS price_per_hour,
          c.operational_status,
          c.is_visible,
          u.full_name AS owner_name,
          u.phone AS owner_phone,
          op.bank_name,
          op.bank_account_no,
          op.bank_account_name,
          COALESCE(rv_stats.avg_rating, 0) AS avg_rating,
          COALESCE(rv_stats.review_count, 0) AS review_count,
          COALESCE(fv_stats.favorites_count, 0) AS favorites_count,
          CASE WHEN user_fv.favorite_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_favorite
        FROM courts c
        LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
        LEFT JOIN users u ON c.owner_id = u.user_id
        LEFT JOIN owner_profiles op ON c.owner_id = op.owner_id
        LEFT JOIN (
          SELECT court_id,
                 ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                 COUNT(*)::int AS review_count
          FROM court_reviews
          GROUP BY court_id
        ) rv_stats ON rv_stats.court_id = c.court_id
        LEFT JOIN (
          SELECT court_id, COUNT(*)::int AS favorites_count
          FROM favorite_courts
          GROUP BY court_id
        ) fv_stats ON fv_stats.court_id = c.court_id
        LEFT JOIN favorite_courts user_fv
          ON user_fv.court_id = c.court_id AND user_fv.user_id = $2
        WHERE c.court_id = $1
      `, [courtId, userId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (!row.is_visible || row.operational_status !== 'ACTIVE') {
          return res.status(404).json({ success: false, message: 'Cụm sân hiện không khả dụng.' });
        }
        const fallback = getCourtsFromFile().find((f) => f.id === courtId);

        const subCourtsRes = await pool.query(
          `SELECT
             sc.sub_court_id,
             sc.name,
             sc.sport_type_id,
             st.name AS sport_name,
             sc.description,
             sc.surface_type,
             sc.amenities,
             sc.image_url,
             sc.normal_price,
             sc.peak_price
           FROM sub_courts sc
           LEFT JOIN sport_types st ON st.sport_type_id = sc.sport_type_id
           WHERE sc.court_id = $1 AND sc.status = 'ACTIVE' AND sc.is_visible = TRUE
           ORDER BY sc.sub_court_id ASC`,
          [courtId]
        );

        const timeSlotsRes = await pool.query(
          `SELECT
             slot_id,
             TO_CHAR(start_time, 'HH24:MI') AS start_label,
             TO_CHAR(end_time, 'HH24:MI') AS end_label,
             TO_CHAR(start_time, 'HH24:MI:SS') AS start_full,
             is_peak
           FROM time_slots
           WHERE court_id = $1 AND is_active = TRUE
           ORDER BY start_time ASC`,
          [courtId]
        );

        const subCourts = subCourtsRes.rows.map((sc) => ({
          id: Number(sc.sub_court_id),
          name: sc.name,
          sportTypeId: Number(sc.sport_type_id),
          sportType: sc.sport_name || row.category,
          description: sc.description || '',
          surfaceType: sc.surface_type || '',
          amenities: sc.amenities || [],
          imageUrl: sc.image_url || (fallback ? fallback.imageUrl : FACILITY_IMAGES[(courtId - 1) % FACILITY_IMAGES.length]),
          normalPrice: Number(sc.normal_price),
          peakPrice: Number(sc.peak_price),
          priceFormatted: `${Number(sc.normal_price).toLocaleString('vi-VN')}đ`
        }));

        const timeSlots = timeSlotsRes.rows.map((ts) => ({
          slotId: Number(ts.slot_id),
          slot: `${ts.start_label} - ${ts.end_label}`,
          durationMinutes: calcSlotDurationMinutes(ts.start_label, ts.end_label),
          isPeak: resolvePeakFlag(ts.is_peak, ts.start_full)
        }));

        const computedOpenTime = timeSlotsRes.rows.length > 0
          ? `${timeSlotsRes.rows[0].start_label} - ${timeSlotsRes.rows.reduce((maxEnd, r) => (r.end_label > maxEnd ? r.end_label : maxEnd), timeSlotsRes.rows[0].end_label)}`
          : 'Chưa mở giờ';

        const reviewCount = Number(row.review_count || 0);
        const ratingNum = reviewCount > 0 ? parseFloat(row.avg_rating || 0) : 0;

        return res.json({
          success: true,
          source: 'PostgreSQL Database',
          data: {
            id: Number(row.id),
            name: row.name,
            category: row.category || 'THỂ THAO',
            rating: ratingNum,
            ratingFormatted: reviewCount > 0 ? ratingNum.toFixed(1) : 'Mới',
            reviewCount,
            favoritesCount: Number(row.favorites_count || 0),
            isFavorite: Boolean(row.is_favorite),
            address: row.address,
            city: row.city || 'TP. Hồ Chí Minh',
            ownerName: row.owner_name || '',
            ownerPhone: row.owner_phone || '',
            ownerBank: row.bank_account_no
              ? {
                  bankName: row.bank_name || '',
                  bankAccountNo: row.bank_account_no || '',
                  bankAccountName: row.bank_account_name || ''
                }
              : null,
            pricePerHour: parseFloat(row.price_per_hour),
            priceFormatted: `${Number(row.price_per_hour).toLocaleString('vi-VN')}đ`,
            imageUrl: fallback ? fallback.imageUrl : FACILITY_IMAGES[(courtId - 1) % FACILITY_IMAGES.length],
            amenities: row.description
              ? row.description.split(',').map((s) => s.trim()).filter(Boolean)
              : (fallback ? fallback.amenities : []),
            openTime: computedOpenTime,
            subCourts,
            timeSlots
          }
        });
      }
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao' });
    } catch (err) {
      console.warn('⚠️ Lỗi truy vấn PostgreSQL court detail:', err.message);
    }
  }

  // Fallback
  try {
    const courts = getCourtsFromFile();
    const court = courts.find((c) => c.id === courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao' });
    }
    res.json({ success: true, source: 'JSON Fallback', data: court });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
