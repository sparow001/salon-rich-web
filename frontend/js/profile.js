// frontend/js/profile.js

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// DOM Elements
const userNameEl = document.getElementById('userName');
const userEmailEl = document.getElementById('userEmail');
const userPhotoEl = document.getElementById('userPhoto');
const bookingsListEl = document.getElementById('bookingsList');
const totalBookingsEl = document.getElementById('totalBookings');
const navLogout = document.getElementById('navLogout');

// Contact Info Elements
const displayMode = document.getElementById('displayMode');
const editForm = document.getElementById('editForm');
const displayPhone = document.getElementById('displayPhone');
const inputPhone = document.getElementById('inputPhone');
const btnEdit = document.getElementById('btnEdit');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const toastMessage = document.getElementById('toastMessage');

let currentUserDocRef = null;

// 1. පාරිභෝගිකයා ලොග් වෙලාද පරික්ෂා කිරීම
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Basic Info UI එකට දැමීම
        userNameEl.innerText = user.displayName || "Customer";
        userEmailEl.innerText = user.email;
        if (user.photoURL) userPhotoEl.src = user.photoURL;

        currentUserDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(currentUserDocRef);

        // Firestore එකෙන් Phone number එක ගැනීම
        if (userDoc.exists()) {
            const phoneVal = userDoc.data().phone;
            if (phoneVal) {
                displayPhone.innerText = phoneVal;
                inputPhone.value = phoneVal;
            }
        } else {
            // අලුත් කෙනෙක් නම් Database එකට ඇතුළත් කිරීම
            await setDoc(currentUserDocRef, {
                uid: user.uid,
                name: user.displayName || "Customer",
                email: user.email,
                photoURL: user.photoURL || "",
                phone: "",
                role: "customer",
                createdAt: new Date()
            });
        }

        // Bookings ගෙන ඒම
        await fetchUserBookings(user.email);
    } else {
        alert("කරුණාකර පළමුව Login වන්න!");
        window.location.replace('login.html');
    }
});

// 2. Edit Mode Logic (UI Toggle)
btnEdit.addEventListener('click', () => {
    displayMode.style.display = 'none';
    editForm.style.display = 'block';
    btnEdit.style.display = 'none';
});

btnCancelEdit.addEventListener('click', () => {
    editForm.style.display = 'none';
    displayMode.style.display = 'flex';
    btnEdit.style.display = 'block';
});

// 3. Update Phone Number (Save Logic)
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserDocRef) return;

    try {
        const newPhone = inputPhone.value;
        await updateDoc(currentUserDocRef, { phone: newPhone });
        
        displayPhone.innerText = newPhone; // UI එක අප්ඩේට් කිරීම
        
        // ආයෙත් Display Mode එකට යාම
        editForm.style.display = 'none';
        displayMode.style.display = 'flex';
        btnEdit.style.display = 'block';

        showToast("Phone number updated successfully!");
    } catch (error) {
        console.error("Update Error:", error);
        alert("Failed to update profile details.");
    }
});

// 4. Bookings ගෙනෙන Function එක (Cancel බොත්තම සමග)
async function fetchUserBookings(email) {
    try {
        const q = query(collection(db, "bookings"), where("userEmail", "==", email));
        const querySnapshot = await getDocs(q);

        bookingsListEl.innerHTML = ''; 
        let totalCount = 0;

        if (querySnapshot.empty) {
            bookingsListEl.innerHTML = '<p style="text-align: center; color: var(--text-gray);">ඔබට දැනට කිසිදු Appointment එකක් නොමැත.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            totalCount++;
            const booking = docSnap.data();
            const bookingId = docSnap.id; // Document ID එක Cancel කරන්න අවශ්‍යයි
            const status = booking.status || 'Pending';
            
            // Status එකට අනුව පාට සහ පෙනුම වෙනස් කිරීම
            let statusClass = 'status-pending';
            if (status.toLowerCase() === 'accepted') statusClass = 'status-accepted';
            if (status.toLowerCase() === 'cancelled') statusClass = 'status-cancelled';

            // Cancel බොත්තම පෙන්වන්නේ Pending ඒවට විතරයි
            const cancelButtonHTML = status.toLowerCase() === 'pending' 
                ? `<button class="btn-cancel" onclick="cancelBooking('${bookingId}')">Cancel</button>` 
                : '';

            const bookingHTML = `
                <div class="booking-card" id="card-${bookingId}">
                    <div>
                        <h4 style="margin: 0 0 5px 0; color: var(--gold);">${booking.service || 'Salon Service'}</h4>
                        <p style="margin: 0; color: var(--text-gray); font-size: 14px;">
                            📅 ${booking.date} | ⏰ ${booking.time}
                        </p>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <span class="status-badge ${statusClass}">${status}</span>
                        ${cancelButtonHTML}
                    </div>
                </div>
            `;
            bookingsListEl.innerHTML += bookingHTML;
        });

        totalBookingsEl.innerText = totalCount; // Total Appointments ගණන Update කිරීම

    } catch (error) {
        console.error("Bookings ගැනීමේදී දෝෂයක්:", error);
        bookingsListEl.innerHTML = '<p style="color: red; text-align: center;">දත්ත ලබාගැනීමේදී දෝෂයක් මතු විය.</p>';
    }
}

// 5. Booking එක Cancel කරන Function එක (Global Scope එකට දානවා HTML onclick එකට වැඩ කරන්න)
window.cancelBooking = async function(bookingId) {
    const confirmCancel = confirm("Are you sure you want to cancel this appointment?");
    if (!confirmCancel) return;

    try {
        const bookingRef = doc(db, "bookings", bookingId);
        // Status එක Cancelled කියලා Update කරනවා
        await updateDoc(bookingRef, { status: "Cancelled" });
        
        showToast("Appointment Cancelled!");
        
        // දත්ත අලුත් කරලා පෙන්වනවා
        const user = auth.currentUser;
        if(user) fetchUserBookings(user.email);
        
    } catch (error) {
        console.error("Cancel Error:", error);
        alert("Could not cancel the appointment.");
    }
};

// 6. Toast Notification පෙන්වන Function එක
function showToast(message) {
    toastMessage.innerText = message;
    toastMessage.classList.add('show');
    setTimeout(() => {
        toastMessage.classList.remove('show');
    }, 3000);
}

// 7. Logout බොත්තම
if (navLogout) {
    navLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = '../index.html'; 
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}