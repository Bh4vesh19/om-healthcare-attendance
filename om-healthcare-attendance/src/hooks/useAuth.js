import { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // Check local storage for session role
                const adminStr = sessionStorage.getItem('omhc_session');
                const staffStr = sessionStorage.getItem('staffSession');
                
                if (adminStr && JSON.parse(adminStr).role === 'admin') {
                    setSession(JSON.parse(adminStr));
                    setUser(firebaseUser);
                } else if (staffStr) {
                    setSession(JSON.parse(staffStr));
                    setUser(firebaseUser);
                } else {
                    setUser(null);
                    setSession(null);
                }
            } else {
                setUser(null);
                setSession(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, session, loading };
};
