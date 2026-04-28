import { auth, db } from './firebase-config.js';
import { 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authForm = document.getElementById('authForm');
const googleBtn = document.getElementById('googleLoginBtn');

// 🚨 Admin ගේ ඊමේල් ලිපිනය මෙතනින් සකසන්න
const ADMIN_EMAIL = "tharinduhashan2129@gmail.com";

// Helper: Save User to Firestore
async function syncUserToFirestore(user, name = null) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            name: name || user.displayName || "Valued Client",
            email: user.email,
            // Admin කෙනෙක් නම් role එක 'admin' ලෙසත් නැත්නම් 'customer' ලෙසත් සේව් වේ
            role: user.email === ADMIN_EMAIL ? 'admin' : 'customer', 
            createdAt: serverTimestamp()
        });
    }
}

// 🌟 1. පරිශීලකයා ලොග් වී ඇත්දැයි නිරන්තරයෙන් පරීක්ෂා කිරීම (Bulletproof Redirect)
// කෙනෙක් ලොග් වුණ ගමන්ම මේකෙන් ඉබේම Home හෝ Admin පිටුවට යවනවා
onAuthStateChanged(auth, (user) => {
    if (user) {
        // 🚨 Admin Security Check එක හරහා Redirect කිරීම 🚨
        if (user.email === ADMIN_EMAIL) {
            // Admin කෙනෙක් නම් කෙලින්ම Admin Dashboard එකට යවයි
            window.location.replace('admin_dashboard.html'); 
        } else {
            // සාමාන්‍ය පාරිභෝගිකයෙක් නම් Home පිටුවට යවයි
            window.location.replace('../index.html'); 
        }
    }
});

// 2. Email/Password Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    
    const isSignUpMode = document.getElementById('nameGroup').style.display === 'block';
    const submitBtn = document.getElementById('submitBtn');

    try {
        // Loading Animation එක පෙන්වීම
        submitBtn.innerHTML = '<span class="spinner"></span> Processing...';
        submitBtn.disabled = true;

        if (isSignUpMode) {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: name });
            await syncUserToFirestore(res.user, name);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        // සාර්ථක වුවහොත් උඩ තියෙන onAuthStateChanged එකෙන් ඉබේම Redirect කරයි
    } catch (err) {
        alert("Error: " + err.message);
        submitBtn.innerHTML = isSignUpMode ? "Sign Up" : "Login";
        submitBtn.disabled = false;
    }
});

// 3. Google Login (Live Server සඳහා Popup ක්‍රමය)
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        googleBtn.innerHTML = '<span class="spinner" style="border-top-color:#000;"></span> Connecting...';
        googleBtn.disabled = true;
        
        // Popup එක හරහා ලොග් වීම
        const result = await signInWithPopup(auth, provider);
        
        // Database එකට දත්ත යැවීම
        await syncUserToFirestore(result.user);
        
        // සාර්ථක වුවහොත් උඩ තියෙන onAuthStateChanged එකෙන් ඉබේම Redirect කරයි
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        alert("Error logging in: " + error.message);
        // Error එකක් ආවොත් ආපහු බොත්තම පරණ තත්ත්වයට පත් කිරීම
        googleBtn.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/3002/300221.png" width="18" alt="Google"> Google Account';
        googleBtn.disabled = false;
    }
});