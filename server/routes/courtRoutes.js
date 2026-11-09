const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
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

// GET /api/courts - Tìm kiếm & lọc cụm sân công khai
router.get('/', async (req, res) => {
  const { keyword, city, category, minPrice, maxPrice, featured } = req.query;

  if (isDbConnected()) {
    try {
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
          ts_stats.slot_labels
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
        WHERE c.is_visible = TRUE AND c.operational_status = 'ACTIVE'
      `;
      const values = [];
      let valIdx = 1;

      if (keyword) {
        queryStr += ` AND (LOWER(c.name) LIKE $${valIdx} OR LOWER(st.name) LIKE $${valIdx} OR LOWER(c.address) LIKE $${valIdx})`;
        values.push(`%${keyword.toLowerCase().trim()}%`);
        valIdx++;
      }

      if (city) {
        queryStr += ` AND (LOWER(c.area) LIKE $${valIdx} OR LOWER(c.address) LIKE $${valIdx})`;
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

      queryStr += ' ORDER BY c.court_id ASC';

      const result = await pool.query(queryStr, values);
      const fallbackCourts = getCourtsFromFile();

      const courts = result.rows.map((row, idx) => {
        const idNum = Number(row.id);
        const fallback = fallbackCourts.find(f => f.id === idNum) || fallbackCourts[idx % fallbackCourts.length];
        const minPriceVal = parseFloat(row.effective_min_price || row.price_per_hour);

        return {
          id: idNum,
          name: row.name,
          category: row.category || 'THỂ THAO',
          sportType: row.category ? row.category.toLowerCase() : 'sport',
          rating: fallback ? fallback.rating : 4.9,
          ratingFormatted: fallback ? (fallback.ratingFormatted || fallback.rating.toString()) : '4.9',
          reviewCount: fallback ? fallback.reviewCount : 120,
          address: row.address,
          city: row.city || 'TP. Hồ Chí Minh',
          pricePerHour: minPriceVal,
          priceFormatted: `${Number(minPriceVal).toLocaleString('vi-VN')}đ`,
          imageUrl: fallback ? fallback.imageUrl : FACILITY_IMAGES[(idNum - 1) % FACILITY_IMAGES.length],
          amenities: row.description ? row.description.split(',').map(s => s.trim()).filter(Boolean) : (fallback ? fallback.amenities : []),
          subCourtCount: Number(row.sub_court_count || 0),
          openTime: row.open_time_range || 'Chưa thiết lập giờ',
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

    if (featured === 'true') courts = courts.filter(c => c.featured);
    if (keyword) {
      const kw = keyword.toLowerCase().trim();
      courts = courts.filter(c =>
        c.name.toLowerCase().includes(kw) ||
        c.category.toLowerCase().includes(kw) ||
        (c.sportType && c.sportType.toLowerCase().includes(kw)) ||
        c.address.toLowerCase().includes(kw)
      );
    }
    if (city) {
      const c = city.toLowerCase().trim();
      courts = courts.filter(court => court.city.toLowerCase().includes(c));
    }
    if (category) {
      courts = courts.filter(court => court.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (minPrice) courts = courts.filter(court => court.pricePerHour >= parseInt(minPrice, 10));
    if (maxPrice) courts = courts.filter(court => court.pricePerHour <= parseInt(maxPrice, 10));

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
    : new Date().toISOString().split('T')[0];
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
    const bookedSlotIds = new Set(bookedRes.rows.map(r => Number(r.slot_id)));

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
        bl => bl.start_at_str < slotEndStr && bl.end_at_str > slotStartStr
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

// GET /api/courts/:id - Lấy chi tiết cụm sân + danh sách sân con + khung giờ
router.get('/:id', async (req, res) => {
  const courtId = parseInt(req.params.id, 10);
  if (!Number.isSafeInteger(courtId) || courtId <= 0) {
    return res.status(400).json({ success: false, message: 'Mã sân không hợp lệ.' });
  }

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
          u.phone AS owner_phone
        FROM courts c
        LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
        LEFT JOIN users u ON c.owner_id = u.user_id
        WHERE c.court_id = $1
      `, [courtId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        if (!row.is_visible || row.operational_status !== 'ACTIVE') {
          return res.status(404).json({ success: false, message: 'Cụm sân hiện không khả dụng.' });
        }
        const fallback = getCourtsFromFile().find(f => f.id === courtId);

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

        const subCourts = subCourtsRes.rows.map(sc => ({
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

        const timeSlots = timeSlotsRes.rows.map(ts => ({
          slotId: Number(ts.slot_id),
          slot: `${ts.start_label} - ${ts.end_label}`,
          durationMinutes: calcSlotDurationMinutes(ts.start_label, ts.end_label),
          isPeak: resolvePeakFlag(ts.is_peak, ts.start_full)
        }));

        const computedOpenTime = timeSlotsRes.rows.length > 0
          ? `${timeSlotsRes.rows[0].start_label} - ${timeSlotsRes.rows.reduce((maxEnd, r) => (r.end_label > maxEnd ? r.end_label : maxEnd), timeSlotsRes.rows[0].end_label)}`
          : 'Chưa mở giờ';

        return res.json({
          success: true,
          source: 'PostgreSQL Database',
          data: {
            id: Number(row.id),
            name: row.name,
            category: row.category || 'THỂ THAO',
            rating: fallback ? fallback.rating : 4.9,
            reviewCount: fallback ? fallback.reviewCount : 186,
            address: row.address,
            city: row.city || 'TP. Hồ Chí Minh',
            ownerName: row.owner_name || '',
            ownerPhone: row.owner_phone || '',
            pricePerHour: parseFloat(row.price_per_hour),
            priceFormatted: `${Number(row.price_per_hour).toLocaleString('vi-VN')}đ`,
            imageUrl: fallback ? fallback.imageUrl : FACILITY_IMAGES[(courtId - 1) % FACILITY_IMAGES.length],
            amenities: row.description ? row.description.split(',').map(s => s.trim()).filter(Boolean) : (fallback ? fallback.amenities : []),
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
    const court = courts.find(c => c.id === courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao' });
    }
    res.json({ success: true, source: 'JSON Fallback', data: court });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;
