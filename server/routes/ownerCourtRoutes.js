const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMyCourts,
  createSubCourt,
  updateSubCourt
} = require('../controllers/ownerCourtController');

const router = express.Router();

router.get('/courts', authMiddleware, getMyCourts);
router.post('/courts', authMiddleware, createSubCourt);
router.put('/courts/:subCourtId', authMiddleware, updateSubCourt);

module.exports = router;
