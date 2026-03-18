// frontend/js/booking_time.js

import { auth, db } from './firebase-config.js';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const bookingForm = document.getElementById('bookingForm');
const selectedServiceInput = document.getElementById('selectedService');
const modalTitle = document.getElementById('modalTitle');
const timeSlotsContainer = document.getElementById('timeSlotsContainer');
const btnConfirmBooking = document.getElementById('btnConfirmBooking');
const dateSlider = document.getElementById('dateSlider');
const btnOpenCalendar = document.getElementById('btnOpenCalendar');
const pills = document.querySelectorAll('.pill');

let selectedDateDB = null; 
let selectedDateUI = null; 
let selectedTimeSlot = null;
let realtimeListener = null;
let blockedHolidays = []; 

// 🌟 URL එකෙන් Service නම ලබා ගැනීම
const urlParams = new URLSearchParams(window.location.search);
const serviceFromURL = urlParams.get('service') || 'General Booking';
if(modalTitle) modalTitle.innerText = `Book: ${serviceFromURL}`;
if(selectedServiceInput) selectedServiceInput.value = serviceFromURL;

// 🌟 User ලොග් වෙලාදැයි පරීක්ෂා කිරීම (Page Load එකේදීම)
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // ලොග් වෙලා නැත්නම් ආපහු Login එකට යවනවා (අලුත් ෆයිල් නම සමඟ)
        window.location.replace(`login.html?redirect=booking_time.html?service=${encodeURIComponent(serviceFromURL)}`);
    } else {
        // ලොග් වෙලා නම් Booking ලොජික් එක පටන් ගන්නවා
        await fetchHolidays(); 
        renderDateSlider();
        handleDateSelection(new Date()); 
        setActivePill('pillToday');
    }
});

async function fetchHolidays() {
    try {
        const docRef = doc(db, "settings", "holidays");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().blockedDates) {
            blockedHolidays = docSnap.data().blockedDates;
        }
        if(window.fp) {
             window.fp.set("disable", [ function(date) { return blockedHolidays.includes(formatDateForDB(date)); } ]);
        }
    } catch (error) { console.error("Error fetching holidays:", error); }
}

window.fp = flatpickr("#hiddenFlatpickr", {
    dateFormat: "Y-m-d",
    minDate: "today",
    disableMobile: true,
    onChange: function(selectedDates) {
        if(selectedDates.length > 0) handleDateSelection(selectedDates[0]);
    }
});

btnOpenCalendar?.addEventListener('click', () => window.fp.open());

function renderDateSlider() {
    if(!dateSlider) return;
    dateSlider.innerHTML = '';
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); 
        const dateNum = d.getDate(); 
        const dateDB = formatDateForDB(d); 
        const isHoliday = blockedHolidays.includes(dateDB); 

        const card = document.createElement('div');
        card.classList.add('date-card');
        card.setAttribute('data-date', dateDB);
        
        if(isHoliday) {
            card.innerHTML = `<span class="day">${dayName}</span><span class="date" style="color: #555;">${dateNum}</span><span style="font-size: 8px; color: #f44336; margin-top:2px; font-weight:bold;">CLOSED</span>`;
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
            card.title = "Salon is closed on this date";
        } else {
            card.innerHTML = `<span class="day">${dayName}</span><span class="date">${dateNum}</span>`;
            card.addEventListener('click', () => handleDateSelection(d));
        }
        dateSlider.appendChild(card);
    }
}

function handleDateSelection(dateObj) {
    selectedDateDB = formatDateForDB(dateObj);       
    
    if (blockedHolidays.includes(selectedDateDB)) {
        timeSlotsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 25px; background: rgba(255, 170, 0, 0.1); border: 1px dashed #ffaa00; border-radius: 8px;">
                <h3 style="color: #ffaa00; margin: 0 0 10px 0;">⛔ Salon is Closed</h3>
                <p style="color: var(--text-muted); font-size: 13px; margin: 0;">Please select another date.</p>
            </div>
        `;
        selectedTimeSlot = null;
        btnConfirmBooking.disabled = true;
        btnConfirmBooking.innerText = `Select a Time Slot`;
        return;
    }

    selectedDateUI = formatDateForUI(dateObj);       

    document.querySelectorAll('.date-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-date') === selectedDateDB);
    });

    pills.forEach(p => p.classList.remove('active'));
    
    selectedTimeSlot = null;
    btnConfirmBooking.disabled = true;
    btnConfirmBooking.innerText = `Select Time for ${selectedDateUI}`;

    loadTimeSlots(selectedDateDB);
}

document.getElementById('pillToday')?.addEventListener('click', () => { handleDateSelection(new Date()); setActivePill('pillToday'); });
document.getElementById('pillTomorrow')?.addEventListener('click', () => { const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); handleDateSelection(tmr); setActivePill('pillTomorrow'); });
document.getElementById('pillWeekend')?.addEventListener('click', () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7); handleDateSelection(d); setActivePill('pillWeekend'); });

function setActivePill(id) {
    pills.forEach(p => p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
}

function formatDateForDB(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDateForUI(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }

function generateAllSlots() {
    const slots = [];
    for (let h = 9; h < 20; h++) { 
        for (let m = 0; m < 60; m += 10) {
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`); 
        }
    }
    return slots;
}

function loadTimeSlots(dbDateStr) {
    timeSlotsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; grid-column: 1 / -1; text-align: center;">Checking availability...</p>';

    if (realtimeListener) realtimeListener();

    const q = query(collection(db, "bookings"), where("date", "==", dbDateStr));
    
    realtimeListener = onSnapshot(q, (snapshot) => {
        const bookingsList = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.status !== "Cancelled") bookingsList.push(data);
        });
        
        renderSlotsUI(dbDateStr, bookingsList);
    });
}

function renderSlotsUI(selectedDateStr, bookedData) {
    timeSlotsContainer.innerHTML = ''; 
    const allSlots = generateAllSlots();
    
    const now = new Date();
    const currentDateStr = formatDateForDB(now);
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

    allSlots.forEach(slot => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('slot');

        const isPast = (selectedDateStr === currentDateStr && slot < currentTimeStr);
        
        const isBooked = bookedData.some(b => {
            const startTime = b.time;
            const endTime = b.endTime || b.time; 
            return (slot >= startTime && slot < endTime);
        });

        if (isPast) {
            slotDiv.classList.add('past');
            slotDiv.innerText = slot;
        } else if (isBooked) {
            slotDiv.classList.add('booked');
            slotDiv.innerHTML = `🔒 ${slot}`; 
            slotDiv.title = "Already booked";
        } else {
            slotDiv.classList.add('available');
            slotDiv.innerText = slot;
            
            slotDiv.addEventListener('click', () => {
                document.querySelectorAll('.slot.selected').forEach(el => { el.classList.remove('selected'); });
                slotDiv.classList.add('selected');
                selectedTimeSlot = slot;
                
                btnConfirmBooking.disabled = false;
                btnConfirmBooking.innerText = `Confirm Booking at ${slot}`;
            });
        }
        timeSlotsContainer.appendChild(slotDiv);
    });
}

// ==========================================
// 3. SUBMIT BOOKING
// ==========================================
bookingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedTimeSlot) return alert("Please select an available time slot!");

    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        btnConfirmBooking.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
        btnConfirmBooking.disabled = true;

        const qCheck = query(collection(db, "bookings"), where("date", "==", selectedDateDB), where("time", "==", selectedTimeSlot));
        const slotSnap = await getDocs(qCheck);
        
        let isSlotTaken = false;
        slotSnap.forEach(doc => {
            if(doc.data().status !== "Cancelled") isSlotTaken = true;
        });

        if (isSlotTaken) {
            alert("Sorry! Someone just booked this slot. Please choose another one.");
            btnConfirmBooking.innerText = `Confirm Booking at ${selectedTimeSlot}`;
            btnConfirmBooking.disabled = false;
            return;
        }

        const bookingData = {
            userName: user.displayName || "Customer",
            userEmail: user.email,
            service: selectedServiceInput.value,
            date: selectedDateDB,       
            displayDate: selectedDateUI, 
            time: selectedTimeSlot,
            status: "Confirmed",
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "bookings"), bookingData); 
        
        alert("🎉 Booking Confirmed Successfully!"); 
        window.location.href = 'my_bookings.html'; // Booking එක ඉවර වුණාම My Bookings වලට යවමු

    } catch (error) {
        alert("Error: " + error.message);
        btnConfirmBooking.innerText = `Confirm Booking at ${selectedTimeSlot}`;
        btnConfirmBooking.disabled = false;
    }
});