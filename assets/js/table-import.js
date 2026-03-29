// Table import utility: import CSV to table (basic demo)
window.importCSVToTable = function(file, tableHost, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const text = e.target.result;
      const rows = text.trim().split(/\r?\n/).map(line => line.split(','));
      if (!rows.length) throw new Error('No data');
      // Build table HTML
      let html = '<table><thead><tr>';
      html += rows[0].map(h => `<th>${h.replace(/"/g, '')}</th>`).join('');
      html += '</tr></thead><tbody>';
      for (let i = 1; i < rows.length; i++) {
        html += '<tr>' + rows[i].map(cell => `<td>${cell.replace(/"/g, '')}</td>`).join('') + '</tr>';
      }
      html += '</tbody></table>';
      tableHost.innerHTML = html;
      if (onSuccess) onSuccess();
    } catch (err) {
      if (onError) onError(err);
    }
  };
  reader.onerror = function() {
    if (onError) onError(reader.error);
  };
  reader.readAsText(file);
};
