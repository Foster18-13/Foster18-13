function renderProductsPage() {
  const list = document.getElementById("productsList");
  if (!list) return;

  const products = readProducts();
  list.innerHTML = "";

  products.forEach((product) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const nameInput = document.createElement("input");
    nameInput.value = product.name;
    nameInput.className = "input";

    const saveBtn = document.createElement("button");
    saveBtn.className = "button";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      renameProduct(product.id, nameInput.value);
      renderProductsPage();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "button";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", () => {
      if (confirm("Delete this product from all records?")) {
        deleteProduct(product.id);
        renderProductsPage();
      }
    });

    row.appendChild(nameInput);
    row.appendChild(saveBtn);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

function initProductsPage() {
  initProtectedPage();
  renderProductsPage();

  const addBtn = document.getElementById("addProductBtn");
  const newName = document.getElementById("newProductName");

  addBtn?.addEventListener("click", () => {
    const id = addProduct(newName?.value || "");
    if (!id) return;
    if (newName) newName.value = "";
    renderProductsPage();
  });
}
