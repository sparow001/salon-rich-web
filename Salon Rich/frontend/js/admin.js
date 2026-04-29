// frontend/js/admin.js
import { auth, db } from './firebase-config.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// 🌟 'where' අලුතින් import කර ඇත 
import { collection, doc, updateDoc, query, orderBy, onSnapshot, getDocs, setDoc, getDoc, addDoc, deleteDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const walkInDateInput = document.getElementById('walkInDate');
const walkInTimeSelect = document.getElementById('walkInTime');

let usersDataMap = {}; 
let realtimeUnsubscribe = null;

const SERVICE_DURATIONS = {
    "Hair Styling": 40,
    "Beard Trimming": 20,
    "Hair Coloring": 90,
    "Facial Treatment": 60
};

// 🌟 Quick Stats Variables
let totalServicesCount = 0;
let todayBookingsCount = 0;
let nextHolidayDate = 'None';

function updateQuickStats() {
    const s1 = document.getElementById('statTodayBookings');
    const s2 = document.getElementById('statTotalServices');
    const s3 = document.getElementById('statNextHoliday');
    if(s1) s1.innerText = todayBookingsCount;
    if(s2) s2.innerText = totalServicesCount;
    if(s3) s3.innerText = nextHolidayDate;
}

// 🌟 Custom Confirm Modal Logic
function customConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const msgEl = document.getElementById('confirmMessage');
        const btnYes = document.getElementById('btnConfirmYes');
        const btnNo = document.getElementById('btnConfirmNo');

        if(!modal) { resolve(confirm(message)); return; }

        msgEl.innerText = message;
        modal.style.display = 'flex';

        const handleYes = () => { cleanup(); resolve(true); };
        const handleNo = () => { cleanup(); resolve(false); };

        btnYes.onclick = handleYes;
        btnNo.onclick = handleNo;

        function cleanup() {
            modal.style.display = 'none';
            btnYes.onclick = null;
            btnNo.onclick = null;
        }
    });
}

// ==========================================
// 1. Auth & Initial Load
// ==========================================
const ADMIN_EMAIL = "tharinduhashan2129@gmail.com"; 

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (user.email === ADMIN_EMAIL) {
            adminNameDisplay.innerText = `Hi, Administrator`;
            await fetchAllUsers(); 
            listenToBookings();    
            loadBlockedDates();
            loadSiteMedia(); 
            loadGalleryImages(); 
        } else {
            alert("⛔ Access Denied! You are not authorized to view the Admin Dashboard.");
            window.location.replace('../index.html');
        }
    } else {
        window.location.replace('login.html');
    }
});

// ==========================================
// 2. Walk-in & Time Slot Sync Logic 🌟
// ==========================================

// දවසකට අදාළ සියලුම සම්මත Time Slots සෑදීම
const generateAllSlots = () => {
    let slots = [];
    for(let h=9; h<=17; h++){ // උදේ 9 සිට හවස 5:30 දක්වා
        slots.push(`${h.toString().padStart(2,'0')}:00`);
        slots.push(`${h.toString().padStart(2,'0')}:30`);
    }
    return slots;
};

// තේරූ දවසට අදාළව Book වී ඇති වෙලාවන් බලා, Available වෙලාවන් පෙන්වීම
async function loadWalkInTimeSlots(dateStr) {
    if(!walkInTimeSelect) return;
    walkInTimeSelect.innerHTML = '<option value="">Loading Slots...</option>';
    
    try {
        const allSlots = generateAllSlots();
        const q = query(collection(db, "bookings"), where("date", "==", dateStr));
        const snap = await getDocs(q);
        
        let bookedSlots = [];
        snap.forEach(doc => {
            const data = doc.data();
            if(data.status !== "Cancelled") { // Cancel වූ ඒවා අදාළ නැත
                bookedSlots.push(data.time);
            }
        });

        walkInTimeSelect.innerHTML = '';
        let availableCount = 0;

        allSlots.forEach(slot => {
            const isBooked = bookedSlots.includes(slot);
            const opt = document.createElement('option');
            opt.value = slot;
            opt.innerText = isBooked ? `${slot} (Booked)` : slot;
            
            if(isBooked) {
                opt.disabled = true;
                opt.style.color = "red";
            } else {
                availableCount++;
            }
            walkInTimeSelect.appendChild(opt);
        });

        if(availableCount === 0) {
            walkInTimeSelect.innerHTML = '<option value="">Fully Booked</option>';
        }
    } catch (err) {
        console.error("Error loading time slots", err);
    }
}

if(btnOpenWalkIn) {
    btnOpenWalkIn.onclick = () => {
        const today = new Date().toISOString().split('T')[0];
        if(walkInDateInput) walkInDateInput.value = today;
        loadWalkInTimeSlots(today);
        walkInModal.style.display = 'flex';
    };
}

if(btnCloseWalkIn) btnCloseWalkIn.onclick = () => walkInModal.style.display = 'none';

if(walkInDateInput) {
    walkInDateInput.addEventListener('change', (e) => loadWalkInTimeSlots(e.target.value));
}

if(walkInForm) {
    walkInForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        
        const service = document.getElementById('walkInService').value;
        const duration = SERVICE_DURATIONS[service] || 30;
        const dateStr = document.getElementById('walkInDate').value;
        const startTimeStr = document.getElementById('walkInTime').value;

        if(!startTimeStr) {
            return alert("Please select an available time slot!");
        }

        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            // End Time එක ගණනය කිරීම
            const [h, m] = startTimeStr.split(':').map(Number);
            const endDate = new Date();
            endDate.setHours(h, m + duration, 0, 0);
            const endTimeStr = endDate.getHours().toString().padStart(2, '0') + ":" + endDate.getMinutes().toString().padStart(2, '0');

            await addDoc(collection(db, "bookings"), {
                userName: document.getElementById('walkInName').value + " (Walk-in)",
                userEmail: "cash-payment@salonrich.com",
                phone: document.getElementById('walkInPhone').value,
                service: service,
                date: dateStr,
                time: startTimeStr,
                endTime: endTimeStr, 
                duration: duration,
                status: 'Accepted', // Walk-in ඒවා කෙලින්ම Accept වේ
                paymentMethod: 'Cash',
                createdAt: new Date().toISOString()
            });

            alert(`Success! Slot blocked for ${dateStr} at ${startTimeStr}.`);
            walkInForm.reset();
            walkInModal.style.display = 'none';
        } catch (err) { 
            alert(err.message); 
        } finally {
            btn.innerText = "Save & Block Slots";
            btn.disabled = false;
        }
    };
}

// ==========================================
// 3. Appointments Table & Search Logic
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
    
    const todayStr = new Date().toISOString().split('T')[0];

    realtimeUnsubscribe = onSnapshot(q, (snapshot) => {
        if(!tableBody) return;
        tableBody.innerHTML = ''; 
        
        todayBookingsCount = 0; 

        snapshot.forEach((docSnap) => {
            const booking = docSnap.data();
            
            if(booking.date === todayStr) todayBookingsCount++; 
            
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

        updateQuickStats(); 
    });
}

// 🌟 Smart Search Filter
const searchBooking = document.getElementById('searchBooking');
if(searchBooking) {
    searchBooking.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#bookingsTableBody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });
}

if(filterDateInput) {
    filterDateInput.addEventListener('change', (e) => listenToBookings(e.target.value));
}
if(btnClearFilter) {
    btnClearFilter.addEventListener('click', () => {
        if(filterDateInput) filterDateInput.value = '';
        listenToBookings(null);
    });
}

window.updateStatus = async (id, status) => {
    const isConfirmed = await customConfirm(`Are you sure you want to change status to ${status}?`);
    if(isConfirmed) await updateDoc(doc(db, "bookings", id), { status });
};

// ==========================================
// 4. Holiday Blocking
// ==========================================
async function loadBlockedDates() {
    const list = document.getElementById('blockedDatesList');
    if(!list) return;
    try {
        const docSnap = await getDoc(doc(db, "settings", "holidays"));
        if(docSnap.exists() && docSnap.data().blockedDates.length > 0) {
            const dates = docSnap.data().blockedDates;
            dates.sort(); 
            list.innerHTML = dates.map(d => `<li style="margin-bottom: 8px;">${d}</li>`).join('');
            
            const todayStr = new Date().toISOString().split('T')[0];
            const upcoming = dates.filter(d => d >= todayStr);
            nextHolidayDate = upcoming.length > 0 ? upcoming[0] : 'None';
        } else {
            list.innerHTML = '<li>No blocked dates.</li>';
            nextHolidayDate = 'None';
        }
        updateQuickStats();
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
// 5. FIRESTORE ONLY MEDIA MANAGEMENT
// ==========================================

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
        const base64String = await compressAndConvertImage(file);
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

        document.getElementById(previewId).innerHTML = '<img src="' + base64String + '">';
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

// --- Load Previews & Fast Logo Sync (Cache System) ---
async function loadSiteMedia() {
    try {
        const navMainLogo = document.getElementById('navMainLogo'); // Navbar එකේ ලෝගෝ එක
        
        // 🌟 1. Cache එකෙන් ලෝගෝ එක ක්ෂණිකව පෙන්වීම (Delay එක නැති කිරීමට)
        const cachedLogo = localStorage.getItem('salonRichLogo');
        if (cachedLogo && navMainLogo) {
            navMainLogo.src = cachedLogo;
            navMainLogo.style.display = 'block';
        }

        // 🌟 2. Firebase එකෙන් අලුත්ම දත්ත ගෙන ඒම
        const homeSnap = await getDoc(doc(db, "site_settings", "home_page"));
        if (homeSnap.exists()) {
            const data = homeSnap.data();
            
            // ලෝගෝ එක අප්ඩේට් කිරීම සහ Cache කිරීම
            if(data.logoUrl) {
                // Admin Dashboard එකේ Preview කොටුවට
                const previewEl = document.getElementById('logoPreview');
                if(previewEl) previewEl.innerHTML = `<img src="${data.logoUrl}">`;
                
                // Navbar එකට (Cache එකට වඩා අලුත් නම් පමණක් මාරු කරයි)
                if(navMainLogo && navMainLogo.src !== data.logoUrl) {
                    navMainLogo.src = data.logoUrl;
                    navMainLogo.style.display = 'block';
                    localStorage.setItem('salonRichLogo', data.logoUrl); // අලුත් ලෝගෝව බ්‍රවුසරයේ සේව් කරයි
                }
            }

            // Slideshow එක ලෝඩ් කිරීම
            if(data.heroSlides) {
                for(let i=0; i<5; i++) {
                    if(data.heroSlides[i]) {
                        const previewEl = document.getElementById(`slide${i+1}Preview`);
                        if(previewEl) previewEl.innerHTML = `<img src="${data.heroSlides[i]}">`;
                    }
                }
            }
        }
        
        // Other pages Banners
        const pagesSnap = await getDoc(doc(db, "site_settings", "other_pages"));
        if (pagesSnap.exists()) {
            const pData = pagesSnap.data();
            if(pData.aboutImg) document.getElementById('aboutPreview').innerHTML = `<img src="${pData.aboutImg}">`;
            if(pData.contactImg) document.getElementById('contactPreview').innerHTML = `<img src="${pData.contactImg}">`;
            if(pData.servicesImg) document.getElementById('servicesPreview').innerHTML = `<img src="${pData.servicesImg}">`;
        }
    } catch (e) { console.error("Error loading media:", e); }
}

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
// 6. GALLERY MANAGEMENT 
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
            const base64String = await compressAndConvertImage(file);
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
                <button class="action-btn btn-danger" onclick="deleteGalleryImage('${docSnap.id}')" style="width:100%; padding: 8px;">
                    <i class="fas fa-trash"></i> Delete
                </button>
            `;
            grid.appendChild(card);
        });
    } catch (e) { console.error("Error loading gallery:", e); }
}

window.deleteGalleryImage = async (docId) => {
    const isConfirmed = await customConfirm("Are you sure you want to delete this photo from the gallery?");
    if(!isConfirmed) return;
    
    try {
        await deleteDoc(doc(db, "gallery", docId));
        loadGalleryImages(); 
    } catch (error) {
        alert("Failed to delete: " + error.message);
    }
}

// ==========================================
// 7. Global Logout
// ==========================================
navLogout?.addEventListener('click', async () => { 
    const isConfirmed = await customConfirm("Are you sure you want to log out from Admin Panel?");
    if(isConfirmed) { 
        await signOut(auth); 
        window.location.replace('../index.html'); 
    } 
});

// ==========================================
// 8. SERVICES (PACKAGES) MANAGEMENT 
// ==========================================
const serviceForm = document.getElementById('serviceForm');
const servicesTableBody = document.getElementById('servicesTableBody');
const btnCancelEdit = document.getElementById('btnCancelEdit');

if (serviceForm) {
    const qServices = query(collection(db, "services"), orderBy("category"));
    onSnapshot(qServices, (snapshot) => {
        if(!servicesTableBody) return;
        servicesTableBody.innerHTML = '';
        
        totalServicesCount = snapshot.size; 
        updateQuickStats();

        if (snapshot.empty) {
            servicesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#aaa;">No services found. Add one!</td></tr>';
            return;
        }
        
        snapshot.forEach((docSnap) => {
            const svc = docSnap.data();
            const row = document.createElement('tr');
            
            const safeName = svc.name ? svc.name.replace(/'/g, "\\'") : '';
            const safeDesc = svc.desc ? svc.desc.replace(/'/g, "\\'") : '';
            
            row.innerHTML = `
                <td><strong>${svc.name}</strong><br><small style="color:var(--gold);">${svc.category}</small></td>
                <td>Rs. ${svc.price}</td>
                <td>${svc.duration} mins</td>
                <td>
                    <button class="action-btn" onclick="editService('${docSnap.id}', '${safeName}', '${svc.category}', '${safeDesc}', '${svc.price}', '${svc.duration}')" style="background:rgba(76, 175, 80, 0.1); border-color:#4CAF50; color:#4CAF50;"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn btn-danger" onclick="deleteService('${docSnap.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            servicesTableBody.appendChild(row);
        });
    });

    serviceForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveService');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const id = document.getElementById('editServiceId').value;
        const serviceData = {
            category: document.getElementById('serviceCategory').value,
            name: document.getElementById('serviceName').value,
            desc: document.getElementById('serviceDesc').value,
            price: Number(document.getElementById('servicePrice').value),
            duration: Number(document.getElementById('serviceDuration').value)
        };

        try {
            if (id) {
                await updateDoc(doc(db, "services", id), serviceData);
            } else {
                await addDoc(collection(db, "services"), serviceData);
            }
            resetServiceForm();
        } catch (error) {
            alert("Error: " + error.message);
        } finally {
            btn.innerText = "Save Service";
            btn.disabled = false;
        }
    };

    window.editService = (id, name, category, desc, price, duration) => {
        document.getElementById('editServiceId').value = id;
        document.getElementById('serviceName').value = name;
        document.getElementById('serviceCategory').value = category;
        document.getElementById('serviceDesc').value = desc;
        document.getElementById('servicePrice').value = price;
        document.getElementById('serviceDuration').value = duration;
        
        document.getElementById('btnSaveService').innerText = "Update Service";
        if(btnCancelEdit) btnCancelEdit.style.display = "block";
        
        serviceForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    window.deleteService = async (id) => {
        const isConfirmed = await customConfirm("Are you sure you want to delete this service? It will be removed from your website immediately.");
        if (isConfirmed) {
            try {
                await deleteDoc(doc(db, "services", id));
            } catch (err) {
                alert("Failed to delete: " + err.message);
            }
        }
    };

    if(btnCancelEdit) btnCancelEdit.onclick = resetServiceForm;

    function resetServiceForm() {
        serviceForm.reset();
        document.getElementById('editServiceId').value = "";
        document.getElementById('btnSaveService').innerText = "Save Service";
        if(btnCancelEdit) btnCancelEdit.style.display = "none";
    }
}