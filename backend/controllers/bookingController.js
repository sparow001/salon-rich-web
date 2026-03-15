// backend/controllers/bookingController.js

const { db } = require('../config/firebase-admin');

// අලුත් Booking එකක් දාන Function එක
const createBooking = async (req, res) => {
    try {
        // Frontend එකෙන් එවන දත්ත ටික අල්ලගැනීම
        const { userName, userEmail, service, date, time } = req.body;

        // දත්ත ඔක්කොම තියෙනවද කියලා බලනවා
        if (!userName || !userEmail || !service || !date || !time) {
            return res.status(400).json({ error: "කරුණාකර සියලුම විස්තර ඇතුළත් කරන්න." });
        }

        // Database එකට සේව් කරන්න ඕනේ විදිහට පැකේජ් කිරීම
        const newBooking = {
            userName,
            userEmail,
            service,
            date,
            time,
            status: "Pending", // මූලික තත්ත්වය Pending ලෙස තබමු
            createdAt: new Date().toISOString()
        };

        // Firestore Database එකේ 'bookings' කියන Collection එකට සේව් කිරීම
        const docRef = await db.collection('bookings').add(newBooking);

        // සාර්ථක වුණාම Frontend එකට පණිවිඩයක් යැවීම
        res.status(201).json({ 
            message: "ඔබගේ Booking එක සාර්ථකයි!", 
            bookingId: docRef.id 
        });

    } catch (error) {
        console.error("Booking Error:", error);
        res.status(500).json({ error: "සර්වර් එකේ දෝෂයක්. කරුණාකර නැවත උත්සාහ කරන්න." });
    }
};

module.exports = { createBooking };