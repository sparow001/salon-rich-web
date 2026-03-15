// frontend/js/admin.js
import { auth, db } from './firebase-config.js'; // 🚨 Storage eka ain kala
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, doc, updateDoc, query, orderBy, onSnapshot, getDocs, setDoc, getDoc, addDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// 🚨 Storage imports ain kala

// DOM Elements
const tableBody = document.getElementById('bookingsTableBody');
const filterDateInput = document.getElementById('filterDate');
const btnClearFilter = document.getElementById('btnClearFilter');
const adminNameDisplay = document.getElementById('adminNameDisplay');
const navLogout = document.getElementById('navLogout');

// Walk-in Elements
const walkInModal = document.getElementById('walkInModal');
const btnOpenWalkIn = document.getElementById('btnOpenWalkIn');
const btnCloseWalkIn = document.getElementById('btnCloseWalkIn');
const walkInForm = document.getElementById('walkInForm');

let usersDataMap = {}; 
let realtimeUnsubscribe = null;

const SERVICE_DURATIONS = {
    "Hair Styling": 40,
    "Beard Trimming": 20,
    "Hair Coloring": 90,
    "Facial Treatment": 60
};

// ==========================================
// 1. Auth & Initial Load
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        adminNameDisplay.innerText = `Hi, ${user.displayName || 'Admin'}`;
        await fetchAllUsers(); 
        listenToBookings();    
        loadBlockedDates();
        loadSiteMedia(); 
        loadGalleryImages(); 
    } else {
        window.location.replace('login.html');
    }
});

// ==========================================
// 2. Walk-in Logic 
// ==========================================
if(btnOpenWalkIn) btnOpenWalkIn.onclick = () => walkInModal.style.display = 'flex';
if(btnCloseWalkIn) btnCloseWalkIn.onclick = () => walkInModal.style.display = 'none';

if(walkInForm) {
    walkInForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const service = document.getElementById('walkInService').value;
        const duration = SERVICE_DURATIONS[service] || 30;

        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const startTimeStr = now.getHours().toString().padStart(2, '0') + ":" + 
                               now.getMinutes().toString().padStart(2, '0');

            const endTime = new Date(now.getTime() + duration * 60000);
            const endTimeStr = endTime.getHours().toString().padStart(2, '0') + ":" + 
                             endTime.getMinutes().toString().padStart(2, '0');

            await addDoc(collection(db, "bookings"), {
                userName: document.getElementById('walkInName').value + " (Walk-in)",
                userEmail: "cash-payment@salonrich.com",
                phone: document.getElementById('walkInPhone').value,
                service: service,
                date: dateStr,
                time: startTimeStr,
                endTime: endTimeStr, 
                duration: duration,
                status: 'Completed',
                paymentMethod: 'Cash',
                createdAt: new Date().toISOString()
            });

            alert(`Success! Slot blocked for ${duration} mins until ${endTimeStr}.`);
            walkInForm.reset();
            walkInModal.style.display = 'none';
        } catch (err) { alert(err.message); } finally {
            btn.innerText = "Save & Block Slots";
            btn.disabled = false;
        }
    };
}

// ==========================================
// 3. Appointments Table Logic
// ==========================================
async function fetchAllUsers() {
    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach(doc => {
            const data = doc.data();
            if(data.email) usersDataMap[data.email] = data;
        });
    } catch (e) { console.error(e); }
}

function listenToBookings(filterDateStr = null) {
    if (realtimeUnsubscribe) realtimeUnsubscribe(); 
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    
    realtimeUnsubscribe = onSnapshot(q, (snapshot) => {
        if(!tableBody) return;
        tableBody.innerHTML = ''; 
        snapshot.forEach((docSnap) => {
            const booking = docSnap.data();
            if (filterDateStr && booking.date !== filterDateStr) return;
            const phone = booking.phone || usersDataMap[booking.userEmail]?.phone || 'No Number';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${booking.userName}</strong><br><small>${booking.userEmail}</small><br><a href="tel:${phone}" class="action-btn" style="text-decoration: none; display: inline-block; margin-top: 5px;">📞 Call</a></td>
                <td style="color: var(--gold); font-weight: bold;">${booking.service}</td>
                <td>📅 ${booking.date}<br>⏰ ${booking.time}</td>
                <td><span class="status-badge status-${booking.status?.toLowerCase() || 'pending'}">${booking.status || 'Pending'}</span></td>
                <td>
                    ${booking.status === 'Pending' ? `<button class="action-btn" onclick="updateStatus('${docSnap.id}', 'Accepted')">Accept</button>` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
    });
}

window.updateStatus = async (id, status) => {
    if(confirm(`Change to ${status}?`)) await updateDoc(doc(db, "bookings", id), { status });
};

// ==========================================
// 4. Holiday Blocking
// ==========================================
async function loadBlockedDates() {
    const list = document.getElementById('blockedDatesList');
    if(!list) return;
    try {
        const docSnap = await getDoc(doc(db, "settings", "holidays"));
        list.innerHTML = docSnap.exists() && docSnap.data().blockedDates.length > 0 
            ? docSnap.data().blockedDates.map(d => `<li style="margin-bottom: 8px;">${d}</li>`).join('') 
            : '<li>No blocked dates.</li>';
    } catch (error) { console.error("Error loading holidays:", error); }
}

const btnBlockDate = document.getElementById('btnBlockDate');
if(btnBlockDate) {
    btnBlockDate.addEventListener('click', async () => {
        const dateInput = document.getElementById('holidayDateInput').value;
        if(!dateInput) return alert("Please select a date!");
        
        try {
            btnBlockDate.innerText = "Blocking...";
            const ref = doc(db, "settings", "holidays");
            const snap = await getDoc(ref);
            
            if(snap.exists()) {
                const dates = snap.data().blockedDates || [];
                if(!dates.includes(dateInput)) {
                    dates.push(dateInput);
                    await updateDoc(ref, { blockedDates: dates });
                }
            } else {
                await setDoc(ref, { blockedDates: [dateInput] });
            }
            alert(`Date ${dateInput} blocked successfully!`);
            loadBlockedDates();
        } catch(e) { alert("Error: " + e.message); } finally {
            btnBlockDate.innerText = "Block This Date";
        }
    });
}

// ==========================================
// 5. FIRESTORE ONLY MEDIA MANAGEMENT 🌟
// ==========================================

// 🚨 Aluth: Image Compressor & Base64 Converter Function 🚨
function compressAndConvertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max width/height eka 800px karala resize kireema
                const MAX_SIZE = 800;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Quality eka 0.7 karala Base64 widihata ganeema
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
        };
        reader.onerror = error => reject(error);
    });
}

async function uploadAndSaveMedia(inputId, dbDocId, dbField, btnElement, previewId, isArray = false, arrayIndex = 0) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Please select an image first!");
        return;
    }

    const originalText = btnElement.innerText;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btnElement.disabled = true;

    try {
        // 1. Image eka compress karala Base64 Text ekata harawima
        const base64String = await compressAndConvertImage(file);

        // 2. Base64 Text eka kelinma Firestore ekata save kireema
        const siteDocRef = doc(db, "site_settings", dbDocId);
        const siteDocSnap = await getDoc(siteDocRef);

        let updateData = {};
        if (isArray) {
            let currentArray = siteDocSnap.exists() && siteDocSnap.data()[dbField] ? siteDocSnap.data()[dbField] : [];
            currentArray[arrayIndex] = base64String; 
            updateData[dbField] = currentArray;
        } else {
            updateData[dbField] = base64String;
        }

        if (siteDocSnap.exists()) {
            await updateDoc(siteDocRef, updateData);
        } else {
            await setDoc(siteDocRef, updateData);
        }

        // 3. Update UI Preview
        document.getElementById(previewId).innerHTML = `<img src="${base64String}">`;
        fileInput.value = ""; 
        alert("Media updated successfully via Firestore!");

    } catch (error) {
        console.error("Upload Error:", error);
        alert("Failed to upload: " + error.message);
    } finally {
        btnElement.innerText = originalText;
        btnElement.disabled = false;
    }
}

// --- Load Previews on Startup ---
async function loadSiteMedia() {
    try {
        const homeSnap = await getDoc(doc(db, "site_settings", "home_page"));
        if (homeSnap.exists()) {
            const data = homeSnap.data();
            if(data.logoUrl) document.getElementById('logoPreview').innerHTML = `<img src="${data.logoUrl}">`;
            if(data.heroSlides) {
                for(let i=0; i<5; i++) {
                    if(data.heroSlides[i]) {
                        const previewEl = document.getElementById(`slide${i+1}Preview`);
                        if(previewEl) previewEl.innerHTML = `<img src="${data.heroSlides[i]}">`;
                    }
                }
            }
        }
        
        const pagesSnap = await getDoc(doc(db, "site_settings", "other_pages"));
        if (pagesSnap.exists()) {
            const pData = pagesSnap.data();
            if(pData.aboutImg) document.getElementById('aboutPreview').innerHTML = `<img src="${pData.aboutImg}">`;
            if(pData.contactImg) document.getElementById('contactPreview').innerHTML = `<img src="${pData.contactImg}">`;
            if(pData.servicesImg) document.getElementById('servicesPreview').innerHTML = `<img src="${pData.servicesImg}">`;
        }
    } catch (e) { console.error("Error loading media:", e); }
}

// --- Attach Listeners to Buttons ---
document.getElementById('btnUpdateLogo')?.addEventListener('click', function() { uploadAndSaveMedia('logoInput', 'home_page', 'logoUrl', this, 'logoPreview'); });
document.getElementById('btnUpdateSlide1')?.addEventListener('click', function() { uploadAndSaveMedia('slide1Input', 'home_page', 'heroSlides', this, 'slide1Preview', true, 0); });
document.getElementById('btnUpdateSlide2')?.addEventListener('click', function() { uploadAndSaveMedia('slide2Input', 'home_page', 'heroSlides', this, 'slide2Preview', true, 1); });
document.getElementById('btnUpdateSlide3')?.addEventListener('click', function() { uploadAndSaveMedia('slide3Input', 'home_page', 'heroSlides', this, 'slide3Preview', true, 2); });
document.getElementById('btnUpdateSlide4')?.addEventListener('click', function() { uploadAndSaveMedia('slide4Input', 'home_page', 'heroSlides', this, 'slide4Preview', true, 3); });
document.getElementById('btnUpdateSlide5')?.addEventListener('click', function() { uploadAndSaveMedia('slide5Input', 'home_page', 'heroSlides', this, 'slide5Preview', true, 4); });

document.getElementById('btnUpdateAbout')?.addEventListener('click', function() { uploadAndSaveMedia('aboutInput', 'other_pages', 'aboutImg', this, 'aboutPreview'); });
document.getElementById('btnUpdateContact')?.addEventListener('click', function() { uploadAndSaveMedia('contactInput', 'other_pages', 'contactImg', this, 'contactPreview'); });
document.getElementById('btnUpdateServices')?.addEventListener('click', function() { uploadAndSaveMedia('servicesInput', 'other_pages', 'servicesImg', this, 'servicesPreview'); });


// ==========================================
// 6. GALLERY MANAGEMENT (ALBUMS - FIRESTORE ONLY) 🌟
// ==========================================
const btnUploadGallery = document.getElementById('btnUploadGallery');

if(btnUploadGallery) {
    btnUploadGallery.addEventListener('click', async () => {
        const fileInput = document.getElementById('galleryImageInput');
        const file = fileInput.files[0];
        const albumName = document.getElementById('galleryAlbumSelect').value;
        const statusText = document.getElementById('galleryUploadStatus');

        if (!file) return alert("Please select a photo for the gallery.");

        btnUploadGallery.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        btnUploadGallery.disabled = true;
        statusText.innerText = "Please wait, compressing & saving to " + albumName + "...";
        statusText.style.color = "#FF9800";

        try {
            // Compress & Convert
            const base64String = await compressAndConvertImage(file);

            // Save directly to Firestore Gallery collection
            await addDoc(collection(db, "gallery"), {
                imageUrl: base64String,
                album: albumName,
                createdAt: serverTimestamp()
            });

            statusText.innerText = "Successfully added to " + albumName + "!";
            statusText.style.color = "#4CAF50";
            fileInput.value = ""; 
            
            loadGalleryImages();

        } catch (error) {
            console.error("Gallery Upload Error:", error);
            statusText.innerText = "Upload failed! " + error.message;
            statusText.style.color = "#F44336";
        } finally {
            btnUploadGallery.innerText = "Add to Gallery";
            btnUploadGallery.disabled = false;
            setTimeout(() => { statusText.innerText = ""; }, 3000);
        }
    });
}

// --- Load and Display Gallery Images ---
async function loadGalleryImages() {
    const grid = document.getElementById('galleryGrid');
    if(!grid) return;

    try {
        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            grid.innerHTML = '<p style="color: var(--text-gray); grid-column: 1/-1; text-align: center;">No images in gallery yet.</p>';
            return;
        }

        grid.innerHTML = ""; 
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const url = data.imageUrl || data.url; 
            if(!url) return;

            const card = document.createElement('div');
            card.className = "gallery-card";
            card.innerHTML = `
                <span class="album-badge">${data.album || "General"}</span>
                <img src="${url}" alt="Gallery Image">
                <button class="btn-primary btn-danger" onclick="deleteGalleryImage('${docSnap.id}')" style="width:100%; padding: 8px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
            grid.appendChild(card);
        });
    } catch (e) { console.error("Error loading gallery:", e); }
}

// --- Delete Gallery Image ---
window.deleteGalleryImage = async (docId) => {
    if(!confirm("Are you sure you want to delete this photo from the gallery?")) return;
    try {
        await deleteDoc(doc(db, "gallery", docId));
        alert("Photo deleted successfully!");
        loadGalleryImages(); 
    } catch (error) {
        alert("Failed to delete: " + error.message);
    }
}

// ==========================================
// 7. Global Logout
// ==========================================
navLogout?.addEventListener('click', async () => { 
    if(confirm("Are you sure you want to log out?")) { 
        await signOut(auth); 
        window.location.replace('../index.html'); 
    } 
});