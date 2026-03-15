// frontend/js/api.js

// අපේ Node.js සර්වර් එක දුවන ලිපිනය (Localhost:5000)
const BASE_URL = 'http://localhost:5000/api';

/**
 * අලුත් Booking එකක් Backend එකට යවන ප්‍රධාන Function එක
 * @param {Object} bookingData - පාරිභෝගිකයාගේ විස්තර (නම, වෙලාව, සේවාව)
 */
export const createBookingAPI = async (bookingData) => {
    try {
        // Backend එකේ '/bookings' පාරට දත්ත යැවීම
        const response = await fetch(`${BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData) // JavaScript Object එකක් JSON බවට පත් කර යැවීම
        });

        // Backend එකෙන් එන පිළිතුර ලබා ගැනීම
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Booking එක සම්පූර්ණ කිරීමට නොහැකි විය.');
        }

        return data; // සාර්ථක වුණොත් Backend එකෙන් එන පණිවිඩය ආපසු යවනවා

    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};