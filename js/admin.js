const AdminSvc = {
  _staffUnsubscribe: null,

  // Add new staff members
  async addStaff(name, password, role, shiftStart = "09:00", shiftEnd = "18:00", lateGrace = "15") {
    const nameTrimmed = name.trim();
    const nameLower = nameTrimmed.toLowerCase();
    
    try {
      const q = await db.collection('staff').where('nameLower', '==', nameLower).limit(1).get();
      if (!q.empty) {
        throw new Error('Staff name already exists. Please use a unique name.');
      }

      const newStaff = {
        name: nameTrimmed,
        nameLower: nameLower,
        password: password.trim(),
        role: role,
        shiftStart: shiftStart,
        shiftEnd: shiftEnd,
        lateGraceMins: parseInt(lateGrace) || 15,
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('staff').add(newStaff);
      return { id: docRef.id, ...newStaff };
    } catch (e) {
      throw e;
    }
  },

  async deleteStaff(id) {
    try {
      await db.collection('staff').doc(id).delete();
    } catch (e) {
      console.error('Delete Staff Error:', e);
      throw e;
    }
  },

  async updateStaff(id, updatedData) {
    try {
      const data = {
        name: updatedData.name.trim(),
        nameLower: updatedData.name.trim().toLowerCase(),
        password: updatedData.password.trim(),
        role: updatedData.role,
        shiftStart: updatedData.shiftStart,
        shiftEnd: updatedData.shiftEnd,
        lateGraceMins: parseInt(updatedData.lateGrace) || 15,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('staff').doc(id).update(data);
      return { id, ...data };
    } catch (e) {
      console.error('Update Staff Error:', e);
      throw e;
    }
  },

  async getStaffById(id) {
    const doc = await db.collection('staff').doc(id).get();
    if (!doc.exists) {
      throw new Error('Staff record not found.');
    }
    return { id: doc.id, ...doc.data() };
  },

  async listenTodayStats() {
    const today = getCurrentDate();
    const activeStaff = await this.getAllActiveStaff();
    
    return db.collection('attendance').where('date', '==', today).onSnapshot(snapshot => {
      const recordsMap = {};
      snapshot.forEach(doc => {
        recordsMap[doc.data().staffDocId] = { id: doc.id, ...doc.data() };
      });

      const finalRecords = activeStaff.map(staff => {
        if (recordsMap[staff.id]) {
          const data = recordsMap[staff.id];
          data.zoneStatusResolved = this.getResolvedZoneStatus(data);
          return data;
        }
        // Staff member who hasn't checked in yet
        return {
          staffDocId: staff.id,
          staffName: staff.name,
          date: today,
          status: 'Not Checked In',
          checkIn: null,
          checkOut: null
        };
      });

      const stats = { present: 0, absent: 0, late: 0, gpsFlagged: 0 };
      
      finalRecords.forEach(data => {
        if (data.status === 'Present' || data.status === 'Late') stats.present++;
        if (data.status === 'Absent') stats.absent++;
        if (data.status === 'Late') stats.late++;
        if (data.zoneStatusResolved === 'out_of_zone') stats.gpsFlagged++;
      });

      // Update Map
      this.updateMapMarkers(finalRecords.filter(r => r.checkIn));

      // Update Status Cards
      document.getElementById('statPresent').textContent = stats.present;
      document.getElementById('statAbsent').textContent = stats.absent;
      document.getElementById('statLate').textContent = stats.late;
      document.getElementById('statGpsFlagged').textContent = stats.gpsFlagged;

      // Update Table
      const tbody = document.getElementById('attendanceTableBody');
      if (tbody) {
        tbody.innerHTML = finalRecords.map(r => this.renderAttendanceRow(r)).join('');
      }
    });
  },

  renderAttendanceRow(r) {
    const resolvedZone = this.getResolvedZoneStatus(r);
    const zoneClass = resolvedZone === 'in_zone' ? 'zone-in' : (resolvedZone === 'out_of_zone' ? 'zone-out' : 'zone-unknown');
    const zoneLabel = resolvedZone === 'in_zone' ? 'IN ZONE' : (resolvedZone === 'out_of_zone' ? 'OUT' : 'Unknown');
    
    let statusClass = 'badge-present';
    if (r.status === 'Late') statusClass = 'badge-late';
    if (r.status === 'Absent') statusClass = 'badge-absent';

    const workHrs = this.calcWorkingHours(r.checkIn, r.checkOut, r.date);
    
    let outTimeClass = 'out-zero';
    const outMins = r.totalOutMins || 0;
    if (outMins > 0 && outMins <= 10) outTimeClass = 'out-amber';
    if (outMins > 10) outTimeClass = 'out-red';
    
    const outTimeStr = outMins > 60 ? `${Math.floor(outMins/60)}h ${outMins%60}m` : `${outMins}m`;
    const extraTimeStr = this.formatDuration(r.extraMinutes || 0);

    const showAbsentBtn = (!r.checkIn && r.status !== 'Absent');

    return `
      <tr class="${r.gpsFlagged ? 'flagged-row' : ''}">
        <td class="staff-name">${r.staffName}</td>
        <td class="time-value">${r.checkIn || '--:--'}</td>
        <td class="time-value">${r.checkOut || '--:--'}</td>
        <td class="work-hours">${workHrs}</td>
        <td>
          <div class="zone-cell">
            <span class="zone-dot ${zoneClass}"></span>
            <span class="zone-label-${resolvedZone || 'unknown'}">${zoneLabel}</span>
          </div>
        </td>
        <td class="${outTimeClass}">${outTimeStr}</td>
        <td class="work-hours">${extraTimeStr}</td>
        <td><span class="badge ${statusClass}">${r.status || 'Present'}</span></td>
        <td>
          ${showAbsentBtn ? `<button class="btn-absent" onclick="AdminSvc.markAbsent('${r.staffDocId}')">❌ Mark Absent</button>` : ''}
        </td>
      </tr>
    `;
  },

  async markAbsent(staffDocId) {
    if (!confirm("Mark this staff as absent for today?")) return;
    const today = getCurrentDate();
    const docId = `${staffDocId}-${today}`;
    try {
      // Get staff name
      const staffDoc = await db.collection('staff').doc(staffDocId).get();
      const staffName = staffDoc.data().name;
      
      await db.collection('attendance').doc(docId).set({
        staffDocId,
        staffName,
        date: today,
        status: 'Absent',
        checkIn: null,
        checkOut: null,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) { alert("Error: " + e.message); }
  },

  refreshStaffTable() {
    if (this._staffUnsubscribe) {
      this._staffUnsubscribe();
    }

    this._staffUnsubscribe = db.collection('staff').where('active', '==', true).onSnapshot(snap => {
      const tbody = document.getElementById('staffTableBody');
      if (!tbody) return;
      tbody.innerHTML = snap.docs.map(doc => {
        const s = doc.data();
        return `
          <tr>
            <td>${s.name}</td>
            <td>${s.role}</td>
            <td>${s.shiftStart} - ${s.shiftEnd}</td>
            <td>${s.lateGraceMins}m</td>
            <td>
              <div class="staff-action-group">
                <button class="btn btn-primary" onclick="editStaffFromTable('${doc.id}')">Edit</button>
                <button class="btn btn-ghost" onclick="AdminSvc.deleteStaff('${doc.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    });
  },

  listenStaffCount(callback) {
    return db.collection('staff').where('active', '==', true).onSnapshot(snap => {
      if (typeof callback === 'function') {
        callback(snap.size);
      }
    });
  },

  async loadAttendanceRange(startDate, endDate) {
    try {
      let q = db.collection('attendance')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .orderBy('date', 'desc');

      const snapshot = await q.get();
      const records = [];
      snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });
      return records;
    } catch (e) {
      console.error('Load Attendance List Error:', e);
      throw e;
    }
  },

  async loadAttendanceRangeForStaff(startDate, endDate, staffDocId) {
    try {
      const records = await this.loadAttendanceRange(startDate, endDate);
      return records.filter(record => record.staffDocId === staffDocId);
    } catch (e) {
      console.error('Load Attendance For Staff Error:', e);
      throw e;
    }
  },

  async getAllActiveStaff() {
    const snap = await db.collection('staff').where('active', '==', true).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  parseTimeToMinutes(timeStr, fallback = '00:00') {
    const safe = (timeStr || fallback).toString();
    const [h, m] = safe.split(':').map(Number);
    return ((Number.isFinite(h) ? h : 0) * 60) + (Number.isFinite(m) ? m : 0);
  },

  getShiftEndBoundary(record) {
    const [endH, endM] = (record.shiftEnd || '18:00').split(':').map(Number);
    const boundary = new Date(`${record.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    if (this.parseTimeToMinutes(record.shiftEnd, '18:00') <= this.parseTimeToMinutes(record.shiftStart, '09:00')) {
      boundary.setDate(boundary.getDate() + 1);
    }
    return boundary;
  },

  async reconcileOpenAttendanceRecords() {
    try {
      const openSnap = await db.collection('attendance').where('checkOut', '==', null).get();
      const now = new Date();

      for (const doc of openSnap.docs) {
        const record = { id: doc.id, ...doc.data() };
        if (!record.checkIn || record.status === 'Absent') continue;

        const shiftEndBoundary = this.getShiftEndBoundary(record);
        if (now < shiftEndBoundary) continue;

        const checkInDate = new Date(`${record.date}T${record.checkIn}:00`);
        const totalMinutes = Math.max(0, Math.floor((shiftEndBoundary.getTime() - checkInDate.getTime()) / 60000));

        await db.collection('attendance').doc(doc.id).update({
          checkOut: `${String(shiftEndBoundary.getHours()).padStart(2, '0')}:${String(shiftEndBoundary.getMinutes()).padStart(2, '0')}`,
          totalMinutes,
          totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
          extraMinutes: 0,
          isAutoClosed: true,
          zoneStatus: 'unknown',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Reconcile Open Attendance Error:', e);
    }
  },

  calcWorkingHours(checkInTime, checkOutTime, dateStr) {
    if (!checkInTime || checkInTime === '-') return '0.0h';
    const [inH, inM] = checkInTime.split(':').map(Number);
    const checkInDate = new Date(`${dateStr}T${checkInTime}:00`);
    let now = new Date();
    if (checkOutTime && checkOutTime !== '-' && checkOutTime !== null) {
      now = new Date(`${dateStr}T${checkOutTime}:00`);
    }
    const diffMins = Math.floor((now - checkInDate) / 60000);
    if (diffMins < 0) return '0.0h';
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  },

  formatDuration(minutes) {
    const safeMinutes = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(safeMinutes / 60);
    const mins = safeMinutes % 60;
    return `${hours}h ${mins}m`;
  },

  getResolvedZoneStatus(record) {
    const coords = record.lastCoords || record.coords;
    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon)) {
      const distance = getDistanceMeters(coords.lat, coords.lon, SHOP_LAT, SHOP_LNG);
      return distance <= ALLOWED_RADIUS_METERS ? 'in_zone' : 'out_of_zone';
    }
    return record.zoneStatus || 'unknown';
  },

  initMap(containerId) {
    if (typeof google === 'undefined') return;
    const shopLoc = { lat: SHOP_LAT, lng: SHOP_LNG };
    this.map = new google.maps.Map(document.getElementById(containerId), {
      zoom: 17,
      center: shopLoc,
      styles: [
        { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
      ]
    });

    new google.maps.Marker({
      position: shopLoc,
      map: this.map,
      title: "OM Health Care",
      icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });

    new google.maps.Circle({
      strokeColor: "#4caf7d",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#4caf7d",
      fillOpacity: 0.15,
      map: this.map,
      center: shopLoc,
      radius: ALLOWED_RADIUS_METERS
    });

    this.markers = {};
  },

  updateMapMarkers(records) {
    if (!this.map || !this.markers) return;
    records.forEach(r => {
      // Use lastCoords from new GPS implementation
      const coords = r.lastCoords || r.coords;
      if (coords && coords.lat) {
        if (this.markers[r.staffDocId]) this.markers[r.staffDocId].setMap(null);
        
        const z = this.getResolvedZoneStatus(r).toLowerCase();
        let iconUrl = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'; // in_zone
        if (z === 'out_of_zone') iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
        else if (z === 'unknown') iconUrl = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';

        this.markers[r.staffDocId] = new google.maps.Marker({
          position: { lat: coords.lat, lng: coords.lon },
          map: this.map,
          title: r.staffName,
          label: { text: r.staffName[0].toUpperCase(), color: 'white' },
          icon: iconUrl
        });
      }
    });
  }
};

window.AdminSvc = AdminSvc;
