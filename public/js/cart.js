// Base URL for API requests
const API_BASE_URL = (function () {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? "http://localhost:5000" : origin;
})();

// Import authentication functions if they don't exist in this context
if (typeof isLoggedIn !== "function") {
  // Check if auth.js is already loaded
  const isAuthScriptLoaded = document.querySelector('script[src*="auth.js"]');

  if (!isAuthScriptLoaded) {
    // Load auth.js script dynamically if not already loaded
    const authScript = document.createElement("script");
    authScript.src = "/public/js/auth.js";
    authScript.async = true;
    document.head.appendChild(authScript);

    console.log("Auth.js script loaded dynamically");

    // Define fallback functions until script loads
    function isLoggedIn() {
      const token = localStorage.getItem("token") || getCookie("token");
      return token && token.trim() !== "";
    }

    function getToken() {
      return localStorage.getItem("token") || getCookie("token") || null;
    }

    // Simple cookie getter function
    function getCookie(name) {
      const nameEQ = name + "=";
      const ca = document.cookie.split(";");
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
          return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    // Simple fallback for refreshToken
    function refreshToken() {
      const token = getToken();
      if (!token) return Promise.reject(new Error("No token to refresh"));

      // For admin tokens, we don't need to refresh (they don't expire)
      if (token.startsWith("admin_")) {
        console.log("Admin token doesn't need refresh");
        return Promise.resolve(token);
      }

      return fetch(`${API_BASE_URL}/api/customer/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to refresh token");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success && data.token) {
            // Save the new token to localStorage
            localStorage.setItem("token", data.token);
            return data.token;
          } else {
            throw new Error(data.message || "Failed to refresh token");
          }
        });
    }
  }
}

// AbortSignal.timeout polyfill for older browsers
if (!AbortSignal.timeout) {
  AbortSignal.timeout = function timeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

let voucherDiscountAmount = 0; // Global variable to track voucher discount amount

// Cart calculation variables
let subtotal = 0;
let taxRate = 15; // Default tax rate (15%)
let taxAmount = 0;
let serviceTaxRate = 10; // Default service tax rate (10%)
let serviceTaxEnabled = false; // Default service tax disabled
let serviceTaxAmount = 0;
let total = 0;

// Loyalty points variables
let userLoyaltyPoints = 0;
let freeItemsData = []; // Store free items configuration
let pointsUsed = 0;
let pointsDiscountAmount = 0;
let loyaltyDiscountSettings = {
  discountPerPoint: 0.5, // Default: 0.5% discount per point
  minPointsForDiscount: 10, // Default: Minimum 10 points needed
  maxDiscountValue: 50, // Default: Maximum 50% discount
  isEnabled: true, // Default: Loyalty discount is enabled
};

// Function to load free items data from API
async function loadFreeItemsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/customer/loyalty/free-items`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        freeItemsData = result.data;
        console.log("Loaded free items data in cart:", freeItemsData);
      }
    }
  } catch (error) {
    console.error("Error fetching free items in cart:", error);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("Cart JS loaded");

  // DOM Elements
  const cartItemsContainer = document.getElementById("cart-items");
  const cartEmptyMessage = document.getElementById("cart-empty");
  const subtotalElement = document.getElementById("subtotal");
  const taxElement = document.getElementById("tax");
  const serviceTaxElement = document.getElementById("service-tax");
  const serviceTaxRow = document.getElementById("service-tax-row");
  const totalElement = document.getElementById("total");
  const checkoutBtn = document.getElementById("checkout-btn");
  const clearCartBtn = document.getElementById("clear-cart");
  const checkoutComplete = document.getElementById("checkout-complete");

  // Voucher elements
  const voucherCodeInput = document.getElementById("voucher-code");
  const applyVoucherBtn = document.getElementById("apply-voucher");
  const voucherMessage = document.getElementById("voucher-message");
  const discountRow = document.getElementById("discount-row");
  const discountAmount = document.getElementById("discount-amount");

  // Loyalty points elements
  const loyaltyPointsContainer = document.getElementById(
    "loyalty-points-container"
  );
  const availablePointsElement = document.getElementById("available-points");
  const pointsDiscountValueElement = document.getElementById(
    "points-discount-value"
  );
  const pointsSlider = document.getElementById("points-slider");
  const minPointsElement = document.getElementById("min-points");
  const usedPointsElement = document.getElementById("used-points");
  const maxPointsElement = document.getElementById("max-points");
  const applyPointsBtn = document.getElementById("apply-points");
  const resetPointsBtn = document.getElementById("reset-points");
  const loyaltyDiscountRow = document.getElementById("loyalty-discount-row");
  const loyaltyDiscountAmount = document.getElementById(
    "loyalty-discount-amount"
  );

  // Table number from URL or session storage
  let tableNumber = getTableNumber();
  if (tableNumber) {
    displayTableIndicator(tableNumber);
  }

  // Verify DOM elements are found
  if (!cartItemsContainer) console.error("Cart items container not found");
  if (!cartEmptyMessage) console.error("Cart empty message not found");
  if (!checkoutComplete) console.error("Checkout complete element not found");

  // Sync theme with main page
  applyThemeFromStorage();

  // Cart data
  let cartItems = [];
  let activeVoucher = null;

  // Load free items data
  await loadFreeItemsData();
  
  // Initialize cart
  await initCart();

  // Add event listener for language changes
  document.addEventListener("language_changed", function () {
    console.log("Language changed, updating cart display");
    updateCartDisplay();

    // Update voucher button text based on current language
    if (applyVoucherBtn) {
      const currentLang = localStorage.getItem("public-language") || "ar";
      const buttonText = currentLang === "ar" ? "تطبيق" : "Apply";
      const buttonSpan = applyVoucherBtn.querySelector("span");
      if (buttonSpan) {
        buttonSpan.textContent = buttonText;
      } else {
        applyVoucherBtn.innerHTML = `<i class="fas fa-check"></i><span>${buttonText}</span>`;
      }
    }
  });

  // Event listeners
  clearCartBtn.addEventListener("click", function () {
    // Add feedback animation
    this.classList.add("clicked");
    setTimeout(() => {
      this.classList.remove("clicked");
      clearCart();
    }, 150);
  });

  checkoutBtn.addEventListener("click", checkoutOrder);

  // Voucher event listener
  if (applyVoucherBtn) {
    applyVoucherBtn.addEventListener("click", applyVoucher);

    // Also apply voucher when pressing Enter in the input field
    voucherCodeInput.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        applyVoucher();
      }
    });
  }

  // Loyalty points event listeners
  if (applyPointsBtn) {
    applyPointsBtn.addEventListener("click", applyLoyaltyPoints);
  }

  if (resetPointsBtn) {
    resetPointsBtn.addEventListener("click", resetLoyaltyPoints);
  }

  // Check if user is logged in and fetch loyalty points
  initLoyaltyPoints();

  // Listen for storage changes (tax settings may be updated from admin)
  window.addEventListener("storage", function (e) {
    if (e.key === "taxSettings") {
      // Tax settings have been updated, recalculate totals
      console.log("Tax settings changed, recalculating totals");
      calculateTotals();
    }

    // Refresh when discount status changes
    if (e.key === "original_prices" || e.key === "menuItems") {
      // Reload cart items to get updated prices
      initCart();
    }

    // Handle cross-tab discount change event
    if (e.key === "discount_change_event") {
      initCart();
    }

    // Handle cross-tab cart change event
    if (e.key === "cart_change_event" || e.key === "cartItems") {
      console.log("Cart updated in another tab, refreshing cart");
      initCart();
      // Also update loyalty points display immediately
      setTimeout(() => updateLoyaltyPointsDisplay(), 100);
    }

    // Listen for loyalty points settings changes
    if (
      e.key === "loyalty_points_settings_updated" ||
      e.key === "loyaltyPointsSettings"
    ) {
      console.log("Loyalty points settings updated, refreshing points data");
      // Refresh loyalty points settings and recalculate
      loadLoyaltyDiscountSettings().then(() => {
        // If points are currently being used, recalculate the discount
        if (pointsUsed > 0) {
          calculateLoyaltyDiscount();
          calculateTotals();
        }
      });

      // If user is logged in, refresh their points
      if (isLoggedIn()) {
        fetchUserLoyaltyPoints();
      }
    }

    // Listen for language changes
    if (e.key === "public-language") {
      console.log("Language changed, refreshing translations");
      if (typeof applyTranslations === "function") {
        applyTranslations();
        // Recalculate totals to update currency text
        calculateTotals();
      }
    }
  });

  // Listen for custom discount change event
  window.addEventListener("digital_menu_discount_change", function () {
    // Reload cart items with new prices
    initCart();
  });

  // Listen for custom cart change event
  window.addEventListener("digital_menu_cart_change", function () {
    console.log("Cart change event received, updating cart");
    initCart();
    // Also update loyalty points display after a short delay to ensure cart is loaded
    setTimeout(() => updateLoyaltyPointsDisplay(), 150);
  });

  // Listen for loyalty points settings update event
  window.addEventListener("loyalty_points_settings_updated", function (e) {
    console.log("Loyalty points settings updated via event:", e.detail);
    // If we have the settings detail, update directly
    if (e.detail && e.detail.exchangeRate) {
      // Refresh loyalty points settings and recalculate
      loadLoyaltyDiscountSettings().then(() => {
        // If points are currently being used, recalculate the discount
        if (pointsUsed > 0) {
          calculateLoyaltyDiscount();
          calculateTotals();
        }
      });
    }
  });

  // Listen for language switcher clicks
  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "language-switcher") {
      // Re-apply translations after a short delay to ensure they're properly applied
      setTimeout(() => {
        if (typeof applyTranslations === "function") {
          applyTranslations();
        }
        // Update cart display to refresh all cart items with new currency text
        updateCartDisplay();
        // Recalculate totals to update currency text
        calculateTotals();
      }, 100);
    }
  });

  // Listen for custom language change event
  document.addEventListener("language_changed", function (e) {
    console.log("Language changed event received:", e.detail.language);
    // Update cart display to refresh all cart items with new currency text
    updateCartDisplay();

    // Recalculate totals to update currency text
    calculateTotals();

    // Update loyalty points display with new language
    updateLoyaltyPointsDisplay();

    // Update apply points button text if it's disabled due to minimum points requirement
    if (
      applyPointsBtn &&
      applyPointsBtn.disabled &&
      userLoyaltyPoints < loyaltyDiscountSettings.minPointsForDiscount
    ) {
      const minRequired = loyaltyDiscountSettings.minPointsForDiscount;
      // Disable the apply button
      if (applyPointsBtn) {
        applyPointsBtn.disabled = true;
        applyPointsBtn.classList.add("disabled");
        // Replace hardcoded text with i18n translation
        const minPointsMessage = getTranslation("minPointsRequired").replace(
          "%s",
          minRequired
        );
        applyPointsBtn.innerHTML = `<i class="fas fa-info-circle"></i> ${minPointsMessage}`;
      }
    }

    // Update loyalty message if points are applied
    if (pointsUsed > 0) {
      const currentLang = e.detail.language;
      const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");
      const loyaltyMessage = document.querySelector(".loyalty-message");

      if (loyaltyMessage) {
        const successText =
          currentLang === "en"
            ? `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> Successfully applied ${pointsUsed} points!</span> Discount: ${pointsDiscountAmount.toFixed(
                2
              )} ${currencyText}`
            : `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> تم تطبيق ${pointsUsed} نقطة بنجاح!</span> الخصم: ${pointsDiscountAmount.toFixed(
                2
              )} ${currencyText}`;

        loyaltyMessage.innerHTML = successText;
      }
    }
  });

  // Apply theme from storage
  function applyThemeFromStorage() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.body.classList.toggle("dark-theme", savedTheme === "dark");
    }
  }

  // Initialize cart
  async function initCart() {
    console.log("Initializing cart");
    try {
      // Load cart items from localStorage
      const savedCart = localStorage.getItem("cartItems");

      if (savedCart) {
        cartItems = JSON.parse(savedCart);
        console.log("Parsed cart items:", cartItems);
        
        // Check and add missing pointsRequired for free items
        let cartUpdated = false;
        cartItems.forEach(item => {
          // Check if item is free (price or basePrice is 0) but doesn't have pointsRequired
          const isFreeItem = (item.basePrice !== undefined ? item.basePrice === 0 : item.price === 0);
          
          if (isFreeItem && !item.pointsRequired) {
            // Find the free item configuration
            // For items with addons, use baseId, otherwise use id
            const productId = item.baseId || item.id;
            
            console.log(`Looking for free item config for productId: ${productId}`);
            console.log("Available free items:", freeItemsData);
            
            // Try direct match first
            let freeItem = freeItemsData.find(fi => {
              // Try to match with both productId and _id
              const match = fi.productId === productId || fi.productId === item.id;
              console.log(`  Checking ${fi.productId} against ${productId} or ${item.id}: ${match}`);
              return match;
            });
            
            // If not found, try to match using the full _id from sessionStorage
            if (!freeItem) {
              console.log(`  ⚠️ No direct match for ${productId}, trying with full _id...`);
              try {
                const namesMap = JSON.parse(sessionStorage.getItem("productNames") || "{}");
                if (namesMap[productId] && namesMap[productId]._id) {
                  const fullId = namesMap[productId]._id;
                  console.log(`    Trying with full _id: ${fullId}`);
                  freeItem = freeItemsData.find(fi => fi.productId === fullId);
                  if (freeItem) {
                    console.log(`    ✅ Found match using full _id!`);
                  }
                }
              } catch (e) {
                console.warn("    Could not retrieve full product ID from sessionStorage");
              }
            }
            
            if (freeItem && freeItem.pointsRequired) {
              item.pointsRequired = freeItem.pointsRequired;
              cartUpdated = true;
              console.log(`✅ Added pointsRequired (${freeItem.pointsRequired}) to free item: ${item.name}`);
            } else {
              // Item is free but not configured in loyalty settings
              // This is not an error - the item can still be used, it just won't require points
              console.log(`ℹ️ Free item "${item.name}" (id: ${productId}) is not configured in loyalty free items settings. It will be treated as a regular free item without points requirement.`);
            }
          }
        });
        
        // Save updated cart if we added pointsRequired
        if (cartUpdated) {
          localStorage.setItem("cartItems", JSON.stringify(cartItems));
        }
        
        await updateCartDisplay();
      } else {
        console.log("No cart items found in localStorage");
        showEmptyCart();
      }

      // Load active voucher from localStorage
      const savedVoucher = localStorage.getItem("activeVoucher");
      if (savedVoucher) {
        activeVoucher = JSON.parse(savedVoucher);
        console.log("Active voucher loaded:", activeVoucher);
        displayAppliedVoucher();
      }

      // Calculate totals
      await calculateTotals();

      // Explicitly update loyalty points display to ensure it's refreshed
      updateLoyaltyPointsDisplay();

      // Apply translations to ensure all text is properly displayed in the current language
      if (typeof applyTranslations === "function") {
        applyTranslations();
      }
    } catch (error) {
      console.error("Error initializing cart:", error);
      showEmptyCart();
    }
  }

  async function updateCartDisplay() {
    console.log("Updating cart display");
    // Clear all existing cart items - completely rebuild the display
    clearCartDisplay();

    if (cartItems.length === 0) {
      console.log("Cart is empty, showing empty message");
      showEmptyCart();
      return;
    }

    console.log("Cart has items, rendering items");
    hideEmptyCart();
    renderCartItems();

    // Only add event listeners on first render
    // They will be handled by event delegation after that
    if (!cartItemsContainer.hasAttribute("data-events-attached")) {
      addCartItemEventListeners();
      cartItemsContainer.setAttribute("data-events-attached", "true");
    }

    await calculateTotals();
  }

  function clearCartDisplay() {
    // Remove all child elements except the empty message
    const childElements = Array.from(cartItemsContainer.children);
    childElements.forEach((child) => {
      if (child !== cartEmptyMessage) {
        cartItemsContainer.removeChild(child);
      }
    });
  }

  function renderCartItems() {
    console.log("Rendering cart items:", cartItems);
    // Add cart items
    cartItems.forEach((item, index) => {
      const cartItem = createCartItemElement(item, index);
      // Insert cart item before the empty message
      cartItemsContainer.insertBefore(cartItem, cartEmptyMessage);
    });
  }

  function addCartItemEventListeners() {
    // Use event delegation instead of attaching listeners to each button
    // This ensures that event handlers work even when DOM elements are replaced
    if (!cartItemsContainer) return;

    cartItemsContainer.addEventListener("click", function (event) {
      // Find the closest button to the clicked element
      const button = event.target.closest(
        ".decrease-btn, .increase-btn, .remove-item"
      );

      // If no button was clicked, exit
      if (!button) return;

      // Get the index from the button's data attribute
      const index = parseInt(button.getAttribute("data-index"));

      // Check which type of button was clicked and call the appropriate function
      if (button.classList.contains("decrease-btn")) {
        decreaseQuantity(index);
      } else if (button.classList.contains("increase-btn")) {
        increaseQuantity(index);
      } else if (button.classList.contains("remove-item")) {
        removeItem(index);
      }
    });
  }

  // Function to check if a URL is a data URL
  function isDataUrl(url) {
    return url && url.startsWith("data:");
  }

  function createCartItemElement(item, index) {
    const itemElement = document.createElement("div");
    itemElement.classList.add("cart-item");

    // For items with addons, calculate total properly
    // If basePrice is 0 (free item), only charge for addons
    let itemTotal;
    if (item.basePrice !== undefined) {
      // Item has addons - use the stored price which already includes addons
      itemTotal = item.price * item.quantity;
    } else {
      // Simple item without addons
      itemTotal = item.price * item.quantity;
    }

    // Get the current language
    const currentLang =
      typeof getCurrentLanguage === "function"
        ? getCurrentLanguage()
        : localStorage.getItem("public-language") || "ar";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

    // Resolve display name based on current language
    let displayName = item.name; // Default to Arabic name
    
    // Check if this is an offer item (offers have isOffer flag or id starts with "offer-")
    const isOfferItem = item.isOffer || (item.id && item.id.startsWith("offer-"));
    
    if (isOfferItem) {
      // For offers, use stored nameEn/nameAr directly without sessionStorage lookup
      if (currentLang === "en" && item.nameEn && item.nameEn.trim() !== "") {
        displayName = item.nameEn;
      } else if (item.nameAr && item.nameAr.trim() !== "") {
        displayName = item.nameAr;
      }
      // If neither nameEn nor nameAr is available, keep item.name as fallback
    } else {
      // For regular products, use the existing logic with sessionStorage fallback
      if (currentLang === "en" && item.nameEn && item.nameEn.trim() !== "") {
        displayName = item.nameEn;
      } else {
        // Fallback: try to get from sessionStorage
        try {
          const namesMap = JSON.parse(
            sessionStorage.getItem("productNames") || "{}"
          );
          if (namesMap[item.id]) {
            const meta = namesMap[item.id];
            displayName =
              currentLang === "en" && meta.nameEn ? meta.nameEn : meta.name || item.name;
          }
        } catch (e) {
          // Keep default displayName
        }
      }
    }

    // Handle missing image URLs with a placeholder
    const imageUrl =
      item.image && item.image.trim() !== ""
        ? item.image
        : "/images/placeholder.svg";

    // Create the HTML content for add-ons
    let addonsHTML = "";
    if (item.addonsList && item.addonsList.length > 0) {
      addonsHTML = '<div class="cart-item-addons">';

      // Sort addons by price, with higher prices first
      const sortedAddons = [...item.addonsList].sort(
        (a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0)
      );

      sortedAddons.forEach((addon) => {
        const addonPrice = parseFloat(addon.price || 0);
        let displayAddonName = addon.name || "إضافة";

        // Handle English language display
        if (currentLang === "en") {
          // Try different possible English name properties
          if (addon.nameEn && addon.nameEn.trim()) {
            displayAddonName = addon.nameEn;
          } else if (addon.optionNameEn && addon.optionNameEn.trim()) {
            // If we have section title in English, combine them
            if (addon.sectionTitleEn && addon.sectionTitleEn.trim()) {
              displayAddonName = `${addon.sectionTitleEn}: ${addon.optionNameEn}`;
            } else {
              displayAddonName = addon.optionNameEn;
            }
          } else if (addon.sectionTitleEn && addon.sectionTitleEn.trim()) {
            // If only section title is available in English
            displayAddonName = addon.sectionTitleEn;
          }
          // If no English names are available, keep the Arabic name as fallback
        }

        addonsHTML += `<div class="cart-addon-item">
          <span class="cart-addon-name">${displayAddonName}</span>
          ${
            addonPrice > 0
              ? `<span class="cart-addon-price">+${addonPrice.toFixed(
                  2
                )}</span>`
              : `<span class="cart-addon-price free">${
                  currentLang === "en" ? "Free" : "مجاني"
                }</span>`
          }
        </div>`;
      });
      addonsHTML += "</div>";
    }

    // Create the image HTML differently for data URLs to avoid sending them to the server
    const imageHtml = isDataUrl(imageUrl)
      ? `<img src="${imageUrl}" alt="${displayName}">`
      : `<img src="${imageUrl}" alt="${displayName}" onerror="this.src='/images/placeholder.svg'">`;

    // Check if this is a free item
    // For items with addons: check if basePrice is 0 (base item is free, but addons may cost)
    // For simple items: check if price is 0
    const isFreeBaseItem = item.basePrice !== undefined ? item.basePrice === 0 : item.price === 0;
    
    let priceDisplay;
    let itemNameDisplay = displayName;
    
    if (isFreeBaseItem && itemTotal === 0) {
      // Completely free (no addons or free addons)
      priceDisplay = `<span class="free-item-text"><i class="fas fa-gift"></i> ${currentLang === "en" ? "FREE" : "مجاني"}</span>`;
    } else if (isFreeBaseItem && itemTotal > 0) {
      // Free base item but has paid addons - show addon price with FREE badge on name
      itemNameDisplay = `${displayName} <span class="free-badge-inline"><i class="fas fa-gift"></i> ${currentLang === "en" ? "FREE" : "مجاني"}</span>`;
      priceDisplay = `${itemTotal.toFixed(2)} ${currencyText}`;
    } else {
      // Regular priced item
      priceDisplay = `${itemTotal.toFixed(2)} ${currencyText}`;
    }

    itemElement.innerHTML = `
            <div class="cart-item-image">
                ${imageHtml}
            </div>
            <div class="cart-item-details">
                <div class="cart-item-name">${itemNameDisplay}</div>
                ${addonsHTML}
                <div class="cart-item-price">${priceDisplay}</div>
                <div class="item-quantity">
                    <button class="quantity-btn decrease-btn" data-index="${index}">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                </div>
            </div>
            <button class="remove-item" data-index="${index}">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

    return itemElement;
  }

  function decreaseQuantity(index) {
    // Check if the item at the given index exists
    if (cartItems[index] && cartItems[index].quantity > 1) {
      cartItems[index].quantity--;
      saveCart();
      updateCartDisplay();
    } else if (cartItems[index]) {
      removeItem(index);
    } else {
      console.error(
        `Attempted to decrease quantity for non-existent item at index ${index}`
      );
      // Refresh the cart display to ensure UI is in sync with data
      updateCartDisplay();
    }
  }

  function increaseQuantity(index) {
    // Check if the item at the given index exists
    if (cartItems[index]) {
      cartItems[index].quantity++;
      saveCart();
      updateCartDisplay();
    } else {
      console.error(
        `Attempted to increase quantity for non-existent item at index ${index}`
      );
      // Refresh the cart display to ensure UI is in sync with data
      updateCartDisplay();
    }
  }

  async function removeItem(index) {
    // Check if the item at the given index exists
    if (index >= 0 && index < cartItems.length) {
      cartItems.splice(index, 1);
      saveCart();
      await updateCartDisplay();
    } else {
      console.error(`Attempted to remove non-existent item at index ${index}`);
      // Refresh the cart display to ensure UI is in sync with data
      await updateCartDisplay();
    }
  }

  async function calculateTotals() {
    console.log("Calculating totals");
    // Calculate subtotal
    subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += item.price * item.quantity;
    });

    // Get the current language
    const currentLang =
      typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

    // Format and display subtotal
    subtotalElement.textContent = subtotal.toFixed(2) + " " + currencyText;

    // Get tax settings first - now from API
    const taxSettings = await getTaxRate();
    console.log("Tax settings:", taxSettings);

    // Update global variables
    taxRate = taxSettings.enabled ? taxSettings.rate : 0;
    serviceTaxRate = taxSettings.serviceRate || 0;
    serviceTaxEnabled = taxSettings.serviceEnabled || false;

    // Calculate and display tax first (before discount)
    if (taxSettings.enabled) {
      taxAmount = (subtotal * taxRate) / 100;

      // Show tax row and update value
      taxElement.parentElement.style.display = "flex";
      taxElement.textContent = taxAmount.toFixed(2) + " " + currencyText;

      // Update tax info percentage
      const taxInfoElement = document.getElementById("tax-info");
      if (taxInfoElement) {
        taxInfoElement.textContent = ` (${taxRate}%)`;
      }
    } else {
      // Hide tax row
      taxAmount = 0;
      taxElement.parentElement.style.display = "none";

      // Update tax info
      const taxInfoElement = document.getElementById("tax-info");
      if (taxInfoElement) {
        taxInfoElement.textContent =
          currentLang === "en" ? " (exempt)" : " (معفى)";
      }
    }

    // Calculate and display service tax
    if (taxSettings.serviceEnabled) {
      serviceTaxAmount = (subtotal * serviceTaxRate) / 100;

      // Show service tax row and update value
      serviceTaxRow.style.display = "flex";
      serviceTaxElement.textContent =
        serviceTaxAmount.toFixed(2) + " " + currencyText;

      // Update service tax info percentage
      const serviceTaxInfoElement = document.getElementById("service-tax-info");
      if (serviceTaxInfoElement) {
        serviceTaxInfoElement.textContent = ` (${serviceTaxRate}%)`;
      }
    } else {
      // Hide service tax row
      serviceTaxAmount = 0;
      serviceTaxRow.style.display = "none";
    }

    // Calculate discount if voucher is applied (after tax is calculated)
    let discountValue = 0;
    let discountDetails = null;

    console.log("Checking for active voucher:", activeVoucher);
    if (activeVoucher) {
      discountValue = (subtotal * activeVoucher.discount) / 100;
      voucherDiscountAmount = discountValue; // Update the global variable
      discountDetails = {
        code: activeVoucher.code,
        name: activeVoucher.code,
        discount: activeVoucher.discount,
        value: discountValue,
      };

      console.log("Active voucher found, discount value:", discountValue);

      // Show discount row
      if (discountRow) {
        discountRow.style.display = "flex";
        console.log("Setting discount row display to flex");
      } else {
        console.error("Discount row element not found");
      }

      // Update discount amount
      if (discountAmount) {
        discountAmount.textContent =
          discountValue.toFixed(2) + " " + currencyText;
        console.log(
          "Updated discount amount text:",
          discountValue.toFixed(2) + " " + currencyText
        );
      } else {
        console.error("Discount amount element not found");
      }
    } else {
      // Hide discount row if no active voucher
      voucherDiscountAmount = 0; // Reset the global variable
      if (discountRow) {
        discountRow.style.display = "none";
        console.log("No active voucher, hiding discount row");
      } else {
        console.error("Discount row element not found when trying to hide it");
      }
    }

    // Calculate loyalty points discount if applied
    if (pointsUsed > 0) {
      // Recalculate loyalty discount in case subtotal has changed
      calculateLoyaltyDiscount();

      // Show loyalty discount row
      if (loyaltyDiscountRow && loyaltyDiscountAmount) {
        loyaltyDiscountRow.style.display = "flex";
        loyaltyDiscountAmount.textContent =
          pointsDiscountAmount.toFixed(2) + " " + currencyText;
      }
    } else {
      // Hide loyalty discount row if no points are applied
      if (loyaltyDiscountRow) {
        loyaltyDiscountRow.style.display = "none";
      }
      pointsDiscountAmount = 0;
    }

    // Calculate total (subtotal + tax - discounts)
    total =
      subtotal +
      taxAmount +
      serviceTaxAmount -
      discountValue -
      pointsDiscountAmount;

    console.log(
      `Final total calculation: ${subtotal} + ${taxAmount} + ${serviceTaxAmount} - ${discountValue} - ${pointsDiscountAmount} = ${total}`
    );

    // Format and display total
    totalElement.textContent = total.toFixed(2) + " " + currencyText;

    // Update checkout button text
    const checkoutText = currentLang === "en" ? "Checkout" : "إتمام الطلب";
    checkoutBtn.textContent = `${checkoutText} (${total.toFixed(
      2
    )} ${currencyText})`;

    // Enable/disable checkout button based on cart status
    checkoutBtn.disabled = cartItems.length === 0;
    
    // Update loyalty points display to show reserved points
    updateLoyaltyPointsDisplay();
  }

  function showEmptyCart() {
    cartEmptyMessage.style.display = "flex";

    // Get the current language
    const currentLang =
      typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

    subtotalElement.textContent = "0.00 " + currencyText;
    taxElement.textContent = "0.00 " + currencyText;
    serviceTaxElement.textContent = "0.00 " + currencyText;
    serviceTaxRow.style.display = "none";
    totalElement.textContent = "0.00 " + currencyText;
    discountRow.style.display = "none";

    // Hide loyalty discount row
    if (loyaltyDiscountRow) {
      loyaltyDiscountRow.style.display = "none";
    }

    // Disable apply points button when cart is empty
    if (applyPointsBtn) {
      applyPointsBtn.disabled = true;
      applyPointsBtn.classList.add("disabled");
      applyPointsBtn.style.opacity = "0.6";
      applyPointsBtn.style.cursor = "not-allowed";
    }

    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = "0.6";
    checkoutBtn.style.cursor = "not-allowed";
  }

  function hideEmptyCart() {
    cartEmptyMessage.style.display = "none";
    checkoutBtn.disabled = false;
    checkoutBtn.style.opacity = "1";
    checkoutBtn.style.cursor = "pointer";

    // Re-enable apply points button when cart has items (if user has enough points)
    if (applyPointsBtn && userLoyaltyPoints >= loyaltyDiscountSettings.minPointsForDiscount) {
      applyPointsBtn.disabled = false;
      applyPointsBtn.classList.remove("disabled");
      applyPointsBtn.style.opacity = "1";
      applyPointsBtn.style.cursor = "pointer";
    }
  }

  function clearCart() {
    cartItems = [];
    clearVoucher();
    clearAppliedLoyaltyPoints();

    // Reset points UI
    pointsUsed = 0;
    pointsDiscountAmount = 0;

    if (
      loyaltyPointsContainer &&
      loyaltyPointsContainer.style.display !== "none"
    ) {
      if (pointsSlider) pointsSlider.value = 0;
      if (usedPointsElement) usedPointsElement.textContent = "0";
      if (pointsDiscountValueElement)
        pointsDiscountValueElement.textContent = "0.00 جنية";

      // Show apply button and hide reset button
      if (applyPointsBtn) applyPointsBtn.style.display = "inline-flex";
      if (resetPointsBtn) resetPointsBtn.style.display = "none";
    }

    saveCart();
    updateCartDisplay();
  }

  function saveCart() {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
      updateCartCountDisplay();

      // Dispatch custom event to notify other components about cart update
      dispatchCartChangeEvent();
    } catch (error) {
      console.error("Error saving cart to localStorage:", error);
    }
  }

  // Helper function to dispatch cart change event
  function dispatchCartChangeEvent() {
    // Create and dispatch a custom event
    const cartChangeEvent = new CustomEvent("digital_menu_cart_change");
    window.dispatchEvent(cartChangeEvent);

    // Also broadcast through localStorage for cross-tab communication
    // Using a timestamp ensures the event is unique each time
    localStorage.setItem("cart_change_event", Date.now().toString());
    setTimeout(() => {
      localStorage.removeItem("cart_change_event");
    }, 100);
  }

  function updateCartCountDisplay() {
    let totalCount = 0;
    cartItems.forEach((item) => {
      totalCount += item.quantity;
    });

    try {
      localStorage.setItem("cartCount", totalCount.toString());
    } catch (error) {
      console.error("Error updating cart count:", error);
    }
  }

  // Before the checkoutOrder function, add a function to verify auth state
  function verifyAuthBeforeCheckout() {
    // Force a fresh authentication check
    if (window.checkSession) {
      window.checkSession();
    }

    return isLoggedIn();
  }

  async function checkoutOrder() {
    console.log("Starting checkout process");

    if (cartItems.length === 0) {
      showToast("سلة التسوق فارغة", "error", 3000);
      return;
    }

    // Disable checkout button to prevent multiple submissions
    checkoutBtn.disabled = true;
    const processingText = typeof getTranslation === 'function' 
      ? getTranslation('processingOrder') 
      : 'Processing...';
    checkoutBtn.innerHTML =
      `<i class="fas fa-spinner fa-spin"></i> <span data-i18n="processingOrder">${processingText}</span>`;

    try {
      // Get subtotal
      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Get tax settings
      const taxSettings = await getTaxRate();

      // Calculate tax amount if enabled
      let taxRate = 0;
      let taxValue = 0;
      if (taxSettings.enabled) {
        taxRate = taxSettings.rate;
        taxValue = (subtotal * taxRate) / 100;
      }

      // Calculate service tax if enabled
      let serviceTaxRate = 0;
      let serviceTaxValue = 0;
      if (taxSettings.serviceEnabled) {
        serviceTaxRate = taxSettings.serviceRate;
        serviceTaxValue = (subtotal * serviceTaxRate) / 100;
      }

      // Get discount information if voucher applied
      let discountValue = 0;
      let discountInfo = null;

      if (activeVoucher) {
        discountValue = (subtotal * activeVoucher.discount) / 100;
        discountInfo = {
          code: activeVoucher.code,
          value: discountValue,
        };
      }

      // Include loyalty points discount if applied
      let loyaltyPointsDiscount = 0;
      let loyaltyPointsInfo = null;
      if (pointsUsed > 0) {
        // Calculate loyalty discount
        const discountPercentage = Math.min(
          pointsUsed * loyaltyDiscountSettings.discountPerPoint,
          loyaltyDiscountSettings.maxDiscountValue
        );
        loyaltyPointsDiscount = (subtotal * discountPercentage) / 100;

        loyaltyPointsInfo = {
          pointsUsed: pointsUsed,
          value: loyaltyPointsDiscount,
        };
      }

      // Calculate final total including loyalty points discount
      const total =
        subtotal +
        taxValue +
        serviceTaxValue -
        discountValue -
        loyaltyPointsDiscount;

      // Prepare items data for the order - ensure all items have their image URLs included
      const items = cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || "", // Include English name for language switching
        nameAr: item.nameAr || item.name || "", // Include Arabic name for language switching
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || "",
        addons: item.addons || [],
        addonsList: item.addonsList || [],
        image: item.image || "", // Ensure image URL is included
        isFreeItem: item.isFreeItem || false, // Include free item flag
        pointsRequired: item.pointsRequired || 0, // Include points required for free items
      }));

      // Get table number (if any)
      const tableNumber = getTableNumber();

      // Create order data object
      const orderData = {
        items,
        subtotal,
        tax: {
          rate: taxRate,
          value: taxValue,
        },
        serviceTax: {
          rate: serviceTaxRate,
          value: serviceTaxValue,
        },
        discount: discountInfo,
        loyaltyDiscount: loyaltyPointsInfo, // Add loyalty discount to order data
        total,
        tableNumber: tableNumber || "0",
        status: "pending",
      };

      let savedToServer = false;

      // Check if user is logged in with a fresh check
      if (verifyAuthBeforeCheckout()) {
        try {
          console.log(
            "User is logged in, attempting authenticated order submission"
          );

          // Try to refresh the token before submitting the order
          let token;
          try {
            // Attempt to refresh the token first
            token = await refreshToken();
            console.log("Token refreshed successfully");
          } catch (refreshError) {
            console.log("Token refresh failed, using existing token");
            token = getToken();
          }

          if (!token) {
            throw new Error("No authentication token available");
          }

          // Save order to MongoDB using authenticated endpoint
          const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              items: orderData.items,
              subtotal: orderData.subtotal,
              tax: orderData.tax,
              serviceTax: orderData.serviceTax,
              discount: orderData.discount,
              loyaltyDiscount: orderData.loyaltyDiscount, // Include loyalty discount in API request
              total: orderData.total,
              status: orderData.status,
              tableNumber: orderData.tableNumber,
            }),
          });

          let data;
          try {
            const responseText = await response.text();
            data = responseText ? JSON.parse(responseText) : {};
          } catch (parseError) {
            console.error("Error parsing response:", parseError);
            data = { message: "Invalid server response" };
          }

          if (!response.ok) {
            console.error("Authentication order failed:", data);
            throw new Error(data.message || "Failed to save order to server");
          }

          console.log("Order saved to database successfully:", data);
          savedToServer = true;

          // Deduct loyalty points if they were used
          if (pointsUsed > 0) {
            try {
              console.log(`Deducting ${pointsUsed} loyalty points`);

              // Re-verify available points with backend before proceeding
              const verifyResponse = await fetch(
                `${API_BASE_URL}/api/customer/loyalty-points`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (verifyResponse.ok) {
                const verifyData = await verifyResponse.json();
                const availablePoints = verifyData.data?.loyaltyPoints || 0;

                // Adjust points to deduct if needed - use the lesser of what was applied vs what's actually available
                const pointsToDeduct = Math.min(
                  parseInt(pointsUsed),
                  availablePoints
                );

                // Check if there are any points to deduct - skip deduction if none available
                if (pointsToDeduct <= 0) {
                  console.log(
                    "No points available for deduction, skipping points deduction"
                  );
                  // Clear applied loyalty points from UI and local storage since they can't be used
                  clearAppliedLoyaltyPoints();
                  pointsUsed = 0;
                  // Don't show toast during normal checkout flow to avoid confusion - only log to console
                  // Only continue with checkout
                } else {
                  // Recalculate discount if points changed
                  if (pointsToDeduct !== pointsUsed) {
                    console.log(
                      `Adjusting points from ${pointsUsed} to ${pointsToDeduct} based on available balance`
                    );
                    pointsUsed = pointsToDeduct;
                  }

                  const deductResponse = await fetch(
                    `${API_BASE_URL}/api/customer/loyalty-points/deduct`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        points: pointsToDeduct,
                        reason:
                          "استخدام في طلب #" + (data.orderId || data._id || ""),
                      }),
                    }
                  );

                  const deductData = await deductResponse.json();

                  if (!deductResponse.ok) {
                    console.error(
                      "Failed to deduct loyalty points:",
                      deductData
                    );
                    // Show a toast notification but continue with checkout
                    showCustomToast(
                      "لم نتمكن من خصم نقاط الولاء، سيتم إكمال الطلب بدون خصم النقاط",
                      "warning"
                    );
                  } else {
                    console.log(
                      "Loyalty points deducted successfully:",
                      deductData
                    );

                    // Update user data in localStorage with new points balance
                    const userData = getUserData();
                    if (userData) {
                      userData.loyaltyPoints = deductData.data.currentPoints;
                      localStorage.setItem(
                        "userData",
                        JSON.stringify(userData)
                      );
                    }
                  }
                }
              } else {
                console.log(
                  "Could not verify current points balance, continuing checkout"
                );
              }
            } catch (pointsError) {
              console.error("Error deducting loyalty points:", pointsError);
              // Continue with checkout even if points deduction fails
              showCustomToast(
                "حدث خطأ أثناء خصم نقاط الولاء، سيتم التواصل معك قريباً",
                "info"
              );
            }
          }
        } catch (apiError) {
          console.error(
            "Error saving order to database with authentication:",
            apiError
          );
          // Try the guest route as fallback
          console.log("Trying guest order as fallback");
          savedToServer = await saveAsGuestOrder(orderData);
        }
      } else {
        console.log("User not logged in, saving as guest order");
        savedToServer = await saveAsGuestOrder(orderData);
      }

      // Get existing orders from local storage (always a good backup)
      let orders = [];
      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        try {
          orders = JSON.parse(savedOrders);
        } catch (parseError) {
          console.error("Error parsing saved orders:", parseError);
          orders = [];
        }
      }

      // Make sure orderData has the loyaltyDiscount info before adding to local storage
      if (pointsUsed > 0 && !orderData.loyaltyDiscount) {
        const discountPercentage = Math.min(
          pointsUsed * loyaltyDiscountSettings.discountPerPoint,
          loyaltyDiscountSettings.maxDiscountValue
        );
        const loyaltyDiscountValue = (subtotal * discountPercentage) / 100;

        orderData.loyaltyDiscount = {
          pointsUsed: pointsUsed,
          value: loyaltyDiscountValue,
        };
      }

      // Add new order to local storage
      orders.push(orderData);

      // Save to local storage
      localStorage.setItem("orders", JSON.stringify(orders));

      // Log successful completion
      console.log(
        "Order process completed. Saved to server:",
        savedToServer ? "Yes" : "No (using local storage)"
      );

      // Clear cart and voucher
      clearCart();
      clearVoucherAfterOrder();

      // Show success message
      showCheckoutSuccess();
    } catch (error) {
      console.error("Error during checkout:", error);

      // Re-enable checkout button
      checkoutBtn.disabled = false;
      const checkoutText = typeof getTranslation === 'function' 
        ? getTranslation('checkout') 
        : 'Checkout';
      checkoutBtn.innerHTML = `<span data-i18n="checkout">${checkoutText}</span> <i class="fas fa-check"></i>`;

      // Show error message
      alert(
        `حدث خطأ أثناء إتمام الطلب: ${error.message}. الرجاء المحاولة مرة أخرى.`
      );
    }
  }

  // Function to save order as guest
  async function saveAsGuestOrder(orderData) {
    try {
      console.log("Attempting to save as guest order");

      // Get some basic customer info if available
      const customerInfo = {
        name: localStorage.getItem("userName") || "Guest",
        email: localStorage.getItem("userEmail") || "guest@example.com",
      };

      // Make sure items array is properly formatted
      const formattedItems = orderData.items.map((item) => ({
        id: item.id || "",
        name: item.name || "",
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || "",
        addons: Array.isArray(item.addons) ? item.addons : [],
        addonsList: Array.isArray(item.addonsList) ? item.addonsList : [],
      }));

      // Create a clean request payload without any undefined values
      const requestPayload = {
        items: formattedItems,
        subtotal: parseFloat(orderData.subtotal) || 0,
        tax: orderData.tax || { rate: 0, value: 0 },
        serviceTax: orderData.serviceTax || { rate: 0, value: 0 },
        discount: orderData.discount || null,
        loyaltyDiscount: orderData.loyaltyDiscount || null,
        total: parseFloat(orderData.total) || 0,
        status: orderData.status || "pending",
        tableNumber: orderData.tableNumber || "0",
        customerInfo: customerInfo,
        // Let server generate orderId and orderNumber
      };

      console.log("Guest order payload:", JSON.stringify(requestPayload));

      // Save order to MongoDB using guest endpoint
      const response = await fetch(`${API_BASE_URL}/api/orders/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        // Add a timeout to prevent long waits
        signal: AbortSignal.timeout(5000),
      });

      // Try to parse the response
      let data;
      try {
        const responseText = await response.text();
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        data = { message: "Invalid server response" };
      }

      if (!response.ok) {
        console.error("Server error response:", data);
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      console.log("Guest order saved to database successfully:", data);

      // Update the local order object with server-generated data if available
      if (data && data.data) {
        orderData.id = data.data._id || orderData.id;
        orderData.orderNumber = data.data.orderNumber || orderData.orderNumber;
      }

      return true;
    } catch (guestError) {
      console.error("Error saving guest order:", guestError);
      // Don't rethrow - just return false to use local storage fallback
      return false;
    }
  }

  // Apply voucher to order in the backend
  async function applyVoucherToOrder(voucherId, orderValue) {
    if (!voucherId || !orderValue) return null;

    try {
      // Use API to apply voucher
      const API_BASE_URL = "http://localhost:5000";
      const token = localStorage.getItem("token") || getCookie("token") || null;

      const headers = {
        "Content-Type": "application/json",
      };

      // Add token if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/vouchers/apply`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          voucherId: voucherId,
          orderValue: orderValue,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error("Failed to apply voucher to order:", result.message);
        return null;
      }

      return result.data;
    } catch (error) {
      console.error("Error applying voucher to order:", error);
      return null;
    }
  }

  // Get voucher info for order
  function getVoucherInfoForOrder() {
    const activeVoucherJson = localStorage.getItem("activeVoucher");

    if (!activeVoucherJson) {
      return null;
    }

    try {
      const activeVoucher = JSON.parse(activeVoucherJson);
      return {
        voucherId: activeVoucher.id,
        code: activeVoucher.code,
        discountAmount: activeVoucher.discountAmount,
      };
    } catch (error) {
      console.error("Error parsing active voucher:", error);
      return null;
    }
  }

  function showCheckoutSuccess() {
    console.log("Showing checkout success message");

    if (checkoutComplete) {
      // Update message to show that order was sent to cashier
      const checkoutMessage = checkoutComplete.querySelector(
        ".checkout-message h2"
      );
      if (checkoutMessage) {
        checkoutMessage.textContent = "تم تأكيد طلبك وإرساله إلى الكاشير!";
      }

      const checkoutSubMessage = checkoutComplete.querySelector(
        ".checkout-message p"
      );
      if (checkoutSubMessage) {
        // Always use the table number (either from URL or default '0')
        const displayTableNum = tableNumber || "0";
        checkoutSubMessage.textContent = `سيتم تحضير طلبك للطاولة رقم ${displayTableNum} في أقرب وقت`;
      }

      checkoutComplete.classList.add("show");

      // Clear applied loyalty points
      clearAppliedLoyaltyPoints();

      // Reset points UI variables
      pointsUsed = 0;
      pointsDiscountAmount = 0;

      // If user is logged in, refresh their loyalty points
      if (isLoggedIn()) {
        fetchUserLoyaltyPoints()
          .then(() => {
            // Update any points displays on the page
            if (availablePointsElement) {
              availablePointsElement.textContent = userLoyaltyPoints;
            }
          })
          .catch((error) => {
            console.error("Error refreshing loyalty points:", error);
          });
      }

      // Redirect to home page after a delay
      setTimeout(() => {
        checkoutComplete.classList.remove("show");
        window.location.href =
          "index.html" + (tableNumber ? `?table=${tableNumber}` : "");
      }, 3000);
    } else {
      console.error("Checkout complete element not found");
      // Redirect to home page after a shorter delay
      setTimeout(() => {
        window.location.href =
          "index.html" + (tableNumber ? `?table=${tableNumber}` : "");
      }, 1500);
    }
  }

  // Clear active voucher after checkout
  function clearVoucherAfterOrder() {
    localStorage.removeItem("activeVoucher");
    activeVoucher = null;

    // Update UI if needed - check if element exists first
    const voucherInfoDisplay = document.querySelector(".voucher-message");
    if (voucherInfoDisplay) {
      voucherInfoDisplay.innerHTML = "";
      voucherInfoDisplay.style.display = "none";
    }

    if (voucherCodeInput) {
      voucherCodeInput.value = "";
      voucherCodeInput.disabled = false;
    }

    if (applyVoucherBtn) {
      applyVoucherBtn.disabled = false;
    }

    // Hide discount row if it exists
    if (discountRow) {
      discountRow.style.display = "none";
    }

    // Recalculate totals after removing voucher
    calculateTotals();
  }

  // Voucher functions
  async function applyVoucher() {
    const code = voucherCodeInput.value.trim();

    // Get current language
    const currentLang = localStorage.getItem("public-language") || "ar";

    if (!code) {
      const emptyCodeMessage =
        currentLang === "en"
          ? "Please enter a valid voucher code"
          : "الرجاء إدخال كود قسيمة صالح";
      showCustomToast(emptyCodeMessage, "warning");
      voucherCodeInput.focus();
      return;
    }

    console.log("Applying voucher with code:", code);

    const loadingText =
      currentLang === "ar" ? "جاري التحقق..." : "Verifying...";

    // Add loading state to button
    applyVoucherBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    applyVoucherBtn.disabled = true;

    // If there's already an active voucher, clear it first
    if (activeVoucher) {
      clearVoucher();
    }

    try {
      // Calculate current cart total
      let subtotal = 0;
      cartItems.forEach((item) => {
        subtotal += item.price * item.quantity;
      });

      console.log(`Validating voucher code ${code} with subtotal ${subtotal}`);

      // Get the correct API URL
      // Check if we need to use a different API base URL (in case of deployment)
      const apiBaseUrl =
        window.API_BASE_URL || API_BASE_URL || "http://localhost:5000";
      console.log("Using API base URL:", apiBaseUrl);

      let response = null;
      let result = null;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          // Try validating the voucher
          console.log(`Attempt ${retryCount + 1} to validate voucher...`);
          const requestBody = {
            code: code,
            orderValue: subtotal,
          };
          console.log("Request body:", requestBody);

          response = await fetch(`${apiBaseUrl}/api/vouchers/validate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            // Add a timeout to prevent long waits
            signal: AbortSignal.timeout(5000),
          });

          console.log(`Attempt ${retryCount + 1} status:`, response.status);

          // If response is OK, break the retry loop
          if (response.ok) {
            break;
          }

          // If we got a non-server error (not 5xx), don't retry
          if (response.status < 500) {
            break;
          }

          // Otherwise, increment retry count and try again
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`Retrying validation (${retryCount}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        } catch (fetchError) {
          console.error(
            `Fetch error on attempt ${retryCount + 1}:`,
            fetchError
          );
          retryCount++;

          if (retryCount > maxRetries) {
            const connectionErrorMsg =
              currentLang === "en"
                ? "Failed to connect to server. Please check your internet connection and try again"
                : "فشل الاتصال بالخادم، يرجى التحقق من اتصال الانترنت والمحاولة مرة أخرى";
            throw new Error(connectionErrorMsg);
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      // Check for HTTP errors
      if (!response || !response.ok) {
        // Try to get error text if possible
        let errorMessage =
          currentLang === "en"
            ? "Error validating voucher"
            : "حدث خطأ أثناء التحقق من القسيمة";
        try {
          const errorText = await response.text();
          console.error("API error response:", errorText);

          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson && errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (parseError) {
            // If not JSON, use the raw text
            if (errorText) errorMessage = errorText;
          }
        } catch (e) {
          console.error("Could not read error response");
        }

        throw new Error(errorMessage);
      }

      // Parse the successful response
      try {
        result = await response.json();
        console.log("Voucher validation result:", result);
      } catch (jsonError) {
        console.error("Error parsing JSON response:", jsonError);
        const parseErrorMsg =
          currentLang === "en"
            ? "Error processing server response"
            : "حدث خطأ أثناء معالجة استجابة الخادم";
        throw new Error(parseErrorMsg);
      }

      if (!result || !result.success) {
        // Show useful tip about the test voucher
        const errorMsg =
          result?.message ||
          (currentLang === "en"
            ? "Please check the code and try again"
            : "الرجاء التحقق من الكود والمحاولة مرة أخرى");

        // Prepare to show a tip about the test voucher after a delay
        setTimeout(() => {
          if (!document.querySelector(".toast-container")) {
            const tipMessage =
              currentLang === "en"
                ? "Tip: You can try the test voucher TEST123"
                : "تلميح: يمكنك تجربة القسيمة التجريبية TEST123";
            showCustomToast(tipMessage, "info", 6000);
          }
        }, 3000);

        throw new Error(errorMsg);
      }

      // Create voucher object from API response
      activeVoucher = {
        id: result.data.voucherId,
        code: code.toUpperCase(),
        discount:
          result.data.type === "percentage"
            ? result.data.value
            : (result.data.discountAmount / subtotal) * 100,
        type: result.data.type,
        value: result.data.value,
        _id: result.data.voucherId, // Store MongoDB ID
      };

      console.log("Voucher applied successfully:", activeVoucher);

      // Save active voucher to localStorage
      localStorage.setItem("activeVoucher", JSON.stringify(activeVoucher));

      // Show success message with toast
      const successMsg =
        currentLang === "en"
          ? `Discount voucher applied: ${activeVoucher.code}`
          : `تم تطبيق قسيمة الخصم: ${activeVoucher.code}`;
      showCustomToast(successMsg, "success");

      // Reset button state with correct language text
      const buttonText = currentLang === "ar" ? "تطبيق" : "Apply";
      applyVoucherBtn.innerHTML = `<i class="fas fa-check"></i><span>${buttonText}</span>`;
      applyVoucherBtn.disabled = false;

      // Display voucher information
      displayAppliedVoucher();

      // Recalculate totals
      await calculateTotals();
      console.log("Totals recalculated after voucher application");

      // Add animation to show success
      voucherCodeInput.classList.add("success-applied");

      // Remove success animation after a short delay
      setTimeout(() => {
        voucherCodeInput.classList.remove("success-applied");
      }, 1500);
    } catch (error) {
      console.error("Voucher validation error:", error);

      // Reset button state with correct language text
      const currentLang = localStorage.getItem("public-language") || "ar";
      const buttonText = currentLang === "ar" ? "تطبيق" : "Apply";
      applyVoucherBtn.innerHTML = `<i class="fas fa-check"></i><span>${buttonText}</span>`;
      applyVoucherBtn.disabled = false;

      // Show error message with toast
      showCustomToast(
        error.message ||
          (currentLang === "en"
            ? "Please check the code and try again"
            : "الرجاء التحقق من الكود والمحاولة مرة أخرى"),
        "error"
      );

      // Focus on input field
      voucherCodeInput.focus();
    }
  }

  function validateVoucher(voucher) {
    // Check if voucher has expired
    const expiryDate = new Date(voucher.expiryDate);
    const today = new Date();

    if (today > expiryDate) {
      return {
        valid: false,
        message: "هذه القسيمة منتهية الصلاحية",
      };
    }

    // Check if there are cart items
    if (cartItems.length === 0) {
      return {
        valid: false,
        message: "لا يمكن تطبيق القسيمة على سلة فارغة",
      };
    }

    return {
      valid: true,
    };
  }

  function displayAppliedVoucher() {
    console.log("Displaying applied voucher:", activeVoucher);
    if (!activeVoucher) {
      console.error("No active voucher to display");
      return;
    }

    // Calculate the discount amount to display immediately
    let discountValue = 0;
    if (cartItems.length > 0) {
      let subtotal = 0;
      cartItems.forEach((item) => {
        subtotal += item.price * item.quantity;
      });
      discountValue = (subtotal * activeVoucher.discount) / 100;
      voucherDiscountAmount = discountValue; // Update the global variable
      console.log(
        `Calculated discount: ${discountValue} (${activeVoucher.discount}% of ${subtotal})`
      );
    }

    // Show the discount row
    if (discountRow) {
      discountRow.style.display = "flex";
      console.log("Discount row display set to flex");
    } else {
      console.error("Discount row element not found");
    }

    // Update discount amount
    if (discountAmount) {
      // Get current language
      const currentLang = localStorage.getItem("public-language") || "ar";
      const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

      discountAmount.textContent =
        discountValue.toFixed(2) + " " + currencyText;
      console.log(
        "Updated discount amount text to:",
        discountValue.toFixed(2) + " " + currencyText
      );

      // Add animation to discount amount
      discountAmount.style.animation = "none";
      discountAmount.offsetHeight; // Trigger reflow
      discountAmount.style.animation = "pulseHighlight 1.5s";
    } else {
      console.error("Discount amount element not found");
    }

    // Get current language
    const currentLang = localStorage.getItem("public-language") || "ar";
    const discountText = currentLang === "en" ? "discount" : "خصم";
    const clearButtonLabel =
      currentLang === "en" ? "Cancel voucher" : "إلغاء القسيمة";

    // Show voucher info
    const voucherInfo = document.createElement("div");
    voucherInfo.classList.add("applied-voucher");
    voucherInfo.innerHTML = `
            <div class="voucher-info">
                <span class="voucher-name">${activeVoucher.code}</span>
                <span class="voucher-discount">${activeVoucher.discount}% ${discountText}</span>
            </div>
            <button class="clear-voucher" id="clear-voucher" aria-label="${clearButtonLabel}">
                <i class="fas fa-times"></i>
            </button>
        `;

    // Replace the existing message
    if (voucherMessage) {
      voucherMessage.innerHTML = "";
      voucherMessage.appendChild(voucherInfo);
      console.log("Voucher message updated with voucher info");

      // Add entry animation
      voucherMessage.style.animation = "none";
      voucherMessage.offsetHeight; // Trigger reflow
      voucherMessage.style.animation = "fadeIn 0.3s forwards";

      // Add event listener to clear button
      const clearBtn = document.getElementById("clear-voucher");
      if (clearBtn) {
        clearBtn.addEventListener("click", clearVoucher);
      } else {
        console.error("Clear voucher button not found after adding to DOM");
      }
    } else {
      console.error("Voucher message element not found");
    }

    // Disable input and apply button
    if (voucherCodeInput) {
      voucherCodeInput.disabled = true;
      voucherCodeInput.style.backgroundColor = "rgba(66, 209, 88, 0.05)";
      voucherCodeInput.style.opacity = "0.7";
    } else {
      console.error("Voucher code input element not found");
    }

    if (applyVoucherBtn) {
      applyVoucherBtn.disabled = true;
    } else {
      console.error("Apply voucher button element not found");
    }
  }

  async function clearVoucher() {
    // Add loading state to button if it exists
    const clearButton = document.getElementById("clear-voucher");
    if (clearButton) {
      clearButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      clearButton.disabled = true;
    }

    // Get current language
    const currentLang = localStorage.getItem("public-language") || "ar";

    // Remove active voucher
    activeVoucher = null;
    voucherDiscountAmount = 0; // Reset the global variable
    localStorage.removeItem("activeVoucher");

    // Reset UI with animation
    if (voucherMessage.firstChild) {
      voucherMessage.firstChild.style.animation = "fadeOut 0.3s forwards";
      // Wait for animation to complete
      setTimeout(() => {
        voucherMessage.innerHTML = "";

        // Reset input and button
        voucherCodeInput.value = "";
        voucherCodeInput.disabled = false;
        voucherCodeInput.style.backgroundColor = "";
        voucherCodeInput.style.opacity = "";
        voucherCodeInput.focus();

        applyVoucherBtn.disabled = false;

        // Show toast notification
        const cancelMsg =
          currentLang === "en"
            ? "Discount voucher cancelled"
            : "تم إلغاء كوبون الخصم";
        showCustomToast(cancelMsg, "info");
      }, 300);
    } else {
      // If no animation needed
      voucherMessage.innerHTML = "";
      voucherCodeInput.value = "";
      voucherCodeInput.disabled = false;
      voucherCodeInput.style.backgroundColor = "";
      voucherCodeInput.style.opacity = "";
      applyVoucherBtn.disabled = false;
    }

    // Hide discount row with animation
    if (discountRow.style.display !== "none") {
      discountRow.style.animation = "fadeOut 0.3s forwards";
      setTimeout(() => {
        discountRow.style.display = "none";
        discountRow.style.animation = "";
      }, 300);
    } else {
      discountRow.style.display = "none";
    }

    // Recalculate totals
    await calculateTotals();
  }

  // Loyalty Points Functions
  async function initLoyaltyPoints() {
    // Check if user is logged in
    if (!isLoggedIn()) {
      // If not logged in, hide loyalty container
      if (loyaltyPointsContainer) {
        loyaltyPointsContainer.style.display = "none";
      }
      return;
    }

    try {
      // Load loyalty discount settings first
      await loadLoyaltyDiscountSettings();

      // Check if loyalty discount is enabled
      if (!loyaltyDiscountSettings.isEnabled) {
        // If disabled, hide loyalty container
        if (loyaltyPointsContainer) {
          loyaltyPointsContainer.style.display = "none";
        }
        return;
      }

      // Fetch user loyalty points
      await fetchUserLoyaltyPoints();

      // Always show the loyalty container for logged-in users, even if they don't have enough points
      // This encourages them to earn more points
      if (loyaltyPointsContainer) {
        loyaltyPointsContainer.style.display = "block";

        // Add animation class after a short delay to draw attention
        setTimeout(() => {
          loyaltyPointsContainer.classList.add("animate");

          // Remove animation after a few seconds
          setTimeout(() => {
            loyaltyPointsContainer.classList.remove("animate");
          }, 6000);
        }, 500);

        // Update max discount value
        const maxValueElement = document.querySelector(".max-value");
        if (maxValueElement) {
          maxValueElement.textContent =
            loyaltyDiscountSettings.maxDiscountValue + "%";
        }
      }

      // Update loyalty points display
      updateLoyaltyPointsDisplay();

      // If user doesn't have enough points, show a message
      if (userLoyaltyPoints < loyaltyDiscountSettings.minPointsForDiscount) {
        const minRequired = loyaltyDiscountSettings.minPointsForDiscount;
        // Disable the apply button
        if (applyPointsBtn) {
          applyPointsBtn.disabled = true;
          applyPointsBtn.classList.add("disabled");
          // Replace hardcoded text with i18n translation
          const minPointsMessage = getTranslation("minPointsRequired").replace(
            "%s",
            minRequired
          );
          applyPointsBtn.innerHTML = `<i class="fas fa-info-circle"></i> ${minPointsMessage}`;
        }
      }

      // Check if there are points already applied from localStorage
      const appliedPoints = getAppliedLoyaltyPoints();
      if (appliedPoints > 0 && appliedPoints <= userLoyaltyPoints) {
        // Apply the saved points
        pointsUsed = appliedPoints;
        updateLoyaltyPointsDisplay();
        calculateLoyaltyDiscount();
        await calculateTotals();

        // Show reset button and hide apply button
        if (applyPointsBtn) applyPointsBtn.style.display = "none";
        if (resetPointsBtn) {
          resetPointsBtn.disabled = false;
          // Get the current language
          const currentLang =
            typeof getCurrentLanguage === "function"
              ? getCurrentLanguage()
              : "ar";
          const resetText =
            currentLang === "en"
              ? '<i class="fas fa-undo"></i> Cancel Application'
              : '<i class="fas fa-undo"></i> إلغاء تطبيق';
          resetPointsBtn.innerHTML = resetText;
          resetPointsBtn.style.display = "inline-flex";
        }

        // Update the loyalty message to show applied status
        const loyaltyMessage = document.querySelector(".loyalty-message");
        if (loyaltyMessage) {
          // Get the current language
          const currentLang =
            typeof getCurrentLanguage === "function"
              ? getCurrentLanguage()
              : "ar";
          const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

          const successText =
            currentLang === "en"
              ? `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> Successfully applied ${pointsUsed} points!</span> Discount: ${pointsDiscountAmount.toFixed(
                  2
                )} ${currencyText}`
              : `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> تم تطبيق ${pointsUsed} نقطة بنجاح!</span> الخصم: ${pointsDiscountAmount.toFixed(
                  2
                )} ${currencyText}`;

          loyaltyMessage.innerHTML = successText;
        }
      }
    } catch (error) {
      console.error("Error initializing loyalty points:", error);
      // Hide loyalty container on error
      if (loyaltyPointsContainer) {
        loyaltyPointsContainer.style.display = "none";
      }
    }
  }

  async function loadLoyaltyDiscountSettings() {
    try {
      // Try to get settings from localStorage first
      const settingsJson = localStorage.getItem("loyaltyDiscountSettings");

      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        loyaltyDiscountSettings = {
          discountPerPoint: settings.discountPerPoint || 0.5,
          minPointsForDiscount: settings.minPointsForDiscount || 10,
          maxDiscountValue: settings.maxDiscountValue || 50,
          isEnabled: settings.isEnabled !== false, // default to true if not specified
        };
        return;
      }

      // If no local settings, try to fetch from API
      const token = getToken();
      if (!token) return;

      // For admin tokens, just use default settings (they can't access customer endpoints)
      if (token.startsWith("admin_")) {
        console.log("Admin token detected, using default loyalty settings");
        return;
      }

      // Add a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${API_BASE_URL}/api/customer/loyalty/discount-settings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // If unauthorized, try to refresh the token
      if (response.status === 200 || response.status === 403) {
        console.log(
          "Unauthorized access to loyalty settings API, attempting token refresh"
        );

        // Check if refreshToken function exists
        if (typeof refreshToken === "function") {
          try {
            // Try to refresh the token
            const newToken = await refreshToken();

            // If we got a new token, retry the request
            if (newToken) {
              console.log("Token refreshed, retrying loyalty settings request");
              const retryResponse = await fetch(
                `${API_BASE_URL}/api/customer/loyalty/discount-settings`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${newToken}`,
                    "Content-Type": "application/json",
                  },
                  signal: AbortSignal.timeout(5000),
                }
              );

              if (retryResponse.ok) {
                const data = await retryResponse.json();
                if (data.success && data.data) {
                  loyaltyDiscountSettings = {
                    discountPerPoint: data.data.discountPerPoint || 0.5,
                    minPointsForDiscount: data.data.minPointsForDiscount || 10,
                    maxDiscountValue: data.data.maxDiscountValue || 50,
                    isEnabled: data.data.isEnabled !== false,
                  };

                  // Save to localStorage for future use
                  localStorage.setItem(
                    "loyaltyDiscountSettings",
                    JSON.stringify(loyaltyDiscountSettings)
                  );
                  return;
                }
              }
            }
          } catch (refreshError) {
            console.error("Error refreshing token:", refreshError);
          }
        }
        // If refresh failed or refreshToken doesn't exist, continue with default settings
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          loyaltyDiscountSettings = {
            discountPerPoint: data.data.discountPerPoint || 0.5,
            minPointsForDiscount: data.data.minPointsForDiscount || 10,
            maxDiscountValue: data.data.maxDiscountValue || 50,
            isEnabled: data.data.isEnabled !== false,
          };

          // Save to localStorage for future use
          localStorage.setItem(
            "loyaltyDiscountSettings",
            JSON.stringify(loyaltyDiscountSettings)
          );
        }
      } else {
        console.log(`API error: ${response.status}`);
      }
    } catch (error) {
      console.error("Error loading loyalty discount settings:", error);
      // Use default settings
    }
  }

  async function fetchUserLoyaltyPoints() {
    try {
      // Try to get from localStorage first
      const userData = getUserData();
      if (userData && userData.loyaltyPoints !== undefined) {
        userLoyaltyPoints = userData.loyaltyPoints;
      }

      // Check if we're properly logged in
      if (!isLoggedIn()) {
        console.log("Not logged in, using cached loyalty points");
        return;
      }

      // Try to fetch latest points from API
      const token = getToken();
      if (!token) {
        console.log("No token available, using cached loyalty points");
        return;
      }

      // For admin tokens, just use cached data (they can't access customer endpoints)
      if (token.startsWith("admin_")) {
        console.log("Admin token detected, using cached loyalty points");
        return;
      }

      try {
        // Add a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(
          `${API_BASE_URL}/api/customer/loyalty-points`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        // If unauthorized, try to refresh the token
        if (response.status === 401 || response.status === 403) {
          console.log(
            "Unauthorized access to loyalty points API, attempting token refresh"
          );

          // Check if refreshToken function exists
          if (typeof refreshToken === "function") {
            try {
              // Try to refresh the token
              const newToken = await refreshToken();

              // If we got a new token, retry the request
              if (newToken) {
                console.log("Token refreshed, retrying loyalty points request");
                const retryResponse = await fetch(
                  `${API_BASE_URL}/api/customer/loyalty-points`,
                  {
                    method: "GET",
                    headers: {
                      Authorization: `Bearer ${newToken}`,
                      "Content-Type": "application/json",
                    },
                    signal: AbortSignal.timeout(5000),
                  }
                );

                if (retryResponse.ok) {
                  const data = await retryResponse.json();
                  if (data.success && data.data) {
                    userLoyaltyPoints = data.data.loyaltyPoints || 0;

                    // Update userData in localStorage
                    if (userData) {
                      userData.loyaltyPoints = userLoyaltyPoints;
                      localStorage.setItem(
                        "userData",
                        JSON.stringify(userData)
                      );
                    }
                    return;
                  }
                }
              }
            } catch (refreshError) {
              console.error("Error refreshing token:", refreshError);
            }
          } else {
            console.log("No refreshToken function available");
          }

          // If refresh failed or refreshToken function doesn't exist, continue using cached data
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            userLoyaltyPoints = data.data.loyaltyPoints || 0;

            // Update userData in localStorage
            if (userData) {
              userData.loyaltyPoints = userLoyaltyPoints;
              localStorage.setItem("userData", JSON.stringify(userData));
            }
          }
        } else {
          console.log(`API error: ${response.status}`);
        }
      } catch (fetchError) {
        console.error("Error fetching loyalty points data:", fetchError);
      }
    } catch (error) {
      console.error("Error in fetchUserLoyaltyPoints:", error);
      // Use points from localStorage if available
    }
  }

  function getUserData() {
    try {
      const userDataString = localStorage.getItem("userData");
      if (userDataString) {
        return JSON.parse(userDataString);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
    return null;
  }

  function updateLoyaltyPointsDisplay() {
    // Re-query the element to ensure we have the latest reference
    const availablePointsElement = document.getElementById("available-points");
    const loyaltyPointsContainer = document.getElementById("loyalty-points-container");
    
    if (!loyaltyPointsContainer || loyaltyPointsContainer.style.display === "none") {
      console.log("Loyalty points container not visible, skipping update");
      return;
    }

    console.log("=== updateLoyaltyPointsDisplay called ===");
    console.log("Cart items:", cartItems);
    console.log("User loyalty points:", userLoyaltyPoints);
    console.log("Free items data:", freeItemsData);

    // Calculate reserved points (points needed for free items in cart)
    let reservedPoints = 0;
    cartItems.forEach(item => {
      console.log(`Item: ${item.name}, Price: ${item.price}, BasePrice: ${item.basePrice}, PointsRequired: ${item.pointsRequired}, Quantity: ${item.quantity}`);
      
      // If item is free but doesn't have pointsRequired, try to find it now
      const isFreeItem = (item.basePrice !== undefined ? item.basePrice === 0 : item.price === 0);
      if (isFreeItem && !item.pointsRequired) {
        const productId = item.baseId || item.id;
        
        // Try direct match first
        let freeItem = freeItemsData.find(fi => 
          fi.productId === productId || 
          fi.productId === item.id ||
          fi.productId.toLowerCase() === productId.toLowerCase()
        );
        
        // If not found, try to match using the full _id from sessionStorage
        if (!freeItem) {
          console.log(`  ⚠️ No direct match for ${productId}, trying with full _id...`);
          try {
            const namesMap = JSON.parse(sessionStorage.getItem("productNames") || "{}");
            if (namesMap[productId] && namesMap[productId]._id) {
              const fullId = namesMap[productId]._id;
              console.log(`    Trying with full _id: ${fullId}`);
              freeItem = freeItemsData.find(fi => fi.productId === fullId);
            }
          } catch (e) {
            console.warn("    Could not retrieve full product ID from sessionStorage");
          }
        }
        
        if (freeItem && freeItem.pointsRequired) {
          item.pointsRequired = freeItem.pointsRequired;
          console.log(`  ⚡ Dynamically added pointsRequired (${freeItem.pointsRequired}) to ${item.name}`);
          // Save the updated cart
          localStorage.setItem("cartItems", JSON.stringify(cartItems));
        } else {
          console.log(`  ⚠️ Could not find free item config for product ${productId}`);
        }
      }
      
      if (item.pointsRequired && item.pointsRequired > 0) {
        const itemReserved = item.pointsRequired * item.quantity;
        reservedPoints += itemReserved;
        console.log(`  -> Reserving ${itemReserved} points (${item.pointsRequired} x ${item.quantity})`);
      }
    });
    
    // Calculate available points after reserving for free items
    const availablePoints = Math.max(0, userLoyaltyPoints - reservedPoints);
    
    console.log(`FINAL: Total points: ${userLoyaltyPoints}, Reserved: ${reservedPoints}, Available: ${availablePoints}`);

    // Update available points display with fresh element reference
    if (availablePointsElement) {
      // Update the text content
      availablePointsElement.textContent = availablePoints;
      
      // Add visual feedback by briefly highlighting the change
      availablePointsElement.style.transition = 'all 0.3s ease';
      availablePointsElement.style.transform = 'scale(1.1)';
      availablePointsElement.style.color = 'var(--primary-color)';
      
      setTimeout(() => {
        availablePointsElement.style.transform = 'scale(1)';
        availablePointsElement.style.color = '';
      }, 300);
      
      console.log(`✅ Successfully updated points display: ${userLoyaltyPoints} total - ${reservedPoints} reserved = ${availablePoints} available`);
    } else {
      console.error("❌ availablePointsElement not found!");
    }

    // Get current language
    const currentLang =
      typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";

    // Update apply points button text if it's disabled
    if (
      applyPointsBtn &&
      applyPointsBtn.disabled &&
      userLoyaltyPoints < loyaltyDiscountSettings.minPointsForDiscount
    ) {
      const minRequired = loyaltyDiscountSettings.minPointsForDiscount;
      const minPointsMessage = getTranslation("minPointsRequired").replace(
        "%s",
        minRequired
      );
      applyPointsBtn.innerHTML = `<i class="fas fa-info-circle"></i> ${minPointsMessage}`;
    } else if (applyPointsBtn && !applyPointsBtn.disabled) {
      // Update the text for the apply button based on language
      const applyText =
        currentLang === "en" ? "Use All Points" : "استخدام كل النقاط";
      applyPointsBtn.innerHTML = `<i class="fas fa-check-circle"></i> ${applyText}`;
    }

    // Update reset button text if visible
    if (resetPointsBtn && resetPointsBtn.style.display !== "none") {
      const resetText =
        currentLang === "en" ? "Cancel Application" : "إلغاء تطبيق";
      resetPointsBtn.innerHTML = `<i class="fas fa-undo"></i> ${resetText}`;
    }

    // Calculate and display discount value
    calculateLoyaltyDiscount();

    // Update progress bar
    updateDiscountProgressBar();
  }

  function updateDiscountProgressBar() {
    const progressFill = document.getElementById("discount-progress-fill");
    if (!progressFill) return;

    // Calculate percentage of maximum discount
    const maxDiscountPercent = loyaltyDiscountSettings.maxDiscountValue;
    const currentDiscountPercent = Math.min(
      pointsUsed * loyaltyDiscountSettings.discountPerPoint,
      maxDiscountPercent
    );

    // Calculate progress percentage
    const progressPercent = (currentDiscountPercent / maxDiscountPercent) * 100;

    // Update progress bar width with animation
    progressFill.style.width = progressPercent + "%";
  }

  function calculateLoyaltyDiscount() {
    // Get the current language
    const currentLang =
      typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

    // Calculate discount percentage based on points used
    const discountPercentage = Math.min(
      pointsUsed * loyaltyDiscountSettings.discountPerPoint,
      loyaltyDiscountSettings.maxDiscountValue
    );

    // Calculate discount amount based on subtotal
    pointsDiscountAmount = (subtotal * discountPercentage) / 100;

    // Update discount value display
    if (pointsDiscountValueElement) {
      pointsDiscountValueElement.textContent =
        pointsDiscountAmount.toFixed(2) + " " + currencyText;
    }

    // Update loyalty discount row if visible
    if (
      loyaltyDiscountRow &&
      loyaltyDiscountRow.style.display === "flex" &&
      loyaltyDiscountAmount
    ) {
      loyaltyDiscountAmount.textContent =
        pointsDiscountAmount.toFixed(2) + " " + currencyText;
    }
  }

  async function applyLoyaltyPoints() {
    // Check if cart is empty
    if (!cartItems || cartItems.length === 0) {
      const currentLang =
        typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
      const emptyCartMessage =
        currentLang === "en"
          ? "Please add items to cart first"
          : "الرجاء إضافة منتجات إلى السلة أولاً";
      showCustomToast(emptyCartMessage, "warning");
      return;
    }

    // Use all available points instead of a selected amount
    if (userLoyaltyPoints < loyaltyDiscountSettings.minPointsForDiscount) {
      // Get the current language
      const currentLang =
        typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";

      // Prepare message in both languages
      const warningMessage =
        currentLang === "en"
          ? `You need at least ${loyaltyDiscountSettings.minPointsForDiscount} points`
          : `يجب أن يكون لديك ${loyaltyDiscountSettings.minPointsForDiscount} نقاط على الأقل`;

      showCustomToast(warningMessage, "warning");
      return;
    }

    // Add a loading state to the button
    if (applyPointsBtn) {
      applyPointsBtn.disabled = true;
      const currentLang =
        typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
      applyPointsBtn.innerHTML =
        currentLang === "en"
          ? '<i class="fas fa-spinner fa-spin"></i> Applying...'
          : '<i class="fas fa-spinner fa-spin"></i> جاري التطبيق...';
    }

    // Set points used to all available points
    pointsUsed = userLoyaltyPoints;

    // Calculate discount
    calculateLoyaltyDiscount();

    // Update progress bar
    updateDiscountProgressBar();

    // Save applied points to localStorage
    saveAppliedLoyaltyPoints(pointsUsed);

    // Get the current language
    const currentLang =
      typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
    const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");

    // Update UI
    if (loyaltyDiscountRow && loyaltyDiscountAmount) {
      loyaltyDiscountRow.style.display = "flex";
      loyaltyDiscountAmount.textContent =
        pointsDiscountAmount.toFixed(2) + " " + currencyText;

      // Add highlight animation to the discount row
      loyaltyDiscountRow.style.animation = "none";
      loyaltyDiscountRow.offsetHeight; // Trigger reflow
      loyaltyDiscountRow.style.animation = "pulseHighlight 2s";
    }

    // Show reset button and hide apply button
    if (applyPointsBtn) applyPointsBtn.style.display = "none";
    if (resetPointsBtn) {
      resetPointsBtn.disabled = false;
      const resetText =
        currentLang === "en"
          ? '<i class="fas fa-undo"></i> Cancel Application'
          : '<i class="fas fa-undo"></i> إلغاء تطبيق';
      resetPointsBtn.innerHTML = resetText;
      resetPointsBtn.style.display = "inline-flex";
    }

    // Recalculate totals
    await calculateTotals();

    // Update the loyalty message
    const loyaltyMessage = document.querySelector(".loyalty-message");
    if (loyaltyMessage) {
      const successText =
        currentLang === "en"
          ? `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> Successfully applied ${pointsUsed} points!</span> Discount: ${pointsDiscountAmount.toFixed(
              2
            )} ${currencyText}`
          : `<span style="color: var(--primary-color); font-weight: 600;"><i class="fas fa-check-circle"></i> تم تطبيق ${pointsUsed} نقطة بنجاح!</span> الخصم: ${pointsDiscountAmount.toFixed(
              2
            )} ${currencyText}`;

      loyaltyMessage.innerHTML = successText;
    }

    // Show success message as a toast instead of alert
    const successMsg =
      currentLang === "en"
        ? "Successfully applied all loyalty points"
        : "تم تطبيق كل نقاط الولاء بنجاح";
    showCustomToast(successMsg, "success", 3000);
  }

  // Helper function to show a custom toast notification
  function showCustomToast(message, type = "success", duration = 3000) {
    // Check if a toast container already exists
    let toastContainer = document.querySelector(".toast-container");

    // If not, create one
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    // Create the toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Set the icon based on type
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-circle";
    if (type === "warning") icon = "exclamation-triangle";

    // Create toast content with close button
    const lang = localStorage.getItem("public-language") || "ar";
    const closeLabel = lang === "en" ? "Close notification" : "إغلاق الإشعار";
    
    toast.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <span>${message}</span>
      <button class="toast-close" aria-label="${closeLabel}">&times;</button>
    `;

    // Add the toast to the container
    toastContainer.appendChild(toast);

    // Add close button listener
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        closeToast(toast, toastContainer);
      });
    }

    // Show the toast with animation
    requestAnimationFrame(() => {
      toast.style.animation = `toast-in 0.5s forwards`;
      toast.classList.add("show");
    });

    // Remove the toast after the specified duration
    const toastTimeout = setTimeout(() => {
      closeToast(toast, toastContainer);
    }, duration);

    // Store the timeout so we can clear it if closed manually
    toast.dataset.timeoutId = toastTimeout;

    // Return the toast element in case we need to reference it later
    return toast;
  }

  // Helper function to close a toast
  function closeToast(toast, container) {
    // Clear any existing timeout
    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId));
    }

    // Apply the exit animation
    toast.style.animation = `toast-out 0.5s forwards`;
    toast.classList.remove("show");

    // Remove from DOM after animation completes
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }

      // Remove the container if there are no more toasts
      if (container.children.length === 0) {
        container.remove();
      }
    }, 500);
  }
  async function resetLoyaltyPoints() {
    // Get current language
    const currentLang = localStorage.getItem("public-language") || "ar";

    // Add loading state to reset button
    if (resetPointsBtn) {
      resetPointsBtn.disabled = true;
      const loadingText =
        currentLang === "en"
          ? '<i class="fas fa-spinner fa-spin"></i> Cancelling...'
          : '<i class="fas fa-spinner fa-spin"></i> جاري الإلغاء...';
      resetPointsBtn.innerHTML = loadingText;
    }

    // Reset points used
    pointsUsed = 0;
    pointsDiscountAmount = 0;

    // Clear applied points from localStorage
    clearAppliedLoyaltyPoints();

    // Update UI
    if (pointsDiscountValueElement) {
      const currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : (currentLang === "en" ? "EGP" : "جنية");
      pointsDiscountValueElement.textContent = "0.00 " + currencyText;
    }

    // Reset progress bar
    updateDiscountProgressBar();

    // Hide discount row
    if (loyaltyDiscountRow) loyaltyDiscountRow.style.display = "none";

    // Show apply button and hide reset button
    if (applyPointsBtn) {
      applyPointsBtn.style.display = "inline-flex";
      applyPointsBtn.disabled = false;
      const applyText =
        currentLang === "en"
          ? '<i class="fas fa-check-circle"></i> Use All Points'
          : '<i class="fas fa-check-circle"></i> استخدام كل النقاط';
      applyPointsBtn.innerHTML = applyText;
    }
    if (resetPointsBtn) {
      resetPointsBtn.disabled = false;
      resetPointsBtn.innerHTML = '<i class="fas fa-undo"></i> إلغاء تطبيق';
      resetPointsBtn.style.display = "none";
    }

    // Recalculate totals
    await calculateTotals();

    // Reset the loyalty message
    const loyaltyMessage = document.querySelector(".loyalty-message");
    if (loyaltyMessage) {
      const tipMessage =
        currentLang === "en"
          ? '<i class="fas fa-lightbulb"></i> Use all your points for maximum discount, and earn more with every order!'
          : '<i class="fas fa-lightbulb"></i> استخدم كل نقاطك للحصول على أقصى خصم ممكن، وكسب المزيد مع كل طلب!';
      loyaltyMessage.innerHTML = tipMessage;
    }

    // Show success message
    const cancelMessage =
      currentLang === "en"
        ? "Loyalty points application cancelled"
        : "تم إلغاء تطبيق نقاط الولاء";
    showCustomToast(cancelMessage, "info");
  }

  function saveAppliedLoyaltyPoints(points) {
    localStorage.setItem("appliedLoyaltyPoints", points);
  }

  function getAppliedLoyaltyPoints() {
    const points = localStorage.getItem("appliedLoyaltyPoints");
    return points ? parseInt(points) : 0;
  }

  function clearAppliedLoyaltyPoints() {
    localStorage.removeItem("appliedLoyaltyPoints");
  }

  function getTaxRate() {
    return new Promise((resolve, reject) => {
      fetch("http://localhost:5000/api/tax-settings")
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to load tax settings");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success && data.data) {
            console.log("Loaded tax settings from API:", data.data);
            resolve(data.data);
          } else {
            throw new Error("Invalid tax settings data");
          }
        })
        .catch((error) => {
          console.error("Error getting tax settings:", error);
          // Default tax settings if API fails
          resolve({
            rate: 15,
            enabled: true,
            serviceRate: 10,
            serviceEnabled: false,
          });
        });
    });
  }
  function generateOrderId() {
    return "ORD-" + Date.now().toString(36).toUpperCase();
  }

  function saveOrder(order) {
    // Add table number to order if available
    if (tableNumber) {
      order.tableNumber = tableNumber;
    } else {
      // If no table number is available, use a default table number
      // instead of making it a takeaway order
      order.tableNumber = "0"; // Using '0' for orders without a specific table
    }
    // Always set type to 'dine-in' since we don't have takeaway
    order.type = "dine-in";

    // Get existing orders
    try {
      let orders = [];
      const savedOrders = localStorage.getItem("orders");

      if (savedOrders) {
        orders = JSON.parse(savedOrders);
      }

      // Add new order
      orders.push(order);

      // Save to localStorage
      localStorage.setItem("orders", JSON.stringify(orders));
      console.log("Order saved successfully");

      // If a voucher was used, update its usage count in the vouchers list
      if (order.discount && order.discount.code) {
        updateVoucherUsage(order.discount.code);
      }

      // Send a custom event to notify other pages (like cashier.html) if they're open
      const orderEvent = new CustomEvent("newOrderCreated", {
        detail: {
          orderId: order.id,
          tableNumber: order.tableNumber,
          total: order.total,
        },
      });
      window.dispatchEvent(orderEvent);
    } catch (error) {
      console.error("Error saving order:", error);
    }
  }

  function updateVoucherUsage(voucherCode) {
    try {
      const savedVouchers = localStorage.getItem("vouchers");
      if (savedVouchers) {
        let vouchers = JSON.parse(savedVouchers);
        const voucherIndex = vouchers.findIndex((v) => v.code === voucherCode);

        if (voucherIndex !== -1) {
          // Initialize usageCount if it doesn't exist
          if (!vouchers[voucherIndex].usageCount) {
            vouchers[voucherIndex].usageCount = 0;
          }

          // Increment usage count
          vouchers[voucherIndex].usageCount++;
          localStorage.setItem("vouchers", JSON.stringify(vouchers));
          console.log(`Updated usage count for voucher ${voucherCode}`);
        }
      }
    } catch (error) {
      console.error("Error updating voucher usage:", error);
    }
  }

  // Get table number from URL or session storage
  function getTableNumber() {
    // First check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let table = urlParams.get("table");

    // If not in URL, check session storage (from index.html)
    if (!table) {
      table = sessionStorage.getItem("tableNumber");
    }

    return table;
  }

  // Display table indicator if table number is present
  function displayTableIndicator(tableNum) {
    // Update return/back link to preserve table number
    const backLink = document.querySelector(".back-button a");
    if (backLink) {
      backLink.href = `index.html?table=${tableNum}`;
    }

    const browseMenuBtn = document.querySelector(".browse-menu-btn");
    if (browseMenuBtn) {
      browseMenuBtn.href = `index.html?table=${tableNum}`;
    }
  }

  // Check table number in URL and session storage
  function checkTableNumber() {
    const tableNum = getTableNumber();
    if (tableNum) {
      displayTableIndicator(tableNum);
    }
  }

  // Setup event listeners for cart items
  function setupEventListeners() {
    // Add event listeners for cart items (increase, decrease, remove buttons)
    // Only add event listeners once (they'll use event delegation)
    if (!cartItemsContainer.hasAttribute("data-events-attached")) {
      addCartItemEventListeners();
      cartItemsContainer.setAttribute("data-events-attached", "true");
    }

    // Update cart count display
    updateCartCountDisplay();
  }

  // Load cart items
  initCart();

  // Set up event listeners
  setupEventListeners();

  // Check for table number in URL
  checkTableNumber();

  // Add this new keyframe animation to handle fadeOut
  const styleSheet = document.createElement("style");
  styleSheet.innerHTML = `    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
    
    @keyframes pulseHighlight {
      0% { color: var(--primary-color); text-shadow: 0 0 0 rgba(66, 209, 88, 0.7); }
      50% { color: #35b049; text-shadow: 0 0 10px rgba(66, 209, 88, 0.7); }
      100% { color: var(--primary-color); text-shadow: 0 0 0 rgba(66, 209, 88, 0.7); }
    }
  `;
  document.head.appendChild(styleSheet);

  // Special function for cart success notifications
  function showCartSuccessToast(message, count = 1) {
    // Create a more visual cart notification
    let toastContainer = document.querySelector(".toast-container");

    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }

    // Create the toast element with shopping cart icon
    const toast = document.createElement("div");
    toast.className = "toast success cart-success-toast";

    // Add badge with count if more than 1 item
    let countBadge = "";
    if (count > 1) {
      countBadge = `<span class="item-count-badge">${count}</span>`;
    }

    const lang = localStorage.getItem("public-language") || "ar";
    const closeLabel = lang === "en" ? "Close notification" : "إغلاق الإشعار";
    
    toast.innerHTML = `
      <div class="cart-toast-icon">
        <i class="fas fa-shopping-cart"></i>
        ${countBadge}
      </div>
      <span>${message}</span>
      <button class="toast-close" aria-label="${closeLabel}">&times;</button>
    `;

    // Add the toast to the container
    toastContainer.appendChild(toast);

    // Add close button listener
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        closeToast(toast, toastContainer);
      });
    }

    // Show the toast with animation
    requestAnimationFrame(() => {
      toast.style.animation = `toast-in 0.5s forwards`;
      toast.classList.add("show");
    });

    // Remove the toast after 3 seconds
    const toastTimeout = setTimeout(() => {
      closeToast(toast, toastContainer);
    }, 3000);

    // Store the timeout ID
    toast.dataset.timeoutId = toastTimeout;

    return toast;
  }

  // Listen for global settings changes (currency updates)
  window.addEventListener('global-settings-changed', function(event) {
    console.log('Global settings changed in cart page, refreshing displays');
    // Recalculate totals to update currency display
    if (typeof calculateTotals === 'function') {
      calculateTotals();
    }
    // Refresh cart display
    displayCart();
  });

  // Listen for global settings loaded event
  window.addEventListener('global-settings-loaded', function(event) {
    console.log('Global settings loaded in cart page');
    // Initial display with correct currency
    if (typeof calculateTotals === 'function') {
      calculateTotals();
    }
  });

  // Listen for language change event to update currency display
  document.addEventListener('language_changed', function(event) {
    console.log('Language changed in cart page, refreshing currency display');
    // Recalculate totals to update currency display (ريال → SAR or vice versa)
    if (typeof calculateTotals === 'function') {
      calculateTotals();
    }
    // Refresh cart display
    displayCart();
  });
});
