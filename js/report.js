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
      return (Number(record.totalMinutes) / 60).toFixed(2);
    }
    if (record.checkIn && record.checkOut) {
      const [ih, im] = record.checkIn.split(':').map(Number);
      const [oh, om] = record.checkOut.split(':').map(Number);
      const mins = Math.max(0, (oh * 60 + om) - (ih * 60 + im));
      return (mins / 60).toFixed(2);
    }
    return '0';
  },

  buildRows: function(records) {
    return records.map(r => ([
      `"${r.staffName || ''}"`,
      `"${r.date || ''}"`,
      `"${r.checkIn || ''}"`,
      `"${r.checkOut || 'Active'}"`,
      `"${this.getWorkingHoursText(r)}"`,
      `"${r.status || ''}"`,
      `"${r.latitude || ''},${r.longitude || ''}"`
    ]));
  },

  // Generates CSV from attendance data
  downloadCSV: function(records, fileName) {
    if (!records || records.length === 0) {
      alert('No records found for the selected period.');
      return;
    }

    const headers = ['Staff Name', 'Date', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Lat/Long'];
    const rows = this.buildRows(records);

    const csvContent = 
      headers.join(',') + '\n' + 
      rows.map(e => e.join(",")).join("\n");

    this.triggerDownload(csvContent, fileName, 'text/csv;charset=utf-8;', 'csv');
  },

  // Excel-compatible export (CSV content with .xls extension)
  downloadExcel: function(records, fileName) {
    if (!records || records.length === 0) {
      alert('No records found for the selected period.');
      return;
    }

    const headers = ['Staff Name', 'Date', 'Check-In', 'Check-Out', 'Working Hours', 'Status', 'Lat/Long'];
    const rows = this.buildRows(records);
    const content = headers.join('\t') + '\n' + rows.map(e => e.join('\t')).join('\n');

    this.triggerDownload(content, fileName, 'application/vnd.ms-excel;charset=utf-8;', 'xls');
  }
};
