import { auth, db } from './firebase-config.js';
import { 
    signInWithRedirect, 
    getRedirectResult,
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const authForm = document.getElementById('authForm');
const googleBtn = document.getElementById('googleLoginBtn');

// Helper: Save User to Firestore
async function syncUserToFirestore(user, name = null) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            name: name || user.displayName || "Valued Client",
            email: user.email,
            role: 'customer',
            createdAt: serverTimestamp()
        });
    }
}

// 🌟 Google Redirect එකෙන් ආපසු ආවද කියා පරීක්ෂා කිරීම
async function checkRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            // Popup නැතුව ලොග් වුණාම කෙලින්ම Database එකට දාලා Home එකට යවනවා
            await syncUserToFirestore(result.user);
            window.location.replace('../index.html');
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        alert("Error logging in: " + error.message);
    }
}

// පිටුව ලෝඩ් වෙද්දීම මේක චෙක් කරනවා
checkRedirectResult();

// 1. Email/Password Auth
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
        window.location.replace('../index.html');
    } catch (err) {
        alert(err.message);
        submitBtn.innerHTML = isSignUpMode ? "Sign Up" : "Login";
        submitBtn.disabled = false;
    }
});

// 2. Google Login (Popup වෙනුවට Redirect ක්‍රමය)
googleBtn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    googleBtn.innerHTML = '<span class="spinner" style="border-top-color:#000;"></span> Redirecting...';
    googleBtn.disabled = true;
    signInWithRedirect(auth, provider);
});