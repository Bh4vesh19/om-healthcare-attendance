// Admin Dashboard logic
const AdminSvc = {
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
      console.error('❌ Firebase save error:', e);
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

  // Real-time listener for today's overall statistics & table records
  listenTodayStats(callback) {
    const today = getCurrentDate();
    return db.collection('attendance').where('date', '==', today).onSnapshot(snapshot => {
      const records = [];
      const stats = {
        present: 0,
        working: 0,
        late: 0,
        gpsFlagged: 0
      };

      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        records.push(data);

        if (data.status !== 'Absent') stats.present++;
        if (data.status !== 'Absent' && data.checkIn && !data.checkOut) stats.working++;
        if (data.status === 'Late') stats.late++;
        if (data.gpsFlagged === true) stats.gpsFlagged++;
      });
      callback(stats, records);
    });
  },

  listenStaffCount(callback) {
    return db.collection('staff').where('active', '==', true).onSnapshot(snap => {
      callback(snap.size);
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
      if (r.coords && r.coords.lat) {
        if (this.markers[r.staffDocId]) this.markers[r.staffDocId].setMap(null);
        this.markers[r.staffDocId] = new google.maps.Marker({
          position: { lat: r.coords.lat, lng: r.coords.lon },
          map: this.map,
          title: r.staffName,
          label: { text: r.staffName[0], color: 'white' },
          icon: r.gpsFlagged ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' : 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        });
      }
    });
  }
};
