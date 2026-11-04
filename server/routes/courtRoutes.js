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

// GET /api/courts - Search & filter courts
router.get('/', async (req, res) => {
  const { keyword, city, category, minPrice, maxPrice, featured } = req.query;

  // 1. Try PostgreSQL with the official schema
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
          c.created_at
        FROM courts c
        LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
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
        queryStr += ` AND c.price_per_slot >= $${valIdx}`;
        values.push(parseInt(minPrice, 10));
        valIdx++;
      }

      if (maxPrice) {
        queryStr += ` AND c.price_per_slot <= $${valIdx}`;
        values.push(parseInt(maxPrice, 10));
        valIdx++;
      }

      queryStr += ' ORDER BY c.court_id ASC';

      const result = await pool.query(queryStr, values);
      
      // Fallback courts map for images & ratings
      const fallbackCourts = getCourtsFromFile();

      const courts = result.rows.map((row, idx) => {
        const fallback = fallbackCourts.find(f => f.id === parseInt(row.id, 10)) || fallbackCourts[idx % fallbackCourts.length];
        
        return {
          id: row.id,
          name: row.name,
          category: row.category || 'THỂ THAO',
          sportType: row.category ? row.category.toLowerCase() : 'sport',
          rating: fallback ? fallback.rating : 4.9,
          ratingFormatted: fallback ? (fallback.ratingFormatted || fallback.rating.toString()) : '4.9',
          reviewCount: fallback ? fallback.reviewCount : 120,
          address: row.address,
          city: row.city || 'TP. Hồ Chí Minh',
          pricePerHour: parseFloat(row.price_per_hour),
          priceFormatted: `${Number(row.price_per_hour).toLocaleString('vi-VN')}đ`,
          imageUrl: fallback ? fallback.imageUrl : 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
          amenities: row.description ? row.description.split(',').map(s => s.trim()) : (fallback ? fallback.amenities : []),
          openTime: '06:00 - 23:00',
          featured: true,
          availableSlots: ["06:00 - 07:00", "07:00 - 08:00", "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00"]
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

  // 2. Fallback
  try {
    let courts = getCourtsFromFile();

    if (featured === 'true') {
      courts = courts.filter(c => c.featured);
    }

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

    if (minPrice) {
      courts = courts.filter(court => court.pricePerHour >= parseInt(minPrice, 10));
    }

    if (maxPrice) {
      courts = courts.filter(court => court.pricePerHour <= parseInt(maxPrice, 10));
    }

    res.json({
      success: true,
      source: 'JSON Fallback',
      total: courts.length,
      data: courts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu sân', error: err.message });
  }
});

// GET /api/courts/:id - Get court detail
router.get('/:id', async (req, res) => {
  const courtId = parseInt(req.params.id, 10);

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
          c.price_per_slot AS price_per_hour
        FROM courts c
        LEFT JOIN sport_types st ON c.sport_type_id = st.sport_type_id
        WHERE c.court_id = $1
      `, [courtId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const fallback = getCourtsFromFile().find(f => f.id === courtId);

        return res.json({
          success: true,
          source: 'PostgreSQL Database',
          data: {
            id: row.id,
            name: row.name,
            category: row.category,
            rating: fallback ? fallback.rating : 4.9,
            reviewCount: fallback ? fallback.reviewCount : 186,
            address: row.address,
            city: row.city,
            pricePerHour: parseFloat(row.price_per_hour),
            priceFormatted: `${Number(row.price_per_hour).toLocaleString('vi-VN')}đ`,
            imageUrl: fallback ? fallback.imageUrl : 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=800&q=80',
            amenities: row.description ? row.description.split(',').map(s => s.trim()) : (fallback ? fallback.amenities : []),
            openTime: '06:00 - 23:00'
          }
        });
      }
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

// POST /api/courts - Owner creates a new court
router.post('/', async (req, res) => {
  try {
    const { name, category, sportType, address, city, pricePerHour, amenities, imageUrl, openTime } = req.body;
    
    if (!name || !pricePerHour) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên sân và giá thuê!' });
    }

    const courts = getCourtsFromFile();
    const newCourt = {
      id: Date.now(),
      name,
      category: category || 'THỂ THAO TỔNG HỢP',
      sportType: sportType || 'sport',
      rating: 5.0,
      ratingFormatted: '5.0',
      reviewCount: 1,
      address: address || 'TP. Hồ Chí Minh',
      city: city || 'TP. Hồ Chí Minh',
      pricePerHour: parseInt(pricePerHour, 10),
      priceFormatted: `${parseInt(pricePerHour, 10).toLocaleString('vi-VN')}đ`,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
      amenities: Array.isArray(amenities) ? amenities : ['Đèn Led', 'Bãi đỗ xe', 'Phòng thay đồ'],
      openTime: openTime || '06:00 - 23:00',
      featured: false,
      availableSlots: ["06:00 - 07:00", "07:00 - 08:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00"]
    };

    courts.unshift(newCourt);
    fs.writeFileSync(courtsFilePath, JSON.stringify(courts, null, 2), 'utf-8');

    res.status(201).json({ success: true, message: 'Thêm sân thể thao mới thành công!', data: newCourt });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi tạo sân mới', error: err.message });
  }
});

// PUT /api/courts/:id - Owner updates court information
router.put('/:id', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id, 10);
    const courts = getCourtsFromFile();
    const index = courts.findIndex(c => c.id === courtId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao cần sửa' });
    }

    courts[index] = {
      ...courts[index],
      ...req.body,
      id: courtId
    };

    fs.writeFileSync(courtsFilePath, JSON.stringify(courts, null, 2), 'utf-8');
    res.json({ success: true, message: 'Cập nhật thông tin sân thành công!', data: courts[index] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật sân', error: err.message });
  }
});

// DELETE /api/courts/:id - Owner deletes a court
router.delete('/:id', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id, 10);
    let courts = getCourtsFromFile();
    const courtToDelete = courts.find(c => c.id === courtId);

    if (!courtToDelete) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao cần xóa' });
    }

    courts = courts.filter(c => c.id !== courtId);
    fs.writeFileSync(courtsFilePath, JSON.stringify(courts, null, 2), 'utf-8');
    res.json({ success: true, message: 'Đã xóa sân thể thao thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa sân', error: err.message });
  }
});

module.exports = router;
