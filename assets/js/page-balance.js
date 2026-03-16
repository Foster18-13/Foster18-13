function renderBalanceSheet() {
  const host = document.getElementById("balanceTableHost");
  if (!host) return;

  const date = selectedDate();
  const products = readProducts();

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product Name</th>
        <th>Opening Stock</th>
        <th>Returns</th>
        <th>Goods Received</th>
        <th>Damages</th>
        <th>Loading</th>
        <th>Balance</th>
        <th>Closing Stock (Manual)</th>
        <th>Remark</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  const makeNumberInput = (value, onChange) => {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "1";
    input.min = "0";
    input.className = "input";
    input.value = value || "";
    input.addEventListener("change", () => onChange(input.value || 0));
    return input;
  };

  products.forEach((product) => {
    const row = document.createElement("tr");

    const opening = getBalanceField(date, "opening", product.id);
    const returnsValue = getBalanceField(date, "returns", product.id);
    const damages = getBalanceField(date, "damages", product.id);
    const closing = getBalanceField(date, "closing", product.id);
    const remark = getBalanceRemark(date, product.id);
    const loading = loadingByProduct(date, product.id);
    const goods = goodsReceivedByProduct(date, product.id);
    const balance = balanceComputed(date, product.id);

    const productCell = document.createElement("td");
    productCell.textContent = product.name;
    row.appendChild(productCell);

    const openingCell = document.createElement("td");
    openingCell.appendChild(makeNumberInput(opening, (v) => {
      setBalanceField(date, "opening", product.id, v);
      renderBalanceSheet();
    }));
    row.appendChild(openingCell);

    const returnsCell = document.createElement("td");
    returnsCell.appendChild(makeNumberInput(returnsValue, (v) => {
      setBalanceField(date, "returns", product.id, v);
      renderBalanceSheet();
    }));
    row.appendChild(returnsCell);

    const goodsCell = document.createElement("td");
    goodsCell.textContent = String(goods);
    row.appendChild(goodsCell);

    const damageCell = document.createElement("td");
    damageCell.appendChild(makeNumberInput(damages, (v) => {
      setBalanceField(date, "damages", product.id, v);
      renderBalanceSheet();
    }));
    row.appendChild(damageCell);

    const loadingCell = document.createElement("td");
    loadingCell.textContent = String(loading);
    row.appendChild(loadingCell);

    const balanceCell = document.createElement("td");
    balanceCell.textContent = String(balance);
    row.appendChild(balanceCell);

    const closingCell = document.createElement("td");
    closingCell.appendChild(makeNumberInput(closing, (v) => {
      setBalanceField(date, "closing", product.id, v);
      renderBalanceSheet();
    }));
    row.appendChild(closingCell);

    const remarkCell = document.createElement("td");
    const remarkInput = document.createElement("input");
    remarkInput.type = "text";
    remarkInput.className = "input";
    remarkInput.value = remark;
    remarkInput.addEventListener("change", () => {
      setBalanceField(date, "remarks", product.id, remarkInput.value);
    });
    remarkCell.appendChild(remarkInput);
    row.appendChild(remarkCell);

    tbody.appendChild(row);
  });

  host.innerHTML = "";
  host.appendChild(table);
}

function initBalancePage() {
  initProtectedPage();
  renderBalanceSheet();
}
