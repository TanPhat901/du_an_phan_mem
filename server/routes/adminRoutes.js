const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const {
  getAdminOverview,
  getAdminCourts,
  updateAdminCourtStatus,
  getAdminUsers,
  createAdminUser,
  updateAdminUserStatus,
  updateAdminUserRole,
  getAdminSportTypes,
  createAdminSportType,
  updateAdminSportType,
  deleteAdminSportType,
  getAdminBookings,
  updateAdminBookingStatus,
  getAdminReviews,
  deleteAdminReview
} = require('../controllers/adminController');

const router = express.Router();

// Toàn bộ API /api/admin đều yêu cầu JWT hợp lệ & tài khoản ADMIN còn hoạt động
router.use(authMiddleware, adminMiddleware);

router.get('/overview', getAdminOverview);

router.get('/courts', getAdminCourts);
router.patch('/courts/:courtId/status', updateAdminCourtStatus);

router.get('/users', getAdminUsers);
router.post('/users', createAdminUser);
router.patch('/users/:userId/status', updateAdminUserStatus);
router.patch('/users/:userId/role', updateAdminUserRole);

router.get('/sport-types', getAdminSportTypes);
router.post('/sport-types', createAdminSportType);
router.put('/sport-types/:sportTypeId', updateAdminSportType);
router.delete('/sport-types/:sportTypeId', deleteAdminSportType);

router.get('/bookings', getAdminBookings);
router.patch('/bookings/:bookingId/status', updateAdminBookingStatus);

router.get('/reviews', getAdminReviews);
router.delete('/reviews/:reviewId', deleteAdminReview);

module.exports = router;

