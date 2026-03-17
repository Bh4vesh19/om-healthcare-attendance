import { db } from './config';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, serverTimestamp, orderBy, limit, getDoc } from 'firebase/firestore';
import { getCurrentDate, getCurrentTime, calcWorkingHours } from '../utils/shiftHelper';

export const getTodayRecord = async (staffDocId) => {
    const today = getCurrentDate();
    const docId = `${staffDocId}-${today}`;
    const docRef = doc(db, 'attendance', docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const checkIn = async (sessionData, isLate) => {
    const today = getCurrentDate();
    const timeNow = getCurrentTime();
    const docId = `${sessionData.docId}-${today}`;

    const data = {
        staffDocId: sessionData.docId,
        staffName: sessionData.name,
        date: today,
        checkIn: timeNow,
        checkOut: null,
        status: isLate ? 'Late' : 'Present',
        totalHours: null,
        inRangeWorkSeconds: 0,
        outOfRangeSeconds: 0,
        totalOutMins: 0,
        zoneStatus: 'in_zone',
        distanceMeters: 0,
        movementStatus: 'Idle',
        gpsAccuracyMeters: null,
        gpsFlagged: false,
        lastGpsCheck: serverTimestamp(),
        lastZoneEntryAt: serverTimestamp(),
        lastZoneExitAt: null,
        zoneTransitionAt: serverTimestamp(),
        trackingMode: 'foreground',
        trackingUpdatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'attendance', docId), data);
    return data;
};

export const checkOut = async (sessionData) => {
    const today = getCurrentDate();
    const timeNow = getCurrentTime();
    const docId = `${sessionData.docId}-${today}`;
    
    const docRef = doc(db, 'attendance', docId);
    const snap = await getDoc(docRef);
    if(!snap.exists()) throw new Error("No check-in record found for today");

    const record = snap.data();
    const totalSeconds = Number(record.inRangeWorkSeconds || 0);
    const totalHoursFloat = parseFloat((totalSeconds / 3600).toFixed(2));

    await updateDoc(docRef, {
        checkOut: timeNow,
        totalHours: totalHoursFloat,
        totalOutMins: Math.floor((Number(record.outOfRangeSeconds || 0)) / 60),
        lastSeenAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const loadStaffHistory = async (staffDocId) => {
    const q = query(
        collection(db, 'attendance'),
        where('staffDocId', '==', staffDocId),
        orderBy('date', 'desc'),
        limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const autoMarkOut = async (sessionData, pastDateStr, defaultEndTime) => {
     const docId = `${sessionData.docId}-${pastDateStr}`;
     const docRef = doc(db, 'attendance', docId);
     const snap = await getDoc(docRef);
     if (snap.exists()) {
        const record = snap.data();
        if(!record.checkOut && record.status !== 'Absent') {
            const totalSeconds = Number(record.inRangeWorkSeconds || 0);
            const totalHoursFloat = parseFloat((totalSeconds / 3600).toFixed(2));
            await updateDoc(docRef, {
                checkOut: defaultEndTime,
                totalHours: totalHoursFloat,
                totalOutMins: Math.floor((Number(record.outOfRangeSeconds || 0)) / 60),
                autoCheckout: true,
                lastSeenAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
     }
};
