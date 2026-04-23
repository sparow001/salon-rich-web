// frontend/js/auth.js

import { auth, provider, signInWithPopup } from './firebase-config.js';

const googleLoginBtn = document.getElementById('googleLoginBtn');

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        try {
            // Google Login Popup එක ගෙනෙනවා
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            console.log("Logged in successfully!", user.displayName);
            alert(`Welcome to Salon Rich, ${user.displayName}!`);
            
            // සාර්ථකව ලොග් වුණාට පස්සේ Home Page එකට යවනවා
            window.location.href = "../index.html";
            
        } catch (error) {
            console.error("Login Error:", error.message);
            alert("Login Failed: " + error.message);
        }
    });
}