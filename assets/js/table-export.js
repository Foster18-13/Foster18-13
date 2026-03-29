// Table export utility: export any table to CSV
window.exportTableToCSV = function(table) {
  let csv = [];
  const rows = table.querySelectorAll('tr');
  for (let row of rows) {
    let cols = Array.from(row.querySelectorAll('th,td'));
    csv.push(cols.map(col => '"' + col.innerText.replace(/"/g, '""') + '"').join(','));
  }
  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'table-export.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
};
