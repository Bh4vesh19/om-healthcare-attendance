// Report Generation and Downloader
const ReportSvc = {
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
  }
};
