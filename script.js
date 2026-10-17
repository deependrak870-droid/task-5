
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const cartCount = document.getElementById("cart-count");
  const search = document.getElementById("search");
  const message = document.getElementById("message");
  const products = document.querySelectorAll(".product");
  const productGrid = document.querySelector(".products");

  if (!productGrid) {
    console.error("Product grid not found. Check your index.html.");
    return;
  }

  // Load the saved cart
  let cart = [];

  try {
    const savedCart = JSON.parse(
      localStorage.getItem("shopsmart-cart") || "[]"
    );

    if (Array.isArray(savedCart)) {
      cart = savedCart.filter(function (item) {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          Number.isFinite(item.price) &&
          item.price >= 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
        );
      });
    }
  } catch (error) {
    console.warn("Saved cart could not be loaded.", error);
  }

  // Create the cart section
  const cartSection = document.createElement("section");
  cartSection.id = "cart";
  cartSection.className = "cart-section";

  cartSection.innerHTML = `
    <h2>Your Shopping Cart</h2>
    <div id="cart-items"></div>

    <div class="cart-summary">
      <p>Total Items: <strong id="total-items">0</strong></p>
      <p>Total Price: <strong id="total-price">₹0.00</strong></p>
      <button type="button" id="clear-cart" class="clear-cart">
        Clear Cart
      </button>
    </div>
  `;

  productGrid.insertAdjacentElement("afterend", cartSection);

  const cartItems = document.getElementById("cart-items");
  const totalItems = document.getElementById("total-items");
  const totalPrice = document.getElementById("total-price");
  const clearCartButton = document.getElementById("clear-cart");

  // Read product information from the existing HTML
  function getProductDetails(product) {
    const heading = product.querySelector("h2, h3, h4, .product-name");

    const name =
      (heading && heading.textContent.trim()) ||
      product.dataset.name ||
      "Product";

    const priceSource = [
      product.dataset.price || "",
      ...Array.from(
        product.querySelectorAll(".price, p, strong, span")
      ).map(function (element) {
        return element.textContent;
      })
    ].join(" ");

    const priceMatch = priceSource.match(
      /(₹|Rs\.?|INR|\$|€|£)\s*([\d,]+(?:\.\d{1,2})?)/i
    );

    if (!priceMatch) {
      return null;
    }

    const price = Number(priceMatch[2].replace(/,/g, ""));

    if (!Number.isFinite(price) || price < 0) {
      return null;
    }

    let currency = priceMatch[1];

    if (/^(Rs\.?|INR)$/i.test(currency)) {
      currency = "₹";
    }

    return {
      id: product.dataset.name || name.toLowerCase(),
      name: name,
      price: price,
      currency: currency
    };
  }

  // Format prices
  function formatPrice(amount, currency) {
    return currency + amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Save cart in the browser
  function saveCart() {
    try {
      localStorage.setItem("shopsmart-cart", JSON.stringify(cart));
    } catch (error) {
      console.warn("Cart could not be saved.", error);
      showMessage("Cart could not be saved in this browser.");
    }
  }

  // Show a status message
  function showMessage(text) {
    if (message) {
      message.textContent = text;
    }
  }

  // Update cart count and contents
  function renderCart() {
    const itemCount = cart.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);

    cartCount.textContent = itemCount;
    totalItems.textContent = itemCount;

    cartItems.replaceChildren();

    if (cart.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-cart";
      emptyMessage.textContent = "Your cart is empty.";
      cartItems.appendChild(emptyMessage);
      totalPrice.textContent = "₹0.00";
      clearCartButton.disabled = true;
      return;
    }

    clearCartButton.disabled = false;

    let total = 0;
    let currency = cart[0].currency || "₹";

    cart.forEach(function (item) {
      total += item.price * item.quantity;

      const row = document.createElement("div");
      row.className = "cart-item";

      const details = document.createElement("div");
      details.className = "cart-item-details";

      const name = document.createElement("h3");
      name.textContent = item.name;

      const price = document.createElement("p");
      price.textContent =
        formatPrice(item.price, item.currency) + " each";

      details.append(name, price);

      const controls = document.createElement("div");
      controls.className = "cart-controls";

      const minusButton = document.createElement("button");
      minusButton.type = "button";
      minusButton.textContent = "−";
      minusButton.setAttribute("aria-label", "Decrease " + item.name);
      minusButton.dataset.action = "decrease";
      minusButton.dataset.id = item.id;

      const quantity = document.createElement("span");
      quantity.textContent = item.quantity;
      quantity.className = "cart-quantity";

      const plusButton = document.createElement("button");
      plusButton.type = "button";
      plusButton.textContent = "+";
      plusButton.setAttribute("aria-label", "Increase " + item.name);
      plusButton.dataset.action = "increase";
      plusButton.dataset.id = item.id;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.className = "remove-item";
      removeButton.dataset.action = "remove";
      removeButton.dataset.id = item.id;

      controls.append(
        minusButton,
        quantity,
        plusButton,
        removeButton
      );

      row.append(details, controls);
      cartItems.appendChild(row);
    });

    totalPrice.textContent = formatPrice(total, currency);
  }

  // Add products to cart
  document.querySelectorAll(".add-cart").forEach(function (button) {
    button.addEventListener("click", function () {
      const product = button.closest(".product");

      if (!product) {
        return;
      }

      const details = getProductDetails(product);

      if (!details) {
        showMessage(
          "Could not read this product's price. Check its HTML."
        );
        return;
      }

      const existingItem = cart.find(function (item) {
        return item.id === details.id;
      });

      if (existingItem) {
        existingItem.quantity++;
      } else {
        cart.push({
          ...details,
          quantity: 1
        });
      }

      saveCart();
      renderCart();
      showMessage(details.name + " added to your cart!");
    });
  });

  // Change quantity or remove an item
  cartItems.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const item = cart.find(function (product) {
      return product.id === button.dataset.id;
    });

    if (!item) {
      return;
    }

    switch (button.dataset.action) {
      case "increase":
        item.quantity++;
        break;

      case "decrease":
        item.quantity--;

        if (item.quantity <= 0) {
          cart = cart.filter(function (product) {
            return product.id !== item.id;
          });
        }
        break;

      case "remove":
        cart = cart.filter(function (product) {
          return product.id !== item.id;
        });
        break;
    }

    saveCart();
    renderCart();
    showMessage("Cart updated successfully!");
  });

  // Clear the entire cart
  clearCartButton.addEventListener("click", function () {
    cart = [];
    saveCart();
    renderCart();
    showMessage("Your cart has been cleared.");
  });

  // Search and filter products
  if (search) {
    search.addEventListener("input", function () {
      const query = search.value.trim().toLowerCase();
      let visibleCount = 0;

      products.forEach(function (product) {
        const name = (
          product.dataset.name ||
          product.textContent
        ).toLowerCase();

        product.hidden = !name.includes(query);

        if (!product.hidden) {
          visibleCount++;
        }
      });

      if (query && visibleCount === 0) {
        showMessage("No products found.");
      } else {
        showMessage("");
      }
    });
  }

  // Initial display
  renderCart();
});
