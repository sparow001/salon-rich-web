import { auth, db } from './firebase-config.js';
import { 
    signInWithPopup, 
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

// 1. Email/Password Auth
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    const isSignUp = document.getElementById('nameGroup').style.display === 'block';

    try {
        if (isSignUp) {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: name });
            await syncUserToFirestore(res.user, name);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        window.location.replace('../index.html');
    } catch (err) {
        alert(err.message);
    }
});

// 2. Google Login
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const res = await signInWithPopup(auth, provider);
        await syncUserToFirestore(res.user);
        window.location.replace('../index.html');
    } catch (err) {
        console.error(err);
    }
});