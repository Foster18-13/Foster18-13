function renderRecordingTable() {
  const host = document.getElementById("recordingTableHost");
  const date = selectedDate();
  if (!host) return;

  const products = readProducts();
  const recording = readRecording(date);
  const columnCount = recording.columnCount;

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const body = document.createElement("tbody");

  const tr = document.createElement("tr");
  tr.innerHTML = `<th>Product</th>${Array.from({ length: columnCount }).map((_, idx) => `<th>Col ${idx + 1}</th>`).join("")}<th>Total Loading</th>`;
  head.appendChild(tr);

  products.forEach((product) => {
    const row = document.createElement("tr");
    const title = document.createElement("td");
    title.textContent = product.name;
    row.appendChild(title);

    for (let i = 0; i < columnCount; i += 1) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "1";
      input.className = "input";
      const values = recording.entries[product.id] || [];
      input.value = values[i] || "";
      input.addEventListener("change", () => {
        setRecordingValue(date, product.id, i, input.value || 0);
        renderRecordingTable();
      });
      td.appendChild(input);
      row.appendChild(td);
    }

    const total = document.createElement("td");
    total.textContent = String(loadingByProduct(date, product.id));
    row.appendChild(total);

    body.appendChild(row);
  });

  table.appendChild(head);
  table.appendChild(body);

  host.innerHTML = "";
  host.appendChild(table);
}

function initRecordingPage() {
  initProtectedPage();
  renderRecordingTable();

  const addColumnBtn = document.getElementById("addColumnBtn");
  addColumnBtn?.addEventListener("click", () => {
    const date = selectedDate();
    const current = readRecording(date).columnCount;
    setRecordingColumnCount(date, current + 1);
    renderRecordingTable();
  });
}
