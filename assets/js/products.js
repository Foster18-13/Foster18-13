function renderProducts() {
  const tbody = document.querySelector("#productTable tbody");
  const data = loadData();

  if (!data.products.length) {
    tbody.innerHTML = `<tr><td colspan="3">No products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.products
    .map((product) => {
      return `
        <tr>
          <td>${product.name}</td>
          <td>
            <input class="input" type="number" min="0.01" step="any" data-factor-id="${product.id}" value="${product.palletFactor ?? 1}" />
          </td>
          <td>
            <button class="button" data-save-factor-id="${product.id}" type="button">Save Factor</button>
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

  tbody.querySelectorAll("button[data-save-factor-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.saveFactorId;
      const factorInput = tbody.querySelector(`input[data-factor-id="${productId}"]`);
      const result = updateProductPalletFactor(productId, factorInput ? factorInput.value : "");
      if (!result.ok) {
        setStatus(result.message, "error");
        return;
      }

      setStatus("Pallet factor updated.", "ok");
      renderProducts();
    });
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
