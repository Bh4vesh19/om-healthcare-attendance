const AdminSvc = {
  _staffUnsubscribe: null,

  // Add new staff members
  async addStaff(name, password, role, shiftStart = "09:00", shiftEnd = "00:00", lateGrace = "15") {
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

  // Show skeleton loader immediately
  showTableSkeleton() {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = Array(5).fill(`
      <tr>
        <td><div class="skeleton" style="width:120px;height:16px"></div></td>
        <td><div class="skeleton" style="width:60px;height:16px"></div></td>
        <td><div class="skeleton" style="width:60px;height:16px"></div></td>
        <td><div class="skeleton" style="width:60px;height:16px"></div></td>
        <td><div class="skeleton" style="width:60px;height:16px"></div></td>
        <td><div class="skeleton" style="width:70px;height:24px;border-radius:20px"></div></td>
      </tr>
    `).join('');
  },

  // Auto-absent check for ALL staff on admin load
  async runAutoAbsentForAllStaff() {
    try {
      const activeStaff = await this.getAllActiveStaff();
      for (const staff of activeStaff) {
        await AttendanceSvc.checkAndMarkAbsent(
          staff.id,
          staff.name,
          staff.shiftStart || '09:00',
          staff.shiftEnd || '00:00',
          staff.role || 'Staff'
        );
      }
      console.log('[ADMIN] Auto-absent check completed for all staff');
    } catch (e) {
      console.error('[ADMIN] Auto-absent check error:', e);
    }
  },

  async listenTodayStats() {
    const today = getCurrentDate();
    const activeStaff = await this.getAllActiveStaff();
    
    // Show skeleton immediately
    this.showTableSkeleton();

    return db.collection('attendance').where('date', '==', today).onSnapshot(snapshot => {
      const recordsMap = {};
      snapshot.forEach(doc => {
        recordsMap[doc.data().staffDocId] = { id: doc.id, ...doc.data() };
      });

      const finalRecords = activeStaff.map(staff => {
        if (recordsMap[staff.id]) {
          return recordsMap[staff.id];
        }
        return {
          staffDocId: staff.id,
          staffName: staff.name,
          date: today,
          status: 'Not Checked In',
          checkIn: null,
          checkOut: null
        };
      });

      const stats = { present: 0, absent: 0, late: 0 };
      
      finalRecords.forEach(data => {
        if (data.status === 'Present' || data.status === 'Late') stats.present++;
        if (data.status === 'Absent') stats.absent++;
        if (data.status === 'Late') stats.late++;
      });

      // Update Status Cards
      document.getElementById('statPresent').textContent = stats.present;
      document.getElementById('statAbsent').textContent = stats.absent;
      document.getElementById('statLate').textContent = stats.late;

      // Update Table — replace skeleton with real data
      const tbody = document.getElementById('attendanceTableBody');
      if (tbody) {
        tbody.innerHTML = finalRecords.map(r => this.renderAttendanceRow(r)).join('');
      }
    });
  },

  renderAttendanceRow(r) {
    let statusClass = 'badge-present';
    let statusLabel = r.status || 'Present';
    if (r.status === 'Late') statusClass = 'badge-late';
    if (r.status === 'Absent') statusClass = 'badge-absent';

    const workHrs = this.calcWorkingHours(r.checkIn, r.checkOut, r.date);
    const extraTimeStr = this.formatDuration(r.extraMinutes || 0);

    // Auto tags
    const autoCheckoutTag = r.autoCheckout ? ' <span class="auto-tag auto-tag-amber">[Auto]</span>' : '';
    const autoAbsentTag = (r.autoAbsent && r.status === 'Absent') ? ' <span class="auto-tag auto-tag-grey">[Auto]</span>' : '';

    const checkOutDisplay = (r.checkOut || '--:--') + autoCheckoutTag;
    const statusDisplay = `<span class="badge ${statusClass}">${statusLabel}</span>${autoAbsentTag}`;

    const showAbsentBtn = (!r.checkIn && r.status !== 'Absent');

    return `
      <tr>
        <td class="staff-name">${r.staffName}</td>
        <td class="time-value">${r.checkIn || '--:--'}</td>
        <td class="time-value">${checkOutDisplay}</td>
        <td class="work-hours">${workHrs}</td>
        <td class="work-hours">${extraTimeStr}</td>
        <td>
          ${statusDisplay}
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
      const staffDoc = await db.collection('staff').doc(staffDocId).get();
      const staffName = staffDoc.data().name;
      
      await db.collection('attendance').doc(docId).set({
        staffDocId,
        staffName,
        date: today,
        status: 'Absent',
        checkIn: null,
        checkOut: null,
        autoCheckout: false,
        autoAbsent: false,
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
    const [endH, endM] = (record.shiftEnd || '00:00').split(':').map(Number);
    const boundary = new Date(`${record.date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    if (this.parseTimeToMinutes(record.shiftEnd, '00:00') <= this.parseTimeToMinutes(record.shiftStart, '09:00')) {
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
          autoCheckout: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (e) {
      console.error('Reconcile Open Attendance Error:', e);
    }
  },

  calcWorkingHours(checkInTime, checkOutTime, dateStr) {
    if (!checkInTime || checkInTime === '-') return '0.0h';
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
  }
};

window.AdminSvc = AdminSvc;

// ========================
// PDF Download Functions
// ========================

function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Header
  doc.setFontSize(18);
  doc.setTextColor(210, 153, 34);
  doc.text('OM Health Care', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Attendance Report', 14, 26);

  // Date
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.setFontSize(10);
  doc.text(`Date: ${today}`, 14, 33);

  // Generated at
  const time = new Date().toLocaleTimeString('en-IN');
  doc.text(`Generated at: ${time}`, 14, 39);

  // Table data from current dashboard table
  const rows = [];
  const tableRows = document.querySelectorAll('#attendanceTableBody tr');

  tableRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      rows.push([
        cells[0].innerText.trim(),
        cells[1].innerText.trim(),
        cells[2].innerText.trim(),
        cells[3].innerText.trim(),
        cells[4].innerText.trim(),
        cells[5].innerText.trim(),
      ]);
    }
  });

  if (rows.length === 0) {
    alert('No attendance data to download.');
    return;
  }

  // Generate table
  doc.autoTable({
    startY: 44,
    head: [['Staff Name', 'Check In', 'Check Out', 'Work Hours', 'Extra Time', 'Status']],
    body: rows,
    headStyles: {
      fillColor: [22, 27, 34],
      textColor: [88, 166, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fillColor: [13, 17, 23],
      textColor: [230, 237, 243],
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [22, 27, 34],
    },
    styles: {
      cellPadding: 4,
      lineColor: [48, 54, 61],
      lineWidth: 0.3,
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(139, 148, 158);
    doc.text(
      `OM Health Care — Confidential | Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  const fileName = `OM_Attendance_${getCurrentDate()}.pdf`;
  doc.save(fileName);
}

async function downloadMonthlyPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape', 'mm', 'a4');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  try {
    const records = await AdminSvc.loadAttendanceRange(startDate, endDate);
    if (!records || records.length === 0) {
      alert('No attendance records found for this month.');
      return;
    }

    // ── Page 1: Header ──
    doc.setFontSize(18);
    doc.setTextColor(210, 153, 34);
    doc.text('OM Health Care', 14, 18);

    doc.setFontSize(12);
    doc.setTextColor(230, 237, 243);
    doc.text('Monthly Attendance Report', 14, 26);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${monthName}`, 14, 33);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 39);

    // ── Staff Summary Table ──
    const staffMap = {};
    records.forEach(r => {
      const key = r.staffName || r.staffDocId || 'Unknown';
      if (!staffMap[key]) staffMap[key] = { present: 0, late: 0, absent: 0, extraMins: 0, totalDays: 0 };
      staffMap[key].totalDays++;
      if (r.status === 'Present') staffMap[key].present++;
      else if (r.status === 'Late') { staffMap[key].late++; staffMap[key].present++; }
      else if (r.status === 'Absent') staffMap[key].absent++;
      staffMap[key].extraMins += (r.extraMinutes || 0);
    });

    const summaryRows = Object.entries(staffMap).map(([name, s]) => [
      name,
      String(s.totalDays),
      String(s.present),
      String(s.late),
      String(s.absent),
      `${Math.floor(s.extraMins / 60)}h ${s.extraMins % 60}m`
    ]);

    doc.autoTable({
      startY: 46,
      head: [['Staff Name', 'Total Days', 'Present', 'Late', 'Absent', 'Extra Time']],
      body: summaryRows,
      headStyles: {
        fillColor: [22, 27, 34],
        textColor: [210, 153, 34],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fillColor: [13, 17, 23],
        textColor: [230, 237, 243],
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [22, 27, 34] },
      styles: { cellPadding: 5, lineColor: [48, 54, 61], lineWidth: 0.3 },
      margin: { left: 14, right: 14 },
      // Color-code status cells
      didParseCell: function(data) {
        if (data.section === 'body') {
          // Absent column (index 4) — red if > 0
          if (data.column.index === 4 && parseInt(data.cell.text[0]) > 0) {
            data.cell.styles.textColor = [248, 81, 73];
            data.cell.styles.fontStyle = 'bold';
          }
          // Late column (index 3) — amber if > 0
          if (data.column.index === 3 && parseInt(data.cell.text[0]) > 0) {
            data.cell.styles.textColor = [210, 153, 34];
            data.cell.styles.fontStyle = 'bold';
          }
          // Present column (index 2) — green
          if (data.column.index === 2 && parseInt(data.cell.text[0]) > 0) {
            data.cell.styles.textColor = [63, 185, 80];
          }
        }
      }
    });

    // ── All Records Table (continues on same/next page) ──
    const lastY = doc.lastAutoTable.finalY + 12;

    doc.setFontSize(11);
    doc.setTextColor(88, 166, 255);
    doc.text('Detailed Records', 14, lastY);

    // Sort all records by date then name
    records.sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.staffName || '').localeCompare(b.staffName || '');
    });

    const detailRows = records.map(r => [
      r.date || '-',
      r.staffName || '-',
      r.checkIn || '--:--',
      r.checkOut || '--:--',
      AdminSvc.calcWorkingHours(r.checkIn, r.checkOut, r.date),
      AdminSvc.formatDuration(r.extraMinutes || 0),
      r.status || '-'
    ]);

    doc.autoTable({
      startY: lastY + 4,
      head: [['Date', 'Staff Name', 'Check In', 'Check Out', 'Work Hours', 'Extra Time', 'Status']],
      body: detailRows,
      headStyles: {
        fillColor: [22, 27, 34],
        textColor: [88, 166, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fillColor: [13, 17, 23],
        textColor: [230, 237, 243],
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [22, 27, 34] },
      styles: { cellPadding: 3, lineColor: [48, 54, 61], lineWidth: 0.3 },
      margin: { left: 14, right: 14 },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 6) {
          const val = data.cell.text[0];
          if (val === 'Absent') data.cell.styles.textColor = [248, 81, 73];
          else if (val === 'Late') data.cell.styles.textColor = [210, 153, 34];
          else if (val === 'Present') data.cell.styles.textColor = [63, 185, 80];
        }
      }
    });

    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(139, 148, 158);
      doc.text(
        `OM Health Care — Confidential | Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.height - 8
      );
    }

    const fileName = `OM_Monthly_${startDate}_to_${endDate}.pdf`;
    doc.save(fileName);
  } catch (e) {
    console.error('Monthly PDF error:', e);
    alert('Error generating monthly PDF: ' + e.message);
  }
}

window.downloadPDF = downloadPDF;
window.downloadMonthlyPDF = downloadMonthlyPDF;
