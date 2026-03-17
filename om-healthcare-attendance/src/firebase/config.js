import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Rule 1 — Firebase config exact values
const firebaseConfig = {
  apiKey: "AIzaSyDU78Ze7rpB3r-0W_MhqfQS2Y0QqodgraY",
  authDomain: "store-attendance-system.firebaseapp.com",
  projectId: "store-attendance-system",
  storageBucket: "store-attendance-system.firebasestorage.app",
  messagingSenderId: "601354333815",
  appId: "1:601354333815:web:0512759b171e27d4462072"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 3 — Store coordinates hardcoded
export const SHOP_LAT = 19.2848044;
export const SHOP_LNG = 72.8781836;
export const ALLOWED_RADIUS_METERS = 100;
export const GEOFENCE_TOLERANCE_METERS = 5;

export { app, auth, db };
