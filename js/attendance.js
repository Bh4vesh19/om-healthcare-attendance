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

  // Mark IN: persistent & resilient
  async markIn(session) {
    try {
      // 1. GPS Verification (Required)
      await GPS.verifyWithinRange(ALLOWED_RADIUS_METERS);

      const today = getCurrentDate();
      const timeStr = getCurrentTime().substring(0, 5); // HH:MM
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();

      const shiftStartMins = this.parseTimeToMinutes(session.shiftStart, "09:00");
      const shiftEndMins = this.parseTimeToMinutes(session.shiftEnd, "18:00");

      // 2. Strict Shift Rules
      // Rule 2: Cannot check in before shift start
      // Note: For night shifts, if it's currently Morning (e.g., 08:00) and shift is 21:00, it's too early.
      // But if it's 20:59, it's also too early.
      if (shiftStartMins <= shiftEndMins) {
          // Day shift
          if (nowMins < shiftStartMins) throw new Error(`Your shift has not started yet. Starts at ${session.shiftStart}.`);
          if (nowMins > shiftEndMins) throw new Error(`Your shift has already ended.`);
      } else {
          // Night shift (e.g., 21:00 to 01:00)
          // Valid only if we are in the [Start...23:59] or [00:00...End] window
          if (!this.isTimeInWindow(nowMins, shiftStartMins, shiftEndMins)) {
               // Check if it's "Before" the night (e.g., 18:00) or "After" the morning (e.g., 05:00)
               if (nowMins > shiftEndMins && nowMins < shiftStartMins) {
                   throw new Error(`Your shift has not started yet. Starts at ${session.shiftStart}.`);
               }
          }
      }

      const recordRef = db.collection('attendance').doc(`${session.docId}-${today}`);
      const record = await recordRef.get();
      if (record.exists) throw new Error('Already checked in today.');

      const grace = parseInt(session.lateGraceMins) || 15;
      let lateBy = 0;
      if (nowMins > shiftStartMins && nowMins < shiftStartMins + 720) { // 720 is 12h, basic protection
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
        lateByMins: lateBy,
        shiftStart: session.shiftStart || '09:00',
        shiftEnd: session.shiftEnd || '18:00',
        totalMinutes: 0,
        extraMinutes: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await recordRef.set(checkInData);
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await recordRef.set(absentData);
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
      await GPS.verifyWithinRange(ALLOWED_RADIUS_METERS);

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
          // Night shift end is roughly next morning. 
          // If checkout is after shift end (e.g., 01:00) but before some cutoff (e.g., 10:00 AM)
          if (nowMins > shiftEndMins && nowMins < shiftEndMins + 600) {
              extraMins = nowMins - shiftEndMins;
          }
      } else {
          // Day shift
          if (nowMins > shiftEndMins) {
              extraMins = nowMins - shiftEndMins;
          }
      }

      const updateData = {
        checkOut: timeStr,
        totalMinutes: totalMins,
        extraMinutes: extraMins,
        totalHours: parseFloat((totalMins / 60).toFixed(2)),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await recordRef.update(updateData);
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
