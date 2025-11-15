/**
 * Voucher Integration for Digital Menu
 * Provides functionality to validate, apply and remove vouchers
 * Using localStorage for storage since API endpoints are not available
 */

// Instead of redeclaring API_BASE_URL, we'll use the one that's already defined
// in script.js or cart.js
// const API_BASE_URL = "http://localhost:5050";

// Function to fetch public vouchers from the API
async function fetchPublicVouchers() {
  try {
    const API_BASE_URL = "http://localhost:5000"; // Use the API base URL
    const response = await fetch(`${API_BASE_URL}/api/vouchers/public`);

    if (!response.ok) {
      console.warn(`Failed to fetch vouchers: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error("Error fetching public vouchers:", error);
    return null;
  }
}

// Modify any function that makes a direct API call to vouchers
async function validateVoucherWithAPI(code, orderValue) {
  try {
    const API_BASE_URL = "http://localhost:5000";

    console.log(
      `Validating voucher with API: ${code}, orderValue: ${orderValue}`
    );

    // Get authentication token if available
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };

    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/vouchers/validate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: code,
          orderValue: orderValue,
        }),
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      console.log("Voucher validation response status:", response.status);

      // If response is not ok, handle the error
      if (!response.ok) {
        // Get error details if available
        let errorMsg = "Error validating voucher";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        return {
          success: false,
          message: errorMsg,
          status: response.status,
        };
      }

      // Parse success response
      const result = await response.json();
      console.log("Voucher API result:", result);

      return result;
    } catch (fetchError) {
      // Clear the timeout
      clearTimeout(timeoutId);

      if (fetchError.name === "AbortError") {
        console.error("Voucher API request timeout");
        return {
          success: false,
          message: "Request timed out, please try again",
        };
      }

      throw fetchError;
    }
  } catch (error) {
    console.error("Error validating voucher with API:", error);
    return {
      success: false,
      message: error.message || "Error validating voucher",
      error: String(error),
    };
  }
}

// Validate and apply a voucher code
async function applyVoucher(voucherCode) {
  if (!voucherCode) {
    showToast(
      "الرجاء إدخال كود القسيمة",
      "error",
      "يجب إدخال كود القسيمة لتطبيقها على الطلب"
    );
    return;
  }

  // Get current cart total
  const cartItems = getCartItems();
  const cartTotal = calculateCartTotal(cartItems);

  try {
    // Show loading state
    const applyButton =
      document.getElementById("apply-voucher-btn") ||
      document.getElementById("apply-voucher");
    if (applyButton) {
      applyButton.disabled = true;
      applyButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
    }

    // Mock validation instead of API call
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simple validation - accept codes that start with "DISCOUNT"
    const isValid = voucherCode.toUpperCase().startsWith("DISCOUNT");

    // Reset button state
    if (applyButton) {
      applyButton.disabled = false;
      applyButton.innerHTML =
        applyButton.id === "apply-voucher" ? "تطبيق" : "Apply Voucher";
    }

    if (!isValid) {
      showToast(
        "كود القسيمة غير صالح",
        "error",
        "الرجاء التحقق من الكود والمحاولة مرة أخرى"
      );
      return;
    }

    // Mock voucher data
    const discountValue = 10; // 10% discount
    const discountAmount = (cartTotal * discountValue) / 100;

    // Save voucher info to localStorage
    const voucherInfo = {
      id: "mock-voucher-" + Date.now(),
      code: voucherCode,
      discount: discountValue,
      type: "percentage",
      value: discountValue,
      discountAmount: discountAmount,
      originalValue: cartTotal,
      finalValue: cartTotal - discountAmount,
    };

    await setActiveVoucher(voucherInfo);

    // Update order summary to show discount
    await updateOrderSummary();

    showToast(
      "تم تطبيق القسيمة بنجاح",
      "success",
      `تم تطبيق خصم بقيمة ${discountAmount.toFixed(2)} جنية على طلبك`
    );

    // Update other tabs/windows
    localStorage.setItem("voucher_change_event", Date.now().toString());
    window.dispatchEvent(new CustomEvent("digital_menu_voucher_change"));
  } catch (error) {
    console.error("Error applying voucher:", error);
    showToast(
      "حدث خطأ أثناء تطبيق القسيمة",
      "error",
      "الرجاء المحاولة مرة أخرى أو التواصل مع خدمة العملاء"
    );

    // Reset button state
    const applyButton =
      document.getElementById("apply-voucher-btn") ||
      document.getElementById("apply-voucher");
    if (applyButton) {
      applyButton.disabled = false;
      applyButton.innerHTML =
        applyButton.id === "apply-voucher" ? "تطبيق" : "Apply Voucher";
    }
  }
}

// Connect with existing cart UI by adding event listeners
function connectWithExistingCartUI() {
  // Skip this function if we're on the cart page since cart.js handles vouchers there
  if (
    window.location.href.includes("cart.html") ||
    window.location.pathname.includes("/pages/cart")
  ) {
    console.log(
      "On cart page - skipping voucher UI connection since cart.js handles it"
    );
    return false;
  }

  // If the page already has a voucher input field
  const existingVoucherCodeInput = document.getElementById("voucher-code");
  const existingApplyVoucherBtn = document.getElementById("apply-voucher");

  if (existingVoucherCodeInput && existingApplyVoucherBtn) {
    // Remove any existing event listeners
    const newApplyVoucherBtn = existingApplyVoucherBtn.cloneNode(true);
    existingApplyVoucherBtn.parentNode.replaceChild(
      newApplyVoucherBtn,
      existingApplyVoucherBtn
    );

    // Add our event listener
    newApplyVoucherBtn.addEventListener("click", function () {
      const voucherCode = existingVoucherCodeInput.value.trim();
      applyVoucher(voucherCode);
    });

    // Add enter key functionality
    existingVoucherCodeInput.addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        const voucherCode = this.value.trim();
        applyVoucher(voucherCode);
      }
    });

    console.log("Connected with existing voucher UI");
    return true;
  }

  return false;
}

// Remove an active voucher
async function removeVoucher() {
  await removeActiveVoucher();

  // Update order summary
  await updateOrderSummary();

  showToast("Voucher removed", "info");
}

// Update order summary including voucher discount
async function updateOrderSummary() {
  const cartItems = getCartItems();
  const subtotal = calculateCartTotal(cartItems);

  // Get active voucher if any
  const activeVoucher = await getActiveVoucher();
  let discountAmount = 0;
  let voucherCode = "";

  if (activeVoucher) {
    try {
      // Recalculate discount amount based on current cart
      if (activeVoucher.type === "percentage") {
        discountAmount = (subtotal * activeVoucher.value) / 100;
        // Apply max discount if specified
        if (
          activeVoucher.maxDiscount &&
          discountAmount > activeVoucher.maxDiscount
        ) {
          discountAmount = activeVoucher.maxDiscount;
        }
      } else {
        // Fixed amount discount
        discountAmount = activeVoucher.value;
        // Discount cannot be more than cart total
        if (discountAmount > subtotal) {
          discountAmount = subtotal;
        }
      }

      voucherCode = activeVoucher.code;

      // Update voucher info with new values
      activeVoucher.discountAmount = discountAmount;
      activeVoucher.originalValue = subtotal;
      activeVoucher.finalValue = subtotal - discountAmount;
      await setActiveVoucher(activeVoucher);
    } catch (error) {
      console.error("Error processing active voucher:", error);
      await removeActiveVoucher();
      discountAmount = 0;
      voucherCode = "";
    }
  }

  // Calculate final total
  const finalTotal = subtotal - discountAmount;

  // Update DOM elements
  const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : "EGP";
  const subtotalElement = document.getElementById("cart-subtotal");
  if (subtotalElement) {
    subtotalElement.textContent = `${subtotal.toFixed(2)} ${currencyText}`;
  }

  // Update discount section
  const discountSection = document.getElementById("discount-section");
  const finalTotalElement = document.getElementById("cart-final-total");

  if (discountAmount > 0) {
    if (discountSection) {
      discountSection.classList.remove("hidden");
      const discountAmountElement = document.getElementById("discount-amount");
      const discountCodeElement = document.getElementById("discount-code");

      if (discountAmountElement) {
        discountAmountElement.textContent = `- ${discountAmount.toFixed(
          2
        )} ${currencyText}`;
      }

      if (discountCodeElement) {
        discountCodeElement.textContent = voucherCode;
      }
    }

    if (finalTotalElement) {
      finalTotalElement.textContent = `${finalTotal.toFixed(2)} ${currencyText}`;
    }

    // Add remove voucher option
    if (!document.getElementById("remove-voucher-btn") && discountSection) {
      const removeBtn = document.createElement("button");
      removeBtn.id = "remove-voucher-btn";
      removeBtn.className = "remove-voucher-btn";
      removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
      removeBtn.addEventListener("click", removeVoucher);
      discountSection.appendChild(removeBtn);
    }
  } else {
    if (discountSection) {
      discountSection.classList.add("hidden");
    }

    if (finalTotalElement) {
      finalTotalElement.textContent = `${subtotal.toFixed(2)} ${currencyText}`;
    }
  }

  // Update voucher input section
  updateVoucherInputSection(discountAmount > 0);
}

// Update the voucher input section visibility
function updateVoucherInputSection(voucherApplied) {
  const voucherInputSection = document.getElementById("voucher-input-section");

  if (!voucherInputSection) {
    return;
  }

  if (voucherApplied) {
    voucherInputSection.classList.add("hidden");
  } else {
    voucherInputSection.classList.remove("hidden");
  }
}

// Helper to show toast messages
function showToast(message, type = "info", details = null) {
  // Check if Toast container exists
  let toastContainer = document.querySelector(".toast-container");

  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create toast
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  // Set icon based on type
  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";
  if (type === "warning") icon = "exclamation-triangle";

  // Create toast content
  let toastHTML = `
    <div class="toast-content">
      <i class="fas fa-${icon}"></i>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Add details if provided
  if (details) {
    toastHTML += `<div class="toast-details">${details}</div>`;
  }

  toast.innerHTML = toastHTML;

  // Add close button listener
  toast.querySelector(".toast-close").addEventListener("click", function () {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  });

  // Add to container
  toastContainer.appendChild(toast);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toastContainer.contains(toast)) {
      toast.classList.add("toast-hiding");
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }
  }, 5000);
}

// Helper to get cart items from localStorage
function getCartItems() {
  try {
    const cartItemsJson = localStorage.getItem("cartItems");
    return cartItemsJson ? JSON.parse(cartItemsJson) : [];
  } catch (e) {
    console.error("Error parsing cart items:", e);
    return [];
  }
}

// Helper to calculate cart total
function calculateCartTotal(cartItems) {
  return cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
}

// Add voucher UI to cart page
function initVoucherUI() {
  // Find the order summary container
  const orderSummary = document.querySelector(".order-summary");

  if (!orderSummary) {
    return;
  }

  // Create discount section if it doesn't exist
  if (!document.getElementById("discount-section")) {
    const discountSection = document.createElement("div");
    discountSection.id = "discount-section";
    discountSection.className = "discount-section hidden";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : "EGP";
    discountSection.innerHTML = `
      <div class="summary-item">
        <span class="label">Discount (<span id="discount-code"></span>):</span>
        <span class="value" id="discount-amount">0.00 ${currencyText}</span>
      </div>
    `;

    // Find total element and insert discount section before it
    const totalElement = orderSummary.querySelector(".summary-item.total");
    if (totalElement) {
      orderSummary.insertBefore(discountSection, totalElement);
    } else {
      orderSummary.appendChild(discountSection);
    }
  }

  // Create voucher input section if it doesn't exist
  if (!document.getElementById("voucher-input-section")) {
    const voucherInputSection = document.createElement("div");
    voucherInputSection.id = "voucher-input-section";
    voucherInputSection.className = "voucher-input-section";
    voucherInputSection.innerHTML = `
      <div class="voucher-input-container">
        <input type="text" id="voucher-code-input" placeholder="Enter voucher code" class="voucher-code-input">
        <button id="apply-voucher-btn" class="apply-voucher-btn">Apply Voucher</button>
      </div>
    `;

    // Add voucher input section after order summary
    orderSummary.parentNode.insertBefore(
      voucherInputSection,
      orderSummary.nextSibling
    );

    // Add event listeners
    document
      .getElementById("apply-voucher-btn")
      .addEventListener("click", function () {
        const voucherCode = document
          .getElementById("voucher-code-input")
          .value.trim();
        applyVoucher(voucherCode);
      });

    document
      .getElementById("voucher-code-input")
      .addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
          const voucherCode = this.value.trim();
          applyVoucher(voucherCode);
        }
      });
  }

  // Initialize with current state
  updateOrderSummary().catch((error) => {
    console.error("Error updating order summary:", error);
  });
}

// Add CSS for voucher UI
function addVoucherStyles() {
  // Check if styles already exist
  if (document.getElementById("voucher-styles")) {
    return;
  }

  const styleSheet = document.createElement("style");
  styleSheet.id = "voucher-styles";
  styleSheet.textContent = `
    .voucher-input-section {
      margin-top: 20px;
      border-top: 1px dashed #ddd;
      padding-top: 15px;
    }
    
    .voucher-input-container {
      display: flex;
      gap: 10px;
    }
    
    .voucher-code-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    
    .apply-voucher-btn {
      background-color: #6366f1;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      cursor: pointer;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .apply-voucher-btn:hover {
      background-color: #4f46e5;
    }
    
    .apply-voucher-btn:disabled {
      background-color: #a5a6f6;
      cursor: not-allowed;
    }
    
    .discount-section {
      color: #10b981;
      font-weight: 500;
    }
    
    .discount-section.hidden {
      display: none;
    }
    
    .remove-voucher-btn {
      background: none;
      border: none;
      color: #ef4444;
      font-size: 12px;
      cursor: pointer;
      margin-left: 8px;
      padding: 2px 5px;
    }
    
    .remove-voucher-btn:hover {
      text-decoration: underline;
    }
    
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .toast {
      background-color: white;
      border-radius: 4px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 12px 16px;
      min-width: 250px;
      max-width: 350px;
      animation: toast-in 0.3s ease-out;
      border-right: 4px solid #6366f1;
    }
    
    .toast-success {
      border-right-color: #10b981;
    }
    
    .toast-error {
      border-right-color: #ef4444;
    }
    
    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .toast-content i {
      font-size: 18px;
      color: #6366f1;
    }
    
    .toast-success i {
      color: #10b981;
    }
    
    .toast-error i {
      color: #ef4444;
    }
    
    .toast-message {
      flex: 1;
    }
    
    .toast-close {
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #9ca3af;
      position: absolute;
      top: 8px;
      right: 8px;
    }
    
    .toast-hiding {
      animation: toast-out 0.3s ease-out forwards;
    }
    
    @keyframes toast-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes toast-out {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(styleSheet);
}

// Initialize voucher system
function initVoucherSystem() {
  // Skip initialization on cart page since cart.js handles vouchers there
  if (
    window.location.href.includes("cart.html") ||
    window.location.pathname.includes("/pages/cart")
  ) {
    console.log(
      "On cart page - skipping voucher system initialization since cart.js handles it"
    );
    return;
  }

  // First try to connect with existing UI
  const connected = connectWithExistingCartUI();

  if (!connected) {
    // Add CSS styles
    addVoucherStyles();

    // Setup UI
    initVoucherUI();
  }

  // Listen for voucher changes
  window.addEventListener("storage", function (e) {
    if (e.key === "voucher_change_event" || e.key === "cartItems") {
      updateOrderSummary().catch((error) => {
        console.error("Error updating order summary:", error);
      });
    }
  });

  // Listen for custom voucher change event
  window.addEventListener("digital_menu_voucher_change", function () {
    updateOrderSummary().catch((error) => {
      console.error("Error updating order summary:", error);
    });
  });

  // Integrate with existing discount row if available
  integrateWithExistingDiscountRow().catch((error) => {
    console.error("Error integrating with discount row:", error);
  });
}

// Integrate with existing discount row if available
async function integrateWithExistingDiscountRow() {
  const existingDiscountRow = document.getElementById("discount-row");
  const existingDiscountAmount = document.getElementById("discount-amount");

  if (existingDiscountRow && existingDiscountAmount) {
    try {
      // Check if there's an active voucher
      const activeVoucher = await getActiveVoucher();

      if (activeVoucher) {
        // Get cart total to calculate discount
        const cartItems = getCartItems();
        const subtotal = calculateCartTotal(cartItems);

        // Calculate discount
        let discountAmount = 0;

        if (activeVoucher.type === "percentage") {
          discountAmount = (subtotal * activeVoucher.value) / 100;
        } else {
          discountAmount = activeVoucher.value;
        }

        // Show discount in existing row
        existingDiscountRow.style.display = "flex";
        existingDiscountAmount.textContent =
          discountAmount.toFixed(2) + " جنية";

        // Add remove button if not already present
        if (!document.getElementById("remove-voucher-btn")) {
          const removeBtn = document.createElement("button");
          removeBtn.id = "remove-voucher-btn";
          removeBtn.className = "remove-voucher-btn";
          removeBtn.innerHTML = '<i class="fas fa-times"></i>';
          removeBtn.addEventListener("click", removeVoucher);
          existingDiscountRow.appendChild(removeBtn);
        }
      }
    } catch (error) {
      console.error("Error parsing active voucher:", error);
    }
  }
}

// Get voucher info for order placement
async function getVoucherInfoForOrder() {
  const activeVoucher = await getActiveVoucher();

  if (!activeVoucher) {
    return null;
  }

  return {
    voucherId: activeVoucher.id,
    code: activeVoucher.code,
    discountAmount: activeVoucher.discountAmount,
  };
}

// Clear voucher after successful order
async function clearVoucherAfterOrder() {
  await removeActiveVoucher();

  // Update other tabs/windows
  localStorage.setItem("voucher_change_event", Date.now().toString());
  window.dispatchEvent(new CustomEvent("digital_menu_voucher_change"));
}

// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Skip initialization on cart page since cart.js handles vouchers there
  if (
    window.location.href.includes("cart.html") ||
    window.location.pathname.includes("/pages/cart")
  ) {
    console.log(
      "On cart page - skipping voucher-integration.js initialization"
    );
    return;
  }

  // Only initialize on other pages
  initVoucherSystem();
});

// Function to get active voucher from localStorage
async function getActiveVoucher() {
  try {
    // Use localStorage instead of API since endpoint is not available
    const activeVoucherJson = localStorage.getItem("activeVoucher");
    if (!activeVoucherJson) {
      return null;
    }
    return JSON.parse(activeVoucherJson);
  } catch (error) {
    console.error("Error getting active voucher:", error);
    return null;
  }
}

// Function to set active voucher via localStorage
async function setActiveVoucher(voucherInfo) {
  try {
    // Use localStorage instead of API since endpoint is not available
    localStorage.setItem("activeVoucher", JSON.stringify(voucherInfo));

    // Update other tabs/windows
    localStorage.setItem("voucher_change_event", Date.now().toString());
    window.dispatchEvent(new CustomEvent("digital_menu_voucher_change"));

    return true;
  } catch (error) {
    console.error("Error setting active voucher:", error);
    return false;
  }
}

// Function to remove active voucher via localStorage
async function removeActiveVoucher() {
  try {
    // Use localStorage instead of API since endpoint is not available
    localStorage.removeItem("activeVoucher");

    // Update other tabs/windows
    localStorage.setItem("voucher_change_event", Date.now().toString());
    window.dispatchEvent(new CustomEvent("digital_menu_voucher_change"));

    return true;
  } catch (error) {
    console.error("Error removing active voucher:", error);
    return false;
  }
}
