const express = require('express');
const router = express.Router();

// In-memory store for demonstration / testing
let bookings = [
  {
    id: 'BK-101',
    courtName: 'The Yard Padel Club Thảo Điền',
    customerName: 'Nguyễn Văn Minh',
    phone: '0901234567',
    date: '2026-11-05',
    timeSlot: '18:00 - 19:00',
    totalPrice: 280000,
    status: 'Đã xác nhận',
    createdAt: new Date().toISOString()
  }
];

let partnerRequests = [];

// GET /api/bookings
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: bookings
  });
});

// POST /api/bookings - Create booking
router.post('/', (req, res) => {
  const { courtId, courtName, customerName, phone, date, timeSlot, totalPrice } = req.body;

  if (!customerName || !phone || !date || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp đầy đủ thông tin: Tên, SĐT, Ngày và Khung giờ chơi.'
    });
  }

  const newBooking = {
    id: `BK-${Date.now().toString().slice(-4)}`,
    courtId,
    courtName: courtName || 'Sân thể thao',
    customerName,
    phone,
    date,
    timeSlot,
    totalPrice: totalPrice || 200000,
    status: 'Đã xác nhận',
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);

  res.status(201).json({
    success: true,
    message: 'Đặt sân thành công! Nhân viên sẽ liên hệ xác nhận trong ít phút.',
    data: newBooking
  });
});

// POST /api/partners - Partner application
router.post('/partner', (req, res) => {
  const { facilityName, ownerName, phone, address, courtCount } = req.body;
  if (!facilityName || !ownerName || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đủ tên cụm sân, người đại diện và số điện thoại!'
    });
  }

  const newRequest = {
    id: `PTR-${Date.now()}`,
    facilityName,
    ownerName,
    phone,
    address,
    courtCount: courtCount || 1,
    createdAt: new Date().toISOString()
  };

  partnerRequests.push(newRequest);

  res.status(201).json({
    success: true,
    message: 'Gửi yêu cầu hợp tác thành công! Đội ngũ SportsBooking sẽ liên hệ hỗ trợ bạn sớm nhất.',
    data: newRequest
  });
});

module.exports = router;

