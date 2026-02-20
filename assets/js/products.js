function renderProducts() {
  const tbody = document.querySelector("#productTable tbody");
  const data = loadData();

  if (!data.products.length) {
    tbody.innerHTML = `<tr><td colspan="2">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.products
    .map((product) => {
      return `
        <tr>
          <td>${product.name}</td>
          <td>
            <button class="button" data-edit-id="${product.id}" type="button">Edit</button>
            <button class="button button-danger" data-delete-id="${product.id}" type="button">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-edit-id]").forEach((button) => {
    button.addEventListener("click", () => editProduct(button.dataset.editId));
  });

  tbody.querySelectorAll("button[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => removeProduct(button.dataset.deleteId));
  });
}

function handleAddProduct(event) {
  event.preventDefault();
  const input = document.getElementById("newProductName");
  const result = addProduct(input.value);

  if (!result.ok) {
    setStatus(result.message, "error");
    return;
  }

  input.value = "";
  renderProducts();
  setStatus("Product added.", "ok");
}

function editProduct(productId) {
  const data = loadData();
  const current = getProductById(data, productId);
  if (!current) {
    setStatus("Product not found.", "error");
    return;
  }

  const updatedName = prompt("Edit product name:", current.name);
  if (updatedName === null) return;

  const result = updateProduct(productId, updatedName);
  if (!result.ok) {
    setStatus(result.message, "error");
    return;
  }

  renderProducts();
  setStatus("Product updated.", "ok");
}

function removeProduct(productId) {
  const confirmed = confirm("Delete this product? It will remove related records.");
  if (!confirmed) return;

  deleteProduct(productId);
  renderProducts();
  setStatus("Product deleted.", "ok");
}

document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  const form = document.getElementById("productForm");
  const exportPdfButton = document.getElementById("exportProductsPdf");
  form.addEventListener("submit", handleAddProduct);
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", () => {
      exportTableAsPdf("productTable", "Product List", "products");
    });
  }
});
