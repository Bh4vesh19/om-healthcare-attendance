// Report Generation and Downloader
const ReportSvc = {
  currentRecords: [],

  triggerDownload: function(content, fileName, mimeType, extension) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${fileName}.${extension}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  getWorkingHoursText: function(record) {
    if (record.totalMinutes && Number(record.totalMinutes) > 0) {
      const hours = Math.floor(record.totalMinutes / 60);
      const mins = record.totalMinutes % 60;
      return `${hours}h ${mins}m`;
    }
    return '0h 0m';
  },

  getExtraHoursText: function(record) {
    if (record.extraMinutes && Number(record.extraMinutes) > 0) {
      const hours = Math.floor(record.extraMinutes / 60);
      const mins = record.extraMinutes % 60;
      return `${hours}h ${mins}m`;
    }
    return '0h 0m';
  },

  buildRows: function(records) {
    return records.map(r => ([
      `"${r.staffName || ''}"`,
      `"${r.date || ''}"`,
      `"${r.checkIn || '--:--'}"`,
      `"${r.checkOut || '--:--'}"`,
      `"${r.lateByMins || 0}"`,
      `"${this.getWorkingHoursText(r)}"`,
      `"${this.getExtraHoursText(r)}"`,
      `"${r.status || ''}"`
    ]));
  },

  // Generates CSV from attendance data
  downloadCSV: function(records, fileName) {
    if (!records || records.length === 0) {
      alert('No records found for the selected period.');
      return;
    }

    const headers = ['Staff Name', 'Date', 'Check-In', 'Check-Out', 'Late Minutes', 'Total Hours', 'Extra Hours', 'Status'];
    const rows = this.buildRows(records);

    const csvContent = 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(",")).join("\n");

    this.triggerDownload(csvContent, fileName, 'text/csv;charset=utf-8;', 'csv');
  },

  // Excel-compatible export
  downloadExcel: function(records, fileName) {
    if (!records || records.length === 0) {
      alert('No records found for the selected period.');
      return;
    }

    const headers = ['Staff Name', 'Date', 'Check-In', 'Check-Out', 'Late Minutes', 'Total Hours', 'Extra Hours', 'Status'];
    const rows = this.buildRows(records);
    
    // Using simple Tab-Separated Values which Excel opens perfectly
    const content = headers.join('\t') + '\n' + rows.map(e => e.join('\t').replace(/"/g, '')).join('\n');

    this.triggerDownload(content, fileName, 'application/vnd.ms-excel;charset=utf-8;', 'xls');
  },

  getMonthRange: function(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    return { start, end };
  },

  renderReportTable: function(records) {
    const tbody = document.getElementById('reportTableBody');
    const empty = document.getElementById('reportEmptyState');
    if (!tbody || !empty) return;

    if (!records.length) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${r.date || '--'}</td>
        <td>${r.staffName || '--'}</td>
        <td>${r.checkIn || '--:--'}</td>
        <td>${r.checkOut || '--:--'}</td>
        <td>${r.lateByMins || 0}</td>
        <td>${this.getWorkingHoursText(r)}</td>
        <td>${this.getExtraHoursText(r)}</td>
        <td><span class="badge ${r.status === 'Absent' ? 'badge-absent' : r.status === 'Late' ? 'badge-late' : 'badge-present'}">${r.status || 'Present'}</span></td>
      </tr>
    `).join('');
  },

  renderSummary: function(records) {
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const overtimeMinutes = records.reduce((sum, r) => sum + (Number(r.extraMinutes) || 0), 0);

    const presentEl = document.getElementById('reportPresent');
    const lateEl = document.getElementById('reportLate');
    const absentEl = document.getElementById('reportAbsent');
    const overtimeEl = document.getElementById('reportOvertime');

    if (presentEl) presentEl.textContent = present;
    if (lateEl) lateEl.textContent = late;
    if (absentEl) absentEl.textContent = absent;
    if (overtimeEl) overtimeEl.textContent = this.getExtraHoursText({ extraMinutes: overtimeMinutes });
  },

  populateStaffFilter: async function() {
    const select = document.getElementById('reportStaffFilter');
    if (!select || !window.AdminSvc) return;

    const staff = await window.AdminSvc.getAllActiveStaff();
    select.innerHTML = '<option value="all">All Staff</option>' + staff.map(s => `
      <option value="${s.id}">${s.name}</option>
    `).join('');
  },

  loadMonthlyReport: async function() {
    const monthInput = document.getElementById('reportMonth');
    const staffFilter = document.getElementById('reportStaffFilter');
    const statusFilter = document.getElementById('reportStatusFilter');
    if (!monthInput || !window.AdminSvc) return;

    const monthValue = monthInput.value;
    if (!monthValue) {
      alert('Please select a month.');
      return;
    }

    const { start, end } = this.getMonthRange(monthValue);
    const selectedStaff = staffFilter ? staffFilter.value : 'all';

    try {
      let records = [];
      if (selectedStaff && selectedStaff !== 'all') {
        records = await window.AdminSvc.loadAttendanceRangeForStaff(start, end, selectedStaff);
      } else {
        records = await window.AdminSvc.loadAttendanceRange(start, end);
      }

      const selectedStatus = statusFilter ? statusFilter.value : 'all';
      if (selectedStatus && selectedStatus !== 'all') {
        records = records.filter(record => (record.status || 'Present') === selectedStatus);
      }

      this.currentRecords = records;
      this.renderSummary(records);
      this.renderReportTable(records);
    } catch (error) {
      console.error('Report load failed:', error);
      this.currentRecords = [];
      this.renderSummary([]);
      this.renderReportTable([]);
      alert('Unable to load report data. Check the selected filters and Firestore indexes.');
    }
  },

  downloadMonthlyReport: async function(format) {
    if (!this.currentRecords.length) {
      await this.loadMonthlyReport();
    }

    if (!this.currentRecords.length) {
      alert('No records found for the selected filters.');
      return;
    }

    const monthValue = document.getElementById('reportMonth')?.value || 'report';
    const staffValue = document.getElementById('reportStaffFilter')?.value || 'all';
    const fileName = `attendance-${staffValue}-${monthValue}`;

    if (format === 'xls') {
      this.downloadExcel(this.currentRecords, fileName);
      return;
    }

    this.downloadCSV(this.currentRecords, fileName);
  }
};

window.ReportSvc = ReportSvc;
