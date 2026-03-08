function renderVehiclesTable() {
  const tbody = document.querySelector("#vehiclesTable tbody");
  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  // Initialize vehicles array if it doesn't exist
  if (!dayStore.vehicles) {
    dayStore.vehicles = [];
    saveData(data);
  }

  if (!dayStore.vehicles.length) {
    tbody.innerHTML = `<tr><td colspan="7">No vehicle assignments for this date.</td></tr>`;
    return;
  }

  tbody.innerHTML = dayStore.vehicles
    .map((vehicle) => {
      const statusColors = {
        'Loading': '#ffc107',
        'In Transit': '#17a2b8',
        'Delivered': '#28a745',
        'Returned': '#dc3545'
      };
      const statusColor = statusColors[vehicle.status] || '#6c757d';
      
      return `
        <tr>
          <td><strong>${vehicle.vehicleNumber}</strong></td>
          <td>${vehicle.driverName}</td>
          <td>${vehicle.waybillRef}</td>
          <td>${vehicle.destination}</td>
          <td>${vehicle.departureTime}</td>
          <td><span style="padding: 4px 8px; background: ${statusColor}; color: white; border-radius: 4px; font-size: 11px;">${vehicle.status}</span></td>
          <td><button class="button button-danger" data-delete-id="${vehicle.id}" type="button">Delete</button></td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteVehicle(button.dataset.deleteId));
  });
}

function addVehicle(event) {
  event.preventDefault();

  const vehicleNumber = document.getElementById("vehicleNumber").value.trim();
  const driverName = document.getElementById("driverName").value.trim();
  const waybillRef = document.getElementById("waybillRef").value.trim();
  const destination = document.getElementById("destination").value.trim();
  const departureTime = document.getElementById("departureTime").value;
  const vehicleStatus = document.getElementById("vehicleStatus").value;

  if (!vehicleNumber || !driverName || !waybillRef || !destination || !departureTime) {
    setStatus("All fields are required.", "error");
    return;
  }

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);

  if (!dayStore.vehicles) {
    dayStore.vehicles = [];
  }

  dayStore.vehicles.push({
    id: generateId("vehicle"),
    vehicleNumber,
    driverName,
    waybillRef,
    destination,
    departureTime,
    status: vehicleStatus
  });

  saveData(data);
  addAuditLog("Vehicle assignment added", {
    vehicleNumber,
    driverName,
    destination,
    status: vehicleStatus
  });
  event.target.reset();
  renderVehiclesTable();
  setStatus("Vehicle assignment added.", "ok");
}

function deleteVehicle(id) {
  if (!confirm("Delete this vehicle assignment?")) return;

  const data = loadData();
  const date = getSelectedDate();
  const dayStore = getShiftStore(data, date);
  const existing = (dayStore.vehicles || []).find((v) => v.id === id);

  dayStore.vehicles = dayStore.vehicles.filter((v) => v.id !== id);
  saveData(data);
  addAuditLog("Vehicle assignment deleted", {
    vehicleNumber: existing?.vehicleNumber || "",
    driverName: existing?.driverName || "",
    destination: existing?.destination || ""
  });
  renderVehiclesTable();
  setStatus("Vehicle assignment deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderVehiclesTable();
  document.getElementById("vehicleForm").addEventListener("submit", addVehicle);
});
