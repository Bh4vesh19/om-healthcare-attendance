import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { getCurrentDate } from '../utils/shiftHelper';

export const useAttendance = (staffDocId) => {
    const [attendanceRecord, setAttendanceRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!staffDocId) {
            setLoading(false);
            return;
        }

        const today = getCurrentDate();
        const docId = `${staffDocId}-${today}`;
        const docRef = doc(db, 'attendance', docId);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setAttendanceRecord({ id: docSnap.id, ...docSnap.data() });
            } else {
                setAttendanceRecord(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [staffDocId]);

    return { attendanceRecord, loading };
};
