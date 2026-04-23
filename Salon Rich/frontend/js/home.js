// frontend/js/home.js

// ==========================================
// 1. Language Translation Logic (EN, SI, TA)
// ==========================================
const translations = {
    en: {
        home: "Home", services: "Services", profile: "Profile", login: "Login", logout: "Logout",
        gallery_nav: "Gallery", galleryTitle: "Our Masterpieces", loading: "Loading...",
        heroTitle: "Experience Premium Beauty",
        heroDesc: "Make your beauty dreams come true. Experience the luxury you deserve.",
        bookNowHero: "Book an Appointment",
        servicesTitle: "Our Premium Services",
        service1Name: "Hair Styling", service1Desc: "Professional cuts, colors, and styling.",
        service2Name: "Beard Trimming", service2Desc: "Classic beard grooming and styling.",
        service3Name: "Hair Coloring", service3Desc: "Premium hair coloring and highlights.",
        service4Name: "Facial Treatment", service4Desc: "Deep cleansing and glowing skin.",
        bookNowBtn: "Book Now",
        modalTitle: "Book Appointment", selectDate: "Select Date:", selectTime: "Select Time:",
        confirmBookingBtn: "Confirm Booking", logoutSuccess: "Logged out successfully!",
        logoutConfirm: "Do you want to logout?",
        about: "About Us", contact: "Contact"
    },
    si: {
        home: "මුල් පිටුව", services: "සේවාවන්", profile: "ගිණුම", login: "ඇතුල් වන්න", logout: "ඉවත් වන්න",
        gallery_nav: "ඡායාරූප", galleryTitle: "අපගේ නිර්මාණ", loading: "ලෝඩ් වෙමින් පවතී...",
        heroTitle: "සුපිරි රූපලාවණ්‍ය අත්දැකීමක්", 
        heroDesc: "ඔබගේ සිහින සැබෑ කරගන්න. දැන්ම වෙලාවක් වෙන්කරගන්න.", 
        bookNowHero: "වෙලාවක් වෙන්කරන්න",
        servicesTitle: "අපගේ ප්‍රධාන සේවාවන්",
        service1Name: "කොණ්ඩා මෝස්තර", service1Desc: "වෘත්තීය කොණ්ඩා කැපීම් සහ මෝස්තර.",
        service2Name: "රැවුල සැකසීම", service2Desc: "ක්ලැසික් රැවුල කැපීම සහ මෝස්තර.",
        service3Name: "වර්ණ ගැන්වීම", service3Desc: "උසස් තත්ත්වයේ හිසකෙස් වර්ණ ගැන්වීම්.",
        service4Name: "මුහුණේ සත්කාර", service4Desc: "සම පිරිසිදු කිරීම සහ පැහැපත් කිරීම.",
        bookNowBtn: "වෙන්කරන්න",
        modalTitle: "වෙලාවක් වෙන්කරන්න", selectDate: "දිනය තෝරන්න:", selectTime: "වේලාව තෝරන්න:",
        confirmBookingBtn: "තහවුරු කරන්න", logoutSuccess: "ඔබ සාර්ථකව ඉවත් විය!",
        logoutConfirm: "ඔබට ඉවත් වීමට අවශ්‍යද?",
        about: "අප ගැන", contact: "විමසීම්"
    },
    ta: {
        home: "முகப்பு", services: "சேவைகள்", profile: "சுயவிவரம்", login: "உள்நுழைக", logout: "வெளியேறு",
        gallery_nav: "தொகுப்பு", galleryTitle: "எங்கள் படைப்புகள்", loading: "ஏற்றுகிறது...",
        heroTitle: "பிரீமியம் அழகை அனுபவியுங்கள்",
        heroDesc: "உங்கள் அழகு கனவுகளை நனவாக்குங்கள். இப்போதே முன்பதிவு செய்யுங்கள்.",
        bookNowHero: "முன்பதிவு செய்யுங்கள்",
        servicesTitle: "எங்கள் பிரீமியம் சேவைகள்",
        service1Name: "முடி அலங்காரம்", service1Desc: "தொழில்முறை வெட்டுக்கள் மற்றும் வண்ணங்கள்.",
        service2Name: "தாடி அலங்காரம்", service2Desc: "கிளாசிக் தாடி சீர்ப்படுத்தல்.",
        service3Name: "முடி வண்ணம்", service3Desc: "பிரீமியம் முடி வண்ணமயமாக்கல்.",
        service4Name: "முக பராமரிப்பு", service4Desc: "ஆழ்ந்த சுத்திகரிப்பு மற்றும் ஒளிரும் சருமம்.",
        bookNowBtn: "முன்பதிவு செய்",
        modalTitle: "நேரத்தை முன்பதிவு செய்", selectDate: "தேதியைத் தேர்ந்தெடுக்கவும்:", selectTime: "நேரத்தைத் தேர்ந்தெடுக்கவும்:",
        confirmBookingBtn: "முன்பதிவை உறுதிப்படுத்துக", logoutSuccess: "வெற்றிகரமாக வெளியேறினீர்கள்!",
        logoutConfirm: "நீங்கள் வெளியேற விரும்புகிறீர்களா?",
        about: "எங்களை பற்றி", contact: "தொடர்பு"
    }
};

// ==========================================
// 2. Language Switcher & LocalStorage Logic
// ==========================================

// කලින් තෝරපු භාෂාවක් තියෙනවද කියලා බලනවා, නැත්නම් ඉංග්‍රීසි (en) ගන්නවා
let currentLang = localStorage.getItem('salonRichLang') || 'en'; 

function updateLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('salonRichLang', lang); // භාෂාව සේව් කරනවා

    // 🚨 1. අලුත් Dropdown එකේ අකුරු මාරු කිරීම
    const currentLangText = document.getElementById('currentLangText');
    if (currentLangText) {
        if(lang === 'en') currentLangText.innerText = 'EN';
        if(lang === 'si') currentLangText.innerText = 'සිං';
        if(lang === 'ta') currentLangText.innerText = 'தமி';
    }

    // 🚨 2. මුළු සයිට් එකේම `data-i18n` තියෙන වචන මාරු කිරීම
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
}

// 🚨 3. Dropdown Button ක්ලික් කරද්දී වෙන දේවල්
document.addEventListener('DOMContentLoaded', () => {
    // Page එක ලෝඩ් වෙද්දිම කලින් සේව් කරපු භාෂාවෙන් අකුරු පෙන්නන්න
    updateLanguage(currentLang);

    const langToggleBtn = document.getElementById('langToggleBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langOptions = document.querySelectorAll('.lang-option');

    if (langToggleBtn && langDropdown) {
        // Globe අයිකන් එක එබුවම මෙනුව පහළට එන එක
        langToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            langDropdown.style.display = langDropdown.style.display === 'block' ? 'none' : 'block';
        });

        // භාෂාවක් තේරුවම වෙන දේ
        langOptions.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedLang = e.target.getAttribute('data-lang');
                updateLanguage(selectedLang);
                langDropdown.style.display = 'none'; // මෙනුව වහනවා
            });
            
            // Hover වෙද්දී රත්තරන් පාට වෙනවා
            btn.addEventListener('mouseover', () => btn.style.color = '#FFD700');
            btn.addEventListener('mouseout', () => btn.style.color = 'white');
        });

        // එළියෙන් ක්ලික් කරාම මෙනුව වැහෙනවා
        document.addEventListener('click', (e) => {
            if (!langToggleBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.style.display = 'none';
            }
        });
    }
});
// ==========================================
// 3. Global Dynamic Logo Fetch Logic
// ==========================================
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from './firebase-config.js';

async function loadGlobalLogo() {
    try {
        const docRef = doc(db, "site_settings", "home_page");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().logoUrl) {
            // මුළු සයිට් එකේම තියෙන .logo ක්ලාස් එක හොයාගෙන ලෝගෝ එක දානවා
            const siteLogos = document.querySelectorAll('.logo');
            siteLogos.forEach(logo => {
                logo.innerHTML = `
                    <img src="${docSnap.data().logoUrl}" alt="Salon Rich Logo" style="max-height: 50px; width: auto; object-fit: contain;">
                    <span class="logo-text" style="font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: white; letter-spacing: 2px;">SALON RICH</span>
                `;
            });
        }
    } catch (error) {
        console.error("Error loading global logo:", error);
    }
}

// පේජ් එක ලෝඩ් වෙද්දීම ලෝගෝ එක ගේන්න
document.addEventListener('DOMContentLoaded', loadGlobalLogo);