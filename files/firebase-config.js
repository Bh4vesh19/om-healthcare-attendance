// ============================================================
// FIREBASE CONFIGURATION - OM HEALTH CARE ATTENDANCE SYSTEM
// ============================================================
// IMPORTANT: Replace the values below with your Firebase project credentials
// Steps:
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (e.g., "om-health-care-attendance")
//   3. Go to Project Settings > General > Your Apps > Web App
//   4. Copy the firebaseConfig object and paste below
//   5. Enable Authentication (Email/Password) in Firebase Console
//   6. Enable Firestore Database in Firebase Console

const firebaseConfig = {
  apiKey: "AIzaSyDU78Ze7rpB3r-0W_MhqfQS2Y0QqodgraY",
  authDomain: "store-attendance-system.firebaseapp.com",
  projectId: "store-attendance-system",
  storageBucket: "store-attendance-system.firebasestorage.app",
  messagingSenderId: "601354333815",
  appId: "1:601354333815:web:0512759b171e27d4462072"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// ============================================================
// ADMIN EMAIL — set this to the admin's login email
// ============================================================
const ADMIN_EMAIL = "omheathcare24@gmail.com";
