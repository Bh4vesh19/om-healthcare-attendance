# 🏥 OM Health Care — Staff Attendance System

A complete web-based attendance system for store staff, hosted on GitHub Pages with Firebase backend.

---

## 🚀 Setup Guide

### Step 1: Create Firebase Project
1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add Project"** → Name it `om-health-care-attendance`
3. Disable Google Analytics (optional) → Create Project

### Step 2: Enable Firebase Authentication
1. In Firebase Console → **Authentication** → **Get Started**
2. Click **Email/Password** → Enable → Save
3. Go to **Users** tab → **Add User**:
   - Email: `admin@omhealthcare.com`
   - Password: *(choose a strong password)*
4. This is the **Admin account**

### Step 3: Setup Firestore Database
1. In Firebase Console → **Firestore Database** → **Create Database**
2. Choose **Start in Test Mode** (you'll update rules later)
3. Select a region closest to India (e.g., `asia-south1`)

### Step 4: Configure Security Rules
In Firestore → **Rules**, paste this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Admin email constant
    function isAdmin() {
      return request.auth != null &&
             request.auth.token.email == 'admin@omhealthcare.com';
    }

    // Staff collection - admin can read/write all, staff read own
    match /staff/{docId} {
      allow read, write: if isAdmin();
      allow read: if request.auth != null &&
                     request.auth.token.email == resource.data.email;
    }

    // Attendance - staff can create own, admin can read all
    match /attendance/{docId} {
      allow create: if request.auth != null;
      allow read, update, delete: if isAdmin();
      allow read: if request.auth != null &&
                     request.auth.token.email == resource.data.email;
    }
  }
}
```

### Step 5: Get Firebase Config
1. In Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your Apps"** → **Web App** (click `</>`)
3. Register app name: `om-health-care-web`
4. Copy the `firebaseConfig` object

### Step 6: Update firebase-config.js
Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const ADMIN_EMAIL = "admin@omhealthcare.com";
```

### Step 7: Deploy to GitHub Pages
1. Create a new repository on GitHub (e.g., `attendance-system`)
2. Push all files to the repository
3. Go to **Settings** → **Pages**
4. Source: **Deploy from branch** → `main` → `/root`
5. Your site will be live at: `https://yourusername.github.io/attendance-system`

---

## 👤 Adding Staff (Admin)

1. Login at `admin-login.html` with your admin email & password
2. Go to **Manage Staff** → **Add Staff**
3. Enter:
   - Full Name
   - Staff ID (e.g., `OMHC001`)
   - Phone, Role
   - Password (staff will use this to login)
4. The staff login email is auto-generated as `staffid@omhealthcare.staff`
5. Staff logs in using their **Staff ID** (not email) + password

---

## 📋 Attendance Rules
| Time | Status |
|------|--------|
| Before 10:00 AM | ✅ Present |
| 10:00 – 10:30 AM | ⏰ Late |
| After 10:30 AM | ❌ Absent |

One mark per day per staff. Duplicate marks are prevented.

---

## 📥 Downloading Reports
Admin can download:
- **Daily** — single day CSV/Excel
- **Weekly** — 7-day range CSV/Excel  
- **Monthly** — full month CSV/Excel

---

## 🖼️ Adding Your Logo
1. Login as Admin → **Settings**
2. Upload your store logo (PNG/JPG, max 2MB)
3. Logo appears on sidebar and login pages

---

## 📁 File Structure
```
attendance-system/
├── index.html              ← Landing page
├── staff-login.html        ← Staff login
├── staff-dashboard.html    ← Staff dashboard + history
├── admin-login.html        ← Admin login
├── admin-dashboard.html    ← Admin panel (all features)
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js  ← ⚠️ UPDATE THIS FIRST
│   ├── auth.js
│   ├── attendance.js
│   └── admin.js
└── README.md
```

---

## ⚠️ Important Notes
- The **Admin email** must match exactly in `firebase-config.js` and Firebase Auth
- Staff accounts are created via Firebase Authentication
- Logo is stored in browser localStorage (device-specific)
- For logo to appear for all users, consider Firebase Storage (future upgrade)

---

Built with ❤️ for OM Health Care
