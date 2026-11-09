const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getSportTypes,
  getMyFacilities,
  createFacility,
  updateFacilitySettings,
  getMyCourts,
  createSubCourt,
  updateSubCourt,
  deleteSubCourt,
  getOwnerBookings,
  getOwnerSchedule,
  createWalkInBooking,
  updateOwnerBookingStatus,
  getOwnerBlocks,
  createOwnerBlock,
  deleteOwnerBlock,
  getOwnerAnalytics
} = require('../controllers/ownerCourtController');

const router = express.Router();

router.get('/sport-types', authMiddleware, getSportTypes);
router.get('/facilities', authMiddleware, getMyFacilities);
router.post('/facilities', authMiddleware, createFacility);
router.put('/facilities/:courtId', authMiddleware, updateFacilitySettings);

router.get('/courts', authMiddleware, getMyCourts);
router.post('/courts', authMiddleware, createSubCourt);
router.put('/courts/:subCourtId', authMiddleware, updateSubCourt);
router.delete('/courts/:subCourtId', authMiddleware, deleteSubCourt);

router.get('/bookings', authMiddleware, getOwnerBookings);
router.post('/bookings/walk-in', authMiddleware, createWalkInBooking);
router.patch('/bookings/:bookingId/status', authMiddleware, updateOwnerBookingStatus);

router.get('/schedule', authMiddleware, getOwnerSchedule);
router.get('/blocks', authMiddleware, getOwnerBlocks);
router.post('/blocks', authMiddleware, createOwnerBlock);
router.delete('/blocks/:blockId', authMiddleware, deleteOwnerBlock);

router.get('/analytics', authMiddleware, getOwnerAnalytics);

module.exports = router;
