const admin = require("firebase-admin");

// අර අපි දැන් ඩවුන්ලෝඩ් කරලා දාපු යතුර මෙතනට සම්බන්ධ කරනවා
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

console.log("🔥 Firebase Admin Connected Successfully!");

module.exports = { admin, db, auth };