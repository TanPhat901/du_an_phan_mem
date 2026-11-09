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
  deleteSubCourt
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

module.exports = router;
