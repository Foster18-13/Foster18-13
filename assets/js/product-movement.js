function populateProductSelect() {
  const productSelect = document.getElementById("productSelect");
  const data = loadData();
  
  productSelect.innerHTML = '<option value="">-- Select a product --</option>';
  data.products.forEach(product => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = product.name;
    productSelect.appendChild(option);
  });
}

function viewProductMovement() {
  const productId = document.getElementById("productSelect").value;
  const resultsDiv = document.getElementById("movementResults");

  if (!productId) {
    resultsDiv.innerHTML = '<p class="text-error">Please select a product.</p>';
    return;
  }

  const data = loadData();
  const product = getProductById(data, productId);
  const movements = [];

  // Collect movement data across all dates
  Object.keys(data.dailyStores || {}).forEach(date => {
    const dayStore = data.dailyStores[date];

    ['day', 'night'].forEach(shift => {
      if (!dayStore[shift]) return;

      const balance = dayStore[shift].balance[productId] || {};
      const recording = dayStore[shift].recording[productId] || { entries: [] };
      
      const opening = asNumber(balance.opening);
      const received = asNumber(balance.received);
      const returns = asNumber(balance.returns);
      const damages = asNumber(balance.damages);
      const delivered = recording.entries.reduce((sum, entry) => sum + asNumber(entry.qty || 0), 0);
      const closing = asNumber(balance.closing);

      if (opening > 0 || received > 0 || delivered > 0 || closing > 0) {
        movements.push({
          date: date,
          shift: shift === 'day' ? 'Day' : 'Night',
          opening: opening,
          received: received,
          returns: returns,
          delivered: delivered,
          damages: damages,
          closing: closing
        });
      }
    });
  });

  if (movements.length === 0) {
    resultsDiv.innerHTML = `<p class="text-muted">No movement data found for "${product.name}".</p>`;
    return;
  }

  // Sort by date (newest first)
  movements.sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.shift === 'Night' ? 1 : -1;
  });

  // Calculate totals
  const totalReceived = movements.reduce((sum, m) => sum + m.received, 0);
  const totalDelivered = movements.reduce((sum, m) => sum + m.delivered, 0);
  const totalDamages = movements.reduce((sum, m) => sum + m.damages, 0);

  resultsDiv.innerHTML = `
    <div style="margin-bottom: 16px; padding: 12px; background: #e7f3ff; border-radius: 8px;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px;">${product.name} - Movement Summary</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
        <div><strong>Total Received:</strong> ${totalReceived}</div>
        <div><strong>Total Delivered:</strong> ${totalDelivered}</div>
        <div><strong>Total Damages:</strong> ${totalDamages}</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Shift</th>
            <th>Opening</th>
            <th>Received</th>
            <th>Returns</th>
            <th>Delivered</th>
            <th>Damages</th>
            <th>Closing</th>
          </tr>
        </thead>
        <tbody>
          ${movements.map(m => `
            <tr>
              <td>${m.date}</td>
              <td>${m.shift}</td>
              <td>${m.opening}</td>
              <td>${m.received}</td>
              <td>${m.returns}</td>
              <td>${m.delivered}</td>
              <td>${m.damages}</td>
              <td>${m.closing}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  populateProductSelect();
  document.getElementById("viewMovementButton").addEventListener("click", viewProductMovement);
});
