// Attendance System Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDU78Ze7rpB3r-0W_MhqfQS2Y0QqodgraY",
  authDomain: "store-attendance-system.firebaseapp.com",
  projectId: "store-attendance-system",
  storageBucket: "store-attendance-system.firebasestorage.app",
  messagingSenderId: "601354333815",
  appId: "1:601354333815:web:0512759b171e27d4462072"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

window.db = db;
window.auth = auth;

// Enable Firestore Offline Persistence
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Firestore Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    console.warn('Firestore Persistence failed: Browser not supported');
  }
});

// Constants
const DEFAULT_ADMIN = "omheathcare24@gmail.com";

window.ADMIN_EMAIL = DEFAULT_ADMIN;

// Connection Status Monitor
const connectionBanner = document.createElement('div');
connectionBanner.id = 'connection-status';
connectionBanner.style = 'position:fixed; top:0; left:0; right:0; padding:8px; text-align:center; font-size:13px; font-weight:600; z-index:9999; display:none; transition: all 0.3s; color:white;';

function updateConnectivityBanner() {
    if (!connectionBanner || !document.body.contains(connectionBanner)) return;
    
    if (navigator.onLine) {
        connectionBanner.textContent = "\u{1F7E2} Back online";
        connectionBanner.style.backgroundColor = "rgba(63, 185, 80, 0.9)";
        connectionBanner.style.display = 'block';
        setTimeout(() => {
            if (navigator.onLine) connectionBanner.style.display = 'none';
        }, 3000);
    } else {
        connectionBanner.textContent = "\u{1F534} No internet connection";
        connectionBanner.style.backgroundColor = "rgba(248, 81, 73, 0.9)";
        connectionBanner.style.display = 'block';
    }
}

// Ensure the banner is added only when the body is ready
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        document.body.prepend(connectionBanner);
        updateConnectivityBanner();
    });
} else {
    document.body.prepend(connectionBanner);
    updateConnectivityBanner();
}

window.addEventListener('online', updateConnectivityBanner);
window.addEventListener('offline', updateConnectivityBanner);

// Helper: Get Current Date (YYYY-MM-DD)
function getCurrentDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

window.getCurrentDate = getCurrentDate;

// Helper: Get Time (HH:MM:SS)
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Helper: Live Working Hours calculation (from HH:MM to Now)
function calcWorkingHoursLive(checkInTime) {
  if (!checkInTime || checkInTime === '-') return '0.0h';
  
  const today = getCurrentDate();
  const checkInDate = new Date(`${today}T${checkInTime.padStart(5, '0')}:00`);
  const now = new Date();
  
  const diffMins = Math.floor((now - checkInDate) / 60000);
  if (diffMins < 0) return '0.0h';
  
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
}

window.getCurrentTime = getCurrentTime;
window.calcWorkingHoursLive = calcWorkingHoursLive;
