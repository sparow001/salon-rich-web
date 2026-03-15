// frontend/js/admin_gallery.js

import { auth, db } from './firebase-config.js'; // db මෙතනින් ගත්තා
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, deleteDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const storage = getStorage(); // Storage එක Initialize කළා
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const galleryGrid = document.getElementById('galleryGrid');
const navLogout = document.getElementById('navLogout');

// Admin ලොග් වෙලාද බලනවා
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadGalleryImages(); 
    } else {
        alert("Please login first!");
        window.location.replace('login.html');
    }
});

// 1. පින්තූරයක් Upload කිරීම
uploadBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) {
        alert("Please select an image to upload!");
        return;
    }

    uploadBtn.disabled = true;
    uploadStatus.style.color = "var(--gold)";
    uploadStatus.innerText = "Uploading... Please wait...";

    try {
        const uniqueName = Date.now() + '-' + file.name;
        const storageRef = ref(storage, 'gallery/' + uniqueName);
        const uploadTask = await uploadBytesResumable(storageRef, file);

        const downloadURL = await getDownloadURL(uploadTask.ref);

        await addDoc(collection(db, "gallery"), {
            imageUrl: downloadURL,
            imageName: uniqueName,
            uploadedAt: new Date().toISOString()
        });

        uploadStatus.style.color = "#4CAF50";
        uploadStatus.innerText = "Image uploaded successfully! 🎉";
        imageInput.value = ''; 
        
        await loadGalleryImages(); 

    } catch (error) {
        console.error("Upload Error:", error);
        uploadStatus.style.color = "#F44336";
        uploadStatus.innerText = "Error uploading: " + error.message;
    } finally {
        uploadBtn.disabled = false;
        setTimeout(() => { uploadStatus.innerText = ''; }, 4000); 
    }
});

// 2. Database එකෙන් පින්තූර ගෙනැවිත් පෙන්වීම
async function loadGalleryImages() {
    try {
        const q = query(collection(db, "gallery"), orderBy("uploadedAt", "desc"));
        const querySnapshot = await getDocs(q);

        galleryGrid.innerHTML = ''; 

        if (querySnapshot.empty) {
            galleryGrid.innerHTML = '<p style="color: var(--text-gray); grid-column: 1 / -1;">No images in the gallery yet.</p>';
            return;
        }

        querySnapshot.forEach((documentSnapshot) => {
            const data = documentSnapshot.data();
            const docId = documentSnapshot.id;

            const card = document.createElement('div');
            card.className = 'gallery-card';
            card.innerHTML = `
                <img src="${data.imageUrl}" alt="Salon Work">
                <button class="delete-btn" onclick="window.deleteImage('${docId}', '${data.imageName}')">Delete ✖</button>
            `;
            galleryGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Gallery Load Error:", error);
        galleryGrid.innerHTML = '<p style="color: red; grid-column: 1 / -1;">Error loading images.</p>';
    }
}

// 3. පින්තූරයක් මකා දැමීම (Delete)
window.deleteImage = async (docId, imageName) => {
    const confirmDelete = confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    try {
        const imageRef = ref(storage, 'gallery/' + imageName);
        await deleteObject(imageRef);

        await deleteDoc(doc(db, "gallery", docId));

        alert("Image deleted successfully!");
        await loadGalleryImages(); 

    } catch (error) {
        console.error("Delete Error:", error);
        alert("Error deleting image: " + error.message);
    }
};

// Logout
if (navLogout) {
    navLogout.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.replace('../index.html');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    });
}