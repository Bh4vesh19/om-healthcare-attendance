import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './config';
import { doc, getDoc } from 'firebase/firestore';
import { ADMIN_EMAIL } from '../config/runtime';

export const loginAdmin = async (password) => {
    const userCredential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
    // Rule 5: After admin login set exactly
    sessionStorage.setItem('omhc_session', JSON.stringify({ loggedIn: true, role: 'admin' }));
    return userCredential.user;
};

export const loginStaff = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch staff doc
    const staffDocRef = doc(db, 'staff', user.uid);
    const staffSnap = await getDoc(staffDocRef);
    
    if (staffSnap.exists()) {
        const staffData = staffSnap.data();
        const sessionToken = {
            docId: user.uid,
            email: email,
            name: staffData.name,
            role: 'staff',
            shiftStart: staffData.shiftStart,
            shiftEnd: staffData.shiftEnd,
            lateGraceMins: staffData.lateGraceMins || 15,
            loggedIn: true,
            timestamp: Date.now()
        };
        sessionStorage.setItem('staffSession', JSON.stringify(sessionToken));
        return { user, staffData };
    } else {
        throw new Error("Staff profile not found.");
    }
};

export const logout = async () => {
    sessionStorage.removeItem('omhc_session');
    sessionStorage.removeItem('staffSession');
    await signOut(auth);
};
