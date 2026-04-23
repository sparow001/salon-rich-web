// backend/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// 👇 ඔන්න අපි අලුතින් හදපු පාර (Route) මෙතනින් සර්වර් එකට සම්බන්ධ කරනවා
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// සර්වර් එක වැඩද කියලා බලන මූලික පාර
app.get('/', (req, res) => {
    res.send('🚀 Salon Rich Backend Server is Running Properly!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Salon Rich Server is LIVE on port ${PORT}`);
});