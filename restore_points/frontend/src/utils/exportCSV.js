export function exportToCSV(filename, rows) {
  if (!rows.length) return;
  const replacer = (key, value) => (value === null ? '' : value);
  const header = Object.keys(rows[0]);
  const csv = [
    header.join(','),
    ...rows.map(row =>
      header
        .map(fieldName => {
          let val = row[fieldName];
          if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
          return '"' + String(val).replace(/"/g, '""') + '"';
        })
        .join(',')
    )
  ].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
