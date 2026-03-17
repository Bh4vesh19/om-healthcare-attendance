// Attendance Handling logic for Staff
// Optimized for connectivity and offline persistence

const AttendanceSvc = {
  parseTimeToMinutes(timeStr, fallback = "00:00") {
    const safe = (timeStr || fallback).toString();
    const [h, m] = safe.split(':').map(Number);
    return ((Number.isFinite(h) ? h : 0) * 60) + (Number.isFinite(m) ? m : 0);
  },

  // Helper to handle time comparison including across midnight
  isTimeInWindow(nowMins, startMins, endMins) {
    if (startMins <= endMins) {
        // Day shift: e.g., 09:00 to 18:00
        return nowMins >= startMins && nowMins <= endMins;
    } else {
        // Night shift: e.g., 21:00 to 01:00
        return nowMins >= startMins || nowMins <= endMins;
    }
  },

  getShiftWindowStatus(session) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const shiftStartMins = this.parseTimeToMinutes(session.shiftStart, "09:00");
    const shiftEndMins = this.parseTimeToMinutes(session.shiftEnd, "18:00");

    const inWindow = this.isTimeInWindow(nowMins, shiftStartMins, shiftEndMins);
    
    if (!inWindow) {
      if (shiftStartMins <= shiftEndMins) {
        if (nowMins < shiftStartMins) return { canCheckIn: false, reason: "too-early" };
        return { canCheckIn: false, reason: "shift-ended" };
      } else {
        return { canCheckIn: false, reason: "too-early" };
      }
    }
    return { canCheckIn: true, reason: "within-shift" };
  },

  getShiftBoundary(recordDate, shiftStart, shiftEnd) {
    const [startH, startM] = (shiftStart || '09:00').split(':').map(Number);
    const [endH, endM] = (shiftEnd || '18:00').split(':').map(Number);
    const startDate = new Date(`${recordDate}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`);
    const endDate = new Date(`${recordDate}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);

    if (this.parseTimeToMinutes(shiftEnd, '18:00') <= this.parseTimeToMinutes(shiftStart, '09:00')) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return { startDate, endDate };
  },

  hasShiftEnded(record, now = new Date()) {
    if (!record || !record.date || !record.shiftEnd) return false;
    const { endDate } = this.getShiftBoundary(record.date, record.shiftStart || '09:00', record.shiftEnd || '18:00');
    return now >= endDate;
  },

  calculateDurationToShiftEnd(record) {
    const { endDate } = this.getShiftBoundary(record.date, record.shiftStart || '09:00', record.shiftEnd || '18:00');
    const checkInDate = new Date(`${record.date}T${(record.checkIn || '00:00')}:00`);
    const diffMins = Math.max(0, Math.floor((endDate.getTime() - checkInDate.getTime()) / 60000));
    return {
      totalMinutes: diffMins,
      totalHours: parseFloat((diffMins / 60).toFixed(2)),
      checkOut: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
    };
  },

  getCappedWorkedHours(record) {
    if (!record || !record.checkIn) return 0;
    if (record.checkOut) return Number(record.totalHours || 0);

    const { endDate } = this.getShiftBoundary(record.date, record.shiftStart || '09:00', record.shiftEnd || '18:00');
    const checkInDate = new Date(`${record.date}T${record.checkIn}:00`);
    const now = new Date();
    const effectiveEnd = now > endDate ? endDate : now;
    const diffMins = Math.max(0, Math.floor((effectiveEnd.getTime() - checkInDate.getTime()) / 60000));
    return parseFloat((diffMins / 60).toFixed(2));
  },

  // Exponential backoff for Firestore writes
  async resilientWrite(operation, maxRetries = 3) {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (e) {
            console.warn(`Write attempt ${i + 1} failed:`, e.code);
            // Don't retry if it's a permission or validation error
            if (e.code === 'permission-denied' || e.code === 'already-exists') throw e;
            if (i === maxRetries - 1) throw e;
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // Exponential backoff
        }
    }
  },

  // Mark IN: persistent & resilient
  async markIn(session) {
    try {
      // 1. GPS Verification (High accuracy for initial check)
      setGpsAccuracy(true);
      try {
        await GPS.verifyWithinRange(ALLOWED_RADIUS_METERS);
      } catch (e) {
        throw new Error("You must be within 100 meters of the store");
      }
      setGpsAccuracy(false); // Drop back for continuous tracking

      const today = getCurrentDate();
      const timeStr = getCurrentTime().substring(0, 5); // HH:MM
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const shiftStartMins = this.parseTimeToMinutes(session.shiftStart, "09:00");
      const shiftEndMins = this.parseTimeToMinutes(session.shiftEnd, "18:00");

      // 2. Strict Shift Rules
      if (shiftStartMins <= shiftEndMins) {
          if (nowMins < shiftStartMins) throw new Error("Your shift has not started yet");
          if (nowMins > shiftEndMins) throw new Error("Your shift has already ended");
      } else {
          // Night shift cross-midnight logic
          if (!this.isTimeInWindow(nowMins, shiftStartMins, shiftEndMins)) {
               if (nowMins > shiftEndMins && nowMins < shiftStartMins) {
                   throw new Error("Your shift has not started yet");
               } else {
                   throw new Error("Your shift has already ended");
               }
          }
      }

      const attendanceDocId = `${session.docId}-${today}`;
      const recordRef = db.collection('attendance').doc(attendanceDocId);
      const record = await recordRef.get();
      if (record.exists) throw new Error("You have already checked in today");

      const grace = parseInt(session.lateGraceMins) || 15;
      let lateBy = 0;
      if (nowMins > shiftStartMins && nowMins < shiftStartMins + 720) {
          lateBy = Math.max(0, nowMins - shiftStartMins);
      }
      
      const status = lateBy > grace ? 'Late' : 'Present';

      const checkInData = {
        staffDocId: session.docId,
        staffName: session.name,
        staffRole: session.staffRole || 'Staff',
        date: today,
        checkIn: timeStr,
        checkOut: null,
        status: status,
        zoneStatus: 'in_zone',
        outOfZoneSeconds: 0,
        outOfZoneStart: null,
        lateByMins: lateBy,
        shiftStart: session.shiftStart || '09:00',
        shiftEnd: session.shiftEnd || '18:00',
        totalMinutes: 0,
        extraMinutes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.resilientWrite(() => recordRef.set(checkInData));
      
      startContinuousGpsTracking(attendanceDocId);
      return checkInData;
    } catch (e) {
      setGpsAccuracy(false);
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.resilientWrite(() => recordRef.set(absentData));
      return absentData;
    } catch (e) {
      console.error('MarkAbsent Error:', e);
      throw e;
    }
  },

  // Mark OUT
  async markOut(session) {
    try {
      // 1. GPS Verification
      setGpsAccuracy(true);
      try {
        await GPS.verifyWithinRange(ALLOWED_RADIUS_METERS);
      } catch (e) {
        throw new Error("You must be within 100 meters of the store");
      }
      setGpsAccuracy(false);

      const today = getCurrentDate();
      const timeStr = getCurrentTime().substring(0, 5); // HH:MM
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      // For night shifts, the check-in might be on the previous day
      let recordRef = db.collection('attendance').doc(`${session.docId}-${today}`);
      let record = await recordRef.get();

      if (!record.exists) {
         // Check "Yesterday" in case of night shift or past-midnight checkout
         const yesterday = new Date(now.getTime() - 86400000);
         const yDay = yesterday.toISOString().split('T')[0];
         recordRef = db.collection('attendance').doc(`${session.docId}-${yDay}`);
         record = await recordRef.get();
      }

      if (!record.exists || record.data().checkOut) throw new Error('No active check-in found.');
      
      const data = record.data();
      const inMins = this.parseTimeToMinutes(data.checkIn);
      const shiftEndMins = this.parseTimeToMinutes(data.shiftEnd);

      // Total minutes calculation (handle midnight)
      let totalMins = 0;
      if (nowMins >= inMins) {
          totalMins = nowMins - inMins;
      } else {
          totalMins = (1440 - inMins) + nowMins; // Crossing midnight
      }

      // Extra hours calculation (checkOut > shiftEnd)
      let extraMins = 0;
      if (data.shiftStart > data.shiftEnd) {
          if (nowMins > shiftEndMins && nowMins < shiftEndMins + 600) {
              extraMins = nowMins - shiftEndMins;
          }
      } else {
          if (nowMins > shiftEndMins) {
              extraMins = nowMins - shiftEndMins;
          }
      }

      const updateData = {
        checkOut: timeStr,
        totalMinutes: totalMins,
        extraMinutes: extraMins,
        totalHours: parseFloat((totalMins / 60).toFixed(2)),
        zoneStatus: 'unknown',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await this.resilientWrite(() => recordRef.update(updateData));

      // Stop continuous tracking
      stopGpsTracking();

      return updateData;
    } catch (e) {
      setGpsAccuracy(false);
      throw e;
    }
  },

  // BUG 1 FIX: Auto Mark OUT at Shift End
  async autoMarkOut(session, recordDate, shiftEndTime) {
    try {
      console.log(`[AUTO-OUT] Attempting auto-checkout for ${recordDate}`);
      const recordRef = db.collection('attendance').doc(`${session.docId}-${recordDate}`);
      const record = await recordRef.get();
      
      if (!record.exists || record.data().checkOut) return;

      const data = record.data();
      const duration = this.calculateDurationToShiftEnd({
        ...data,
        date: recordDate,
        shiftEnd: shiftEndTime || data.shiftEnd
      });

      const updateData = {
        checkOut: duration.checkOut,
        totalMinutes: duration.totalMinutes,
        extraMinutes: 0,
        totalHours: duration.totalHours,
        isAutoClosed: true, // Marked as auto-closed
        zoneStatus: 'unknown', // Set to unknown
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await recordRef.update(updateData);
      
      // Stop tracking on auto-close
      stopGpsTracking();

      console.log(`[AUTO-OUT] Successfully auto-closed record for ${recordDate}`);
      return updateData;
    } catch (e) {
      console.error('[AUTO-OUT] Error:', e);
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
  },

  async getOpenRecordsForStaff(docId) {
    const snap = await db.collection('attendance')
      .where('staffDocId', '==', docId)
      .get();

    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(record => !record.checkOut)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5);
  }
};
