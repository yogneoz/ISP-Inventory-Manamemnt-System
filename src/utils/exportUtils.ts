/**
 * CSV / Excel Data Exporter Utility for IZone Multi-Branch ERP
 */

export function exportToCSV<T extends Record<string, any>>(
  filename: string,
  data: T[],
  columns: { key: keyof T | string; label: string; formatter?: (value: any, row: T) => string }[]
) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // Header row
  const headers = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let val = (row as any)[col.key];
        if (col.formatter) {
          val = col.formatter(val, row);
        } else if (val === null || val === undefined) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        const stringVal = String(val).replace(/"/g, '""');
        return `"${stringVal}"`;
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...rows].join('\n'); // Add UTF-8 BOM for Excel compatibility

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
