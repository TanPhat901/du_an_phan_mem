const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const courtsFilePath = path.join(__dirname, '../data/courts.json');

const getCourtsData = () => {
  const data = fs.readFileSync(courtsFilePath, 'utf-8');
  return JSON.parse(data);
};

// GET /api/courts - Search & filter courts
router.get('/', (req, res) => {
  try {
    let courts = getCourtsData();
    const { keyword, city, category, minPrice, maxPrice, featured } = req.query;

    if (featured === 'true') {
      courts = courts.filter(c => c.featured);
    }

    if (keyword) {
      const kw = keyword.toLowerCase().trim();
      courts = courts.filter(c => 
        c.name.toLowerCase().includes(kw) || 
        c.category.toLowerCase().includes(kw) ||
        c.sportType.toLowerCase().includes(kw) ||
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
      total: courts.length,
      data: courts
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu sân', error: err.message });
  }
});

// GET /api/courts/:id - Get court detail
router.get('/:id', (req, res) => {
  try {
    const courts = getCourtsData();
    const court = courts.find(c => c.id === parseInt(req.params.id, 10));
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân thể thao' });
    }
    res.json({ success: true, data: court });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: err.message });
  }
});

module.exports = router;

