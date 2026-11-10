const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
} = require('../controllers/profileController');

router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, updateMyProfile);
router.put('/password', authMiddleware, changeMyPassword);

module.exports = router;
