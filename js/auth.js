// Staff Login (Name + Password only, no Firebase Auth)
async function loginStaff(enteredName, enteredPassword) {
  console.log(`[AUTH] Staff login attempt: name=${enteredName}`);
  try {
    const nameLower = enteredName.trim().toLowerCase();
    const snap = await db.collection('staff')
      .where('nameLower', '==', nameLower)
      .where('password', '==', enteredPassword.trim())
      .where('active', '==', true) // Only active users can login
      .limit(1).get();

    if (snap.empty) {
      throw new Error('❌ Invalid name or password. Contact your admin.');
    }

    const doc = snap.docs[0];
    const data = doc.data();

    const sessionData = {
      loggedIn: true,
      role: 'staff',
      docId: doc.id,
      name: data.name,
      staffRole: data.role,
      shiftStart: data.shiftStart,
      shiftEnd: data.shiftEnd,
      lateGraceMins: data.lateGraceMins || 15
    };

    sessionStorage.setItem('staffSession', JSON.stringify(sessionData));
    console.log('[AUTH] Staff session established.');
    window.location.href = './staff-dashboard.html';

  } catch (error) {
    console.error('[AUTH] Staff Login Error:', error);
    alert('Login Failed: ' + error.message);
  }
}

// Admin Login (Uses Firebase Auth)
async function loginUser(email, password, role) {
  console.log(`[AUTH] Admin login attempt: email=${email}`);
  try {
    const inputEmail = email.toLowerCase().trim();
    if (inputEmail !== ADMIN_EMAIL.toLowerCase().trim()) {
       throw new Error('Unauthorized Access. You do not have administrator permissions.');
    }

    const userCredential = await auth.signInWithEmailAndPassword(inputEmail, password);
    const user = userCredential.user;

    const sessionToken = {
      role: 'admin',
      email: inputEmail,
      loggedIn: true,
      timestamp: Date.now()
    };
    sessionStorage.setItem('omhc_session', JSON.stringify(sessionToken));
    window.location.href = './admin-dashboard.html';

  } catch (error) {
    console.error('[AUTH] Admin Login Exception:', error);
    alert('Admin Login Failed: ' + error.message);
  }
}

// Global logout function
function logoutUser() {
  sessionStorage.removeItem('omhc_session');
  sessionStorage.removeItem('staffSession');
  auth.signOut().finally(() => {
    window.location.href = './index.html';
  });
}

// Verify auth session on load
function verifySession(requiredRole) {
  // 1. FAST SYNC CHECK
  if (requiredRole === 'staff') {
    const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
    if (!staffSession.loggedIn) {
      console.warn("[AUTH] No valid staff session found.");
      window.location.href = './staff-login.html';
      return;
    }
    return; // Staff verification ends here (no Firebase check)
  }

  const adminSession = JSON.parse(sessionStorage.getItem('omhc_session') || '{}');
  if (!adminSession.loggedIn || adminSession.role !== 'admin') {
    console.warn("[AUTH] No valid admin session found.");
    window.location.href = './admin-login.html';
    return;
  }

  // 2. FIREBASE ASYNC VALIDATION (Admin only)
  auth.onAuthStateChanged(user => {
    if (!user) {
      console.warn("[AUTH] Admin Firebase state: No user logged in.");
      sessionStorage.removeItem('omhc_session');
      window.location.href = './admin-login.html';
    } else if (user.email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase().trim()) {
      window.location.href = './staff-dashboard.html';
    }
  });
}

// Auth session verification ends here
