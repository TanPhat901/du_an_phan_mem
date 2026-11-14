require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { checkDbConnection, isDbConnected } = require('./config/db');
const courtRoutes = require('./routes/courtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const ownerCourtRoutes = require('./routes/ownerCourtRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/owner', ownerCourtRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SportsBooking Backend API is running smoothly!',
    database: {
      type: 'PostgreSQL',
      connected: isDbConnected(),
      host: process.env.DB_HOST || 'localhost',
      dbName: process.env.DB_NAME || 'sportsbooking_db'
    }
  });
});

// Start Server and check PostgreSQL (Standalone Mode)
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🚀 SportsBooking Server is running on http://localhost:${PORT}`);
    await checkDbConnection();
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
