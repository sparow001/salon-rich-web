// backend/routes/bookingRoutes.js

const express = require('express');
const router = express.Router();
const { createBooking } = require('../controllers/bookingController');

// කවුරුහරි POST රික්වෙස්ට් එකක් '/api/bookings/' කියන තැනට එව්වොත්, ඒක createBooking එකට යවනවා
router.post('/', createBooking);

module.exports = router;