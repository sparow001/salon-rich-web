// frontend/js/booking.js

import { auth, db } from './firebase-config.js';
import { createBookingAPI } from './api.js';
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const modal = document.getElementById('bookingModal');
const closeBtn = document.getElementById('closeModal');
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

// 🌟 Shimmer Animation Style (Loading Effect)
const style = document.createElement('style');
style.innerHTML = `
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } } 
    .skeleton-slot { height: 35px; border-radius: 5px; background: #333; animation: pulse 1.5s infinite; }
    
    .btn-spinner {
        display: inline-block; width: 16px; height: 16px; border: 3px solid rgba(255,255,255,0.3);
        border-radius: 50%; border-top-color: #fff; animation: spin 1s ease-in-out infinite; margin-right: 8px; vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;
document.head.appendChild(style);

// ==========================================
// 1. SMART DATE SELECTION LOGIC
// ==========================================

async function fetchHolidays() {
    try {
        const docRef = doc(db, "settings", "holidays");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().blockedDates) {
            blockedHolidays = docSnap.data().blockedDates;
        }
        fp.set("disable", [ function(date) { return blockedHolidays.includes(formatDateForDB(date)); } ]);
    } catch (error) { console.error("Error fetching holidays:", error); }
}

// 🚨 FIX: positionElement ඉවත් කර ඇත (Calendar දැන් මැදින් ඕපන් වේ)
let fp = flatpickr("#hiddenFlatpickr", {
    dateFormat: "Y-m-d",
    minDate: "today",
    disableMobile: true,
    onChange: function(selectedDates) {
        if(selectedDates.length > 0) handleDateSelection(selectedDates[0]);
    }
});

btnOpenCalendar.addEventListener('click', () => fp.open());

function renderDateSlider() {
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
                <p style="color: var(--text-gray); font-size: 13px; margin: 0;">Please select another date for your appointment.</p>
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

document.getElementById('pillToday').addEventListener('click', () => { handleDateSelection(new Date()); setActivePill('pillToday'); });
document.getElementById('pillTomorrow').addEventListener('click', () => { const tmr = new Date(); tmr.setDate(tmr.getDate() + 1); handleDateSelection(tmr); setActivePill('pillTomorrow'); });
document.getElementById('pillWeekend').addEventListener('click', () => { const d = new Date(); d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7); handleDateSelection(d); setActivePill('pillWeekend'); });

function setActivePill(id) {
    pills.forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function formatDateForDB(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDateForUI(d) { return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }


// ==========================================
// 2. MODAL & PRE-LOGIN CHECK LOGIC
// ==========================================

document.addEventListener('click', async (e) => {
    const bookBtn = e.target.closest('.service-card .btn-primary');
    
    if (bookBtn) {
        e.preventDefault(); 
        
        // 🚨 PRE-LOGIN CHECK: ලොග් වෙලාද නැද්ද බලනවා (බොත්තම එබූ සැණින්)
        const user = auth.currentUser;
        if (!user) {
            // ලොග් වී නොමැති නම් කෙළින්ම Login Page එකට යවයි
            window.location.href = 'pages/login.html';
            return;
        }

        // ලොග් වී ඇත්නම් පමණක් Modal එක පෙන්වයි
        const card = bookBtn.closest('.service-card');
        const serviceName = card.querySelector('h3').innerText;
        
        selectedServiceInput.value = serviceName;
        modalTitle.innerText = `Book: ${serviceName}`;
        
        await fetchHolidays(); 
        renderDateSlider();
        handleDateSelection(new Date()); 
        setActivePill('pillToday');

        modal.style.display = 'flex'; 
    }
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if(realtimeListener) realtimeListener(); 
});

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
    timeSlotsContainer.innerHTML = '';
    for(let i=0; i<15; i++) {
        timeSlotsContainer.innerHTML += `<div class="skeleton-slot"></div>`;
    }

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

    const bookedCount = bookedData.length;
    if ((bookedCount / allSlots.length) * 100 >= 50 && selectedDateStr >= currentDateStr) {
        timeSlotsContainer.innerHTML += `<div style="grid-column: 1 / -1; margin-bottom: 10px; text-align: center;"><span style="background: rgba(244, 67, 54, 0.1); color: #f44336; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; border: 1px solid #f44336;">🔥 Filling Fast: High Demand Today!</span></div>`;
    }

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
                document.querySelectorAll('.slot.selected').forEach(el => {
                    el.classList.remove('selected');
                    el.style.background = ""; 
                    el.style.color = "";
                });
                
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
// 3. SUBMIT BOOKING (With Double-Booking Prevention & Spinner)
// ==========================================
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedTimeSlot) return alert("Please select an available time slot!");

    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'pages/login.html';
        return;
    }

    try {
        btnConfirmBooking.innerHTML = `<span class="btn-spinner"></span> Processing...`;
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
            time: selectedTimeSlot 
        };

        const result = await createBookingAPI(bookingData); 
        
        alert("🎉 " + result.message); 
        modal.style.display = 'none';

    } catch (error) {
        alert("Error: " + error.message);
        btnConfirmBooking.innerText = `Confirm Booking at ${selectedTimeSlot}`;
        btnConfirmBooking.disabled = false;
    }
});