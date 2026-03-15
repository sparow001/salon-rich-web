// frontend/js/firebase-config.js

// 1. Firebase අන්තර්ජාලයෙන් ගෙන්වා ගැනීම (Auth, Database සහ Storage සඳහා)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// 2. ඔයාගේ Salon Rich ව්‍යාපෘතියේ රහස් යතුරු සහ විස්තර
const firebaseConfig = {
  apiKey: "AIzaSyBUdMzCEgZaN2tZDc9QlhneaERoO15oMg4",
  authDomain: "salon-rich.firebaseapp.com",
  projectId: "salon-rich",
  storageBucket: "salon-rich.firebasestorage.app",
  messagingSenderId: "395494973208",
  appId: "1:395494973208:web:95c90cd13e19008268086d"
};

// 3. Firebase පණ ගැන්වීම
const app = initializeApp(firebaseConfig);

// 4. අපිට අවශ්‍ය සේවාවන් වෙන වෙනම හදාගැනීම
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// 5. අනිත් ෆයිල් වලට පාවිච්චි කරන්න පුළුවන් වෙන්න Export කිරීම
export { auth, provider, signInWithPopup, db, storage };