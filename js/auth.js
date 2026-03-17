// Staff Login (Name + Password only, no Firebase Auth)
async function loginStaff(enteredName, enteredPassword) {
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
    sessionStorage.setItem('loginDate', window.getCurrentDate());
    window.location.href = './staff-dashboard.html';
    return sessionData;

  } catch (error) {
    console.error('[AUTH] Staff Login Error:', error);
    throw error;
  }
}

// Helper for Admin Login Button
async function handleAdminLogin() {
  console.log('login clicked');
  const passwordInput = document.getElementById('password') || document.getElementById('passwordInput');
  const password = passwordInput ? passwordInput.value.trim() : '';
  if (!password) {
    alert('Please enter a password');
    return;
  }
  return loginUser(window.ADMIN_EMAIL, password, 'admin');
}

// Admin Login (Uses Firebase Auth)
async function loginUser(email, password, role) {
  try {
    await auth.signInWithEmailAndPassword(email || window.ADMIN_EMAIL, password);

    const sessionToken = {
      role: 'admin',
      email: email || window.ADMIN_EMAIL,
      loggedIn: true,
      timestamp: Date.now()
    };
    sessionStorage.setItem('omhc_session', JSON.stringify(sessionToken));
    sessionStorage.setItem('loginDate', window.getCurrentDate());
    window.location.href = './admin-dashboard.html';
    return sessionToken;

  } catch (error) {
    console.error('[AUTH] Admin Login Exception:', error);
    throw error;
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
  // 0. DAILY SESSION RESET CHECK
  const today = window.getCurrentDate();
  const loginDate = sessionStorage.getItem('loginDate');
  
  if (loginDate && loginDate !== today) {
    sessionStorage.clear();
    window.location.href = './index.html';
    return;
  }

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
    } else if (user.email.toLowerCase().trim() !== window.ADMIN_EMAIL.toLowerCase().trim()) {
      window.location.href = './staff-dashboard.html';
    }
  });
}

// Auth session verification ends here
window.loginStaff = loginStaff;
window.loginUser = loginUser;
window.handleAdminLogin = handleAdminLogin;
window.logoutUser = logoutUser;
window.verifySession = verifySession;
