// Attendance Handling logic for Staff
// Optimized for connectivity and offline persistence

const AttendanceSvc = {
  parseTimeToMinutes(timeStr, fallback = "00:00") {
    const safe = (timeStr || fallback).toString();
    const [h, m] = safe.split(':').map(Number);
    return ((Number.isFinite(h) ? h : 0) * 60) + (Number.isFinite(m) ? m : 0);
  },

  getShiftWindowStatus(session) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const shiftStartMins = this.parseTimeToMinutes(session.shiftStart, "09:00");
    const shiftEndMins = this.parseTimeToMinutes(session.shiftEnd, "18:00");

    if (nowMins < (shiftStartMins - 60)) {
       return { canCheckIn: false, reason: "too-early", nowMins, shiftStartMins, shiftEndMins };
    }
    if (nowMins > shiftEndMins) {
      return { canCheckIn: false, reason: "shift-ended", nowMins, shiftStartMins, shiftEndMins };
    }
    return { canCheckIn: true, reason: "within-shift", nowMins, shiftStartMins, shiftEndMins };
  },

  // Mark IN: persistent & resilient
  async markIn(session) {
    try {
      const today = getCurrentDate();
      const timeStr = getCurrentTime().substring(0, 5); // HH:MM
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const recordRef = db.collection('attendance').doc(`${session.docId}-${today}`);

      // Check if already checked in (using cache for speed)
      let record;
      try {
        record = await recordRef.get({ source: 'cache' });
      } catch (e) {
        record = await recordRef.get();
      }
      
      if (record.exists) throw new Error('Already checked in today.');

      const [shiftH, shiftM] = (session.shiftStart || "09:00").split(':').map(Number);
      const shiftStartMins = shiftH * 60 + shiftM;

      // Logic check
      if (nowMins < (shiftStartMins - 60)) {
          throw new Error(`Too early. Shift starts at ${session.shiftStart}.`);
      }

      const grace = parseInt(session.lateGraceMins) || 15;
      const status = nowMins <= (shiftStartMins + grace) 
        ? (nowMins <= shiftStartMins ? 'Present' : 'Late') 
        : 'Late';
      const lateBy = Math.max(0, nowMins - shiftStartMins);

      const checkInData = {
        staffDocId: session.docId,
        staffName: session.name,
        staffRole: session.staffRole || 'Staff',
        date: today,
        checkIn: timeStr,
        checkOut: null,
        status: status,
        lateByMins: lateBy,
        shiftStart: session.shiftStart || '09:00',
        shiftEnd: session.shiftEnd || '18:00',
        totalMinutes: 0,
        extraMinutes: 0,
        totalSecondsInZone: 0,
        gpsFlagged: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // Set with offline support (no await on purpose to return early if offline)
      recordRef.set(checkInData).catch(e => console.error("Persistence error:", e));
      return checkInData;
    } catch (e) {
      console.error('MarkIn Error:', e);
      throw e;
    }
  },

  // Mark ABSENT for current date
  async markAbsent(session) {
    try {
      const today = getCurrentDate();
      const recordRef = db.collection('attendance').doc(`${session.docId}-${today}`);

      const absentData = {
        staffDocId: session.docId,
        staffName: session.name,
        staffRole: session.staffRole || 'Staff',
        date: today,
        checkIn: null,
        checkOut: null,
        status: 'Absent',
        lateByMins: 0,
        shiftStart: session.shiftStart || '09:00',
        shiftEnd: session.shiftEnd || '18:00',
        totalMinutes: 0,
        extraMinutes: 0,
        totalSecondsInZone: 0,
        gpsFlagged: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await recordRef.set(absentData);
      return absentData;
    } catch (e) {
      console.error('MarkAbsent Error:', e);
      throw e;
    }
  },

  // Mark OUT: persistent & resilient
  async markOut(session) {
    try {
      const today = getCurrentDate();
      const timeStr = getCurrentTime().substring(0, 5); // HH:MM
      const now = new Date();

      const recordRef = db.collection('attendance').doc(`${session.docId}-${today}`);
      const record = await recordRef.get();

      if (!record.exists) throw new Error('No active check-in found.');
      const data = record.data();
      if (data.checkOut) throw new Error('Already marked out today.');
      if (data.status === 'Absent') throw new Error('Cannot check out after marking absent.');

      const inTime = data.checkIn;
      const [inH, inM] = inTime.split(':').map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const totalMins = Math.max(0, nowMins - (inH * 60 + inM));
      
      const shiftEndMins = this.parseTimeToMinutes(data.shiftEnd, "18:00");
      const extraMinutes = Math.max(0, nowMins - shiftEndMins);

      const updateData = {
        checkOut: timeStr,
        totalMinutes: totalMins,
        extraMinutes: extraMinutes,
        totalHours: parseFloat((totalMins / 60).toFixed(2)),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      recordRef.update(updateData).catch(e => console.error("Persistence error:", e));
      return updateData;
    } catch (e) {
      console.error('MarkOut Error:', e);
      throw e;
    }
  },

  async checkAlreadyCheckedIn(staffDocId) {
    const today = getCurrentDate();
    try {
       const doc = await db.collection('attendance').doc(`${staffDocId}-${today}`).get({ source: 'cache' });
       return doc.exists;
    } catch (e) {
       const doc = await db.collection('attendance').doc(`${staffDocId}-${today}`).get();
       return doc.exists;
    }
  },

  getTodayRecord(docId, callback) {
    const today = getCurrentDate();
    const fullDocId = `${docId}-${today}`;
    return db.collection('attendance').doc(fullDocId).onSnapshot(doc => {
      if (doc.exists) {
        callback(doc.data());
      } else {
        callback(null);
      }
    });
  }
};
