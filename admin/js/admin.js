/**
 * Admin Dashboard JavaScript
 */

// Get translation helper function
function getTranslation(key) {
  if (!key || typeof key !== "string") {
    return key;
  }
  if (typeof translations !== "undefined" && translations) {
    const preferredLang = localStorage.getItem("admin-language") || "ar";
    const preferredTranslation =
      translations[preferredLang] && translations[preferredLang][key];
    if (preferredTranslation !== undefined && preferredTranslation !== null) {
      return preferredTranslation;
    }
    const fallbackArabic = translations.ar && translations.ar[key];
    if (fallbackArabic !== undefined && fallbackArabic !== null) {
      return fallbackArabic;
    }
    const fallbackEnglish = translations.en && translations.en[key];
    if (fallbackEnglish !== undefined && fallbackEnglish !== null) {
      return fallbackEnglish;
    }
  }
  return key;
}

// Initialize global settings object for admin
window.globalSettings = {
  loaded: false,
  currency: "EGP",
  currencyCode: "EGP",
};

// Load global settings from API
async function loadAdminGlobalSettings() {
  try {
    const API_BASE_URL =
      typeof window !== "undefined" && window.API_BASE_URL
        ? `${window.API_BASE_URL}/api`
        : typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1")
        ? "http://localhost:5000/api"
        : "/api";
    const response = await fetch(`${API_BASE_URL}/global-settings`);
    const result = await response.json();

    if (result.success && result.data) {
      window.globalSettings = {
        ...result.data,
        currencyCode: result.data.currency, // Ensure currencyCode is set for English display
        loaded: true,
      };
      console.log("Admin global settings loaded:", window.globalSettings);

      // Dispatch event to notify other scripts
      window.dispatchEvent(
        new CustomEvent("admin-global-settings-loaded", {
          detail: window.globalSettings,
        })
      );

      return window.globalSettings;
    }
  } catch (error) {
    console.error("Error loading admin global settings:", error);
  }
  return null;
}

// Load settings on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAdminGlobalSettings);
} else {
  loadAdminGlobalSettings();
}

let currentOrderDetailsModalData = null;

/**
 * Shows an admin notification at the bottom middle of the screen
 * @param {string} message - The notification message to display
 * @param {string} type - The notification type: 'success', 'error', 'warning', or 'info'
 * @param {number} duration - How long the notification should stay visible in milliseconds
 * @param {Function} onClick - Optional click handler for the notification
 */
function showAdminNotification(
  message,
  type = "info",
  duration = 3000,
  onClick = null
) {
  // Remove any existing notifications to prevent stacking
  const existingNotifications = document.querySelectorAll(
    ".admin-bottom-notification"
  );
  existingNotifications.forEach((notif) => {
    notif.remove();
  });

  // Create notification element
  const notification = document.createElement("div");
  notification.classList.add("admin-bottom-notification");

  // Add type class
  if (type) {
    notification.classList.add(type);
  }

  notification.textContent = message;

  // Add click handler if provided
  if (typeof onClick === "function") {
    notification.style.cursor = "pointer";
    notification.addEventListener("click", onClick);
  }

  // Add notification to body
  document.body.appendChild(notification);

  // Force a reflow to ensure the element is rendered before adding the show class
  notification.offsetHeight;

  // Show notification
  requestAnimationFrame(() => {
    notification.classList.add("show");
  });

  // Remove notification after the specified duration
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, duration);
}

/**
 * Shows the global loading spinner
 */
function showLoadingSpinner() {
  const loadingSpinner = document.getElementById("admin-loading");
  if (loadingSpinner) {
    loadingSpinner.style.display = "flex";
  }
}

/**
 * Hides the global loading spinner
 */
function hideLoadingSpinner() {
  const loadingSpinner = document.getElementById("admin-loading");
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Check if styles are loaded
  console.log("Checking if orders-filter.css is loaded...");
  const stylesLoaded = Array.from(document.styleSheets).some(
    (sheet) => sheet.href && sheet.href.includes("orders-filter.css")
  );
  console.log("orders-filter.css loaded:", stylesLoaded);

  // Setup service worker update handling
  setupServiceWorkerUpdateHandler();

  // Fix the "All Customers" option text for the current language
  fixAllCustomersOptionText();

  // Check for offline mode parameter
  const urlParams = new URLSearchParams(window.location.search);
  const isOfflineMode = urlParams.get("offline") === "true";

  if (isOfflineMode) {
    console.log("Running in offline mode by user request");
    document.body.classList.add("offline-mode");
    showAdminNotification(
      getTranslation("offlineModeEnabled"),
      "warning",
      5000
    );
  }

  // Initialize sidebar toggle functionality
  initSidebarToggle();

  // Initialize add-ons functionality
  initProductAddons();

  console.log("Admin page loaded. Performing initial authentication check...");

  // Verify token is present
  const token = localStorage.getItem("adminToken");
  console.log("Admin token present:", !!token);

  // Verify session is valid
  const sessionData = localStorage.getItem("adminSession");

  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);
      console.log("Session found:", session);
      console.log(
        "Session valid until:",
        new Date(session.expiresAt).toLocaleString()
      );
      console.log("Current time:", new Date().toLocaleString());
      console.log("Session is valid:", session.expiresAt > Date.now());
    } catch (e) {
      console.error("Error parsing session:", e);
    }
  } else {
    console.log("No session data found");
  }

  // Check if user is authenticated first
  if (!isAuthenticated()) {
    // Redirect to login page if not authenticated
    console.log("Authentication failed, redirecting to login page");
    window.location.href = "admin-login.html";
    return;
  }

  console.log("Authentication successful, continuing with page initialization");

  // Check section permissions and hide unauthorized sections
  checkSectionPermissions();

  // Update UI elements based on permissions
  updateUIBasedOnPermissions();

  // Show welcome notification only once per session
  const welcomeShown = sessionStorage.getItem("welcomeNotificationShown");
  if (!welcomeShown) {
    // Get admin name from session
    let adminName = "المدير";
    if (sessionData) {
      const session = JSON.parse(sessionData);
      if (session.displayName) {
        adminName = session.displayName;
      }
    }

    // Show welcome notification
    showAdminNotification(
      getTranslation("welcomeMessage").replace("{name}", adminName),
      "success",
      5000
    );

    // Set flag in session storage to prevent showing again
    sessionStorage.setItem("welcomeNotificationShown", "true");
  }

  // Initialize orders date filter
  const ordersDateFilter = document.getElementById("orders-date-filter");
  const ordersStatusFilter = document.getElementById("orders-status-filter");
  const clearOrdersDateFilterBtn = document.getElementById(
    "clear-orders-date-filter"
  );
  const ordersFilterContainer = document.querySelector(
    ".orders-filter-container"
  );

  if (ordersDateFilter) {
    // Set max date to today
    ordersDateFilter.max = new Date().toISOString().split("T")[0];

    // Add event listener for date change
    ordersDateFilter.addEventListener("change", function () {
      updateRecentOrders();
      showToast(
        getTranslation("ordersFilterApplied") || "تم تطبيق التصفية على الطلبات",
        "info"
      );

      if (ordersFilterContainer) {
        if (
          this.value ||
          (ordersStatusFilter && ordersStatusFilter.value !== "all")
        ) {
          ordersFilterContainer.classList.add("active-filter");
        } else {
          ordersFilterContainer.classList.remove("active-filter");
        }
      }
    });
  }

  if (ordersStatusFilter) {
    ordersStatusFilter.addEventListener("change", function () {
      updateRecentOrders();
      showToast(
        getTranslation("ordersStatusUpdated") || "تم تحديث حالة الطلبات",
        "info"
      );

      if (ordersFilterContainer) {
        if (
          this.value !== "all" ||
          (ordersDateFilter && ordersDateFilter.value)
        ) {
          ordersFilterContainer.classList.add("active-filter");
        } else {
          ordersFilterContainer.classList.remove("active-filter");
        }
      }
    });
  }

  if (clearOrdersDateFilterBtn) {
    clearOrdersDateFilterBtn.addEventListener("click", function () {
      ordersDateFilter.value = "";
      if (ordersStatusFilter) {
        ordersStatusFilter.value = "all";
      }
      updateRecentOrders();
      showToast(
        getTranslation("ordersFiltersCleared") || "تم مسح التصفية",
        "info"
      );

      if (ordersFilterContainer) {
        ordersFilterContainer.classList.remove("active-filter");
      }
    });
  }

  // DOM Elements - Modals
  const productModal = document.getElementById("product-modal");
  const closeProductModal = document.getElementById("close-product-modal");
  const voucherModal = document.getElementById("voucher-modal");
  const closeVoucherModal = document.getElementById("close-voucher-modal");

  // DOM Elements - Forms
  const productForm = document.getElementById("product-form");
  const voucherForm = document.getElementById("voucher-form");

  // DOM Elements - Buttons
  const addProductBtn = document.getElementById("add-product-btn");
  const saveTaxSettingsBtn = document.getElementById("save-tax-settings");
  const resetStatsBtn = document.getElementById("reset-stats");
  const addVoucherBtn = document.getElementById("add-voucher-btn");
  const applyGlobalDiscountBtn = document.getElementById(
    "apply-global-discount"
  );
  const resetGlobalDiscountBtn = document.getElementById(
    "reset-global-discount"
  );

  // Check if elements are found
  console.log("Elements found:", {
    productModal: !!productModal,
    closeProductModal: !!closeProductModal,
    voucherModal: !!voucherModal,
    closeVoucherModal: !!closeVoucherModal,
    productForm: !!productForm,
    voucherForm: !!voucherForm,
    addProductBtn: !!addProductBtn,
    saveTaxSettingsBtn: !!saveTaxSettingsBtn,
    resetStatsBtn: !!resetStatsBtn,
    addVoucherBtn: !!addVoucherBtn,
    applyGlobalDiscountBtn: !!applyGlobalDiscountBtn,
    resetGlobalDiscountBtn: !!resetGlobalDiscountBtn,
  });

  // DOM Elements - Lists
  const productsList = document.getElementById("products-list");
  const vouchersList = document.getElementById("vouchers-list");

  // DOM Elements - Stats
  const totalEarningsElement = document.getElementById("total-earnings");
  const totalOrdersElement = document.getElementById("total-orders");
  const totalProductsElement = document.getElementById("total-products");
  const totalVouchersElement = document.getElementById("total-vouchers");
  const averageOrderValueElement = document.getElementById(
    "average-order-value"
  );
  const dashboardTotalOffersElement = document.getElementById(
    "dashboard-total-offers"
  );

  // DOM Elements - Tax Settings
  const taxRateInput = document.getElementById("tax-rate");
  const taxEnabledToggle = document.getElementById("tax-enabled");

  // Toggle light/dark mode
  const toggleSwitch = document.getElementById("switch");
  if (toggleSwitch) {
    applyThemeFromStorage();
    toggleSwitch.addEventListener("change", function () {
      if (this.checked) {
        // Dark mode
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
      } else {
        // Light mode
        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
      }

      // Update chart with new theme
      if (salesChart) {
        // Destroy existing chart
        salesChart.destroy();
        salesChart = null;

        // Reinitialize chart with new theme
        initSalesChart();
      }
    });
  }

  // Data Storage
  let products = [];
  let orders = [];
  let vouchers = [];
  let taxSettings = {
    rate: 15,
    enabled: true,
    serviceRate: 10,
    serviceEnabled: false,
  };

  // Selection state management
  let selectedProducts = new Set();
  let selectedCategories = new Set();
  let selectedVouchers = new Set();

  // Sales chart variables
  let salesChart = null;
  let salesData = {
    labels: [],
    earnings: [],
    tooltips: [],
  };

  // Initialize data from localStorage
  initData();

  // Initialize stats
  updateStats();

  // Event Listeners - Modals
  addProductBtn.addEventListener("click", function () {
    console.log("Add product button clicked");
    openProductModal();
  });
  closeProductModal.addEventListener("click", closeAllModals);

  addVoucherBtn.addEventListener("click", function () {
    console.log("Add voucher button clicked");
    showVoucherModalForced();
  });
  closeVoucherModal.addEventListener("click", closeAllModals);

  // Event Listeners - Forms
  productForm.addEventListener("submit", handleProductSubmit);
  voucherForm.addEventListener("submit", handleVoucherSubmit);

  // Event Listeners - Tax Settings
  saveTaxSettingsBtn.addEventListener("click", saveTaxSettings);

  // Event Listener - Reset Stats
  if (resetStatsBtn) {
    resetStatsBtn.addEventListener("click", confirmResetStats);
  }

  // Event Listeners - Global Discount
  if (applyGlobalDiscountBtn) {
    applyGlobalDiscountBtn.addEventListener("click", applyGlobalDiscount);
  }

  if (resetGlobalDiscountBtn) {
    resetGlobalDiscountBtn.addEventListener("click", resetGlobalDiscount);
  }

  // Real-time data storage changes
  window.addEventListener("storage", function (e) {
    if (e.key === "orders") {
      // Orders changed (possibly from a new checkout)
      loadOrders();
      updateStats();
    } else if (e.key === "taxSettings") {
      // Tax settings changed
      loadTaxSettings();
    }
  });

  // Listen for custom discount change events
  window.addEventListener("digital_menu_discount_change", function () {
    // Reload products to get updated prices
    loadProducts();
  });

  // Add event listener for local storage changes (for cross-tab sync)
  window.addEventListener("storage", function (e) {
    // Check if the discount status changed
    if (e.key === "original_prices" || e.key === "discount_change_event") {
      checkGlobalDiscount();
    }
  });

  // Functions - Reset Stats
  function confirmResetStats() {
    // Show confirmation dialog
    if (
      confirm(
        "هل أنت متأكد من إعادة تعيين جميع الإحصائيات؟ سيتم حذف جميع بيانات الطلبات."
      )
    ) {
      resetStats();
    }
  }

  async function resetStats() {
    try {
      // Initialize API service
      const apiService = new ApiService();

      // Call the reset stats API endpoint
      console.log("Resetting stats via API...");
      const response = await apiService.resetStats();

      if (response && response.success) {
        console.log("Stats reset successfully:", response);

        // Also clear local orders data
        orders = [];
        localStorage.removeItem("orders");

        // Update stats display
        updateStats();

        // Show notification
        showNotification(
          response.message || getTranslation("statsResetSuccess"),
          "success"
        );
      } else {
        console.error("Failed to reset stats:", response?.error);
        showNotification(getTranslation("statsResetFailed"), "error");
      }
    } catch (error) {
      console.error("Error resetting stats:", error);
      showNotification(getTranslation("statsResetError"), "error");
    }

    // Apply animation to the reset button
    resetStatsBtn.classList.add("rotating");
    setTimeout(() => {
      resetStatsBtn.classList.remove("rotating");
    }, 1000);
  }

  // Functions - Theme
  function applyThemeFromStorage() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      document.body.classList.add("light-mode");
      toggleSwitch.checked = false;
    } else {
      document.body.classList.remove("light-mode");
      toggleSwitch.checked = true;
    }
  }

  // Functions - Initialization
  function initData() {
    // Show loading spinner
    showLoadingSpinner();

    // Load products
    loadProducts();

    // Load orders
    loadOrders();

    // Load vouchers
    loadVouchers();

    // Load tax settings
    loadTaxSettings();

    // Render products
    renderProducts();

    // Render vouchers
    renderVouchers();

    // Initialize image preview and upload functionality
    initImageHandling();

    // Initialize QR code generator
    initQRCodeGenerator();

    // Check global discount status
    checkGlobalDiscount();

    // Create crowded hours chart
    createCrowdedHoursChart();

    // Update all currency text elements
    updateAllCurrencyText();

    // Hide the loading spinner after initialization
    hideLoadingSpinner();
  }

  // Function to update all currency text elements based on the current language
  function updateAllCurrencyText() {
    const currencyText = getCurrencyText();

    // Update all currency-text elements
    document.querySelectorAll(".currency-text").forEach((element) => {
      element.textContent = currencyText;
    });

    // Update all currency-symbol elements (in forms)
    document.querySelectorAll(".currency-symbol").forEach((element) => {
      element.textContent = currencyText;
    });

    console.log(`Updated all currency text elements to: ${currencyText}`);
  }

  // Flag to track if discount notification has been shown on this page load
  let discountNotificationShown = false;

  // Check if global discount is applied and update UI
  async function checkGlobalDiscount() {
    // Get the discount input element
    const discountInput = document.getElementById("global-discount-percentage");
    const applyBtn = document.getElementById("apply-global-discount");
    const resetBtn = document.getElementById("reset-global-discount");

    if (!discountInput || !applyBtn || !resetBtn) return;

    // Get discount container element
    const discountContainer = document.querySelector(
      ".global-discount-container"
    );

    try {
      // Initialize API service
      const apiService = new ApiService();

      // Get discount status from API
      console.log("Checking global discount status from API");
      const response = await apiService.getGlobalDiscountStatus();

      if (response.success && response.data) {
        if (response.data.discountActive) {
          // Discount is active, update UI
          const discountPercent = response.data.discountPercentage;

          // Update UI to show current discount
          discountInput.value = discountPercent;

          // Add a visual indicator that discount is active
          if (discountContainer) {
            discountContainer.classList.add("discount-active");
          }

          // Show notification that discount is active (only once per page load)
          if (!discountNotificationShown) {
            showNotification(
              getTranslation("globalDiscountActive").replace(
                "{percent}",
                discountPercent
              ),
              "info"
            );
            discountNotificationShown = true;
          }
        } else {
          // No discount is active, reset UI
          if (discountContainer) {
            discountContainer.classList.remove("discount-active");
          }
          discountInput.value = 10; // Reset to default value
        }
      }
    } catch (error) {
      console.error("Error checking discount status:", error);
      // Reset UI in case of error
      if (discountContainer) {
        discountContainer.classList.remove("discount-active");
      }
      discountInput.value = 10; // Reset to default value
    }
  }

  // Initialize image handling functionality
  function initImageHandling() {
    // Initialize image preview button
    const previewImageBtn = document.getElementById("preview-image-btn");
    if (previewImageBtn) {
      previewImageBtn.addEventListener("click", function (e) {
        // Prevent form submission when clicking the preview button
        e.preventDefault();

        const productImageInput = document.getElementById("product-image");

        // Clear any previous validation styling
        productImageInput.classList.remove("invalid");

        if (!productImageInput.value.trim()) {
          showNotification(getTranslation("enterImageLinkFirst"), "warning");
          return;
        }

        previewImageFromUrl(productImageInput.value);
      });
    }

    // Initialize image upload functionality
    const fileUploadInput = document.getElementById("product-image-upload");
    if (fileUploadInput) {
      const fileUploadWrapper = fileUploadInput.closest(".file-upload-wrapper");
      const fileUploadBox = fileUploadWrapper.querySelector(".file-upload-box");

      // Remove old event listeners by cloning the input element
      const newFileUploadInput = fileUploadInput.cloneNode(true);
      fileUploadInput.parentNode.replaceChild(
        newFileUploadInput,
        fileUploadInput
      );

      // Handle file selection (only one listener now)
      newFileUploadInput.addEventListener("change", function (e) {
        handleFileUpload(this.files[0], fileUploadWrapper);
      });

      // Remove old drag/drop listeners by cloning the box
      const newFileUploadBox = fileUploadBox.cloneNode(true);
      fileUploadBox.parentNode.replaceChild(newFileUploadBox, fileUploadBox);

      // Handle drag and drop (only one listener now)
      newFileUploadBox.addEventListener("dragover", function (e) {
        e.preventDefault();
        fileUploadWrapper.classList.add("dragging");
      });

      newFileUploadBox.addEventListener("dragleave", function (e) {
        e.preventDefault();
        fileUploadWrapper.classList.remove("dragging");
      });

      newFileUploadBox.addEventListener("drop", function (e) {
        e.preventDefault();
        fileUploadWrapper.classList.remove("dragging");

        if (e.dataTransfer.files.length) {
          handleFileUpload(e.dataTransfer.files[0], fileUploadWrapper);
        }
      });
    }

    // Initialize tab switching
    const imageTabs = document.querySelectorAll(".image-tab");
    if (imageTabs.length) {
      imageTabs.forEach((tab) => {
        tab.addEventListener("click", function () {
          // Remove active class from all tabs and contents
          document
            .querySelectorAll(".image-tab")
            .forEach((t) => t.classList.remove("active"));
          document
            .querySelectorAll(".image-tab-content")
            .forEach((c) => c.classList.remove("active"));

          // Add active class to clicked tab and its content
          this.classList.add("active");
          const tabId = this.getAttribute("data-tab");
          document.getElementById(tabId + "-tab").classList.add("active");
        });
      });
    }

    // Add event listener to product image URL input to handle Enter key
    const productImageInput = document.getElementById("product-image");
    if (productImageInput) {
      productImageInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault(); // Prevent form submission
          previewImageBtn.click(); // Trigger preview button click
        }
      });
    }
  }

  // Preview image from URL
  function previewImageFromUrl(imageUrl) {
    const previewImg = document.getElementById("preview-img");
    const noPreviewDiv = document.getElementById("no-preview");
    const productImageFinal = document.getElementById("product-image-final");

    if (imageUrl) {
      // Check if it's an already uploaded image (starts with /assets/products/)
      // or an external URL (starts with http or https)
      const isLocalAsset = imageUrl.startsWith("/assets/products/");
      const isExternalUrl =
        imageUrl.startsWith("http://") || imageUrl.startsWith("https://");

      if (isLocalAsset || isExternalUrl) {
        console.log("Using direct image URL without uploading:", imageUrl);
        // Direct use for local assets or external URLs
        previewImg.src = imageUrl;
        previewImg.onload = function () {
          previewImg.style.display = "block";
          noPreviewDiv.style.display = "none";
          productImageFinal.value = imageUrl;
        };
        previewImg.onerror = function () {
          previewImg.style.display = "none";
          noPreviewDiv.style.display = "flex";
          productImageFinal.value = "";
          showNotification(getTranslation("cannotLoadImage"), "error");
        };
      } else if (imageUrl.startsWith("data:image/")) {
        // For data URLs, just preview without uploading (we'll upload on save)
        console.log("Using data URL for preview (will upload on save)");
        previewImg.src = imageUrl;
        previewImg.style.display = "block";
        noPreviewDiv.style.display = "none";
        productImageFinal.value = imageUrl;
        showNotification(getTranslation("imageLoadedForPreview"), "success");
      } else {
        console.log("Unknown image URL format:", imageUrl);
        // Unknown URL format
        previewImg.style.display = "none";
        noPreviewDiv.style.display = "flex";
        productImageFinal.value = "";
        showNotification(getTranslation("invalidImageFormat"), "error");
      }
    } else {
      previewImg.style.display = "none";
      noPreviewDiv.style.display = "flex";
      productImageFinal.value = "";
      showNotification(getTranslation("enterImageLinkFirst"), "warning");
    }
  }

  // Handle file upload
  async function handleFileUpload(file, wrapper) {
    const previewImg = document.getElementById("preview-img");
    const noPreviewDiv = document.getElementById("no-preview");
    const productImageFinal = document.getElementById("product-image-final");
    const statusText = wrapper.querySelector("p");

    // Reset error state
    wrapper.classList.remove("error");

    // Validate file
    if (!file) return;

    console.log(
      `Processing file upload: ${file.name}, type: ${file.type}, size: ${
        file.size / 1024
      } KB`
    );

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      wrapper.classList.add("error");
      statusText.textContent = getTranslation("invalidFileTypeStatus");
      showNotification(getTranslation("invalidFileType"));
      return;
    }

    // File size limit (5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      wrapper.classList.add("error");
      statusText.textContent = getTranslation("fileTooLargeStatus");
      showNotification(getTranslation("fileTooLarge"));
      return;
    }

    // Show loading state
    wrapper.classList.add("has-file");
    statusText.textContent = getTranslation("processingImage");

    let compressedDataUrl = null;
    try {
      console.log("Compressing image...");
      statusText.textContent = getTranslation("processingImage");
      compressedDataUrl = await ImageCompressor.compress(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        outputFormat: "jpeg",
      });

      console.log("Image compressed successfully, uploading to server...");
      statusText.textContent =
        getTranslation("uploadingImage") || "جاري رفع الصورة...";

      const response = await fetch(`${API_BASE_URL}/upload/image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData: compressedDataUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      const result = await response.json();
      if (!result.success || !result.imageUrl) {
        throw new Error("Invalid response from server");
      }

      const baseUrl = API_BASE_URL.replace("/api", "");
      const imageUrl = `${baseUrl}${result.imageUrl}`;
      previewImg.src = imageUrl;
      previewImg.style.display = "block";
      noPreviewDiv.style.display = "none";
      productImageFinal.value = result.imageUrl;
      statusText.textContent =
        getTranslation("imageUploadedSuccessStatus") || "تم رفع الصورة بنجاح";
      showNotification(
        getTranslation("imageUploadedSuccess") || "تم رفع الصورة بنجاح",
        "success"
      );
    } catch (error) {
      if (compressedDataUrl) {
        previewImg.src = compressedDataUrl;
        previewImg.style.display = "block";
        noPreviewDiv.style.display = "none";
        productImageFinal.value = compressedDataUrl;
        statusText.textContent =
          getTranslation("imageStoredInlineStatus") ||
          "تم حفظ الصورة ضمن البيانات";
        showNotification(
          getTranslation("imageStoredInline") || "تم حفظ الصورة ضمن البيانات",
          "success"
        );
      } else {
        wrapper.classList.add("error");
        statusText.textContent =
          error.message || getTranslation("unexpectedErrorProcessingFile");
        showNotification(
          getTranslation("errorUploadingImage") || "فشل رفع الصورة",
          "error"
        );
      }
    }
  }

  async function loadProducts() {
    try {
      // Initialize API service
      const apiService = new ApiService();

      // Fetch products from MongoDB
      console.log("Fetching products from MongoDB");

      // The API service now has its own timeout, so we don't need Promise.race
      const response = await apiService.getProducts();

      if (response && response.success) {
        products = response.data;
        console.log("Products loaded from MongoDB:", products);

        // Update UI
        renderProducts();
      } else {
        console.warn(
          "No products found in MongoDB or error occurred:",
          response?.error || response?.message
        );

        // Show appropriate error message based on error type
        if (response?.error === "timeout") {
          showAdminNotification(
            getTranslation("serverConnectionError") ||
              "Cannot connect to server. Please ensure the backend server is running on http://localhost:5000",
            "error",
            5000
          );
        } else if (response?.error === "network") {
          showAdminNotification(
            getTranslation("serverConnectionError") ||
              "Network error. Please check your connection.",
            "error",
            5000
          );
        } else {
          showAdminNotification(
            getTranslation("noProducts") || "No products found in database",
            "warning",
            3000
          );
        }

        // Provide a fallback - empty products array
        products = [];
        renderProducts();
      }
    } catch (error) {
      console.error("Error loading products:", error);

      // Handle the error gracefully without crashing
      showAdminNotification(
        "Error loading products. Please refresh the page or check if the server is running.",
        "error",
        5000
      );

      // Provide a fallback - empty products array
      products = [];
      // Still try to render any cached products
      renderProducts();
    }
  }

  async function loadOrders() {
    try {
      // Initialize API service
      const apiService = new ApiService();

      // Fetch orders from the API
      console.log("Fetching orders from API");
      const response = await apiService.request("orders", "GET");

      if (response && response.success) {
        orders = response.data;
        console.log("Orders loaded from API:", orders.length);

        // Update UI
        updateStats();
      } else {
        console.warn(
          "No orders found in API or error occurred:",
          response?.error
        );

        // Fallback to localStorage if API fails
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          orders = JSON.parse(savedOrders);
          console.log("Orders loaded from localStorage:", orders.length);
          updateStats();
        }
      }
    } catch (error) {
      console.error("Error loading orders:", error);

      // Fallback to localStorage
      const savedOrders = localStorage.getItem("orders");
      if (savedOrders) {
        orders = JSON.parse(savedOrders);
        console.log(
          "Orders loaded from localStorage (fallback):",
          orders.length
        );
      }
      updateStats();
    }
  }

  function loadVouchers() {
    // First load from localStorage as a fallback
    const savedVouchers = localStorage.getItem("vouchers");
    if (savedVouchers) {
      vouchers = JSON.parse(savedVouchers);
    }

    // Then try to load from MongoDB
    try {
      const apiService = new ApiService();

      apiService
        .request("vouchers")
        .then((response) => {
          if (response.success && response.data && response.data.length > 0) {
            // Convert backend voucher format to frontend format
            vouchers = response.data.map((backendVoucher) => {
              return {
                id: backendVoucher.id || generateUniqueId(),
                _id: backendVoucher._id, // Store MongoDB ID
                code: backendVoucher.code,
                discount: backendVoucher.value, // Backend 'value' is frontend 'discount'
                minOrderAmount: backendVoucher.minOrderValue || 0,
                category:
                  backendVoucher.applicableCategories?.length > 0
                    ? backendVoucher.applicableCategories[0]
                    : "all",
                expiryDate: backendVoucher.endDate,
                dateCreated:
                  backendVoucher.createdAt ||
                  backendVoucher.startDate ||
                  new Date().toISOString(),
                isActive: backendVoucher.isActive,
              };
            });

            // Update localStorage with the latest data
            localStorage.setItem("vouchers", JSON.stringify(vouchers));

            // Re-render vouchers list
            renderVouchers();

            // Update stats
            updateStats();
          }
        })
        .catch((error) => {
          console.error("Error loading vouchers from database:", error);
        });
    } catch (error) {
      console.error("Error initializing API service:", error);
    }
  }

  function loadTaxSettings() {
    // Try to fetch tax settings from the database first
    fetchTaxSettingsFromDatabase()
      .then((dbSettings) => {
        if (dbSettings) {
          // Update the taxSettings object with database values
          taxSettings = dbSettings;

          // Save to localStorage for offline use
          localStorage.setItem("taxSettings", JSON.stringify(taxSettings));

          // Update UI with fetched tax settings
          updateTaxSettingsUI();
        } else {
          // Fallback to localStorage if database fetch fails
          const savedTaxSettings = localStorage.getItem("taxSettings");
          if (savedTaxSettings) {
            taxSettings = JSON.parse(savedTaxSettings);
            updateTaxSettingsUI();
          }
        }
      })
      .catch((error) => {
        console.error("Error loading tax settings from database:", error);

        // Fallback to localStorage if database fetch fails
        const savedTaxSettings = localStorage.getItem("taxSettings");
        if (savedTaxSettings) {
          taxSettings = JSON.parse(savedTaxSettings);
          updateTaxSettingsUI();
        }
      });
  }

  /**
   * Fetch tax settings from the database via API
   * @returns {Promise<Object|null>} The tax settings or null if fetch fails
   */
  async function fetchTaxSettingsFromDatabase() {
    try {
      const apiService = new ApiService();
      const response = await apiService.getTaxSettings();

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching tax settings from database:", error);
      return null;
    }
  }

  /**
   * Update the UI with the current tax settings
   */
  function updateTaxSettingsUI() {
    // Update UI with saved tax settings
    taxRateInput.value = taxSettings.rate;
    taxEnabledToggle.checked = taxSettings.enabled;

    // Update service tax UI if those settings exist
    const serviceTaxRateInput = document.getElementById("service-tax-rate");
    const serviceTaxEnabledToggle = document.getElementById(
      "service-tax-enabled"
    );

    if (serviceTaxRateInput && taxSettings.serviceRate !== undefined) {
      serviceTaxRateInput.value = taxSettings.serviceRate;
    }

    if (serviceTaxEnabledToggle && taxSettings.serviceEnabled !== undefined) {
      serviceTaxEnabledToggle.checked = taxSettings.serviceEnabled;

      // Update button status based on serviceEnabled value
      updateServiceTaxButtonStatus(taxSettings.serviceEnabled);
    }
  }

  /**
   * Update the service tax button status based on the enabled state
   * @param {boolean} isEnabled - Whether service tax is enabled
   */
  function updateServiceTaxButtonStatus(isEnabled) {
    const serviceTaxButton = document.getElementById("service-tax-enabled");
    if (serviceTaxButton) {
      serviceTaxButton.checked = isEnabled;

      // You can add additional visual indicators here if needed
      const serviceTaxContainer = serviceTaxButton.closest(
        ".tax-toggle-container"
      );
      if (serviceTaxContainer) {
        if (isEnabled) {
          serviceTaxContainer.classList.add("enabled");
        } else {
          serviceTaxContainer.classList.remove("enabled");
        }
      }
    }
  }

  // Functions - Stats
  async function updateStats() {
    try {
      // Initialize API service
      const apiService = new ApiService();

      console.log("[DEBUG] Fetching dashboard stats from API");

      // Fetch dashboard stats from API
      const response = await apiService.getDashboardStats();
      console.log("[DEBUG] Dashboard stats API response:", response);

      // First check if we have a valid response object
      if (!response) {
        console.warn("Received empty response from dashboard stats API");
        updateStatsFromLocalData();
        return;
      }

      // Check if the response has success property and it's true
      if (response && response.totalOrders !== undefined) {
        const stats = response;
        console.log("Dashboard stats loaded:", stats);

        // Format earnings with thousands separator
        const formattedEarnings = stats.totalEarnings
          .toFixed(2)
          .replace(/\d(?=(\d{3})+\.)/g, "$&,");

        // Format today's earnings
        const formattedTodaysEarnings = stats.todayEarnings
          .toFixed(2)
          .replace(/\d(?=(\d{3})+\.)/g, "$&,");

        // Get currency text based on language
        const currencyText = getCurrencyText();

        // Update UI
        // Keep currency in a span for live i18n updates
        totalEarningsElement.innerHTML = `${formattedEarnings} <span class="currency-text">${currencyText}</span>`;
        totalOrdersElement.textContent = stats.totalOrders;
        totalProductsElement.textContent = products.length;
        totalVouchersElement.textContent = vouchers.length;

        const averageOrderValue =
          stats.totalOrders > 0 ? stats.totalEarnings / stats.totalOrders : 0;
        const formattedAverageOrderValue = averageOrderValue
          .toFixed(2)
          .replace(/\d(?=(\d{3})+\.)/g, "$&,");

        if (averageOrderValueElement) {
          averageOrderValueElement.innerHTML = `${formattedAverageOrderValue} <span class="currency-text">${currencyText}</span>`;
        }

        // Update today's stats
        const todayOrdersElement = document.getElementById("today-orders");
        const todayEarningsElement = document.getElementById("today-earnings");

        if (todayOrdersElement) {
          todayOrdersElement.textContent = stats.todayOrders;
        }

        if (todayEarningsElement) {
          const currencySpan =
            todayEarningsElement.querySelector(".currency-text");
          if (currencySpan) {
            currencySpan.textContent = currencyText;
            todayEarningsElement.firstChild.textContent = `${formattedTodaysEarnings} `;
          } else {
            todayEarningsElement.textContent = `${formattedTodaysEarnings} ${currencyText}`;
          }
        }

        // Initialize sales chart if not already initialized
        if (!salesChart) {
          initSalesChart();
        } else {
          // Get the active period or default to 'week'
          const activePeriodBtn = document.querySelector(
            ".chart-period-btn.active"
          );
          const period = activePeriodBtn
            ? activePeriodBtn.dataset.period
            : "week";

          // Load sales data from database with the active period
          loadSalesDataFromDatabase(period);
        }

        // Update crowded hours chart if it exists
        if (document.getElementById("crowded-hours-chart")) {
          renderCrowdedHoursChart();
        }

        // Apply animation to stats when they change
        animateStatsChange();

        // Update recent orders list with data from API
        if (response.recentOrders) {
          updateRecentOrdersFromAPI(response.recentOrders);
        } else {
          updateRecentOrders();
        }

        // Load best products
        loadBestProducts();

        // Update dashboard offer stats
        updateDashboardOfferStats();
      } else {
        const errorMessage =
          response.message || response.error || "Unknown error";
        console.warn(
          `Failed to load dashboard stats from API: ${errorMessage}`
        );
        // Fallback to local calculation
        updateStatsFromLocalData();
      }
    } catch (error) {
      console.error("Error updating stats from API:", error);
      // Fallback to local calculation
      updateStatsFromLocalData();
    }
  }

  // Fallback function to calculate stats from local data
  function updateStatsFromLocalData() {
    // Calculate total earnings from orders
    let totalEarnings = 0;

    orders.forEach((order) => {
      totalEarnings += order.total;
    });

    // Format earnings with thousands separator
    const formattedEarnings = totalEarnings
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");

    // Calculate today's orders and earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = orders.filter((order) => {
      const orderDate = new Date(order.date);
      return orderDate >= today;
    });

    const todaysEarnings = todaysOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0
    );

    const averageOrderValue =
      orders.length > 0 ? totalEarnings / orders.length : 0;

    // Format today's earnings
    const formattedTodaysEarnings = todaysEarnings
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");

    const formattedAverageOrderValue = averageOrderValue
      .toFixed(2)
      .replace(/\d(?=(\d{3})+\.)/g, "$&,");

    // Get currency text based on language
    const currencyText = getCurrencyText();

    // Count active and expired vouchers
    const activeVouchers = vouchers.filter(
      (v) => new Date(v.expiryDate) >= today
    ).length;
    const expiredVouchers = vouchers.length - activeVouchers;

    // Update UI
    // Keep currency in a span for live i18n updates
    totalEarningsElement.innerHTML = `${formattedEarnings} <span class="currency-text">${currencyText}</span>`;
    totalOrdersElement.textContent = orders.length;
    totalProductsElement.textContent = products.length;
    totalVouchersElement.textContent = vouchers.length;

    if (averageOrderValueElement) {
      averageOrderValueElement.innerHTML = `${formattedAverageOrderValue} <span class="currency-text">${currencyText}</span>`;
    }

    // Update today's stats
    const todayOrdersElement = document.getElementById("today-orders");
    const todayEarningsElement = document.getElementById("today-earnings");

    if (todayOrdersElement) {
      todayOrdersElement.textContent = todaysOrders.length;
    }

    if (todayEarningsElement) {
      const currencySpan = todayEarningsElement.querySelector(".currency-text");
      if (currencySpan) {
        currencySpan.textContent = currencyText;
        todayEarningsElement.firstChild.textContent = `${formattedTodaysEarnings} `;
      } else {
        todayEarningsElement.textContent = `${formattedTodaysEarnings} ${currencyText}`;
      }
    }

    // Initialize sales chart if not already initialized
    if (!salesChart) {
      initSalesChart();
    } else {
      // Generate weekly sales data from local orders
      generateWeeklySalesDataFromOrders();
    }

    // Update crowded hours chart if it exists
    if (document.getElementById("crowded-hours-chart")) {
      renderCrowdedHoursChart();
    }

    // Apply animation to stats when they change
    animateStatsChange();

    // Update recent orders list
    updateRecentOrders();

    // Load best products
    loadBestProducts();

    // Update dashboard offer stats
    updateDashboardOfferStats();
  }

  // Function to update dashboard offer statistics
  async function updateDashboardOfferStats() {
    try {
      const API_BASE_URL =
        typeof window !== "undefined" && window.API_BASE_URL
          ? `${window.API_BASE_URL}/api`
          : typeof window !== "undefined" &&
            (window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1")
          ? "http://localhost:5000/api"
          : "/api";
      const response = await fetch(`${API_BASE_URL}/offers`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch offers for dashboard stats");
        return;
      }

      const data = await response.json();
      const offers = data.data || [];

      // Calculate total offers
      const totalOffers = offers.length;

      // Update dashboard UI
      if (dashboardTotalOffersElement) {
        dashboardTotalOffersElement.textContent = totalOffers;
      }

      console.log("Dashboard offer stats updated:", { totalOffers });
    } catch (error) {
      console.error("Error updating dashboard offer stats:", error);
    }
  }

  // Currency translation mapping
  const currencyTranslations = {
    EGP: { en: "EGP", ar: "جنيه" },
    USD: { en: "USD", ar: "دولار" },
    EUR: { en: "EUR", ar: "يورو" },
    GBP: { en: "GBP", ar: "جنيه إسترليني" },
    SAR: { en: "SAR", ar: "ريال" },
    AED: { en: "AED", ar: "درهم" },
    KWD: { en: "KWD", ar: "دينار" },
    QAR: { en: "QAR", ar: "ريال" },
    OMR: { en: "OMR", ar: "ريال" },
    BHD: { en: "BHD", ar: "دينار" },
    JOD: { en: "JOD", ar: "دينار" },
    IQD: { en: "IQD", ar: "دينار" },
    LBP: { en: "LBP", ar: "ليرة" },
    SYP: { en: "SYP", ar: "ليرة" },
    TND: { en: "TND", ar: "دينار" },
    MAD: { en: "MAD", ar: "درهم" },
    DZD: { en: "DZD", ar: "دينار" },
    LYD: { en: "LYD", ar: "دينار" },
    SDG: { en: "SDG", ar: "جنيه" },
    YER: { en: "YER", ar: "ريال" },
  };

  // Function to get currency text based on current language and global settings
  function getCurrencyText() {
    const currentLang = localStorage.getItem("admin-language") || "ar";

    // Try to get currency from global settings first
    if (
      window.globalSettings &&
      window.globalSettings.loaded &&
      window.globalSettings.currency
    ) {
      const currencyCode = window.globalSettings.currency;
      const translation = currencyTranslations[currencyCode];

      if (translation) {
        return translation[currentLang] || translation.en;
      }

      // Fallback to currency code if no translation found
      return currencyCode;
    }

    // Fallback to default if global settings not loaded
    return currentLang === "ar" ? "جنيه" : "EGP";
  }

  // Listen for global settings changes to update currency
  window.addEventListener("global-settings-updated", function (event) {
    console.log("Global settings updated in admin, refreshing displays");
    // Reload global settings
    loadAdminGlobalSettings().then(() => {
      // Refresh all displays
      refreshAdminDisplays();
    });
  });

  // Listen for admin global settings loaded
  window.addEventListener("admin-global-settings-loaded", function (event) {
    console.log("Admin global settings loaded, refreshing displays");
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      refreshAdminDisplays();
    }, 100);
  });

  // Function to refresh all admin displays with new currency
  function refreshAdminDisplays() {
    // Update currency text in stats
    document.querySelectorAll(".currency-text").forEach((element) => {
      element.textContent = getCurrencyText();
    });

    // Update stats with new currency
    if (typeof updateStats === "function") {
      updateStats();
    }

    // Update charts
    if (salesChart) {
      updateSalesChart();
    }

    // Update products display
    if (typeof renderProducts === "function") {
      renderProducts();
    }

    // Update recent orders
    if (typeof updateRecentOrders === "function") {
      updateRecentOrders();
    }

    // Update best products
    if (typeof loadBestProducts === "function") {
      loadBestProducts();
    }
  }

  // Listen for language changes to update currency text and charts
  document.addEventListener("languageChanged", function (event) {
    const language = event.detail.language;

    // Update currency text in stats
    document.querySelectorAll(".currency-text").forEach((element) => {
      element.textContent = getCurrencyText();
    });

    // Update currency symbols in charts
    if (salesChart) {
      updateSalesChart();
    }

    // Update addon currency symbols
    updateAddonCurrencySymbols(language);

    renderProducts();

    // Update crowded hours chart if it exists
    if (typeof renderCrowdedHoursChart === "function") {
      renderCrowdedHoursChart();
    }

    // Reload best products to show correct language names
    loadBestProducts();
  });

  // Update recent orders from API data
  function updateRecentOrdersFromAPI(recentOrders) {
    const recentOrdersContainer = document.getElementById("recent-orders");
    if (!recentOrdersContainer) return;

    // Clear container
    recentOrdersContainer.innerHTML = "";

    let filteredOrders = Array.isArray(recentOrders) ? [...recentOrders] : [];

    const selectedStatus = ordersStatusFilter
      ? ordersStatusFilter.value
      : "all";
    if (selectedStatus && selectedStatus !== "all") {
      filteredOrders = filteredOrders.filter((order) => {
        const orderStatus = (order.status || "").toLowerCase();
        return orderStatus === selectedStatus.toLowerCase();
      });
    }

    const selectedDateValue = ordersDateFilter ? ordersDateFilter.value : "";
    if (selectedDateValue) {
      const selectedDate = new Date(selectedDateValue);
      selectedDate.setHours(0, 0, 0, 0);
      filteredOrders = filteredOrders.filter((order) => {
        const rawDate =
          order.date || order.createdAt || order.created_at || order.timestamp;
        if (!rawDate) {
          return false;
        }
        const orderDate = new Date(rawDate);
        if (Number.isNaN(orderDate.getTime())) {
          return false;
        }
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === selectedDate.getTime();
      });
    }

    if (!selectedDateValue && (!selectedStatus || selectedStatus === "all")) {
      filteredOrders = filteredOrders.slice(0, 5);
    }

    if (!filteredOrders.length) {
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("empty-message");
      const emptyText = selectedDateValue
        ? getTranslation("noOrdersOnDate") || "لا توجد طلبات في هذا التاريخ"
        : getTranslation("noOrdersForFilters") ||
          "لا توجد طلبات مطابقة لمعايير التصفية";
      emptyMessage.innerHTML = `<i class="fas fa-receipt"></i><p>${emptyText}</p>`;
      recentOrdersContainer.appendChild(emptyMessage);
      return;
    }

    filteredOrders.forEach((order) => {
      const orderItem = document.createElement("div");
      orderItem.classList.add("order-item");

      // Add status-based class
      if (order.status) {
        orderItem.classList.add(order.status);
      }

      // Format the date
      const orderDate = new Date(order.date);
      const formattedDate = formatDateString(orderDate);

      // Format the total with thousands separator
      const formattedTotal = Number(order.total || 0)
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,");

      // Create status badge with icon
      let statusBadge = "";
      if (order.status) {
        let statusText = "";
        let statusIcon = "";

        // Find the first instance of order status text determination
        switch (order.status) {
          case "completed":
            statusText = getTranslation("orderStatusCompleted");
            statusIcon = '<i class="fas fa-check-circle"></i>';
            break;
          case "pending":
            statusText = getTranslation("orderStatusPending");
            statusIcon = '<i class="fas fa-clock"></i>';
            break;
          case "cancelled":
            statusText = getTranslation("orderStatusCancelled");
            statusIcon = '<i class="fas fa-times-circle"></i>';
            break;
          case "processing":
            statusText = getTranslation("orderStatusProcessing");
            statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
          default:
            statusText = order.status;
            statusIcon = '<i class="fas fa-info-circle"></i>';
        }

        statusBadge = `<div class="order-status-badge ${order.status}">${statusIcon} ${statusText}</div>`;
      }

      // Create the HTML
      orderItem.innerHTML = `
                <div class="order-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="order-details">
                    <div class="order-id">${
                      order.orderNumber || order.orderId || order._id
                    }</div>
                    <div class="order-date">${formattedDate}</div>
                </div>
                <div class="order-total">${formattedTotal} <span class="currency-text">${getCurrencyText()}</span></div>
                ${statusBadge}
            `;

      // Add click event listener to show order details
      orderItem.addEventListener("click", () => {
        showOrderDetails(order);
      });

      recentOrdersContainer.appendChild(orderItem);
    });
  }

  function animateStatsChange() {
    const statCards = document.querySelectorAll(".stat-card");
    statCards.forEach((card) => {
      card.classList.add("stat-updated");
      setTimeout(() => {
        card.classList.remove("stat-updated");
      }, 1000);
    });
  }

  function updateRecentOrders() {
    const recentOrdersContainer = document.getElementById("recent-orders");
    if (!recentOrdersContainer) return;

    // Clear container
    recentOrdersContainer.innerHTML = "";

    if (orders.length === 0) {
      // Show empty message
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("empty-message");
      const emptyText =
        getTranslation("noRecentOrders") || "لا توجد طلبات حديثة";
      emptyMessage.innerHTML = `<i class="fas fa-receipt"></i><p>${emptyText}</p>`;
      recentOrdersContainer.appendChild(emptyMessage);
      return;
    }

    // Get the selected date filter value
    const dateFilter = document.getElementById("orders-date-filter");
    let filteredOrders = [...orders];

    if (ordersStatusFilter && ordersStatusFilter.value !== "all") {
      const normalizedStatus = ordersStatusFilter.value.toLowerCase();
      filteredOrders = filteredOrders.filter((order) => {
        const orderStatus = (order.status || "").toLowerCase();
        return orderStatus === normalizedStatus;
      });
    }

    // Apply date filter if a date is selected
    if (dateFilter && dateFilter.value) {
      const selectedDate = new Date(dateFilter.value);
      selectedDate.setHours(0, 0, 0, 0); // Set to beginning of day

      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.date);
        orderDate.setHours(0, 0, 0, 0); // Set to beginning of day
        return orderDate.getTime() === selectedDate.getTime();
      });

      // If no orders match the filter, show empty message
      if (filteredOrders.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.classList.add("empty-message");
        const emptyText =
          getTranslation("noOrdersOnDate") || "لا توجد طلبات في هذا التاريخ";
        emptyMessage.innerHTML = `<i class="fas fa-receipt"></i><p>${emptyText}</p>`;
        recentOrdersContainer.appendChild(emptyMessage);
        return;
      }
    } else {
      // Sort by date (newest first) if no date filter
      filteredOrders = filteredOrders.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      // Show only the 5 most recent orders when no date filter is applied
      if (!ordersStatusFilter || ordersStatusFilter.value === "all") {
        filteredOrders = filteredOrders.slice(0, 5);
      }
    }

    if (filteredOrders.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("empty-message");
      const emptyText =
        getTranslation("noOrdersForFilters") ||
        "لا توجد طلبات مطابقة لمعايير التصفية";
      emptyMessage.innerHTML = `<i class="fas fa-receipt"></i><p>${emptyText}</p>`;
      recentOrdersContainer.appendChild(emptyMessage);
      return;
    }

    // Create order items
    filteredOrders.forEach((order) => {
      const orderItem = document.createElement("div");
      orderItem.classList.add("order-item");

      // Add status-based class
      if (order.status) {
        orderItem.classList.add(order.status);
      }

      // Format the date
      const orderDate = new Date(order.date);
      const formattedDate = formatDateString(orderDate);

      // Format the total with thousands separator
      const orderTotal = parseFloat(order.total) || 0;
      const formattedTotal = orderTotal
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,");

      // Create status badge with icon
      let statusBadge = "";
      if (order.status) {
        let statusText = "";
        let statusIcon = "";

        // Find the second instance of order status text determination
        switch (order.status) {
          case "completed":
            statusText = getTranslation("orderStatusCompleted");
            statusIcon = '<i class="fas fa-check-circle"></i>';
            break;
          case "pending":
            statusText = getTranslation("orderStatusPending");
            statusIcon = '<i class="fas fa-clock"></i>';
            break;
          case "cancelled":
            statusText = getTranslation("orderStatusCancelled");
            statusIcon = '<i class="fas fa-times-circle"></i>';
            break;
          case "processing":
            statusText = getTranslation("orderStatusProcessing");
            statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
          default:
            statusText = order.status;
            statusIcon = '<i class="fas fa-info-circle"></i>';
        }

        statusBadge = `<div class="order-status-badge ${order.status}">${statusIcon} ${statusText}</div>`;
      }

      // Create the HTML
      orderItem.innerHTML = `
                <div class="order-icon">
                    <i class="fas fa-shopping-bag"></i>
                </div>
                <div class="order-details">
                    <div class="order-id">${
                      order.id || order.orderId || order.orderNumber
                    }</div>
                    <div class="order-date">${formattedDate}</div>
                </div>
                <div class="order-total">${formattedTotal} <span class="currency-text">${getCurrencyText()}</span></div>
                ${statusBadge}
            `;

      // Add click event listener to show order details
      orderItem.addEventListener("click", () => {
        showOrderDetails(order);
      });

      recentOrdersContainer.appendChild(orderItem);
    });
  }

  // Functions - Products
  function renderProducts() {
    const productsGrid = document.getElementById("products-list");
    const productsSpinner = document.getElementById("products-spinner");
    const totalProductsElement = document.getElementById("total-products");
    const currentLang = localStorage.getItem("admin-language") || "ar";

    if (!productsGrid || !products || products.length === 0) {
      if (productsSpinner) {
        productsSpinner.style.display = "none";
      }
      if (productsGrid) {
        productsGrid.innerHTML = `
          <div class="empty-message">
            <i class="fas fa-utensils"></i>
            <p data-i18n="noProducts">لا توجد منتجات</p>
          </div>
        `;
      }
      return;
    }

    if (productsSpinner) {
      productsSpinner.style.display = "none";
    }

    productsGrid.innerHTML = "";

    products.forEach((product) => {
      const displayName =
        currentLang === "en" && product.nameEn ? product.nameEn : product.name;
      const displayDescription =
        currentLang === "en" && product.descriptionEn
          ? product.descriptionEn
          : product.description;
      const productCard = document.createElement("div");
      productCard.className = "admin-product-card";
      productCard.setAttribute("data-id", product.id);
      productCard.setAttribute("data-name", displayName);
      productCard.setAttribute("data-category", product.category);

      // Determine price display based on discount
      let priceDisplay = "";
      const productPrice = parseFloat(product.price) || 0;
      const productDiscountedPrice = parseFloat(product.discountedPrice) || 0;

      if (product.discountedPrice && productDiscountedPrice > 0) {
        priceDisplay = `
          <div class="product-price discounted">
            <span class="original-price">${productPrice.toFixed(
              2
            )} <span class="currency-text">${getCurrencyText()}</span></span>
            <span class="discounted-price">${productDiscountedPrice.toFixed(
              2
            )} <span class="currency-text">${getCurrencyText()}</span></span>
          </div>
        `;
      } else {
        priceDisplay = `
          <div class="product-price">
            <span>${productPrice.toFixed(
              2
            )} <span class="currency-text">${getCurrencyText()}</span></span>
          </div>
        `;
      }

      productCard.innerHTML = `
                <div class="product-image">
                    <img src="${product.image}" alt="${displayName}" />
                    <div class="product-category-badge">${getCategoryName(
                      product.category
                    )}</div>
                </div>
                <div class="product-content">
                    <h3 class="product-title">${displayName}</h3>
                    <p class="product-desc">${displayDescription.substring(
                      0,
                      80
                    )}${displayDescription.length > 80 ? "..." : ""}</p>
                    <div class="product-meta">
                        ${priceDisplay}
                    </div>
                    <div class="product-actions">
                        <button class="edit-button" data-id="${product.id}">
                            <i class="fas fa-edit"></i> <span data-i18n="edit" data-i18n-en="Edit">تعديل</span>
                        </button>
                        <button class="delete-button" data-id="${product.id}">
                            <i class="fas fa-trash-alt"></i> <span data-i18n="delete" data-i18n-en="Delete">حذف</span>
                        </button>
                    </div>
                </div>
            `;

      productsGrid.appendChild(productCard);
    });

    // Update total products count in stats
    if (totalProductsElement) {
      totalProductsElement.textContent = products.length;
    }

    // Add event listeners to edit and delete buttons
    document.querySelectorAll(".edit-button").forEach((button) => {
      button.addEventListener("click", function () {
        const productId = this.getAttribute("data-id");
        const product = products.find((p) => p.id === productId);
        if (product) {
          openProductModal(product);
        }
      });
    });

    document.querySelectorAll(".delete-button").forEach((button) => {
      button.addEventListener("click", function () {
        const productId = this.getAttribute("data-id");
        deleteProduct(productId);
      });
    });

    // Fix edit button text based on current language
    // Use the currentLang determined earlier in this function
    if (currentLang === "en") {
      document
        .querySelectorAll(".edit-button span[data-i18n='edit']")
        .forEach((span) => {
          span.textContent = "Edit";
        });
      document
        .querySelectorAll(".delete-button span[data-i18n='delete']")
        .forEach((span) => {
          span.textContent = "Delete";
        });
    }

    // Update currency text for all elements
    updateAllCurrencyText();

    // Add event listener to search input
    const searchInput = document.getElementById("product-search");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        const searchTerm = this.value.toLowerCase();
        const categoryFilter = document.getElementById(
          "product-category-filter"
        ).value;

        document.querySelectorAll(".admin-product-card").forEach((card) => {
          const productName = card.getAttribute("data-name").toLowerCase();
          const productCategory = card.getAttribute("data-category");

          const matchesSearch = productName.includes(searchTerm);
          const matchesCategory =
            categoryFilter === "all" || productCategory === categoryFilter;

          if (matchesSearch && matchesCategory) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    }

    // Add event listener to category filter
    const categoryFilter = document.getElementById("product-category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", function () {
        const selectedCategory = this.value;
        const searchTerm = document
          .getElementById("product-search")
          .value.toLowerCase();

        document.querySelectorAll(".admin-product-card").forEach((card) => {
          const productName = card.getAttribute("data-name").toLowerCase();
          const productCategory = card.getAttribute("data-category");

          const matchesSearch = productName.includes(searchTerm);
          const matchesCategory =
            selectedCategory === "all" || productCategory === selectedCategory;

          if (matchesSearch && matchesCategory) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    }
  }

  // Toggle product selection
  function toggleProductSelection(productId, isSelected) {
    if (isSelected) {
      selectedProducts.add(productId);
    } else {
      selectedProducts.delete(productId);
    }
    updateProductsBulkActionsBar();
  }

  // Select all products
  function selectAllProducts(isSelected) {
    if (isSelected) {
      products.forEach((product) => selectedProducts.add(product.id));
    } else {
      selectedProducts.clear();
    }
    renderProducts();
  }

  // Update products bulk actions bar
  function updateProductsBulkActionsBar() {
    const bulkActionsBar = document.getElementById("products-bulk-actions-bar");
    const selectedCountSpan = document.getElementById(
      "products-selected-count"
    );
    const selectAllCheckbox = document.getElementById("select-all-products");

    if (bulkActionsBar && selectedCountSpan) {
      if (selectedProducts.size > 0) {
        bulkActionsBar.style.display = "flex";
        selectedCountSpan.textContent = selectedProducts.size;
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = selectedProducts.size === products.length;
        }
      } else {
        bulkActionsBar.style.display = "none";
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
        }
      }
    }
  }

  // Bulk delete products
  function bulkDeleteProducts() {
    if (selectedProducts.size === 0) return;

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const confirmMessage =
      currentLang === "en"
        ? `Are you sure you want to delete ${selectedProducts.size} product(s)?`
        : `هل أنت متأكد من حذف ${selectedProducts.size} منتج؟`;

    if (confirm(confirmMessage)) {
      selectedProducts.forEach((productId) => {
        const index = products.findIndex((p) => p.id === productId);
        if (index !== -1) {
          products.splice(index, 1);
        }
      });

      selectedProducts.clear();
      saveProducts();
      renderProducts();
      updateStats();

      const successMessage =
        currentLang === "en"
          ? "Products deleted successfully"
          : "تم حذف المنتجات بنجاح";
      showAdminNotification(successMessage, "success");
    }
  }

  /**
   * Check if user has permission to edit a specific section
   * @param {string} section - The section to check edit permission for
   * @returns {boolean} - Whether the user has edit permission
   */
  function checkEditPermission(section) {
    // Get the session data to check permissions
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      const permissions = session.permissions || {};

      // For admin tokens with role "admin", all edit operations are permitted
      if (session.role === "admin" && !session.isCustomerAdmin) {
        return true;
      }

      // Define required edit permissions for each section
      const editPermissions = {
        products: "productsEdit",
        vouchers: "vouchersEdit",
        tax: "tax",
        qr: "qr",
        reservations: "reservations",
        "loyalty-points": "points",
        "customer-accounts": "accounts",
      };

      // Check if user has the required permission
      const requiredPermission = editPermissions[section];
      if (!requiredPermission) return true; // If no permission defined, allow by default

      return permissions[requiredPermission] === true;
    } catch (error) {
      console.error("Error checking edit permission:", error);
      return false;
    }
  }

  /**
   * Open product modal for creating or editing a product
   * @param {Object} product - The product to edit, null for creating a new product
   */
  function openProductModal(product = null) {
    // Check if user has permission to edit products
    if (!checkEditPermission("products")) {
      showAdminNotification(
        getTranslation("noPermissionToEditProductsNotification") ||
          "ليس لديك صلاحية لتعديل المنتجات",
        "error"
      );
      return;
    }

    // Clear previous form data
    productForm.reset();

    // Set modal title and form fields
    const modalTitle = document.getElementById("product-modal-title");
    const productIdInput = document.getElementById("product-id");
    const productNameInput = document.getElementById("product-name");
    const productNameEnInput = document.getElementById("product-name-en");
    const productDescriptionInput = document.getElementById(
      "product-description"
    );
    const productDescriptionEnInput = document.getElementById(
      "product-description-en"
    );
    const productPriceInput = document.getElementById("product-price");
    const productCategorySelect = document.getElementById("product-category");
    const productImageInput = document.getElementById("product-image");
    const productImageFinal = document.getElementById("product-image-final");
    const previewImg = document.getElementById("preview-img");
    const noPreviewDiv = document.getElementById("no-preview");

    // Reset image preview
    previewImg.style.display = "none";
    noPreviewDiv.style.display = "flex";

    // Reset file upload status
    const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
    if (fileUploadWrapper) {
      fileUploadWrapper.classList.remove("has-file", "error");
      const statusText = fileUploadWrapper.querySelector("p");
      if (statusText) {
        statusText.textContent = getTranslation("clickOrDragImage");
      }
    }

    // Reset tabs - select URL tab by default
    document
      .querySelectorAll(".image-tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".image-tab-content")
      .forEach((content) => content.classList.remove("active"));
    const urlTab = document.querySelector('.image-tab[data-tab="url"]');
    const urlTabContent = document.getElementById("url-tab");
    if (urlTab && urlTabContent) {
      urlTab.classList.add("active");
      urlTabContent.classList.add("active");
    }

    // Reset add-ons for new product
    resetAddOns();

    if (product) {
      // Edit mode
      console.log("Opening modal for editing product:", product);
      modalTitle.textContent = getTranslation("editProduct");
      productIdInput.value = product.id;

      // Fill form with product data
      productNameInput.value = product.name;
      if (productNameEnInput) productNameEnInput.value = product.nameEn || "";
      productDescriptionInput.value = product.description;
      if (productDescriptionEnInput)
        productDescriptionEnInput.value = product.descriptionEn || "";
      productPriceInput.value = product.price;
      productCategorySelect.value = product.category;
      productImageInput.value = product.image;

      // Determine if image is a data URL (uploaded image) or URL
      if (product.image) {
        productImageFinal.value = product.image;

        // Check if it's a data URL
        if (product.image.startsWith("data:image/")) {
          // Switch to upload tab
          document
            .querySelectorAll(".image-tab")
            .forEach((tab) => tab.classList.remove("active"));
          document
            .querySelectorAll(".image-tab-content")
            .forEach((content) => content.classList.remove("active"));

          const uploadTab = document.querySelector(
            '.image-tab[data-tab="upload"]'
          );
          const uploadTabContent = document.getElementById("upload-tab");
          if (uploadTab && uploadTabContent) {
            uploadTab.classList.add("active");
            uploadTabContent.classList.add("active");
          }

          // Update file upload status
          if (fileUploadWrapper) {
            fileUploadWrapper.classList.add("has-file");
            const statusText = fileUploadWrapper.querySelector("p");
            if (statusText) {
              statusText.textContent = getTranslation("imageUploadedSuccess");
            }
          }
        } else {
          // Regular URL
          productImageInput.value = product.image;
        }

        // Show preview of the image
        previewImg.src = product.image;
        previewImg.style.display = "block";
        noPreviewDiv.style.display = "none";
      }
    } else {
      // Add mode
      console.log("Opening modal for adding new product");
      modalTitle.textContent = getTranslation("addProduct");
      productIdInput.value = "";
      productImageFinal.value = "";
    }

    // Update category dropdown with latest categories
    if (
      typeof window.categoriesManager !== "undefined" &&
      window.categoriesManager.updateProductCategoryDropdowns
    ) {
      window.categoriesManager.updateProductCategoryDropdowns();
    }

    // Show modal
    productModal.style.display = "flex";
    setTimeout(() => {
      productModal.classList.add("show");
    }, 10);

    // Dispatch event to initialize add-ons
    document.dispatchEvent(
      new CustomEvent("productModalOpened", {
        detail: { product },
      })
    );
  }

  /**
   * Reset add-ons UI to default state
   */
  function resetAddOns() {
    const addonsList = document.getElementById("addons-list");
    const noAddonsMessage = document.getElementById("no-addons-message");

    if (addonsList && noAddonsMessage) {
      // Clear existing add-ons
      addonsList.innerHTML = "";

      // Show the "no add-ons" message
      noAddonsMessage.style.display = "flex";
    }
  }

  // Function to validate image URL
  function isValidImageUrl(url) {
    if (!url) return false;

    // If it's a data URL (uploaded image)
    if (url.startsWith("data:image/")) {
      return true;
    }

    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".bmp",
      ".tiff",
    ];
    const lowerUrl = url.toLowerCase();

    // Check if URL ends with a valid image extension or contains common image hosting domains
    const hasValidExtension = imageExtensions.some((ext) =>
      lowerUrl.endsWith(ext)
    );
    const hasImageHost =
      lowerUrl.includes("unsplash.com") ||
      lowerUrl.includes("imgur.com") ||
      lowerUrl.includes("cloudinary.com") ||
      lowerUrl.includes("pexels.com") ||
      lowerUrl.includes("images.") ||
      lowerUrl.includes("img.") ||
      lowerUrl.includes("photos.") ||
      lowerUrl.includes("picsum.photos") ||
      lowerUrl.includes("image") ||
      lowerUrl.includes("storage.googleapis.com") ||
      lowerUrl.includes("blob.core.windows.net") ||
      lowerUrl.includes("s3.amazonaws.com");

    // Allow URLs with query parameters that might contain image info
    const hasImageQuery =
      lowerUrl.includes("?") &&
      (lowerUrl.includes("format=") ||
        lowerUrl.includes("type=image") ||
        lowerUrl.includes("image") ||
        lowerUrl.includes("width=") ||
        lowerUrl.includes("height="));

    return hasValidExtension || hasImageHost || hasImageQuery;
  }

  // Functions - Product Form Submission
  async function handleProductSubmit(e) {
    e.preventDefault();

    // Check if user has permission to edit products
    if (!checkEditPermission("products")) {
      showAdminNotification(
        getTranslation("noPermissionToEditProductsNotification") ||
          "ليس لديك صلاحية لتعديل المنتجات",
        "error"
      );
      return;
    }

    // Get form values
    const productId = document.getElementById("product-id").value;
    const productName = document.getElementById("product-name").value;
    const productNameEn =
      (document.getElementById("product-name-en") || {}).value || "";
    const productDescription = document.getElementById(
      "product-description"
    ).value;
    const productDescriptionEn =
      (document.getElementById("product-description-en") || {}).value || "";
    const productPrice = document.getElementById("product-price").value;
    const productCategory = document.getElementById("product-category").value;
    const productImage = document.getElementById("product-image-final").value;

    // Validate form
    if (!productName || !productPrice || !productCategory) {
      showAdminNotification(getTranslation("fillRequiredFields"), "error");
      return;
    }

    try {
      // Initialize API service
      const apiService = new ApiService();

      // Get add-ons data if any
      const addOns = collectAddonsData();

      // Prepare product data
      const productData = {
        name: productName,
        nameEn: productNameEn,
        description: productDescription,
        descriptionEn: productDescriptionEn,
        price: parseFloat(productPrice),
        category: productCategory,
        image: productImage,
        addOns: addOns,
      };

      // Check if this is a new product or an edit
      if (productId) {
        // Update existing product
        console.log(`Updating product with ID: ${productId}`, productData);
        const response = await apiService.updateProduct(productId, productData);

        if (!response.success) {
          throw new Error(response.message || "Failed to update product");
        }

        // Find the product in the products array and update it
        const productIndex = products.findIndex((p) => p.id === productId);
        if (productIndex !== -1) {
          products[productIndex] = {
            ...products[productIndex],
            ...productData,
            id: productId,
          };
        }

        showNotification(getTranslation("productUpdatedSuccess"), "success");
      } else {
        // Add new product
        console.log("Creating new product:", productData);
        // Generate unique ID for the new product
        const newProductId = generateUniqueId();
        productData.id = newProductId;

        const response = await apiService.createProduct(productData);

        if (!response.success) {
          throw new Error(response.message || "Failed to create product");
        }

        // Add to products array
        products.push({
          id: response.data.id || newProductId,
          ...productData,
        });

        showNotification(getTranslation("productAddedSuccess"), "success");
      }

      // Save products and update UI
      saveProducts();

      // Close modal
      closeAllModals();

      // Dispatch custom event for cross-page updates
      window.dispatchEvent(
        new CustomEvent("digital_menu_product_change", {
          detail: { action: productId ? "update" : "create" },
        })
      );
    } catch (error) {
      console.error("Error saving product:", error);
      showNotification(
        getTranslation("errorSavingProduct").replace("{error}", error.message),
        "error"
      );
    }
  }

  /**
   * Delete a product
   * @param {string} productId - ID of the product to delete
   */
  async function deleteProduct(productId) {
    // Check if user has permission to edit products
    if (!checkEditPermission("products")) {
      showAdminNotification(
        getTranslation("noPermissionToDeleteProductsNotification") ||
          "ليس لديك صلاحية لحذف المنتجات",
        "error"
      );
      return;
    }

    if (!confirm(getTranslation("confirmDeleteProduct"))) {
      return;
    }

    try {
      // Initialize API service
      const apiService = new ApiService();

      // Delete from MongoDB
      const response = await apiService.deleteProduct(productId);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to delete product from server"
        );
      }

      // Remove from local array
      products = products.filter((product) => product.id !== productId);

      // Save to local storage
      saveProducts();

      // Re-render products list
      renderProducts();

      // Update stats
      updateStats();

      // Show notification
      showNotification(getTranslation("productDeletedSuccess"), "success");

      // Dispatch event to notify other pages about the change
      window.dispatchEvent(
        new CustomEvent("digital_menu_product_change", {
          detail: { action: "delete", productId },
        })
      );
    } catch (error) {
      console.error("Error deleting product:", error);
      showNotification(
        getTranslation("errorDeletingProduct").replace(
          "{error}",
          error.message
        ),
        "error"
      );
    }
  }

  function saveProducts() {
    try {
      console.log("Products saved successfully");

      // Update UI
      renderProducts();

      // Dispatch custom event for real-time updates
      const productChangeEvent = new CustomEvent(
        "digital_menu_product_change",
        {
          detail: { action: "update", timestamp: Date.now() },
        }
      );
      window.dispatchEvent(productChangeEvent);
      console.log("Product change event dispatched");

      return true;
    } catch (error) {
      console.error("Error updating products UI:", error);
      showNotification(
        getTranslation("errorUpdatingProductsUI").replace(
          "{error}",
          error.message
        ),
        "error"
      );
      return false;
    }
  }

  // Functions - Tax Settings
  function saveTaxSettings() {
    // Check if user has permission to edit tax settings
    if (!checkEditPermission("tax")) {
      showAdminNotification(
        getTranslation("noPermissionToEditTaxSettingsNotification") ||
          "ليس لديك صلاحية لتعديل إعدادات الضريبة",
        "error"
      );
      return;
    }

    // Get input values
    const taxRateInput = document.getElementById("tax-rate");
    const taxEnabledToggle = document.getElementById("tax-enabled");

    if (!taxRateInput || !taxEnabledToggle) {
      showNotification(getTranslation("taxElementsNotFound"), "error");
      return;
    }

    const taxRateValue = parseFloat(taxRateInput.value);
    const taxEnabledValue = taxEnabledToggle.checked;

    // Get service fee values - using correct IDs that match loadTaxSettings
    const serviceFeeRate = document.getElementById("service-tax-rate");
    const serviceFeeEnabled = document.getElementById("service-tax-enabled");

    // Validate inputs
    if (isNaN(taxRateValue) || taxRateValue < 0 || taxRateValue > 100) {
      showNotification(getTranslation("invalidTaxRate"), "error");
      return;
    }

    // Update tax settings object
    taxSettings.rate = taxRateValue;
    taxSettings.enabled = taxEnabledValue;

    // Update service fee settings if elements exist
    if (serviceFeeRate && serviceFeeEnabled) {
      const serviceRateValue = parseFloat(serviceFeeRate.value);

      if (
        isNaN(serviceRateValue) ||
        serviceRateValue < 0 ||
        serviceRateValue > 100
      ) {
        showNotification(getTranslation("invalidServiceRate"), "error");
        return;
      }

      taxSettings.serviceRate = serviceRateValue;
      taxSettings.serviceEnabled = serviceFeeEnabled.checked;
    }

    // Update button status based on new setting
    updateServiceTaxButtonStatus(serviceFeeEnabled.checked);

    // Save to localStorage
    localStorage.setItem("taxSettings", JSON.stringify(taxSettings));

    // Update the UI safely
    const taxStatusElement = document.querySelector(".tax-status");
    const taxRateElement = document.querySelector(".tax-rate-display");
    const serviceStatusElement = document.querySelector(".service-status");
    const serviceRateElement = document.querySelector(".service-rate-display");

    if (taxStatusElement) {
      taxStatusElement.textContent = taxSettings.enabled
        ? "مفعلة"
        : "غير مفعلة";
    }

    if (taxRateElement) {
      taxRateElement.textContent = `${taxSettings.rate}%`;
    }

    if (serviceStatusElement) {
      serviceStatusElement.textContent = taxSettings.serviceEnabled
        ? "مفعلة"
        : "غير مفعلة";
    }

    if (serviceRateElement) {
      serviceRateElement.textContent = `${taxSettings.serviceRate}%`;
    }

    // Save to database via API
    saveTaxSettingsToDatabase(taxSettings);

    // Show notification
    showNotification(getTranslation("taxSettingsSaved"), "success");
  }

  /**
   * Save tax settings to the database via API
   * @param {Object} settings - The tax settings to save
   */
  async function saveTaxSettingsToDatabase(settings) {
    try {
      const apiService = new ApiService();
      const url = `${apiService.apiUrl}/tax-settings`;

      const response = await fetch(url, {
        method: "PUT",
        headers: apiService.getHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to save tax settings:", errorData);
        showNotification(getTranslation("taxSettingsSaveFailed"), "error");
        return;
      }

      console.log("Tax settings saved to database successfully");
    } catch (error) {
      console.error("Error saving tax settings to database:", error);
      showNotification(getTranslation("taxSettingsSaveError"), "error");
    }
  }

  // Functions - Orders Management
  function createOrdersReport() {
    if (orders.length === 0) {
      showNotification(getTranslation("noOrdersForReport"));
      return;
    }

    // Simple orders report
    let report = "تقرير الطلبات\n\n";

    // Sort by date (newest first)
    const sortedOrders = [...orders].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    sortedOrders.forEach((order, index) => {
      const orderDate = new Date(order.date);
      report += `طلب #${index + 1} (${formatDate(orderDate)})\n`;
      report += `رقم الطلب: ${order.id}\n`;
      report += "المنتجات:\n";

      order.items.forEach((item) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = parseInt(item.quantity) || 0;
        const itemTotal = itemPrice * itemQuantity;
        const displayName = (() => {
          const currentLang = getCurrentLanguage();
          if (currentLang === "en" && item.nameEn) {
            return item.nameEn;
          } else if (item.nameAr) {
            return item.nameAr;
          } else {
            return item.name || "منتج";
          }
        })();
        report += `- ${displayName} × ${itemQuantity} = ${itemTotal.toFixed(
          2
        )} جنية\n`;
      });

      // Safely convert values to numbers with fallbacks
      const subtotal = parseFloat(order.subtotal) || 0;
      const tax = parseFloat(order.tax) || 0;
      const total = parseFloat(order.total) || 0;

      report += `المجموع الفرعي: ${subtotal.toFixed(2)} جنية\n`;
      report += `الضريبة: ${tax.toFixed(2)} جنية\n`;
      report += `المجموع النهائي: ${total.toFixed(2)} جنية\n\n`;
    });

    // Create a Blob with the report content
    const blob = new Blob([report], { type: "text/plain" });

    // Create a download link
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `orders_report_${
      new Date().toISOString().split("T")[0]
    }.txt`;

    // Trigger the download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  // Functions - Modals
  function closeAllModals() {
    // Close product modal
    productModal.classList.remove("show");
    setTimeout(() => {
      productModal.style.display = "none";

      // Reset form
      productForm.reset();
      productForm.removeAttribute("data-id");

      // Reset image preview
      const previewImg = document.getElementById("preview-img");
      const noPreviewDiv = document.getElementById("no-preview");
      if (previewImg && noPreviewDiv) {
        previewImg.style.display = "none";
        noPreviewDiv.style.display = "flex";
      }

      // Reset hidden image field
      const productImageFinal = document.getElementById("product-image-final");
      if (productImageFinal) {
        productImageFinal.value = "";
      }

      // Reset file upload status
      const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
      if (fileUploadWrapper) {
        fileUploadWrapper.classList.remove("has-file", "error");
        const statusText = fileUploadWrapper.querySelector("p");
        if (statusText) {
          statusText.textContent = getTranslation("clickOrDragImage");
        }
      }

      // Reset tabs - select URL tab by default
      document
        .querySelectorAll(".image-tab")
        .forEach((tab) => tab.classList.remove("active"));
      document
        .querySelectorAll(".image-tab-content")
        .forEach((content) => content.classList.remove("active"));
      const urlTab = document.querySelector('.image-tab[data-tab="url"]');
      const urlTabContent = document.getElementById("url-tab");
      if (urlTab && urlTabContent) {
        urlTab.classList.add("active");
        urlTabContent.classList.add("active");
      }
    }, 300);

    // Close voucher modal with forced reset
    const modal = document.getElementById("voucher-modal");
    if (modal) {
      modal.classList.remove("show");
      modal.style.cssText = "display: none; opacity: 0;";

      // Reset form
      const form = document.getElementById("voucher-form");
      if (form) {
        form.reset();
        form.removeAttribute("data-id");
      }
    }
  }

  // Utility Functions
  function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  function getCategoryName(categoryValue) {
    const currentLang = getCurrentLanguage();

    // Try to get categories from localStorage
    const savedCategories = localStorage.getItem("categories");
    if (savedCategories) {
      try {
        const categories = JSON.parse(savedCategories);
        const foundCategory = categories.find(
          (cat) => cat.value === categoryValue || cat.id === categoryValue
        );

        if (foundCategory) {
          // Return the appropriate language name
          return currentLang === "en" && foundCategory.nameEn
            ? foundCategory.nameEn
            : foundCategory.name;
        }
      } catch (error) {
        console.error("Error parsing categories:", error);
      }
    }

    // Fallback to the category value itself if not found
    return categoryValue;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const currentLang = getCurrentLanguage();

    // Format the date in a more reliable way for display
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    // Return in format DD/MM/YYYY for Arabic and MM/DD/YYYY for English
    if (currentLang === "ar") {
      return `${day}/${month}/${year}`;
    } else {
      return `${month}/${day}/${year}`;
    }
  }

  function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  }

  function showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.classList.add("notification");

    // Add type class
    if (type) {
      notification.classList.add(type);
    }

    notification.textContent = message;

    // Add notification to body
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Remove notification after a delay
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // Expose showNotification globally for use by other scripts
  window.showNotification = showNotification;

  // Close modals when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === productModal) {
      productModal.style.display = "none";
    }
  });

  // Add export orders button
  const dashboardSection = document.getElementById("dashboard-section");
  if (dashboardSection) {
    const exportButton = document.createElement("button");
    exportButton.className = "export-button";
    exportButton.innerHTML =
      '<i class="fas fa-file-export"></i> ' +
      getTranslation("exportOrdersReport");
    exportButton.addEventListener("click", createOrdersReport);

    // Add the export button directly to the dashboard section
    dashboardSection.appendChild(exportButton);
  }

  // Update tax rate input to handle decimal values properly
  taxRateInput.addEventListener("input", function () {
    // Ensure we can handle decimal values like 0.5%
    const value = parseFloat(this.value);
    if (!isNaN(value) && value >= 0) {
      // Allow decimal values
      this.setCustomValidity("");
    } else {
      this.setCustomValidity("Please enter a valid tax rate");
    }
  });

  // Setup modals
  if (productModal) {
    productModal
      .querySelector(".close-modal")
      ?.addEventListener("click", () => closeAllModals());
    productModal
      .querySelector(".close-button")
      ?.addEventListener("click", () => closeAllModals());

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target === productModal) {
        closeAllModals();
      }
    });
  }

  // Functions - Voucher Management
  function saveVouchers() {
    // Save to localStorage
    localStorage.setItem("vouchers", JSON.stringify(vouchers));

    // Save to MongoDB via ApiService
    try {
      const apiService = new ApiService();

      // First, get existing vouchers from the database to compare
      apiService
        .request("vouchers")
        .then((response) => {
          if (response.success) {
            const dbVouchers = response.data;

            // Process each voucher to determine if it needs to be created, updated, or deleted
            vouchers.forEach((voucher) => {
              const existingVoucher = dbVouchers.find(
                (v) => v.code === voucher.code
              );

              // Transform the data to match the backend model requirements
              const transformedData = {
                code: voucher.code,
                type: "percentage",
                value: parseFloat(voucher.discount),
                minOrderValue: parseFloat(voucher.minOrderAmount || 0),
                endDate: voucher.expiryDate,
                applicableCategories:
                  voucher.category !== "all" ? [voucher.category] : [],
                isActive: true,
              };

              if (existingVoucher) {
                // Update existing voucher
                apiService.request(
                  `vouchers/${existingVoucher._id}`,
                  "PUT",
                  transformedData
                );
              } else {
                // Create new voucher
                apiService.request("vouchers", "POST", transformedData);
              }
            });

            // Find vouchers that were deleted locally but still exist in DB
            dbVouchers.forEach((dbVoucher) => {
              if (!vouchers.find((v) => v.code === dbVoucher.code)) {
                // Delete voucher from database
                apiService.request(`vouchers/${dbVoucher._id}`, "DELETE");
              }
            });
          }
        })
        .catch((error) => {
          console.error("Error syncing vouchers with database:", error);
        });
    } catch (error) {
      console.error("Error initializing API service:", error);
    }

    renderVouchers();
  }

  function renderVouchers() {
    // Clear the list
    vouchersList.innerHTML = "";

    if (vouchers.length === 0) {
      // No vouchers message
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-message";

      const currentLang = getCurrentLanguage();
      const noVouchersText =
        currentLang === "ar"
          ? "لا توجد قسائم حالياً. قم بإضافة قسائم جديدة."
          : "No vouchers available. Add new vouchers.";

      emptyMessage.innerHTML = `
                <i class="fas fa-ticket-alt"></i>
                <p>${noVouchersText}</p>
            `;
      vouchersList.appendChild(emptyMessage);
    } else {
      // Create voucher cards
      vouchers.forEach((voucher) => {
        const voucherCard = document.createElement("div");
        voucherCard.className = "voucher-card";

        // Check if voucher is expired
        const isExpired = new Date(voucher.expiryDate) < new Date();
        if (isExpired) {
          voucherCard.classList.add("expired");
        }

        // Get category name if specified
        let categoryDisplay = "";
        if (voucher.category && voucher.category !== "all") {
          categoryDisplay = `<div class="voucher-category">
                        <i class="fas fa-tag"></i>
                        <span data-i18n="category">${getCategoryName(
                          voucher.category
                        )}</span>
                    </div>`;
        }

        // Get minimum order if specified
        let minOrderDisplay = "";
        if (voucher.minOrderAmount && voucher.minOrderAmount > 0) {
          const currencyText = getCurrencyText();
          minOrderDisplay = `<div class="min-order">
                        <i class="fas fa-cart-plus"></i>
                        <span>${getTranslation("minOrderCardLabel")} ${
            voucher.minOrderAmount
          } <span class="currency-text">${currencyText}</span></span>
                    </div>`;
        }

        voucherCard.innerHTML = `
                    <div class="voucher-header">
                        <h3 class="voucher-name">${voucher.code}</h3>
                        <div class="voucher-discount">${voucher.discount}%</div>
                    </div>
                    <div class="voucher-details">
                        <div class="voucher-detail">
                            <i class="fas fa-percent"></i>
                            <span>${voucher.discount}% ${getTranslation(
          "discountWord"
        )}</span>
                        </div>
                        <div class="voucher-detail">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="voucher-expiry-text">
                                <span class="voucher-expiry-label" data-i18n="expiryDateLabel">${getTranslation(
                                  "expiryDateLabel"
                                )}</span>
                                <span class="voucher-expiry-date">${formatDate(
                                  voucher.expiryDate
                                )}</span>
                            </span>
                        </div>
                        ${categoryDisplay}
                        ${minOrderDisplay}
                        
                        <div class="expiry-status ${
                          isExpired ? "expired" : "active"
                        }">
                            ${
                              isExpired
                                ? `<i class="fas fa-times-circle"></i> ${getTranslation(
                                    "expired"
                                  )}`
                                : `<i class="fas fa-check-circle"></i> ${getTranslation(
                                    "active"
                                  )}`
                            }
                        </div>
                        
                        <div style="margin-top: 15px; display: flex; gap: 10px;">
                            <button class="edit-button edit-btn" data-id="${
                              voucher.id
                            }" aria-label="Edit voucher">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-button delete-btn" data-id="${
                              voucher.id
                            }" aria-label="Delete voucher">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;

        vouchersList.appendChild(voucherCard);

        // Attach event listeners to action buttons
        voucherCard.querySelector(".edit-btn").addEventListener("click", () => {
          openVoucherModal(voucher);
        });

        voucherCard
          .querySelector(".delete-btn")
          .addEventListener("click", () => {
            deleteVoucher(voucher.id);
          });
      });
    }
  }

  // Toggle voucher selection
  function toggleVoucherSelection(voucherId, isSelected) {
    if (isSelected) {
      selectedVouchers.add(voucherId);
    } else {
      selectedVouchers.delete(voucherId);
    }
    updateVouchersBulkActionsBar();
  }

  // Select all vouchers
  function selectAllVouchers(isSelected) {
    if (isSelected) {
      vouchers.forEach((voucher) => selectedVouchers.add(voucher.id));
    } else {
      selectedVouchers.clear();
    }
    renderVouchers();
  }

  // Update vouchers bulk actions bar
  function updateVouchersBulkActionsBar() {
    const bulkActionsBar = document.getElementById("vouchers-bulk-actions-bar");
    const selectedCountSpan = document.getElementById(
      "vouchers-selected-count"
    );
    const selectAllCheckbox = document.getElementById("select-all-vouchers");

    if (bulkActionsBar && selectedCountSpan) {
      if (selectedVouchers.size > 0) {
        bulkActionsBar.style.display = "flex";
        selectedCountSpan.textContent = selectedVouchers.size;
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = selectedVouchers.size === vouchers.length;
        }
      } else {
        bulkActionsBar.style.display = "none";
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
        }
      }
    }
  }

  // Bulk activate vouchers
  function bulkActivateVouchers() {
    if (selectedVouchers.size === 0) return;

    selectedVouchers.forEach((voucherId) => {
      const voucher = vouchers.find((v) => v.id === voucherId);
      if (voucher) {
        voucher.isActive = true;
      }
    });

    selectedVouchers.clear();
    saveVouchers();
    renderVouchers();

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const successMessage =
      currentLang === "en"
        ? "Vouchers activated successfully"
        : "تم تفعيل القسائم بنجاح";
    showAdminNotification(successMessage, "success");
  }

  // Bulk deactivate vouchers
  function bulkDeactivateVouchers() {
    if (selectedVouchers.size === 0) return;

    selectedVouchers.forEach((voucherId) => {
      const voucher = vouchers.find((v) => v.id === voucherId);
      if (voucher) {
        voucher.isActive = false;
      }
    });

    selectedVouchers.clear();
    saveVouchers();
    renderVouchers();

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const successMessage =
      currentLang === "en"
        ? "Vouchers deactivated successfully"
        : "تم إلغاء تفعيل القسائم بنجاح";
    showAdminNotification(successMessage, "success");
  }

  // Bulk delete vouchers
  function bulkDeleteVouchers() {
    if (selectedVouchers.size === 0) return;

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const confirmMessage =
      currentLang === "en"
        ? `Are you sure you want to delete ${selectedVouchers.size} voucher(s)?`
        : `هل أنت متأكد من حذف ${selectedVouchers.size} قسيمة؟`;

    if (confirm(confirmMessage)) {
      selectedVouchers.forEach((voucherId) => {
        const index = vouchers.findIndex((v) => v.id === voucherId);
        if (index !== -1) {
          vouchers.splice(index, 1);
        }
      });

      selectedVouchers.clear();
      saveVouchers();
      renderVouchers();
      updateStats();

      const successMessage =
        currentLang === "en"
          ? "Vouchers deleted successfully"
          : "تم حذف القسائم بنجاح";
      showAdminNotification(successMessage, "success");
    }
  }

  /**
   * Open voucher modal for creating or editing a voucher
   * @param {Object} voucher - The voucher to edit, null for creating a new voucher
   */
  function openVoucherModal(voucher = null) {
    // Check if user has permission to edit vouchers
    if (!checkEditPermission("vouchers")) {
      showAdminNotification(
        getTranslation("noPermissionToEditVouchersNotification") ||
          "ليس لديك صلاحية لتعديل القسائم",
        "error"
      );
      return;
    }

    console.log("openVoucherModal called", voucher);

    const modalTitle = document.getElementById("voucher-modal-title");
    const voucherCode = document.getElementById("voucher-code");
    const voucherDiscount = document.getElementById("voucher-discount");
    const voucherMinOrder = document.getElementById("voucher-min-order");
    const voucherCategory = document.getElementById("voucher-category");
    const voucherExpiry = document.getElementById("voucher-expiry");
    const generateCodeBtn = document.getElementById("generate-code-btn");

    console.log("Modal elements:", {
      modalTitle,
      voucherCode,
      voucherDiscount,
      voucherExpiry,
      voucherModal: voucherModal,
    });

    // Add event listener for the generate code button
    generateCodeBtn.addEventListener("click", function () {
      voucherCode.value = generateVoucherCode();
    });

    if (voucher) {
      // Edit existing voucher
      modalTitle.textContent = getTranslation("editVoucher");
      voucherForm.dataset.id = voucher.id;
      voucherCode.value = voucher.code;
      voucherDiscount.value = voucher.discount;
      voucherMinOrder.value = voucher.minOrderAmount || 0;
      voucherCategory.value = voucher.category || "all";
      voucherExpiry.value = formatDateForInput(voucher.expiryDate);
    } else {
      // Create new voucher
      modalTitle.textContent = getTranslation("addNewVoucher");
      voucherForm.removeAttribute("data-id");
      voucherCode.value = generateVoucherCode();
      voucherDiscount.value = "10";
      voucherMinOrder.value = "0";
      voucherCategory.value = "all";

      // Set default expiry date to 30 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      voucherExpiry.value = formatDateForInput(defaultDate);
    }

    console.log("About to show modal");
    voucherModal.style.display = "flex";
    setTimeout(() => {
      console.log("Adding show class");
      voucherModal.classList.add("show");
      voucherCode.focus();
    }, 10);
  }

  /**
   * Handle voucher form submission
   * @param {Event} e - Form submit event
   */
  function handleVoucherSubmit(e) {
    e.preventDefault();

    // Check if user has permission to edit vouchers
    if (!checkEditPermission("vouchers")) {
      showAdminNotification(
        getTranslation("noPermissionToEditVouchersNotification") ||
          "ليس لديك صلاحية لتعديل القسائم",
        "error"
      );
      return;
    }

    // Get form data
    const voucherId = voucherForm.dataset.id;
    const code = document.getElementById("voucher-code").value;
    const discount = document.getElementById("voucher-discount").value;
    const minOrderAmount = document.getElementById("voucher-min-order").value;
    const category = document.getElementById("voucher-category").value;
    const expiryDate = document.getElementById("voucher-expiry").value;

    // Validate form
    if (!code || !discount || !expiryDate) {
      showNotification(getTranslation("fillAllVoucherData"), "error");
      return;
    }

    // Create voucher object
    const voucher = {
      id: voucherId || generateUniqueId(),
      code: code.toUpperCase(),
      discount: parseFloat(discount),
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      category: category,
      expiryDate: expiryDate,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Check if editing or adding
    if (voucherId) {
      // Edit existing voucher
      const index = vouchers.findIndex((v) => v.id === voucherId);
      if (index !== -1) {
        // Preserve MongoDB ID if it exists
        if (vouchers[index]._id) {
          voucher._id = vouchers[index]._id;
        }
        vouchers[index] = voucher;
      }
    } else {
      // Add new voucher
      vouchers.push(voucher);
    }

    // Save to localStorage and API
    saveVouchers();

    // Re-render vouchers list
    renderVouchers();

    // Update stats
    updateStats();

    // Close modal
    closeAllModals();

    // Show notification
    showNotification(
      voucherId
        ? getTranslation("voucherEditedSuccess")
        : getTranslation("voucherAddedSuccess"),
      "success"
    );
  }

  /**
   * Delete a voucher
   * @param {string} voucherId - ID of the voucher to delete
   */
  function deleteVoucher(voucherId) {
    // Check if user has permission to edit vouchers
    if (!checkEditPermission("vouchers")) {
      showAdminNotification(
        getTranslation("noPermissionToDeleteVouchersNotification") ||
          "ليس لديك صلاحية لحذف القسائم",
        "error"
      );
      return;
    }

    if (!confirm(getTranslation("confirmDeleteVoucher"))) {
      return;
    }

    try {
      // Find the voucher to get its MongoDB ID if available
      const voucher = vouchers.find((v) => v.id === voucherId);
      const mongoId = voucher && voucher._id;

      // Check if voucher exists in MongoDB (has a valid _id)
      if (mongoId) {
        // Initialize API service
        const apiService = new ApiService();

        // Try to delete from MongoDB
        apiService
          .deleteVoucher(mongoId)
          .then((response) => {
            if (response.success) {
              // Remove from local array
              vouchers = vouchers.filter((v) => v.id !== voucherId);

              // Save to localStorage
              saveVouchers();

              // Re-render vouchers list
              renderVouchers();

              // Update stats
              updateStats();

              // Show notification
              showNotification(
                getTranslation("voucherDeletedSuccess"),
                "success"
              );
            } else {
              showNotification(getTranslation("errorDeletingVoucher"), "error");
            }
          })
          .catch((error) => {
            console.error("Error deleting voucher from server:", error);
            showNotification(getTranslation("errorConnectingServer"), "error");

            // Fallback to local deletion
            // Remove from local array
            vouchers = vouchers.filter((v) => v.id !== voucherId);

            // Save to localStorage
            saveVouchers();

            // Re-render vouchers list
            renderVouchers();

            // Update stats
            updateStats();

            // Show notification
            showNotification(
              getTranslation("voucherDeletedLocally"),
              "warning"
            );
          });
      } else {
        // Voucher only exists locally (no MongoDB _id), delete it locally only
        console.log("Voucher only exists locally, deleting from localStorage");

        // Remove from local array
        vouchers = vouchers.filter((v) => v.id !== voucherId);

        // Save to localStorage
        saveVouchers();

        // Re-render vouchers list
        renderVouchers();

        // Update stats
        updateStats();

        // Show notification
        showNotification(getTranslation("voucherDeletedLocally"), "success");
      }
    } catch (error) {
      console.error("Error in delete voucher flow:", error);
      showNotification(getTranslation("unexpectedError"), "error");
    }
  }

  // New modal display function
  function showVoucherModalForced() {
    console.log("Using forced voucher modal display");

    // Get the voucher modal and ensure it exists
    const modal = document.getElementById("voucher-modal");
    if (!modal) {
      console.error("Modal not found in DOM!");
      alert(getTranslation("modalLoadError"));
      return;
    }

    // Prepare default values
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    const defaultExpiryDate = formatDateForInput(defaultDate);

    // Generate a random code
    const randomCode = generateVoucherCode();

    // Set modal title and form values directly
    document.getElementById("voucher-modal-title").textContent =
      getTranslation("addNewVoucher");
    document.getElementById("voucher-code").value = randomCode;
    document.getElementById("voucher-discount").value = "10";
    document.getElementById("voucher-min-order").value = "0";
    document.getElementById("voucher-category").value = "all";
    document.getElementById("voucher-expiry").value = defaultExpiryDate;

    // Add event listener for generate code button
    const generateCodeBtn = document.getElementById("generate-code-btn");
    generateCodeBtn.addEventListener("click", function () {
      document.getElementById("voucher-code").value = generateVoucherCode();
    });

    // Show the modal
    voucherForm.removeAttribute("data-id");
    modal.style.display = "flex";
    setTimeout(() => {
      modal.classList.add("show");
      document.getElementById("voucher-code").focus();
    }, 10);
  }

  // Generate a random voucher code
  function generateVoucherCode() {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // removed similar looking characters
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  // QR Code Generator Functions
  function initQRCodeGenerator() {
    const existingInit = document.querySelector(".qr-list-container.qr-generator-initialized");
    if (existingInit) return;

    const createQRBtn = document.getElementById("create-qr-btn");
    const qrPreview = document.getElementById("qr-preview");
    const qrListContainer = document.querySelector(".qr-list-container");
    if (!createQRBtn || !qrListContainer) return;
    qrListContainer.classList.add("qr-generator-initialized");

    // Load saved QR codes from local storage
    loadSavedQRCodes();

    // Create QR Code button event listener
    createQRBtn.addEventListener("click", () => {
      const tableNumber = document.getElementById("table-number").value;
      if (!tableNumber || isNaN(tableNumber) || tableNumber < 1) {
        showNotification(getTranslation("enterValidTableNumber"), "error");
        return;
      }

      const savedQRCodes = JSON.parse(localStorage.getItem("qrCodes")) || [];
      const exists = savedQRCodes.some(
        (qr) => String(qr.tableNumber) === String(tableNumber)
      );
      if (exists) {
        const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
        const msg = lang === "ar" ? "كود QR موجود بالفعل لهذه الطاولة" : "QR code already exists for this table";
        showNotification(`${msg} ${tableNumber}`, "error");
        return;
      }

      generateQRCode(tableNumber, qrPreview, true);
    });

    // Event delegation for QR list actions (print, delete)
    qrListContainer.addEventListener("click", (e) => {
      const target = e.target.closest("button");
      if (!target) return;

      const qrItem = target.closest(".qr-table-item");
      const tableNumber = qrItem.dataset.table;

      if (target.classList.contains("print-qr")) {
        printQRCode(tableNumber);
      } else if (target.classList.contains("delete-qr")) {
        deleteQRCode(tableNumber, qrItem);
      }
    });
  }

  function generateQRCode(tableNumber, container, isPreview = false) {
    // Clear the container
    container.innerHTML = "";

    // Create URL with table number and secure QR token
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
    const API_BASE_URL =
      window.API_BASE_URL ||
      (function () {
        const { hostname, origin } = window.location;
        const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
        return isLocal ? "http://localhost:5000" : origin;
      })();
    const token = localStorage.getItem("adminToken");
    let menuUrl = baseUrl + `index.html?table=${tableNumber}`;
    if (token) {
      try {
        // Request a signed QR id from the server (admin-only)
        // eslint-disable-next-line no-undef
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };
        // Note: synchronous build flow with async fetch inside is acceptable here
        // because QR is generated immediately after
      } catch (_) {}
    }
    // Try to fetch qid synchronously via async/await in an IIFE
    (async () => {
      try {
        if (token) {
          const r = await fetch(
            `${API_BASE_URL}/api/table/qr-token?table=${tableNumber}`,
            {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const d = await r.json();
          if (d && d.success && d.qid) {
            menuUrl =
              baseUrl +
              `index.html?table=${tableNumber}&qid=${encodeURIComponent(
                d.qid
              )}`;
          }
        }
      } catch (_) {}
      // Generate QR code
      const qr = qrcode(0, "M");
      qr.addData(menuUrl);
      qr.make();

      // Create QR code image element
      const qrImg = document.createElement("img");
      qrImg.src = qr.createDataURL();
      qrImg.alt = `${getTranslation("tableWord")} ${tableNumber}`;
      qrImg.classList.add("qr-code-image");

      // Add table info
      const tableInfo = document.createElement("div");
      tableInfo.classList.add("table-info");
      tableInfo.innerHTML = `<i class="fas fa-utensils"></i> ${getTranslation(
        "tableWord"
      )} ${getCurrentLanguage() === "ar" ? "رقم " : "#"}${tableNumber}`;

      // Append to container
      container.appendChild(qrImg);
      container.appendChild(tableInfo);

      // If generating the preview, add a save button
      if (isPreview) {
        const saveBtn = document.createElement("button");
        saveBtn.classList.add("generate-qr-button");
        saveBtn.innerHTML = `<i class="fas fa-save"></i> ${getTranslation(
          "saveQr"
        )}`;
        saveBtn.style.marginTop = "15px";

        saveBtn.addEventListener("click", () => {
          saveQRCode(tableNumber, qrImg.src);
        });

        container.appendChild(saveBtn);
      }
    })();
  }

  function saveQRCode(tableNumber, qrImageSrc) {
    // Get saved QR codes from localStorage or initialize empty array
    let savedQRCodes = JSON.parse(localStorage.getItem("qrCodes")) || [];

    // Check if QR code for this table already exists
    const existingIndex = savedQRCodes.findIndex(
      (qr) => qr.tableNumber === tableNumber
    );

    if (existingIndex !== -1) {
      const lang = typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
      const msg = lang === "ar" ? "كود QR موجود بالفعل لهذه الطاولة" : "QR code already exists for this table";
      showNotification(`${msg} ${tableNumber}`, "error");
      return;
    } else {
      // Add new QR code
      savedQRCodes.push({ tableNumber, qrImageSrc });
      showNotification(
        getTranslation("qrCodeSaved").replace("{table}", tableNumber),
        "success"
      );
    }

    // Save to localStorage
    localStorage.setItem("qrCodes", JSON.stringify(savedQRCodes));

    // Reload the QR codes list
    loadSavedQRCodes();
  }

  function loadSavedQRCodes() {
    const qrListContainer = document.querySelector(".qr-list-container");
    qrListContainer.innerHTML = "";

    // Get saved QR codes from localStorage
    const savedQRCodes = JSON.parse(localStorage.getItem("qrCodes")) || [];

    // Sort by table number
    savedQRCodes.sort(
      (a, b) => parseInt(a.tableNumber) - parseInt(b.tableNumber)
    );

    if (savedQRCodes.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.classList.add("empty-list-message");
      emptyMessage.innerHTML = `<i class="fas fa-info-circle"></i> <span data-i18n="noQrCodes">${getTranslation(
        "noQrCodes"
      )}</span>`;
      qrListContainer.appendChild(emptyMessage);
      return;
    }

    // Create and append QR code items
    savedQRCodes.forEach((qr) => {
      const qrItem = createQRCodeItem(qr.tableNumber, qr.qrImageSrc);
      qrListContainer.appendChild(qrItem);
    });
  }

  function createQRCodeItem(tableNumber, qrImageSrc) {
    const qrItem = document.createElement("div");
    qrItem.classList.add("qr-table-item");
    qrItem.dataset.table = tableNumber;

    qrItem.innerHTML = `
            <div class="qr-code">
                <img src="${qrImageSrc}" alt="QR Code for Table ${tableNumber}">
            </div>
            <div class="qr-table-footer">
                <span class="table-number">${
                  getTranslation("tableNumberLabel") ||
                  getTranslation("tableNumber") ||
                  "طاولة"
                } ${tableNumber}</span>
                <div class="qr-actions">
                    <button class="print-qr" title="طباعة"><i class="fas fa-print"></i></button>
                    <button class="delete-qr" title="حذف"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;

    return qrItem;
  }

  function printQRCode(tableNumber) {
    // Get saved QR codes from localStorage
    const savedQRCodes = JSON.parse(localStorage.getItem("qrCodes")) || [];
    const qrCode = savedQRCodes.find((qr) => qr.tableNumber === tableNumber);

    if (!qrCode) {
      showNotification(getTranslation("qrCodeNotFound"), "error");
      return;
    }

    // Create print window
    const printWindow = window.open("", "_blank");
    const tableNumberLabel =
      getTranslation("tableNumberLabel") ||
      (getCurrentLanguage() === "ar" ? "رقم الطاولة:" : "Table Number:");

    const htmlContent = `
            <html>
            <head>
                <title>طباعة رمز QR للطاولة ${tableNumber}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
                    
                    body {
                        font-family: 'Cairo', Arial, sans-serif;
                        text-align: center;
                        direction: rtl;
                        margin: 0;
                        padding: 0;
                        background-color: #f8f9fa;
                    }
                    
                    .qr-container {
                        max-width: 400px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: white;
                        border-radius: 15px;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                        margin-top: 30px;
                    }
                    
                    .restaurant-name {
                        font-size: 28px;
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #42d158;
                    }
                    
                    .table-number {
                        font-size: 22px;
                        margin-bottom: 20px;
                        background-color: #42d158;
                        color: white;
                        padding: 8px 15px;
                        border-radius: 30px;
                        display: inline-block;
                    }
                    
                    .qr-image {
                        max-width: 100%;
                        height: auto;
                        border: 10px solid white;
                        border-radius: 10px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        margin-bottom: 20px;
                    }
                    
                    .instructions {
                        margin-top: 20px;
                        font-size: 18px;
                        color: #666;
                        line-height: 1.5;
                    }
                    
                    .footer {
                        margin-top: 30px;
                        font-size: 14px;
                        color: #999;
                    }
                    @media print {
                        @page {
                            size: 100mm 150mm;
                            margin: 0;
                        }
                        body {
                            margin: 0.5cm;
                        }
                        .print-button {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="qr-container">
                    <div class="restaurant-name">المطعم الرقمي</div>
                    <div class="table-number">${tableNumberLabel} ${tableNumber}</div>
                    <img class="qr-image" src="${qrCode.qrImageSrc}" alt="QR Code for Table ${tableNumber}">
                    <div class="instructions">امسح الرمز باستخدام كاميرا هاتفك لعرض القائمة</div>
                    <div class="footer">شكراً لاختياركم مطعمنا</div>
                    <button class="print-button" onclick="window.print(); setTimeout(function(){ window.close(); }, 500);">طباعة</button>
                </div>
            </body>
            </html>
        `;
    if (!printWindow || !printWindow.document) {
      const msg = getCurrentLanguage() === "ar" ? "يرجى السماح بفتح النوافذ المنبثقة للطباعة" : "Please allow pop-ups to open the print tab";
      showNotification(msg, "warning");
      return;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  function deleteQRCode(tableNumber, qrItem) {
    if (
      confirm(
        getTranslation("confirmDeleteQRCode").replace("{table}", tableNumber)
      )
    ) {
      // Get saved QR codes from localStorage
      let savedQRCodes = JSON.parse(localStorage.getItem("qrCodes")) || [];

      // Filter out the one to delete
      savedQRCodes = savedQRCodes.filter(
        (qr) => qr.tableNumber !== tableNumber
      );

      // Save back to localStorage
      localStorage.setItem("qrCodes", JSON.stringify(savedQRCodes));

      // Remove from DOM
      qrItem.remove();

      // Update empty state if needed
      if (savedQRCodes.length === 0) {
        loadSavedQRCodes();
      }

      showNotification(
        getTranslation("qrCodeDeleted").replace("{table}", tableNumber),
        "success"
      );
    }
  }

  // Global Discount Functions
  async function applyGlobalDiscount() {
    // Get the discount percentage
    const discountInput = document.getElementById("global-discount-percentage");
    const discountPercentage = parseFloat(discountInput.value);

    // Validate the discount percentage
    if (
      isNaN(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 90
    ) {
      showNotification(getTranslation("enterValidDiscountRange"), "error");
      return;
    }

    if (discountPercentage === 0) {
      showNotification(getTranslation("enterDiscountGreaterThanZero"), "error");
      return;
    }

    // Confirm with the user before applying the discount
    if (
      !confirm(
        getTranslation("confirmApplyDiscount").replace(
          "{percent}",
          discountPercentage
        )
      )
    ) {
      return;
    }

    try {
      // Create a mapping of product IDs to original prices
      const originalPrices = {};
      products.forEach((product) => {
        originalPrices[product.id] = product.price;
      });

      // Initialize API service
      const apiService = new ApiService();

      // Apply discount via API
      console.log(`Applying ${discountPercentage}% discount via API`);
      const response = await apiService.applyGlobalDiscount(
        discountPercentage,
        originalPrices
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to apply discount");
      }

      // Refresh products from database
      await loadProducts();

      // Show notification
      showNotification(
        getTranslation("discountAppliedSuccess").replace(
          "{percent}",
          discountPercentage
        ),
        "success"
      );

      // Update the discount container UI
      const discountContainer = document.querySelector(
        ".global-discount-container"
      );
      if (discountContainer) {
        discountContainer.classList.add("discount-active");
      }

      // Dispatch custom event for automatic refresh across all pages
      dispatchDiscountChangeEvent();
    } catch (error) {
      console.error("Error applying discount:", error);
      showNotification(
        getTranslation("errorApplyingDiscount").replace(
          "{error}",
          error.message
        ),
        "error"
      );
    }
  }

  async function resetGlobalDiscount() {
    try {
      // Confirm with the user before resetting the prices
      if (!confirm(getTranslation("confirmCancelDiscount"))) {
        return;
      }

      // Initialize API service
      const apiService = new ApiService();
      // Reset discount via API - no need to pass original prices anymore
      console.log("Resetting discount via API");
      const resetResponse = await apiService.resetGlobalDiscount();

      if (!resetResponse.success) {
        throw new Error(resetResponse.message || "Failed to reset discount");
      }

      // Refresh products from database
      await loadProducts();

      // Show notification
      showNotification(
        getTranslation("discountCancelledPricesRestored"),
        "success"
      );

      // Update the discount container UI
      const discountContainer = document.querySelector(
        ".global-discount-container"
      );
      if (discountContainer) {
        discountContainer.classList.remove("discount-active");
      }

      // Dispatch custom event for automatic refresh across all pages
      dispatchDiscountChangeEvent();
    } catch (error) {
      console.error("Error resetting discount:", error);
      showNotification(
        getTranslation("errorCancellingDiscount").replace(
          "{error}",
          error.message
        ),
        "error"
      );
    }
  }

  // Helper function to dispatch discount change event
  function dispatchDiscountChangeEvent() {
    const discountChangeEvent = new CustomEvent(
      "digital_menu_discount_change",
      {
        detail: { timestamp: Date.now() },
      }
    );
    window.dispatchEvent(discountChangeEvent);
    console.log("Discount change event dispatched");
  }

  // Initialize the service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("../service-worker.js", { scope: "/" })
      .then(function (registration) {
        console.log(
          "Service Worker registered with scope:",
          registration.scope
        );
      })
      .catch(function (error) {
        console.error("Service Worker registration failed:", error);
      });
  }

  // Product Add-ons Functions
  function initProductAddons() {
    // Check if already initialized
    if (document.querySelector(".addons-initialized")) {
      return;
    }

    // Mark as initialized
    const marker = document.createElement("div");
    marker.classList.add("addons-initialized");
    marker.style.display = "none";
    document.body.appendChild(marker);

    // Add event listener for the "Add Add-on Section" button
    const addAddonSectionBtn = document.getElementById("add-addon-section-btn");
    if (addAddonSectionBtn) {
      addAddonSectionBtn.addEventListener("click", addNewAddonSection);
    }

    // Initialize any existing add-ons when editing a product
    document.addEventListener("productModalOpened", function (event) {
      const product = event.detail.product;
      if (product && product.addOns && product.addOns.length > 0) {
        renderProductAddons(product.addOns);
      } else {
        // Show the "no add-ons" message
        const noAddonsMessage = document.getElementById("no-addons-message");
        const addonsList = document.getElementById("addons-list");
        if (noAddonsMessage && addonsList) {
          noAddonsMessage.style.display = "flex";
          addonsList.innerHTML = "";
        }
      }

      // Initialize draggable container for addon sections
      const addonsList = document.getElementById("addons-list");
      if (addonsList) {
        addonsList.addEventListener("dragover", function (e) {
          e.preventDefault();
          const draggingSection = document.querySelector(
            ".addon-section.dragging"
          );
          if (!draggingSection) return;

          // Get the mouse position
          const mouseY = e.clientY;

          // Find the closest sibling to insert before
          const siblings = Array.from(
            addonsList.querySelectorAll(".addon-section:not(.dragging)")
          );
          const nextSibling = siblings.find((sibling) => {
            const box = sibling.getBoundingClientRect();
            return mouseY < box.top + box.height / 2;
          });

          // Insert the dragging section
          if (nextSibling) {
            addonsList.insertBefore(draggingSection, nextSibling);
          } else {
            addonsList.appendChild(draggingSection);
          }
        });
      }
    });
  }

  function renderProductAddons(addOns) {
    const addonsList = document.getElementById("addons-list");
    const noAddonsMessage = document.getElementById("no-addons-message");

    if (!addonsList || !noAddonsMessage) return;

    // Clear existing add-ons
    addonsList.innerHTML = "";

    if (addOns && addOns.length > 0) {
      // Hide the "no add-ons" message
      noAddonsMessage.style.display = "none";

      // Render each add-on section
      addOns.forEach((section, sectionIndex) => {
        const sectionElement = createAddonSectionElement(section, sectionIndex);
        addonsList.appendChild(sectionElement);
      });
    } else {
      // Show the "no add-ons" message
      noAddonsMessage.style.display = "flex";
    }
  }

  function createAddonSectionElement(section, sectionIndex) {
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "addon-section";
    sectionDiv.dataset.index = sectionIndex;
    // Add draggable attribute
    sectionDiv.draggable = true;

    // Add animation class
    sectionDiv.classList.add("fade-in");
    setTimeout(() => sectionDiv.classList.remove("fade-in"), 500);

    // Create section header
    const headerDiv = document.createElement("div");
    headerDiv.className = "addon-section-header";
    // Add drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle section-drag-handle";
    dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    dragHandle.title = "اسحب لتغيير الترتيب";

    // Create title input
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "addon-section-title";
    titleInput.value = section.title || "";
    titleInput.placeholder = "عنوان القسم (مثال: اختر الصلصة)";
    titleInput.name = `addon-section-title-${sectionIndex}`;

    // Create optional English title input
    const titleEnInput = document.createElement("input");
    titleEnInput.type = "text";
    titleEnInput.className = "addon-section-title addon-section-title-en";
    titleEnInput.value = section.titleEn || "";
    titleEnInput.placeholder = "Section title in English (optional)";
    titleEnInput.name = `addon-section-title-en-${sectionIndex}`;

    // Auto-focus the title input if it's a new empty section
    if (!section.title) {
      setTimeout(() => titleInput.focus(), 100);
    }

    // Create section actions
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "addon-section-actions";

    // Create required toggle
    const requiredDiv = document.createElement("div");
    requiredDiv.className = "addon-section-toggle";

    const requiredLabel = document.createElement("label");
    requiredLabel.setAttribute("data-i18n", "required");
    requiredLabel.setAttribute("data-i18n-en", "Required");
    // Set text based on current language using translation system
    if (window.getCurrentLanguage && window.getTranslation) {
      const currentLang = window.getCurrentLanguage();
      if (currentLang === "en") {
        requiredLabel.textContent = "Required";
      } else {
        requiredLabel.textContent =
          window.getTranslation("required") || "إجباري";
      }
    } else {
      requiredLabel.textContent = "إجباري";
    }

    const requiredCheckbox = document.createElement("input");
    requiredCheckbox.type = "checkbox";
    requiredCheckbox.checked = section.required || false;
    requiredCheckbox.name = `addon-section-required-${sectionIndex}`;

    requiredDiv.appendChild(requiredLabel);
    requiredDiv.appendChild(requiredCheckbox);

    // Create single choice toggle
    const singleChoiceDiv = document.createElement("div");
    singleChoiceDiv.className = "addon-section-toggle";

    const singleChoiceLabel = document.createElement("label");
    singleChoiceLabel.setAttribute("data-i18n", "singleChoice");
    singleChoiceLabel.setAttribute("data-i18n-en", "Single Choice");
    // Set text based on current language using translation system
    if (window.getCurrentLanguage && window.getTranslation) {
      const currentLang = window.getCurrentLanguage();
      if (currentLang === "en") {
        singleChoiceLabel.textContent = "Single Choice";
      } else {
        singleChoiceLabel.textContent =
          window.getTranslation("singleChoice") || "خيار واحد فقط";
      }
    } else {
      singleChoiceLabel.textContent = "خيار واحد فقط";
    }

    const singleChoiceCheckbox = document.createElement("input");
    singleChoiceCheckbox.type = "checkbox";
    singleChoiceCheckbox.checked = section.singleChoice || false;
    singleChoiceCheckbox.name = `addon-section-single-choice-${sectionIndex}`;

    singleChoiceDiv.appendChild(singleChoiceLabel);
    singleChoiceDiv.appendChild(singleChoiceCheckbox);

    // Create delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.title = "حذف القسم";
    deleteBtn.addEventListener("click", function () {
      if (confirm(getTranslation("confirmDeleteSection"))) {
        sectionDiv.classList.add("fade-out");
        setTimeout(() => {
          sectionDiv.remove();
          updateAddonsVisibility();
        }, 300);
      }
    });

    // Assemble header
    actionsDiv.appendChild(requiredDiv);
    actionsDiv.appendChild(singleChoiceDiv);
    actionsDiv.appendChild(deleteBtn);
    headerDiv.appendChild(dragHandle);
    headerDiv.appendChild(titleInput);
    headerDiv.appendChild(titleEnInput);
    headerDiv.appendChild(actionsDiv);

    // Create options container
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "addon-options";

    // Add existing options
    if (section.options && section.options.length > 0) {
      section.options.forEach((option, optionIndex) => {
        const optionElement = createAddonOptionElement(
          option,
          sectionIndex,
          optionIndex
        );
        optionsDiv.appendChild(optionElement);
      });
    }

    // Add "Add Option" button
    const addOptionBtn = document.createElement("button");
    addOptionBtn.type = "button";
    addOptionBtn.className = "add-addon-option-btn";
    addOptionBtn.setAttribute("data-i18n", "addAddonOption");
    addOptionBtn.setAttribute("data-i18n-en", "Add New Option");

    const addOptionIcon = document.createElement("i");
    addOptionIcon.className = "fas fa-plus";
    addOptionBtn.appendChild(addOptionIcon);

    const addOptionLabelKey = "addAddonOption";
    let addOptionLabel = "إضافة خيار جديد";
    if (window.getTranslation) {
      try {
        addOptionLabel = window.getTranslation(addOptionLabelKey);
      } catch (e) {
        addOptionLabel = addOptionLabelKey;
      }
    } else if (
      window.getCurrentLanguage &&
      window.getCurrentLanguage() === "en"
    ) {
      addOptionLabel = "Add New Option";
    }
    addOptionBtn.appendChild(document.createTextNode(" " + addOptionLabel));
    addOptionBtn.addEventListener("click", function () {
      const newOption = { name: "", price: 0 };
      const optionIndex = optionsDiv.querySelectorAll(".addon-option").length;
      const optionElement = createAddonOptionElement(
        newOption,
        sectionIndex,
        optionIndex
      );
      optionsDiv.insertBefore(optionElement, addOptionBtn);

      // Focus the name input of the new option
      setTimeout(() => {
        const nameInput = optionElement.querySelector(".addon-option-name");
        if (nameInput) nameInput.focus();
      }, 50);
    });

    // Assemble section
    optionsDiv.appendChild(addOptionBtn);
    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(optionsDiv);

    // Add drag and drop event listeners for section
    sectionDiv.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", sectionIndex);
      sectionDiv.classList.add("dragging");
      // Delay to allow the dragging class to apply before drag starts
      setTimeout(() => {
        sectionDiv.classList.add("section-dragging");
      }, 0);
    });

    sectionDiv.addEventListener("dragend", function () {
      sectionDiv.classList.remove("dragging", "section-dragging");
    });

    sectionDiv.addEventListener("dragover", function (e) {
      e.preventDefault();
      const draggingSection = document.querySelector(".addon-section.dragging");
      if (!draggingSection || draggingSection === sectionDiv) return;

      const addonsList = sectionDiv.parentElement;
      const rect = sectionDiv.getBoundingClientRect();
      const mouseY = e.clientY;
      const threshold = rect.top + rect.height / 2;

      if (mouseY < threshold) {
        addonsList.insertBefore(draggingSection, sectionDiv);
      } else {
        addonsList.insertBefore(draggingSection, sectionDiv.nextElementSibling);
      }
    });

    return sectionDiv;
  }

  function createAddonOptionElement(option, sectionIndex, optionIndex) {
    const optionDiv = document.createElement("div");
    optionDiv.className = "addon-option";
    optionDiv.dataset.index = optionIndex;
    // Add draggable attribute
    optionDiv.draggable = true;

    // Add animation class
    optionDiv.classList.add("fade-in");
    setTimeout(() => optionDiv.classList.remove("fade-in"), 500);

    // Create drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle option-drag-handle";
    dragHandle.innerHTML = '<i class="fas fa-grip-lines"></i>';
    dragHandle.title = "اسحب لتغيير الترتيب";

    // Create name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "addon-option-name";
    nameInput.value = option.name || "";
    nameInput.placeholder = "اسم الخيار";
    nameInput.name = `addon-option-name-${sectionIndex}-${optionIndex}`;

    // Create optional English name input
    const nameEnInput = document.createElement("input");
    nameEnInput.type = "text";
    nameEnInput.className = "addon-option-name addon-option-name-en";
    nameEnInput.value = option.nameEn || "";
    nameEnInput.placeholder = "Option name in English (optional)";
    nameEnInput.name = `addon-option-name-en-${sectionIndex}-${optionIndex}`;

    // Create price input container
    const priceDiv = document.createElement("div");
    priceDiv.className = "addon-option-price";

    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "0.5";
    priceInput.value = option.price || 0;
    priceInput.placeholder = "السعر";
    priceInput.name = `addon-option-price-${sectionIndex}-${optionIndex}`;

    const currencySpan = document.createElement("span");
    currencySpan.className = "currency-symbol";
    // Use dynamic currency from global settings
    currencySpan.textContent = getCurrencyText();

    priceDiv.appendChild(priceInput);
    priceDiv.appendChild(currencySpan);

    // Create actions
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "addon-option-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.title = "حذف الخيار";
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.addEventListener("click", function () {
      optionDiv.classList.add("fade-out");
      setTimeout(() => {
        optionDiv.remove();
      }, 300);
    });

    actionsDiv.appendChild(deleteBtn);

    // Assemble option
    optionDiv.appendChild(dragHandle);
    optionDiv.appendChild(nameInput);
    optionDiv.appendChild(nameEnInput);
    optionDiv.appendChild(priceDiv);
    optionDiv.appendChild(actionsDiv);

    // Add drag and drop event listeners for option
    optionDiv.addEventListener("dragstart", function (e) {
      e.dataTransfer.setData("text/plain", optionIndex);
      optionDiv.classList.add("dragging");
      // Delay to allow the dragging class to apply before drag starts
      setTimeout(() => {
        optionDiv.classList.add("option-dragging");
      }, 0);
    });

    optionDiv.addEventListener("dragend", function () {
      optionDiv.classList.remove("dragging", "option-dragging");
    });

    optionDiv.addEventListener("dragover", function (e) {
      e.preventDefault();
      const draggingOption = document.querySelector(".addon-option.dragging");
      if (!draggingOption || draggingOption === optionDiv) return;

      // Make sure we're in the same section (parent container)
      if (draggingOption.parentElement !== optionDiv.parentElement) return;

      const optionsContainer = optionDiv.parentElement;
      const rect = optionDiv.getBoundingClientRect();
      const mouseY = e.clientY;
      const threshold = rect.top + rect.height / 2;

      // Get the add button to make sure we don't insert after it
      const addButton = optionsContainer.querySelector(".add-addon-option-btn");

      if (mouseY < threshold) {
        optionsContainer.insertBefore(draggingOption, optionDiv);
      } else {
        // Make sure not to insert after the add button
        const nextSibling = optionDiv.nextElementSibling;
        if (nextSibling && nextSibling !== addButton) {
          optionsContainer.insertBefore(draggingOption, nextSibling);
        } else if (nextSibling === addButton) {
          optionsContainer.insertBefore(draggingOption, addButton);
        }
      }
    });

    return optionDiv;
  }

  function addNewAddonSection() {
    const addonsList = document.getElementById("addons-list");
    const noAddonsMessage = document.getElementById("no-addons-message");

    if (!addonsList || !noAddonsMessage) return;

    // Hide the "no add-ons" message with fade effect
    noAddonsMessage.classList.add("fade-out");
    setTimeout(() => {
      noAddonsMessage.style.display = "none";
      noAddonsMessage.classList.remove("fade-out");
    }, 300);

    // Create a new section with default values
    const newSection = {
      title: "",
      required: false,
      singleChoice: false,
      options: [],
    };

    // Get the next section index
    const sectionIndex = addonsList.querySelectorAll(".addon-section").length;

    // Create and append the new section element
    const sectionElement = createAddonSectionElement(newSection, sectionIndex);
    addonsList.appendChild(sectionElement);

    // Smooth scroll to the new section
    setTimeout(() => {
      sectionElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  function updateAddonsVisibility() {
    const addonsList = document.getElementById("addons-list");
    const noAddonsMessage = document.getElementById("no-addons-message");

    if (!addonsList || !noAddonsMessage) return;

    // Check if there are any add-on sections
    const hasSections =
      addonsList.querySelectorAll(".addon-section").length > 0;

    // Update visibility
    noAddonsMessage.style.display = hasSections ? "none" : "flex";
  }

  function collectAddonsData() {
    const addonsList = document.getElementById("addons-list");
    if (!addonsList) return [];

    const sections = addonsList.querySelectorAll(".addon-section");
    const addOns = [];

    sections.forEach((section) => {
      const titleInput = section.querySelector(".addon-section-title");
      const titleEnInput = section.querySelector(".addon-section-title-en");
      const requiredCheckbox = section.querySelector(
        "input[type='checkbox'][name^='addon-section-required']"
      );
      const singleChoiceCheckbox = section.querySelector(
        "input[type='checkbox'][name^='addon-section-single-choice']"
      );
      const optionElements = section.querySelectorAll(".addon-option");

      // Skip sections with empty titles
      if (!titleInput.value.trim()) return;

      const sectionData = {
        title: titleInput.value.trim(),
        titleEn:
          titleEnInput && titleEnInput.value ? titleEnInput.value.trim() : "",
        required: requiredCheckbox.checked,
        singleChoice: singleChoiceCheckbox
          ? singleChoiceCheckbox.checked
          : false,
        options: [],
      };

      optionElements.forEach((optionEl) => {
        const nameInput = optionEl.querySelector(".addon-option-name");
        const nameEnInput = optionEl.querySelector(".addon-option-name-en");
        const priceInput = optionEl.querySelector(".addon-option-price input");

        // Skip options with empty names
        if (!nameInput.value.trim()) return;

        sectionData.options.push({
          name: nameInput.value.trim(),
          nameEn:
            nameEnInput && nameEnInput.value ? nameEnInput.value.trim() : "",
          price: parseFloat(priceInput.value) || 0,
        });
      });

      // Only add sections that have at least one option
      if (sectionData.options.length > 0) {
        addOns.push(sectionData);
      }
    });

    return addOns;
  }

  // Sidebar toggle functionality
  function initSidebarToggle() {
    // Check if already initialized
    if (document.querySelector(".sidebar-initialized")) {
      return;
    }

    const sidebarCloseBtn = document.getElementById("sidebar-toggle");
    const sidebarOpenBtn = document.getElementById("sidebar-open-btn");
    const body = document.body;
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const adminContent = document.querySelector(".admin-content");

    // Mark as initialized
    if (adminContent) {
      adminContent.classList.add("sidebar-initialized");
    } else {
      const marker = document.createElement("div");
      marker.classList.add("sidebar-initialized");
      marker.style.display = "none";
      document.body.appendChild(marker);
    }

    // Initialize sidebar state based on screen width
    if (window.innerWidth <= 1140) {
      body.classList.remove("sidebar-expanded");
    } else {
      body.classList.add("sidebar-expanded");
      // Remove blur effect for desktop
      if (adminContent) {
        adminContent.style.filter = "none";
      }
    }

    // Open sidebar on open button click
    if (sidebarOpenBtn) {
      sidebarOpenBtn.addEventListener("click", function () {
        body.classList.add("sidebar-expanded");
        localStorage.setItem("sidebarExpanded", "true");
      });
    }

    // Close sidebar on close button click
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener("click", function () {
        body.classList.remove("sidebar-expanded");
        localStorage.setItem("sidebarExpanded", "false");
      });
    }

    // Close sidebar when clicking on overlay
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener("click", function () {
        body.classList.remove("sidebar-expanded");
        localStorage.setItem("sidebarExpanded", "false");
      });
    }

    // Handle window resize
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1140) {
        body.classList.add("sidebar-expanded");
        // Remove blur effect for desktop
        if (adminContent) {
          adminContent.style.filter = "none";
        }
      } else {
        // Check stored preference for smaller screens
        const sidebarExpanded = localStorage.getItem("sidebarExpanded");
        if (sidebarExpanded === "true") {
          body.classList.add("sidebar-expanded");
        } else if (sidebarExpanded === "false" || sidebarExpanded === null) {
          body.classList.remove("sidebar-expanded");
        }
      }
    });

    // Load saved sidebar state
    const sidebarExpanded = localStorage.getItem("sidebarExpanded");
    if (sidebarExpanded === "true") {
      body.classList.add("sidebar-expanded");
      // For desktop, ensure no blur
      if (window.innerWidth > 1140 && adminContent) {
        adminContent.style.filter = "none";
      }
    } else if (sidebarExpanded === "false" || sidebarExpanded === null) {
      body.classList.remove("sidebar-expanded");
    }

    // Add click handlers to sidebar links to close sidebar on mobile
    const sidebarLinks = document.querySelectorAll(".admin-tab");
    sidebarLinks.forEach((link) => {
      link.addEventListener("click", function () {
        if (window.innerWidth <= 1140) {
          body.classList.remove("sidebar-expanded");
          localStorage.setItem("sidebarExpanded", "false");
        }

        // Hide admin submenus when clicking on other tabs
        const globalSettingsSubmenu = document.getElementById(
          "global-settings-submenu"
        );
        if (globalSettingsSubmenu && !this.id.includes("global-settings")) {
          globalSettingsSubmenu.classList.remove("show");
        }

        const productsSubmenu = document.getElementById("products-submenu");
        if (productsSubmenu && !this.id.includes("products")) {
          productsSubmenu.classList.remove("show");
        }
      });
    });
  }

  // Initialize API service
  const apiService = new ApiService();

  // Show order details in a modal
  async function showOrderDetails(order) {
    try {
      // If we only have the order ID, fetch the full order details
      if (
        !order.items &&
        (order.id || order.orderId || order.orderNumber || order._id)
      ) {
        const orderId =
          order.id || order.orderId || order.orderNumber || order._id;

        // Show loading notification
        const loadingToast = showToast("جاري التحميل...", "loading");

        try {
          // Fetch order details from API
          const response = await apiService.request(`orders/${orderId}`, "GET");

          if (response && response.success && response.data) {
            order = response.data;
          } else {
            // If API fails, try to find the order in the local array
            const localOrder = orders.find(
              (o) =>
                o.id === orderId ||
                o.orderId === orderId ||
                o.orderNumber === orderId ||
                o._id === orderId
            );

            if (localOrder) {
              order = localOrder;
            }
          }

          hideToast(loadingToast);
        } catch (error) {
          console.error("Error fetching order details:", error);
          hideToast(loadingToast);
          showToast("حدث خطأ أثناء تحميل تفاصيل الطلب", "error");
          return;
        }
      }

      // If order is rated, fetch the rating comment
      if (order.isRated) {
        try {
          const orderId = order.orderNumber || order.orderId || order._id;
          // Fetch ratings for this order
          const ratingsResponse = await apiService.request(
            `ratings/order/${orderId}`,
            "GET"
          );

          if (
            ratingsResponse &&
            ratingsResponse.success &&
            ratingsResponse.data &&
            ratingsResponse.data.length > 0
          ) {
            // Get the most recent rating
            const latestRating = ratingsResponse.data[0];
            // Add comment to order object
            order.comment = latestRating.comment;
            // Add rating value to order object
            order.ratingValue = latestRating.rating;
            console.log(
              "Found rating for order:",
              order.ratingValue,
              order.comment
            );
          }
        } catch (error) {
          console.error("Error fetching rating for order:", error);
          // Continue without the comment if there's an error
        }
      }

      // Ensure we have product images for each item
      if (Array.isArray(order.items) && order.items.length > 0) {
        // Check if we need to fetch product details for images
        const needsImages = order.items.some((item) => !item.image);

        if (needsImages) {
          try {
            // Get all products to match with order items
            const productsResponse = await apiService.getProducts();

            if (
              productsResponse &&
              productsResponse.success &&
              Array.isArray(productsResponse.data)
            ) {
              const productsMap = {};

              // Create a map of products by ID and name for quick lookup
              productsResponse.data.forEach((product) => {
                if (product.id) productsMap[product.id] = product;
                if (product._id) productsMap[product._id] = product;
                if (product.name)
                  productsMap[product.name.toLowerCase()] = product;
              });

              // Update order items with images
              order.items = order.items.map((item) => {
                if (!item.image) {
                  // Try to find matching product by id or name
                  const matchedProduct =
                    (item.id && productsMap[item.id]) ||
                    (item.productId && productsMap[item.productId]) ||
                    (item.name && productsMap[item.name.toLowerCase()]);

                  if (matchedProduct && matchedProduct.image) {
                    return { ...item, image: matchedProduct.image };
                  }
                }
                return item;
              });
            }
          } catch (error) {
            console.error("Error fetching product images:", error);
            // Continue without images if there's an error
          }
        }
      }

      currentOrderDetailsModalData = order;
      createOrderDetailsModal(order);
    } catch (error) {
      console.error("Error showing order details:", error);
      showToast("حدث خطأ أثناء عرض تفاصيل الطلب", "error");
    }
  }

  // Create a modal to display order details
  function createOrderDetailsModal(order) {
    currentOrderDetailsModalData = order;
    // Format the date
    const orderDate = new Date(order.date || order.createdAt);
    const formattedDate = formatDateString(orderDate);
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const timeLocale = currentLang === "ar" ? "ar-EG" : "en-US";
    const timeOptions =
      currentLang === "ar"
        ? { hour: "2-digit", minute: "2-digit" }
        : { hour: "numeric", minute: "2-digit", hour12: true };
    const formattedTime = orderDate.toLocaleTimeString(timeLocale, timeOptions);

    // Get order ID
    const orderId =
      order.orderNumber ||
      order.orderId ||
      order.id ||
      order._id ||
      "غير متوفر";

    // Get status info
    let statusClass = order.status || "pending";
    let statusText = "قيد الانتظار";
    let statusIcon = '<i class="fas fa-clock"></i>';

    switch (statusClass) {
      case "completed":
        statusText = "مكتمل";
        statusIcon = '<i class="fas fa-check-circle"></i>';
        break;
      case "processing":
        statusText = "قيد التنفيذ";
        statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
        break;
      case "cancelled":
        statusText = "ملغي";
        statusIcon = '<i class="fas fa-times-circle"></i>';
        break;
    }

    // Get currency text
    const currencyText = getCurrencyText();

    // Generate items HTML
    let itemsHTML = "";
    let subtotal = 0;
    let addonsTotal = 0;

    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1);
        const itemTotal = itemPrice * itemQuantity;
        subtotal += itemTotal;

        // Process addons
        let addonsHTML = "";
        let itemAddonsTotal = 0;

        // Handle different addon formats
        if (item.addons && item.addons.length > 0) {
          addonsHTML += '<div class="item-addons">';

          // Check if we have complex structure with sections
          const hasComplexStructure = item.addons.some(
            (addon) =>
              addon.options ||
              addon.title ||
              (addon.name && Array.isArray(addon.options))
          );

          if (hasComplexStructure) {
            // Process sections with options
            item.addons.forEach((section) => {
              if (section.title || section.name) {
                const sectionTitle = section.title || section.name;
                addonsHTML += `<div class="addon-section-title">${sectionTitle}</div>`;

                // Process options
                if (
                  Array.isArray(section.options) &&
                  section.options.length > 0
                ) {
                  section.options.forEach((option) => {
                    const optionPrice = parseFloat(option.price || 0);
                    itemAddonsTotal += optionPrice;
                    addonsTotal += optionPrice;

                    addonsHTML += `
                      <div class="item-addon">
                        <span class="addon-name">• ${(() => {
                          const currentLang = getCurrentLanguage();
                          if (currentLang === "en" && option.nameEn) {
                            return option.nameEn;
                          } else if (currentLang === "en" && option.titleEn) {
                            return option.titleEn;
                          } else {
                            return option.name || option.title || "إضافة";
                          }
                        })()}</span>
                        ${
                          optionPrice > 0
                            ? `<span class="addon-price">+${optionPrice.toFixed(
                                2
                              )} ${currencyText}</span>`
                            : '<span class="addon-price free">مجاني</span>'
                        }
                      </div>
                    `;
                  });
                }
              } else {
                // Simple addon
                const addonPrice = parseFloat(section.price || 0);
                itemAddonsTotal += addonPrice;
                addonsTotal += addonPrice;

                addonsHTML += `
                  <div class="item-addon">
                    <span class="addon-name">• ${(() => {
                      const currentLang = getCurrentLanguage();
                      if (currentLang === "en" && section.nameEn) {
                        return section.nameEn;
                      } else {
                        return section.name || "إضافة";
                      }
                    })()}</span>
                    ${
                      addonPrice > 0
                        ? `<span class="addon-price">+${addonPrice.toFixed(
                            2
                          )} ${currencyText}</span>`
                        : '<span class="addon-price free">مجاني</span>'
                    }
                  </div>
                `;
              }
            });
          } else {
            // Simple array of addons
            item.addons.forEach((addon) => {
              const addonPrice = parseFloat(addon.price || 0);
              itemAddonsTotal += addonPrice;
              addonsTotal += addonPrice;

              addonsHTML += `
                <div class="item-addon">
                  <span class="addon-name">• ${(() => {
                    const currentLang = getCurrentLanguage();
                    if (currentLang === "en" && addon.nameEn) {
                      return addon.nameEn;
                    } else if (currentLang === "en" && addon.titleEn) {
                      return addon.titleEn;
                    } else {
                      return addon.name || addon.title || "إضافة";
                    }
                  })()}</span>
                  ${
                    addonPrice > 0
                      ? `<span class="addon-price">+${addonPrice.toFixed(
                          2
                        )} ${currencyText}</span>`
                      : '<span class="addon-price free">مجاني</span>'
                  }
                </div>
              `;
            });
          }

          addonsHTML += "</div>";
        } else if (item.addonsList && item.addonsList.length > 0) {
          // Process addonsList format
          addonsHTML += '<div class="item-addons">';

          item.addonsList.forEach((addon) => {
            const addonPrice = parseFloat(addon.price || 0);
            itemAddonsTotal += addonPrice;
            addonsTotal += addonPrice;

            addonsHTML += `
              <div class="item-addon">
                <span class="addon-name">• ${(() => {
                  const currentLang = getCurrentLanguage();
                  if (currentLang === "en" && addon.nameEn) {
                    return addon.nameEn;
                  } else {
                    return addon.name || "إضافة";
                  }
                })()}</span>
                ${
                  addonPrice > 0
                    ? `<span class="addon-price">+${addonPrice.toFixed(
                        2
                      )} ${currencyText}</span>`
                    : '<span class="addon-price free">مجاني</span>'
                }
              </div>
            `;
          });

          addonsHTML += "</div>";
        }

        // Add item notes if available
        let notesHTML = "";
        if (item.notes && item.notes.trim() !== "") {
          notesHTML = `<div class="item-notes">ملاحظات: ${item.notes}</div>`;
        }

        // Create item HTML
        itemsHTML += `
          <div class="order-detail-item">
            <div class="item-header">
              <div class="item-image-container">
                ${
                  item.image
                    ? `<img src="${item.image}" alt="${(() => {
                        const currentLang = getCurrentLanguage();
                        if (currentLang === "en" && item.nameEn) {
                          return item.nameEn;
                        } else if (item.nameAr) {
                          return item.nameAr;
                        } else {
                          return item.name || "منتج";
                        }
                      })()}" onerror="this.onerror=null; this.src='assets/img/default-food.png'; this.classList.add('fallback-img');">`
                    : `<div class="no-image"><i class="fas fa-utensils"></i></div>`
                }
              </div>
              <div class="item-name-qty">
                <span class="item-name">${(() => {
                  const currentLang = getCurrentLanguage();
                  if (currentLang === "en" && item.nameEn) {
                    return item.nameEn;
                  } else if (item.nameAr) {
                    return item.nameAr;
                  } else {
                    return item.name || "منتج";
                  }
                })()}</span>
                <span class="item-quantity">×${itemQuantity}</span>
              </div>
              <div class="item-price-info">
                <span class="item-base-price">${itemPrice.toFixed(
                  2
                )} ${currencyText}</span>
                <span class="item-total-price">${(
                  itemTotal + itemAddonsTotal
                ).toFixed(2)} ${currencyText}</span>
              </div>
            </div>
            ${addonsHTML}
            ${notesHTML}
          </div>
        `;
      });
    } else {
      itemsHTML = `
        <div class="no-items-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${getTranslation("noItemsAvailable")}</p>
        </div>
      `;
    }

    // Calculate totals
    const orderSubtotal = parseFloat(order.subtotal || subtotal || 0);
    const tax = order.tax ? parseFloat(order.tax.value || 0) : 0;
    const taxRate = order.tax ? parseFloat(order.tax.rate || 0) : 0;
    const serviceTax = order.serviceTax
      ? parseFloat(order.serviceTax.value || 0)
      : 0;
    const serviceTaxRate = order.serviceTax
      ? parseFloat(order.serviceTax.rate || 0)
      : 0;
    const discount = order.discount ? parseFloat(order.discount.value || 0) : 0;
    const total = parseFloat(order.total || 0);

    // Create the modal HTML
    const modalHTML = `
      <div class="order-details-modal-backdrop"></div>
      <div class="order-details-modal-container">
        <div class="order-details-modal-header">
          <h3>${getTranslation(
            "orderDetails"
          )} <span class="order-id-badge">#${orderId}</span></h3>
          <button class="order-details-modal-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="order-details-modal-body">
          <div class="order-info-grid">
            <div class="order-info-card">
              <div class="info-icon"><i class="fas fa-calendar-alt"></i></div>
              <div class="info-content">
                <div class="info-label">${getTranslation("dateAndTime")}</div>
                <div class="info-value">${formattedDate} - ${formattedTime}</div>
              </div>
            </div>
            
            <div class="order-info-card">
              <div class="info-icon"><i class="fas fa-chair"></i></div>
              <div class="info-content">
                <div class="info-label">${getTranslation("tableNumber")}</div>
                <div class="info-value">${
                  order.tableNumber || getTranslation("unspecified")
                }</div>
              </div>
            </div>
            
            <div class="order-info-card">
              <div class="info-icon"><i class="fas fa-user"></i></div>
              <div class="info-content">
                <div class="info-label">${getTranslation("customerName")}</div>
                <div class="info-value">${
                  order.customerName || getTranslation("unspecified")
                }</div>
              </div>
            </div>
            
            <div class="order-info-card">
              <div class="info-icon"><i class="fas fa-star"></i></div>
              <div class="info-content">
                <div class="info-label">${getTranslation("orderRating")}</div>
                <div class="info-value">
                  ${
                    order.isRated
                      ? `<span class="rating-badge rated"><i class="fas fa-check-circle"></i> ${getTranslation(
                          "rated"
                        )} ${
                          order.ratingValue
                            ? `<span class="rating-value">${order.ratingValue}/5</span>`
                            : ""
                        }</span>`
                      : `<span class="rating-badge not-rated"><i class="fas fa-times-circle"></i> ${getTranslation(
                          "notRated"
                        )}</span>`
                  }
                </div>
              </div>
            </div>
            
            <div class="order-info-card">
              <div class="info-icon status-icon ${statusClass}"><i class="fas fa-info-circle"></i></div>
              <div class="info-content">
                <div class="info-label">${getTranslation("orderStatus")}</div>
                <div class="info-value">
                  <span class="status-badge ${statusClass}">${statusIcon} ${statusText}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="order-items-section">
            <h4>${getTranslation("orderItems")}</h4>
            <div class="order-items-list">
              ${itemsHTML}
            </div>
          </div>
          
          ${
            order.comment && order.comment.trim() !== ""
              ? `
          <div class="order-comment-section">
            <h4>${getTranslation("customerComment")}</h4>
            <div class="order-comment">
              <div class="comment-icon"><i class="fas fa-comment-alt"></i></div>
              <div class="comment-text">${order.comment}</div>
            </div>
          </div>
            `
              : ""
          }
          
          <div class="order-summary-section">
            <h4>${getTranslation("orderSummary")}</h4>
            <div class="order-summary">
              <div class="summary-row">
                <div class="summary-label">${getTranslation("subtotal")}</div>
                <div class="summary-value">${orderSubtotal.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
              
              ${
                addonsTotal > 0
                  ? `
              <div class="summary-row">
                <div class="summary-label">${getTranslation(
                  "addonsTotal"
                )}</div>
                <div class="summary-value">${addonsTotal.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
              `
                  : ""
              }
              
              ${
                tax > 0
                  ? `
              <div class="summary-row">
                <div class="summary-label">${getTranslation(
                  "tax"
                )} (${taxRate}%)</div>
                <div class="summary-value">${tax.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
              `
                  : ""
              }
              
              ${
                serviceTax > 0
                  ? `
              <div class="summary-row">
                <div class="summary-label">${getTranslation(
                  "serviceTax"
                )} (${serviceTaxRate}%)</div>
                <div class="summary-value">${serviceTax.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
              `
                  : ""
              }
              
              ${
                discount > 0
                  ? `
              <div class="summary-row discount">
                <div class="summary-label">${getTranslation("discount")}</div>
                <div class="summary-value">- ${discount.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
              `
                  : ""
              }
              
              <div class="summary-row total">
                <div class="summary-label">${getTranslation("total")}</div>
                <div class="summary-value">${total.toFixed(
                  2
                )} ${getCurrencyText()}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="order-details-modal-footer">
        </div>
      </div>
    `;

    // Create modal element
    const modalElement = document.createElement("div");
    modalElement.id = "order-details-modal";
    modalElement.className = "order-details-modal";
    modalElement.innerHTML = modalHTML;

    // Add direction-specific styles based on current language
    const isRTL = document.documentElement.dir === "rtl";
    if (!isRTL) {
      const existingLTRStyle = document.getElementById(
        "order-details-modal-ltr-style"
      );
      if (existingLTRStyle) {
        existingLTRStyle.remove();
      }
      const style = document.createElement("style");
      style.id = "order-details-modal-ltr-style";
      style.textContent = `
        .order-details-modal .order-details-modal-header h3 {
          text-align: left;
        }
        .order-details-modal .order-info-grid {
          direction: ltr;
        }
        .order-details-modal .order-info-card {
          flex-direction: row;
          text-align: left;
        }
        .order-details-modal .info-content {
          text-align: left;
          padding-left: 0;
          padding-right: 0;
        }
        .order-details-modal .info-label {
          text-align: left;
        }
        .order-details-modal .info-value {
          text-align: left;
        }
        .order-details-modal .order-items-section h4,
        .order-details-modal .order-comment-section h4,
        .order-details-modal .order-summary-section h4 {
          text-align: left;
        }
        .order-details-modal .order-detail-item {
          text-align: left;
        }
        .order-details-modal .item-header {
          flex-direction: row;
        }
        .order-details-modal .item-addons {
          text-align: left;
          padding-left: 20px;
          padding-right: 0;
        }
        .order-details-modal .summary-row {
          flex-direction: row;
          justify-content: space-between;
          text-align: left;
        }
        .order-details-modal .order-comment {
          flex-direction: row;
          text-align: left;
        }
        .order-details-modal .comment-icon {
          margin-right: 10px;
          margin-left: 0;
        }
        .order-details-modal .info-icon {
          margin-right: 10px;
          margin-left: 0;
        }
        .order-details-modal .order-details-modal-close {
          right: auto;
          left: 15px;
        }
        .order-details-modal .item-name-qty {
          text-align: left;
        }
        .order-details-modal .item-price {
          text-align: right;
        }
        .order-details-modal .item-quantity {
          margin-right: 0;
          margin-left: 10px;
        }
        .order-details-modal .addon-section-title {
          text-align: left;
        }
        .order-details-modal .addon-option {
          text-align: left;
        }
        .order-details-modal .no-items-message {
          text-align: center;
        }
        .order-details-modal .order-id-badge {
          margin-right: 0;
          margin-left: 8px;
        }
        .order-details-modal .status-badge {
          text-align: left;
        }
        .order-details-modal .item-notes {
          text-align: left;
          padding-left: 20px;
          padding-right: 0;
        }
        .order-details-modal .addon-name {
          text-align: left;
        }
        .order-details-modal .addon-price {
          text-align: right;
        }
      `;
      document.head.appendChild(style);
    } else {
      const existingLTRStyle = document.getElementById(
        "order-details-modal-ltr-style"
      );
      if (existingLTRStyle) {
        existingLTRStyle.remove();
      }
    }

    // Add to body
    document.body.appendChild(modalElement);

    // Add event listeners
    const closeButtons = modalElement.querySelectorAll(
      ".order-details-modal-close, .order-details-modal-backdrop"
    );
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeOrderDetailsModal();
      });
    });

    // Show modal with animation
    setTimeout(() => {
      modalElement.classList.add("show");
    }, 10);
  }

  // Close the order details modal
  function closeOrderDetailsModal() {
    const modal = document.getElementById("order-details-modal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
        const existingLTRStyle = document.getElementById(
          "order-details-modal-ltr-style"
        );
        if (existingLTRStyle) {
          existingLTRStyle.remove();
        }
        currentOrderDetailsModalData = null;
      }, 300);
    }
  }

  document.addEventListener("languageChanged", function () {
    if (!currentOrderDetailsModalData) {
      return;
    }
    const existingModal = document.getElementById("order-details-modal");
    if (!existingModal) {
      return;
    }
    existingModal.remove();
    const existingLTRStyle = document.getElementById(
      "order-details-modal-ltr-style"
    );
    if (existingLTRStyle) {
      existingLTRStyle.remove();
    }
    createOrderDetailsModal(currentOrderDetailsModalData);
  });

  // Helper function to show a toast notification
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "";
    switch (type) {
      case "success":
        icon = '<i class="fas fa-check-circle"></i>';
        break;
      case "error":
        icon = '<i class="fas fa-exclamation-circle"></i>';
        break;
      case "warning":
        icon = '<i class="fas fa-exclamation-triangle"></i>';
        break;
      case "loading":
        icon = '<i class="fas fa-spinner fa-spin"></i>';
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>';
    }

    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("show");
    }, 10);

    if (type !== "loading") {
      setTimeout(() => {
        hideToast(toast);
      }, 3000);
    }

    return toast;
  }

  // Helper function to hide a toast
  function hideToast(toast) {
    if (toast) {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  // Helper function to format date
  function formatDateString(date) {
    try {
      // Check if date is already a Date object, if not convert it
      if (!(date instanceof Date)) {
        date = new Date(date);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "تاريخ غير صالح";
      }

      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "تاريخ غير صالح";
    }
  }

  // Global variables for stats and chart
  // These variables are already declared at the top level
  // let salesChart = null;
  // let salesData = {
  //   labels: [],
  //   earnings: []
  // };

  // Initialize sales chart
  function initSalesChart() {
    const chartCanvas = document.getElementById("sales-chart");
    if (!chartCanvas) return;

    // Get the theme mode
    const isDarkMode = !document.body.classList.contains("light-mode");

    // Set up chart colors based on theme
    const themeColors = {
      gridColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      textColor: isDarkMode ? "#FFFFFF" : "#333333",
      gradient: {
        start: "rgba(66, 209, 88, 0.8)",
        end: "rgba(66, 209, 88, 0.1)",
      },
    };

    const ctx = chartCanvas.getContext("2d");

    // Create gradient for chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, themeColors.gradient.start);
    gradient.addColorStop(1, themeColors.gradient.end);

    // Enhanced options for more interactive charts
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
        includeInvisible: true,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
          titleColor: isDarkMode ? "#ffffff" : "#333333",
          bodyColor: isDarkMode ? "#cccccc" : "#666666",
          borderColor: isDarkMode ? "#333333" : "#eeeeee",
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function (context) {
              let value = context.raw;
              const currency = getCurrencyText();
              return `${value.toFixed(2)} ${currency}`;
            },
            title: function (tooltipItems) {
              return tooltipItems[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: themeColors.textColor,
            font: {
              family: "Cairo",
              size: 12,
            },
          },
        },
        y: {
          grid: {
            color: themeColors.gridColor,
          },
          ticks: {
            color: themeColors.textColor,
            font: {
              family: "Cairo",
              size: 12,
            },
            callback: function (value) {
              const currency = getCurrencyText();
              return value + " " + currency;
            },
          },
          beginAtZero: true,
        },
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
      hover: {
        animationDuration: 200,
      },
    };

    // Create chart
    salesChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: salesData.labels,
        datasets: [
          {
            label: getTranslation("salesRevenue") || "إيرادات المبيعات",
            data: salesData.earnings,
            backgroundColor: gradient,
            borderColor: "#42d158",
            borderWidth: 2,
            pointBackgroundColor: "#42d158",
            pointBorderColor: isDarkMode ? "#1e1e1e" : "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: chartOptions,
    });

    // Initialize chart-period-controls buttons
    initChartPeriodControls();

    // Add data summary cards if they don't exist
    addSalesDataSummaryCards();

    // Load initial data with fallback method
    try {
      // Try to use local orders data first
      if (orders && orders.length > 0) {
        generateWeeklySalesDataFromOrders();
      } else {
        // If no orders, generate sample data
        generateSampleSalesData();
      }
    } catch (error) {
      console.error("Error loading initial chart data:", error);
      // Fallback to sample data
      generateSampleSalesData();
    }
  }

  // Initialize chart period controls by adding event listeners to existing buttons
  function initChartPeriodControls() {
    const chartPeriodBtns = document.querySelectorAll(".chart-period-btn");
    if (!chartPeriodBtns.length) return;

    chartPeriodBtns.forEach((button) => {
      button.addEventListener("click", () => {
        // Reset the toast flag when changing periods
        resetNoSalesDataToast();

        // Update active state
        document
          .querySelectorAll(".chart-period-btn")
          .forEach((btn) => btn.classList.remove("active"));
        button.classList.add("active");

        // Load data for the selected period
        const period = button.dataset.period;
        if (period === "week") {
          generateSampleSalesData();
        } else if (period === "month") {
          generateMonthlyData();
        } else if (period === "quarter") {
          generateQuarterlyData();
        } else if (period === "year") {
          generateYearlyData();
        } else if (period === "custom") {
          showCustomDateRangeModal();
        }
      });
    });
  }

  // Generate monthly data
  function generateMonthlyData() {
    // Check if we have orders data first
    if (orders && orders.length > 0) {
      // Generate data for the last 30 days from real orders
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      salesData.labels = [];
      salesData.earnings = [];

      // Create 5 data points for different parts of the month (roughly weeks)
      for (let i = 0; i < 5; i++) {
        const weekStart = new Date(thirtyDaysAgo);
        weekStart.setDate(thirtyDaysAgo.getDate() + i * 6);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 5);

        // Get orders for this week
        const weekOrders = orders.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate >= weekStart && orderDate <= weekEnd;
        });

        // Calculate total earnings for the week
        const weekEarnings = weekOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0
        );

        const week = i + 1;
        salesData.labels.push(getTranslation(`week${week}`) || `أسبوع ${week}`);
        salesData.earnings.push(weekEarnings);
      }
    } else {
      // No orders data, show empty chart
      salesData.labels = [
        getTranslation("week1") || "أسبوع 1",
        getTranslation("week2") || "أسبوع 2",
        getTranslation("week3") || "أسبوع 3",
        getTranslation("week4") || "أسبوع 4",
        getTranslation("week5") || "أسبوع 5",
      ];
      salesData.earnings = [0, 0, 0, 0, 0];

      // Show notification only once
      if (!noSalesDataToastShown) {
        showToast(
          getTranslation("noMonthlyData") ||
            "لا توجد بيانات مبيعات للشهر الماضي",
          "info"
        );
        noSalesDataToastShown = true;
      }
    }

    updateSalesChart();
  }

  // Generate quarterly data
  function generateQuarterlyData() {
    const monthNames = [
      getTranslation("january") || "يناير",
      getTranslation("february") || "فبراير",
      getTranslation("march") || "مارس",
      getTranslation("april") || "أبريل",
      getTranslation("may") || "مايو",
      getTranslation("june") || "يونيو",
      getTranslation("july") || "يوليو",
      getTranslation("august") || "أغسطس",
      getTranslation("september") || "سبتمبر",
      getTranslation("october") || "أكتوبر",
      getTranslation("november") || "نوفمبر",
      getTranslation("december") || "ديسمبر",
    ];

    const currentMonth = new Date().getMonth();
    const quarterStart = Math.floor(currentMonth / 3) * 3;

    salesData.labels = [];
    salesData.earnings = [];

    // Check if we have orders data
    if (orders && orders.length > 0) {
      // Generate data for the 3 months in the current quarter from real orders
      const today = new Date();

      for (let i = 0; i < 3; i++) {
        const monthIndex = (quarterStart + i) % 12;
        salesData.labels.push(monthNames[monthIndex]);

        // Calculate start and end dates for this month
        const year = today.getFullYear();
        const monthStartDate = new Date(year, quarterStart + i, 1);
        const monthEndDate = new Date(year, quarterStart + i + 1, 0);

        // Get orders for this month
        const monthOrders = orders.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate >= monthStartDate && orderDate <= monthEndDate;
        });

        // Calculate total earnings for the month
        const monthEarnings = monthOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0
        );

        salesData.earnings.push(monthEarnings);
      }
    } else {
      // No orders data, show empty chart
      for (let i = 0; i < 3; i++) {
        const monthIndex = (quarterStart + i) % 12;
        salesData.labels.push(monthNames[monthIndex]);
        salesData.earnings.push(0);
      }

      // Show notification only once
      if (!noSalesDataToastShown) {
        showToast(
          getTranslation("noQuarterlyData") ||
            "لا توجد بيانات مبيعات للربع الحالي",
          "info"
        );
        noSalesDataToastShown = true;
      }
    }

    updateSalesChart();
  }

  // Generate yearly data
  function generateYearlyData() {
    const monthNames = [
      getTranslation("january") || "يناير",
      getTranslation("february") || "فبراير",
      getTranslation("march") || "مارس",
      getTranslation("april") || "أبريل",
      getTranslation("may") || "مايو",
      getTranslation("june") || "يونيو",
      getTranslation("july") || "يوليو",
      getTranslation("august") || "أغسطس",
      getTranslation("september") || "سبتمبر",
      getTranslation("october") || "أكتوبر",
      getTranslation("november") || "نوفمبر",
      getTranslation("december") || "ديسمبر",
    ];

    salesData.labels = [];
    salesData.earnings = [];

    // Check if we have orders data
    if (orders && orders.length > 0) {
      // Generate data for all 12 months from real orders
      const today = new Date();
      const currentYear = today.getFullYear();

      for (let i = 0; i < 12; i++) {
        salesData.labels.push(monthNames[i]);

        // Calculate start and end dates for this month
        const monthStartDate = new Date(currentYear, i, 1);
        const monthEndDate = new Date(currentYear, i + 1, 0);

        // Get orders for this month
        const monthOrders = orders.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate >= monthStartDate && orderDate <= monthEndDate;
        });

        // Calculate total earnings for the month
        const monthEarnings = monthOrders.reduce(
          (sum, order) => sum + (order.total || 0),
          0
        );

        salesData.earnings.push(monthEarnings);
      }
    } else {
      // No orders data, show empty chart
      for (let i = 0; i < 12; i++) {
        salesData.labels.push(monthNames[i]);
        salesData.earnings.push(0);
      }

      // Show notification only once
      if (!noSalesDataToastShown) {
        showToast(
          getTranslation("noYearlyData") ||
            "لا توجد بيانات مبيعات للسنة الحالية",
          "info"
        );
        noSalesDataToastShown = true;
      }
    }

    updateSalesChart();
  }

  // Update sales chart data with weekly sales data
  function updateSalesChartData(weeklySales) {
    if (!weeklySales || !Array.isArray(weeklySales)) {
      console.warn("Invalid weekly sales data:", weeklySales);
      generateSampleSalesData();
      return;
    }

    salesData.labels = weeklySales.map(
      (day) => day.day || day.label || day.date
    );
    salesData.earnings = weeklySales.map(
      (day) => day.earnings || day.value || day.amount || 0
    );

    updateSalesChart();
  }

  // Add a flag to track if the toast for missing sales data has been shown
  let noSalesDataToastShown = false;

  // Generate sample sales data for demonstration
  function generateSampleSalesData() {
    const daysOfWeek = [
      getTranslation("sunday") || "الأحد",
      getTranslation("monday") || "الإثنين",
      getTranslation("tuesday") || "الثلاثاء",
      getTranslation("wednesday") || "الأربعاء",
      getTranslation("thursday") || "الخميس",
      getTranslation("friday") || "الجمعة",
      getTranslation("saturday") || "السبت",
    ];
    const today = new Date().getDay();

    salesData.labels = [];
    salesData.earnings = [];

    // Check if we have orders data
    if (orders && orders.length > 0) {
      // Use generateWeeklySalesDataFromOrders instead
      generateWeeklySalesDataFromOrders();
      return;
    } else {
      // No orders data, show empty chart
      // Get labels for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const dayIndex = (today - i + 7) % 7;
        salesData.labels.push(daysOfWeek[dayIndex]);
        salesData.earnings.push(0);
      }

      // Show notification only once
      if (!noSalesDataToastShown) {
        showToast(
          getTranslation("noWeeklyData") ||
            "لا توجد بيانات مبيعات للأسبوع الماضي",
          "info"
        );
        noSalesDataToastShown = true;
      }
    }

    updateSalesChart();
    updateSalesDataSummaryCards();
  }

  // Generate weekly sales data from local orders
  function generateWeeklySalesDataFromOrders() {
    const daysOfWeek = [
      getTranslation("sunday") || "الأحد",
      getTranslation("monday") || "الإثنين",
      getTranslation("tuesday") || "الثلاثاء",
      getTranslation("wednesday") || "الأربعاء",
      getTranslation("thursday") || "الخميس",
      getTranslation("friday") || "الجمعة",
      getTranslation("saturday") || "السبت",
    ];
    const today = new Date();
    const dayOfWeek = today.getDay();

    salesData.labels = [];
    salesData.earnings = [];

    // Show loading state on chart
    const chartWrapper = document.querySelector(".sales-chart-wrapper");
    if (chartWrapper) {
      chartWrapper.classList.add("loading");
    }

    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // Get orders for this day
      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate >= date && orderDate < nextDate;
      });

      // Calculate total earnings for the day
      const dayEarnings = dayOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      // Add to chart data
      const dayIndex = (dayOfWeek - i + 7) % 7;
      salesData.labels.push(daysOfWeek[dayIndex]);
      salesData.earnings.push(dayEarnings);
    }

    // Add tooltip content with order count for each day
    salesData.tooltips = salesData.labels.map((label, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      // Get orders for this day
      const dayOrders = orders.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate.toDateString() === date.toDateString();
      });

      return {
        orderCount: dayOrders.length,
        formattedDate: formatDate(date),
      };
    });

    updateSalesChart();

    // Remove loading state from chart
    if (chartWrapper) {
      setTimeout(() => {
        chartWrapper.classList.remove("loading");
      }, 300);
    }
  }

  // Update the sales chart with current data
  function updateSalesChart() {
    if (!salesChart) {
      initSalesChart();
      return;
    }

    // If we actually have data, reset the flag since we might need to show the message again for other periods
    if (salesData.earnings && salesData.earnings.some((value) => value > 0)) {
      resetNoSalesDataToast();
    }

    // Apply animation to chart update
    const chartWrapper = document.querySelector(".sales-chart-wrapper");
    if (chartWrapper) {
      chartWrapper.classList.add("loading");
      setTimeout(() => {
        salesChart.data.labels = salesData.labels;
        salesChart.data.datasets[0].data = salesData.earnings;
        salesChart.update();
        chartWrapper.classList.remove("loading");
        updateSalesDataSummaryCards();
      }, 300);
    } else {
      salesChart.data.labels = salesData.labels;
      salesChart.data.datasets[0].data = salesData.earnings;
      salesChart.update();
      updateSalesDataSummaryCards();
    }
  }

  // Add data summary cards below the chart
  function addSalesDataSummaryCards() {
    const container = document.querySelector(".sales-chart-container");
    if (!container) return;

    // Check if cards already exist
    if (container.querySelector(".chart-data-summary")) return;

    // Get currency symbol from translations
    const currencySymbol = getTranslation("currencySymbol") || "جنية";

    // Create summary cards container
    const summaryContainer = document.createElement("div");
    summaryContainer.className = "chart-data-summary";

    // Create data cards
    const cards = [
      {
        id: "total-sales",
        titleKey: "totalSales",
        title: getTranslation("totalSales") || "إجمالي المبيعات",
        value: "0",
        change: { value: "0%", isPositive: true },
        icon: "fa-chart-line",
      },
      {
        id: "avg-sale",
        titleKey: "avgSale",
        title: getTranslation("avgSale") || "متوسط المبيعات",
        value: "0",
        change: { value: "0%", isPositive: true },
        icon: "fa-calculator",
      },
      {
        id: "highest-day",
        titleKey: "highestDay",
        title: getTranslation("highestDay") || "أعلى يوم مبيعات",
        value: "الأحد",
        change: { value: `0.00 ${currencySymbol}`, isPositive: true },
        icon: "fa-arrow-up",
      },
    ];

    cards.forEach((card) => {
      const cardElement = document.createElement("div");
      cardElement.className = "chart-data-card";
      cardElement.id = card.id;

      cardElement.innerHTML = `
        <div class="data-card-title">
          <i class="fas ${card.icon}"></i> <span data-i18n="${card.titleKey}">${
        card.title
      }</span>
        </div>
        <div class="data-card-value">${card.value}</div>
        <div class="data-card-change ${
          card.change.isPositive ? "positive" : "negative"
        }">
          <i class="fas ${
            card.change.isPositive ? "fa-arrow-up" : "fa-arrow-down"
          }"></i>
          ${card.change.value}
        </div>
      `;

      summaryContainer.appendChild(cardElement);
    });

    // Append cards to container
    container.appendChild(summaryContainer);
  }

  // Update data in summary cards
  function updateSalesDataSummaryCards() {
    if (!salesData || !salesData.earnings || salesData.earnings.length === 0)
      return;

    // Get currency symbol from global settings
    const currencySymbol = getCurrencyText();

    // Calculate summary statistics
    const totalSales = salesData.earnings.reduce(
      (sum, value) => sum + value,
      0
    );
    const avgSale = totalSales / salesData.earnings.length;

    // Find highest day
    let highestValue = 0;
    let highestDay = "";
    salesData.earnings.forEach((value, index) => {
      if (value > highestValue) {
        highestValue = value;
        highestDay = salesData.labels[index];
      }
    });

    // Calculate percent change (comparing first and last value)
    const firstValue = salesData.earnings[0];
    const lastValue = salesData.earnings[salesData.earnings.length - 1];
    const percentChange =
      firstValue === 0
        ? lastValue > 0
          ? 100
          : 0
        : ((lastValue - firstValue) / firstValue) * 100;
    const isPositive = percentChange >= 0;

    // Update card values with animation
    const totalSalesCard = document.getElementById("total-sales");
    const avgSaleCard = document.getElementById("avg-sale");
    const highestDayCard = document.getElementById("highest-day");

    if (totalSalesCard) {
      const valueElement = totalSalesCard.querySelector(".data-card-value");
      const changeElement = totalSalesCard.querySelector(".data-card-change");

      // Add animation class
      valueElement.classList.add("chart-data-update-animation");
      changeElement.classList.add("chart-data-update-animation");

      // Format values
      valueElement.textContent =
        totalSales.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,") +
        " " +
        currencySymbol;
      changeElement.className = `data-card-change ${
        isPositive ? "positive" : "negative"
      }`;
      changeElement.innerHTML = `<i class="fas ${
        isPositive ? "fa-arrow-up" : "fa-arrow-down"
      }"></i> ${Math.abs(percentChange).toFixed(1)}%`;

      // Remove animation class after animation completes
      setTimeout(() => {
        valueElement.classList.remove("chart-data-update-animation");
        changeElement.classList.remove("chart-data-update-animation");
      }, 600);
    }

    if (avgSaleCard) {
      const valueElement = avgSaleCard.querySelector(".data-card-value");
      const changeElement = avgSaleCard.querySelector(".data-card-change");

      valueElement.classList.add("chart-data-update-animation");
      changeElement.classList.add("chart-data-update-animation");

      valueElement.textContent =
        avgSale.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,") +
        " " +
        currencySymbol;

      // Calculate percent change in average sale
      const firstAvg = firstValue / (salesData.labels.length > 0 ? 1 : 1);
      const lastAvg = lastValue / (salesData.labels.length > 0 ? 1 : 1);
      const avgPercentChange =
        firstAvg === 0
          ? lastAvg > 0
            ? 100
            : 0
          : ((lastAvg - firstAvg) / firstAvg) * 100;
      const isAvgPositive = avgPercentChange >= 0;

      changeElement.className = `data-card-change ${
        isAvgPositive ? "positive" : "negative"
      }`;
      changeElement.innerHTML = `<i class="fas ${
        isAvgPositive ? "fa-arrow-up" : "fa-arrow-down"
      }"></i> ${Math.abs(avgPercentChange).toFixed(1)}%`;

      setTimeout(() => {
        valueElement.classList.remove("chart-data-update-animation");
        changeElement.classList.remove("chart-data-update-animation");
      }, 600);
    }

    if (highestDayCard) {
      const valueElement = highestDayCard.querySelector(".data-card-value");
      const changeElement = highestDayCard.querySelector(".data-card-change");

      valueElement.classList.add("chart-data-update-animation");
      changeElement.classList.add("chart-data-update-animation");

      valueElement.textContent = highestDay;
      changeElement.innerHTML = `<i class="fas fa-coins"></i> ${highestValue
        .toFixed(2)
        .replace(/\d(?=(\d{3})+\.)/g, "$&,")} ${currencySymbol}`;

      setTimeout(() => {
        valueElement.classList.remove("chart-data-update-animation");
        changeElement.classList.remove("chart-data-update-animation");
      }, 600);
    }
  }

  // Initialize all functions
  window.addEventListener("DOMContentLoaded", async () => {
    try {
      // Get DOM references - use the already declared variables instead of redeclaring them
      if (!totalEarningsElement)
        totalEarningsElement = document.getElementById("total-earnings");
      if (!totalOrdersElement)
        totalOrdersElement = document.getElementById("total-orders");
      if (!totalProductsElement)
        totalProductsElement = document.getElementById("total-products");
      if (!totalVouchersElement)
        totalVouchersElement = document.getElementById("total-vouchers");

      // Only initialize components that weren't already initialized
      if (
        typeof initSidebarToggle === "function" &&
        !document.querySelector(".sidebar-initialized")
      ) {
        initSidebarToggle();
      }

      if (typeof initImageHandling === "function") {
        initImageHandling();
      }

      if (typeof initQRCodeGenerator === "function") {
        initQRCodeGenerator();
      }

      if (
        typeof initProductAddons === "function" &&
        !document.querySelector(".addons-initialized")
      ) {
        initProductAddons();
      }

      // Apply theme if not already done
      if (
        typeof applyThemeFromStorage === "function" &&
        !document.body.classList.contains("theme-applied")
      ) {
        applyThemeFromStorage();
        document.body.classList.add("theme-applied");
      }

      // Fetch data and render components
      if (typeof initData === "function") {
        await initData();
      }

      if (typeof loadProducts === "function") {
        await loadProducts();
      }

      if (typeof loadOrders === "function") {
        await loadOrders();
      }

      if (typeof loadVouchers === "function") {
        loadVouchers();
      }

      if (typeof loadTaxSettings === "function") {
        loadTaxSettings();
      }

      if (typeof updateStats === "function") {
        updateStats();
      }

      // Initialize sales chart after data is loaded
      if (typeof initSalesChart === "function" && !salesChart) {
        initSalesChart();
      }

      // Add reset stats button event if not already added
      const resetStatsButton = document.getElementById("reset-stats");
      if (
        resetStatsButton &&
        typeof confirmResetStats === "function" &&
        !resetStatsButton.hasEventListener
      ) {
        resetStatsButton.addEventListener("click", confirmResetStats);
        resetStatsButton.hasEventListener = true;
      }
    } catch (error) {
      console.error("Error initializing admin page:", error);
      if (typeof showToast === "function") {
        showToast("حدث خطأ أثناء تحميل الصفحة", "error");
      }
    }

    // Initialize products submenu toggle
    const productsTab = document.getElementById("products-tab");
    if (productsTab) {
      productsTab.addEventListener("click", function (e) {
        // Toggle submenu
        const submenu = document.getElementById("products-submenu");
        if (submenu) {
          submenu.classList.toggle("show");
        }
      });
    }

    // Handle products submenu clicks
    const productsSubtabs = document.querySelectorAll(
      "#products-submenu .admin-subtab"
    );
    productsSubtabs.forEach((subtab) => {
      subtab.addEventListener("click", function (e) {
        e.preventDefault();
        const targetSection = this.getAttribute("data-target");

        // Remove active class from all products subtabs
        productsSubtabs.forEach((st) => st.classList.remove("active"));

        // Add active class to clicked subtab
        this.classList.add("active");

        // Hide all sections
        const sections = document.querySelectorAll(".admin-section");
        sections.forEach((section) => {
          section.style.display = "none";
        });

        // Show the target section
        const sectionElement = document.getElementById(targetSection);
        if (sectionElement) {
          sectionElement.style.display = "block";
        }

        // Close sidebar on mobile after clicking subtab
        if (window.innerWidth <= 1140) {
          document.body.classList.remove("sidebar-expanded");
          localStorage.setItem("sidebarExpanded", "false");
        }

        // Scroll to top
        window.scrollTo(0, 0);
      });
    });

    // Initialize submenu mode toggle
    const submenuModeToggle = document.getElementById("submenu-mode-toggle");
    const submenuModeEnabled =
      localStorage.getItem("submenuModeEnabled") !== "false"; // Default is true

    // Apply saved preference
    applySubmenuMode(submenuModeEnabled);

    if (submenuModeToggle) {
      submenuModeToggle.addEventListener("click", function () {
        const currentMode =
          localStorage.getItem("submenuModeEnabled") !== "false";
        const newMode = !currentMode;

        localStorage.setItem("submenuModeEnabled", newMode);
        applySubmenuMode(newMode);

        // Show notification
        if (typeof showToast === "function") {
          const message = newMode
            ? "Submenu mode enabled"
            : "Submenu mode disabled";
          showToast(message, "success");
        }
      });
    }
  });

  // Function to apply submenu mode
  function applySubmenuMode(enabled) {
    const submenuModeToggle = document.getElementById("submenu-mode-toggle");
    const productsTab = document.getElementById("products-tab");
    const globalSettingsTab = document.getElementById("global-settings-tab");
    const productsSubmenu = document.getElementById("products-submenu");
    const globalSettingsSubmenu = document.getElementById(
      "global-settings-submenu"
    );
    const standaloneTabs = document.querySelectorAll(".standalone-tab");
    const toggleableSubtabs = document.querySelectorAll(".toggleable-subtab");

    if (enabled) {
      // Enable submenu mode
      if (submenuModeToggle) submenuModeToggle.classList.add("active");

      // Show submenus and add has-submenu class
      if (productsTab) productsTab.classList.add("has-submenu");
      if (globalSettingsTab) globalSettingsTab.classList.add("has-submenu");
      if (productsSubmenu) productsSubmenu.style.display = "";
      if (globalSettingsSubmenu) globalSettingsSubmenu.style.display = "";

      // Show toggleable items in submenus
      toggleableSubtabs.forEach((subtab) => {
        subtab.style.display = "";
      });

      // Hide standalone tabs
      standaloneTabs.forEach((tab) => {
        tab.style.display = "none";
      });
    } else {
      // Disable submenu mode
      if (submenuModeToggle) submenuModeToggle.classList.remove("active");

      // Products tab: remove has-submenu class and hide submenu completely
      if (productsTab) productsTab.classList.remove("has-submenu");
      if (productsSubmenu) {
        productsSubmenu.classList.remove("show");
        productsSubmenu.style.display = "none";
      }

      // Global Settings: keep submenu visible but remove has-submenu class
      if (globalSettingsTab) globalSettingsTab.classList.remove("has-submenu");
      if (globalSettingsSubmenu) globalSettingsSubmenu.classList.remove("show");

      // Hide toggleable subtabs within submenus
      toggleableSubtabs.forEach((subtab) => {
        subtab.style.display = "none";
      });

      // Show standalone tabs
      standaloneTabs.forEach((tab) => {
        tab.style.display = "block";
      });
    }
  }

  // Load sales data from database based on period or date range
  async function loadSalesDataFromDatabase(periodOrStartDate, endDate = null) {
    try {
      // Get chart wrapper element
      const chartWrapper = document.querySelector(".sales-chart-wrapper");
      if (chartWrapper) {
        // Show loading indicator
        chartWrapper.classList.add("loading");
      }

      // Use local data generation instead of API calls
      if (orders && orders.length > 0) {
        // If we have orders, generate data from them
        if (endDate) {
          // Custom date range
          generateCustomDateRangeData(periodOrStartDate, endDate);
        } else if (periodOrStartDate === "week") {
          generateWeeklySalesDataFromOrders();
        } else if (periodOrStartDate === "month") {
          generateMonthlyData();
        } else if (periodOrStartDate === "quarter") {
          generateQuarterlyData();
        } else if (periodOrStartDate === "year") {
          generateYearlyData();
        } else {
          // Default to weekly
          generateWeeklySalesDataFromOrders();
        }
        console.log("Generated sales data from local orders");
      } else {
        // No orders, show empty chart with appropriate time period
        if (endDate) {
          // Custom date range
          generateCustomDateRangeData(periodOrStartDate, endDate);
        } else if (periodOrStartDate === "week") {
          generateSampleSalesData(); // This now shows empty chart
        } else if (periodOrStartDate === "month") {
          generateMonthlyData();
        } else if (periodOrStartDate === "quarter") {
          generateQuarterlyData();
        } else if (periodOrStartDate === "year") {
          generateYearlyData();
        } else {
          // Default to weekly
          generateSampleSalesData(); // This now shows empty chart
        }
        console.log("Generated empty sales chart - no orders data available");
      }

      // Hide loading indicator
      if (chartWrapper) {
        chartWrapper.classList.remove("loading");
      }
    } catch (error) {
      console.error("Error loading sales data:", error);

      // Hide loading indicator
      const chartWrapper = document.querySelector(".sales-chart-wrapper");
      if (chartWrapper) {
        chartWrapper.classList.remove("loading");
      }

      // Show error notification
      showToast("حدث خطأ أثناء تحميل بيانات المبيعات", "error");
    }
  }

  // Show custom date range modal for sales chart
  function showCustomDateRangeModal() {
    const modal = document.getElementById("date-range-modal");
    if (!modal) return;

    // Set default dates (last 7 days)
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");

    if (startDateInput && endDateInput) {
      startDateInput.value = formatDateForInput(lastWeek);
      endDateInput.value = formatDateForInput(today);
    }

    // Activate the 7-day preset button by default
    const weekBtn = modal.querySelector('.preset-btn[data-days="7"]');
    if (weekBtn) {
      modal
        .querySelectorAll(".preset-btn")
        .forEach((btn) => btn.classList.remove("active"));
      weekBtn.classList.add("active");
    }

    // Show modal
    modal.style.display = "flex";
    setTimeout(() => {
      modal.classList.add("show");
    }, 10);

    // Add event listeners to preset buttons
    setupDateRangeModalEvents(modal);
  }

  // Setup date range modal event listeners
  function setupDateRangeModalEvents(modal) {
    // Get form elements
    const startDateInput = document.getElementById("start-date");
    const endDateInput = document.getElementById("end-date");
    const presetButtons = modal.querySelectorAll(".preset-btn");
    const applyButton = document.getElementById("apply-date-range");
    const cancelButton = document.getElementById("cancel-date-range");
    const closeButton = modal.querySelector(".close-modal");
    const customRangeMessage = modal.querySelector(".custom-range-message");

    // Add event listeners to preset buttons
    presetButtons.forEach((btn) => {
      btn.addEventListener("click", function () {
        // Remove active class from all buttons
        presetButtons.forEach((b) => b.classList.remove("active"));

        // Add active class to clicked button
        this.classList.add("active");

        // Get days from data attribute
        const days = parseInt(this.getAttribute("data-days"));

        // Calculate start and end dates
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - days);

        // Update date inputs
        startDateInput.value = formatDateForInput(startDate);
        endDateInput.value = formatDateForInput(today);

        // Show custom range message
        if (customRangeMessage) {
          customRangeMessage.classList.add("show");
        }
      });
    });

    // Apply button click
    if (applyButton) {
      applyButton.addEventListener("click", function () {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        // Validate dates
        if (!startDate || !endDate) {
          showToast("يرجى تحديد تاريخ البداية والنهاية", "error");
          return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ensure start date is not after end date
        if (start > end) {
          showToast("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية", "error");
          return;
        }

        // Close the modal
        closeDateRangeModal();

        // Load data for custom date range
        loadSalesDataFromDatabase(startDate, endDate);
      });
    }

    // Cancel button click
    if (cancelButton) {
      cancelButton.addEventListener("click", closeDateRangeModal);
    }

    // Close button click
    if (closeButton) {
      closeButton.addEventListener("click", closeDateRangeModal);
    }

    // Date inputs change event
    if (startDateInput && endDateInput) {
      startDateInput.addEventListener("change", showCustomRangeMessage);
      endDateInput.addEventListener("change", showCustomRangeMessage);
    }
  }

  // Show custom range message
  function showCustomRangeMessage() {
    const customRangeMessage = document.querySelector(".custom-range-message");
    if (customRangeMessage) {
      customRangeMessage.classList.add("show");
    }
  }

  // Close date range modal
  function closeDateRangeModal() {
    const modal = document.getElementById("date-range-modal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";

        // Reset custom range message
        const customRangeMessage = modal.querySelector(".custom-range-message");
        if (customRangeMessage) {
          customRangeMessage.classList.remove("show");
        }
      }, 300);
    }
  }

  // Generate data for custom date range
  function generateCustomDateRangeData(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Calculate the difference in days
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    salesData.labels = [];
    salesData.earnings = [];

    // Check if we have orders data
    if (orders && orders.length > 0) {
      // Determine how to display the data based on date range length
      if (diffDays <= 14) {
        // For short ranges, show each day
        for (let i = 0; i <= diffDays; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);

          // Get orders for this day
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          const dayOrders = orders.filter((order) => {
            const orderDate = new Date(order.date);
            return orderDate >= dayStart && orderDate <= dayEnd;
          });

          // Calculate total earnings for the day
          const dayEarnings = dayOrders.reduce(
            (sum, order) => sum + (order.total || 0),
            0
          );

          salesData.labels.push(formatDate(currentDate));
          salesData.earnings.push(dayEarnings);
        }
      } else if (diffDays <= 90) {
        // For medium ranges, group by weeks
        const numWeeks = Math.ceil(diffDays / 7);

        for (let i = 0; i < numWeeks; i++) {
          const weekStartDate = new Date(startDate);
          weekStartDate.setDate(startDate.getDate() + i * 7);

          const weekEndDate = new Date(weekStartDate);
          weekEndDate.setDate(weekStartDate.getDate() + 6);

          // Ensure we don't go beyond the endDate
          const actualEndDate = weekEndDate > endDate ? endDate : weekEndDate;

          // Get orders for this week
          const weekOrders = orders.filter((order) => {
            const orderDate = new Date(order.date);
            return orderDate >= weekStartDate && orderDate <= actualEndDate;
          });

          // Calculate total earnings for the week
          const weekEarnings = weekOrders.reduce(
            (sum, order) => sum + (order.total || 0),
            0
          );

          const weekLabel = `${formatDate(weekStartDate)} - ${formatDate(
            actualEndDate
          )}`;
          salesData.labels.push(weekLabel);
          salesData.earnings.push(weekEarnings);

          // Break if we've gone beyond the end date
          if (weekStartDate > endDate) break;
        }
      } else {
        // For long ranges, group by months
        const months = [];
        let currentDate = new Date(startDate);

        // Create array of months in the range
        while (currentDate <= endDate) {
          const monthYear = `${currentDate.getMonth()}-${currentDate.getFullYear()}`;
          if (!months.includes(monthYear)) {
            months.push(monthYear);
          }

          // Move to next month
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Generate data for each month
        const monthNames = [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ];

        months.forEach((monthYear, index) => {
          const [month, year] = monthYear.split("-").map(Number);

          // Calculate start and end dates for this month
          const monthStartDate = new Date(year, month, 1);
          const monthEndDate = new Date(year, month + 1, 0);

          // Adjust for the actual date range
          const actualStartDate =
            monthStartDate < startDate ? startDate : monthStartDate;
          const actualEndDate = monthEndDate > endDate ? endDate : monthEndDate;

          // Get orders for this month
          const monthOrders = orders.filter((order) => {
            const orderDate = new Date(order.date);
            return orderDate >= actualStartDate && orderDate <= actualEndDate;
          });

          // Calculate total earnings for the month
          const monthEarnings = monthOrders.reduce(
            (sum, order) => sum + (order.total || 0),
            0
          );

          const monthName = `${monthNames[month]} ${year}`;
          salesData.labels.push(monthName);
          salesData.earnings.push(monthEarnings);
        });
      }
    } else {
      // No orders data, show empty chart with appropriate intervals
      if (diffDays <= 14) {
        // For short ranges, show each day
        for (let i = 0; i <= diffDays; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          salesData.labels.push(formatDate(currentDate));
          salesData.earnings.push(0);
        }
      } else if (diffDays <= 90) {
        // For medium ranges, group by weeks
        const numWeeks = Math.ceil(diffDays / 7);
        for (let i = 0; i < numWeeks; i++) {
          const weekStartDate = new Date(startDate);
          weekStartDate.setDate(startDate.getDate() + i * 7);
          const weekEndDate = new Date(weekStartDate);
          weekEndDate.setDate(weekStartDate.getDate() + 6);
          const actualEndDate = weekEndDate > endDate ? endDate : weekEndDate;
          const weekLabel = `${formatDate(weekStartDate)} - ${formatDate(
            actualEndDate
          )}`;
          salesData.labels.push(weekLabel);
          salesData.earnings.push(0);
          if (weekStartDate > endDate) break;
        }
      } else {
        // For long ranges, group by months
        const months = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const monthYear = `${currentDate.getMonth()}-${currentDate.getFullYear()}`;
          if (!months.includes(monthYear)) {
            months.push(monthYear);
          }
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        const monthNames = [
          "يناير",
          "فبراير",
          "مارس",
          "أبريل",
          "مايو",
          "يونيو",
          "يوليو",
          "أغسطس",
          "سبتمبر",
          "أكتوبر",
          "نوفمبر",
          "ديسمبر",
        ];

        months.forEach((monthYear) => {
          const [month, year] = monthYear.split("-").map(Number);
          const monthName = `${monthNames[month]} ${year}`;
          salesData.labels.push(monthName);
          salesData.earnings.push(0);
        });
      }

      // Show notification
      showToast("لا توجد بيانات مبيعات للفترة المحددة", "info");
    }

    updateSalesChart();
  }

  // Analyze orders to determine crowded hours
  function analyzeCrowdedHours() {
    // Return early if no orders
    if (!orders || orders.length === 0) {
      return {
        hourCounts: {},
        mostCrowdedHour: null,
        mostCrowdedHourCount: 0,
        hourlyData: [],
      };
    }

    // Initialize hour counters
    const hourCounts = {};
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = 0;
    }

    // Count orders by hour
    orders.forEach((order) => {
      if (order.date) {
        const orderDate = new Date(order.date);
        const hour = orderDate.getHours();
        hourCounts[hour]++;
      }
    });

    // Find most crowded hour
    let mostCrowdedHour = 0;
    let mostCrowdedHourCount = 0;

    for (let hour = 0; hour < 24; hour++) {
      if (hourCounts[hour] > mostCrowdedHourCount) {
        mostCrowdedHourCount = hourCounts[hour];
        mostCrowdedHour = hour;
      }
    }

    // Format data for chart
    const hourlyData = [];
    for (let hour = 0; hour < 24; hour++) {
      // Get current language
      const currentLang = localStorage.getItem("admin-language") || "ar";

      // Format hour for display (12-hour format with AM/PM)
      let displayHour;
      if (currentLang === "ar") {
        // Arabic format
        if (hour === 0) {
          displayHour = "12 ص";
        } else if (hour < 12) {
          displayHour = `${hour} ص`;
        } else if (hour === 12) {
          displayHour = "12 م";
        } else {
          displayHour = `${hour - 12}:00 م`;
        }
      } else {
        // English format
        if (hour === 0) {
          displayHour = "12:00 AM";
        } else if (hour < 12) {
          displayHour = `${hour}:00 AM`;
        } else if (hour === 12) {
          displayHour = "12:00 PM";
        } else {
          displayHour = `${hour - 12}:00 PM`;
        }
      }

      hourlyData.push({
        hour: hour,
        displayHour: displayHour,
        count: hourCounts[hour],
      });
    }

    return {
      hourCounts,
      mostCrowdedHour,
      mostCrowdedHourCount,
      hourlyData,
    };
  }

  // Create and render crowded hours chart
  function createCrowdedHoursChart() {
    // Find the dashboard section to add our chart
    const dashboardSection = document.getElementById("dashboard-section");
    if (!dashboardSection) return;

    // Check if chart already exists
    if (document.getElementById("crowded-hours-container")) return;

    // Create container
    const container = document.createElement("div");
    container.id = "crowded-hours-container";
    container.className = "chart-container crowded-hours-container";

    // Add title
    const titleDiv = document.createElement("div");
    titleDiv.className = "summary-title";
    const currentLang = localStorage.getItem("admin-language") || "ar";
    titleDiv.innerHTML = `<i class="fas fa-clock"></i> <span data-i18n="crowdedHoursTitle">${
      currentLang === "ar" ? "ساعات الذروة" : "Peak Hours"
    }</span>`;
    container.appendChild(titleDiv);

    // Create chart wrapper
    const chartWrapper = document.createElement("div");
    chartWrapper.className = "crowded-hours-chart-wrapper";

    // Create canvas for chart
    const canvas = document.createElement("canvas");
    canvas.id = "crowded-hours-chart";
    canvas.height = 200;
    chartWrapper.appendChild(canvas);
    container.appendChild(chartWrapper);

    // Create most crowded hour display
    const mostCrowdedHourDiv = document.createElement("div");
    mostCrowdedHourDiv.className = "most-crowded-hour";
    mostCrowdedHourDiv.innerHTML =
      '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i></div>';
    container.appendChild(mostCrowdedHourDiv);

    // Add container to dashboard
    const salesChartContainer = document.querySelector(
      ".sales-chart-container"
    );
    if (salesChartContainer) {
      // Insert after sales chart
      salesChartContainer.parentNode.insertBefore(
        container,
        salesChartContainer.nextSibling
      );
    } else {
      // Fallback - add to end of dashboard
      dashboardSection.appendChild(container);
    }

    // Render chart data
    renderCrowdedHoursChart();
  }

  // Render crowded hours chart with data
  function renderCrowdedHoursChart() {
    const canvas = document.getElementById("crowded-hours-chart");
    if (!canvas) return;

    // Get crowded hours data
    const crowdedHoursData = analyzeCrowdedHours();

    // Update most crowded hour display
    updateMostCrowdedHourDisplay(crowdedHoursData);

    // Get the theme mode
    const isDarkMode = !document.body.classList.contains("light-mode");

    // Set up chart colors based on theme
    const themeColors = {
      gridColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      textColor: isDarkMode ? "#FFFFFF" : "#333333",
      barColor: "rgba(66, 209, 88, 0.7)",
      barBorderColor: "rgba(66, 209, 88, 1)",
      highlightBarColor: "rgba(255, 159, 64, 0.7)",
      highlightBarBorderColor: "rgba(255, 159, 64, 1)",
    };

    // Prepare data for chart
    const labels = crowdedHoursData.hourlyData.map((h) => h.displayHour);
    const data = crowdedHoursData.hourlyData.map((h) => h.count);

    // Prepare background colors - highlight the most crowded hour
    const backgroundColor = data.map((count, index) => {
      return index === crowdedHoursData.mostCrowdedHour
        ? themeColors.highlightBarColor
        : themeColors.barColor;
    });

    const borderColor = data.map((count, index) => {
      return index === crowdedHoursData.mostCrowdedHour
        ? themeColors.highlightBarBorderColor
        : themeColors.barBorderColor;
    });

    // Create chart
    const ctx = canvas.getContext("2d");
    if (window.crowdedHoursChart) {
      window.crowdedHoursChart.destroy();
    }

    // Get current language for label
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const datasetLabel = currentLang === "ar" ? "عدد الطلبات" : "Orders Count";

    window.crowdedHoursChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: datasetLabel,
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: themeColors.gridColor,
            },
            ticks: {
              color: themeColors.textColor,
              font: {
                family: "Cairo",
                size: 12,
              },
              precision: 0,
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: themeColors.textColor,
              font: {
                family: "Cairo",
                size: 10,
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff",
            titleColor: isDarkMode ? "#ffffff" : "#333333",
            bodyColor: isDarkMode ? "#cccccc" : "#666666",
            borderColor: isDarkMode ? "#333333" : "#eeeeee",
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                const count = context.raw;
                const currentLang =
                  localStorage.getItem("admin-language") || "ar";
                return currentLang === "ar"
                  ? `عدد الطلبات: ${count}`
                  : `Orders: ${count}`;
              },
            },
          },
        },
      },
    });
  }

  // Update the most crowded hour display
  function updateMostCrowdedHourDisplay(crowdedHoursData) {
    const displayElement = document.querySelector(".most-crowded-hour");
    if (!displayElement) return;

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";

    if (!crowdedHoursData || crowdedHoursData.mostCrowdedHourCount === 0) {
      const noDataMessage =
        currentLang === "ar"
          ? "لا توجد بيانات كافية لتحديد ساعات الذروة"
          : "Not enough data to determine peak hours";

      displayElement.innerHTML = `
        <div class="no-data-message">
          <i class="fas fa-info-circle"></i>
          <p>${noDataMessage}</p>
        </div>
      `;
      return;
    }

    // Format the most crowded hour for display
    let hourDisplay;
    const hour = crowdedHoursData.mostCrowdedHour;

    if (currentLang === "ar") {
      // Arabic format
      if (hour === 0) {
        hourDisplay = "12:00 ص";
      } else if (hour < 12) {
        hourDisplay = `${hour}:00 ص`;
      } else if (hour === 12) {
        hourDisplay = "12:00 م";
      } else {
        hourDisplay = `${hour - 12}:00 م`;
      }
    } else {
      // English format
      if (hour === 0) {
        hourDisplay = "12:00 AM";
      } else if (hour < 12) {
        hourDisplay = `${hour}:00 AM`;
      } else if (hour === 12) {
        hourDisplay = "12:00 PM";
      } else {
        hourDisplay = `${hour - 12}:00 PM`;
      }
    }

    // Get translation for labels
    const peakHourLabel = currentLang === "ar" ? "ساعة الذروة" : "Peak Hour";
    const ordersCountLabel =
      currentLang === "ar" ? "عدد الطلبات" : "Orders Count";

    // Create HTML for the display
    displayElement.innerHTML = `
      <div class="crowded-hour-info">
        <div class="info-label">${peakHourLabel}</div>
        <div class="info-value">${hourDisplay}</div>
      </div>
      <div class="crowded-hour-count">
        <div class="info-label">${ordersCountLabel}</div>
        <div class="info-value">${crowdedHoursData.mostCrowdedHourCount}</div>
      </div>
    `;
  }

  // Function to load and display best products
  async function loadBestProducts() {
    try {
      const spinner = document.getElementById("best-products-spinner");
      const productsList = document.getElementById("best-products-list");
      const emptyMessage = document.getElementById("empty-best-products");

      if (!spinner || !productsList || !emptyMessage) {
        console.error("[DEBUG] Best products UI elements not found");
        return;
      }

      // Show spinner
      spinner.style.display = "flex";
      productsList.style.display = "none";
      emptyMessage.style.display = "none";

      // Get most ordered products from API
      const apiService = new ApiService();
      let products = [];
      let apiError = false;

      try {
        console.log("[DEBUG] Attempting to load best products from API");

        // First try to get orders to ensure we have real data
        const ordersResponse = await apiService.request(
          "orders?limit=100",
          "GET"
        );
        if (
          !ordersResponse.success ||
          !ordersResponse.data ||
          ordersResponse.data.length === 0
        ) {
          console.warn(
            "[DEBUG] No orders found in database, cannot calculate most ordered products"
          );
          throw new Error("No orders found in database");
        }

        // Get the most ordered products data
        const mostOrderedProducts = await apiService.getMostOrderedProducts(10); // Request more to account for possible duplicates
        console.log(
          "[DEBUG] API response for most ordered products:",
          mostOrderedProducts
        );

        if (!mostOrderedProducts || mostOrderedProducts.length === 0) {
          console.warn("[DEBUG] No most ordered products returned from API");
          throw new Error("No most ordered products returned from API");
        }

        // Get all products to match IDs correctly and get complete product info
        const allProductsResponse = await apiService.getProducts();
        const allProducts = allProductsResponse.success
          ? allProductsResponse.data
          : [];
        console.log("[DEBUG] All products fetched:", allProducts.length);

        if (!allProducts || allProducts.length === 0) {
          console.warn("[DEBUG] No products found in database");
          throw new Error("No products found in database");
        }

        // Process each most ordered product
        let processedProducts = mostOrderedProducts.map((orderedProduct) => {
          // Try to find the matching product in the complete products list
          // This is needed because the ID formats might be different
          const matchingProduct = allProducts.find(
            (p) =>
              // Try to match by ID first
              p.id === orderedProduct.id ||
              // Then by name as fallback
              p.name === orderedProduct.name
          );

          if (matchingProduct) {
            console.log(
              `[DEBUG] Found matching product for ${orderedProduct.name}`
            );
            const catalogArabicName =
              matchingProduct.name || orderedProduct.name;
            const catalogEnglishName =
              matchingProduct.nameEn && matchingProduct.nameEn.trim() !== ""
                ? matchingProduct.nameEn
                : orderedProduct.nameEn || orderedProduct.name;
            // Merge the order data with complete product details
            return {
              ...orderedProduct,
              name: catalogArabicName,
              nameEn: catalogEnglishName,
              image: matchingProduct.image, // Use the image from product details
              description: matchingProduct.description,
              descriptionEn: matchingProduct.descriptionEn, // Include English description
              category: matchingProduct.category,
              // Add a normalized name for deduplication
              normalizedName: orderedProduct.name.toLowerCase().trim(),
            };
          }

          // If no match found, just use the ordered product data as is
          console.log(
            `[DEBUG] No matching product found for ${orderedProduct.name}`
          );
          return {
            ...orderedProduct,
            normalizedName: orderedProduct.name.toLowerCase().trim(),
          };
        });

        // Deduplicate products with the same name
        // Keep only the first occurrence (highest ordered)
        const seenNames = new Set();
        processedProducts = processedProducts.filter((product) => {
          if (seenNames.has(product.normalizedName)) {
            console.log(`[DEBUG] Removing duplicate product: ${product.name}`);
            return false;
          }
          seenNames.add(product.normalizedName);
          return true;
        });

        // Limit to 5 products after deduplication
        products = processedProducts.slice(0, 5);

        console.log("[DEBUG] Final deduplicated products:", products);
      } catch (error) {
        console.error("[DEBUG] API error when loading best products:", error);

        // Try an alternative approach - calculate most ordered products from orders directly
        try {
          console.log(
            "[DEBUG] Trying alternative approach to get most ordered products"
          );
          const ordersResponse = await apiService.request(
            "orders?limit=100",
            "GET"
          );

          if (
            ordersResponse.success &&
            ordersResponse.data &&
            ordersResponse.data.length > 0
          ) {
            const orders = ordersResponse.data;
            console.log(
              `[DEBUG] Successfully fetched ${orders.length} orders for alternative calculation`
            );

            // Create a map to count product orders
            const productCounts = new Map();
            const productInfo = new Map();

            // Process each order
            orders.forEach((order) => {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item) => {
                  if (!item.id || !item.name) return;

                  const normalizedName = item.name.toLowerCase().trim();
                  const currentCount = productCounts.get(normalizedName) || 0;
                  productCounts.set(
                    normalizedName,
                    currentCount + (item.quantity || 1)
                  );

                  // Store product info if not already stored
                  if (!productInfo.has(normalizedName)) {
                    productInfo.set(normalizedName, {
                      id: item.id,
                      name: item.name,
                      nameEn: item.nameEn || "", // Include English name if available
                      image: item.image || "",
                      category: item.category || "",
                      prices: [item.price || 0],
                    });
                  } else {
                    // Add price to prices array for averaging later
                    productInfo
                      .get(normalizedName)
                      .prices.push(item.price || 0);
                  }
                });
              }
            });

            // Convert to array and sort by count
            const sortedProducts = Array.from(productCounts.entries())
              .map(([normalizedName, count]) => {
                const info = productInfo.get(normalizedName);
                const prices = info.prices;
                const averagePrice =
                  prices.reduce((sum, price) => sum + price, 0) / prices.length;

                return {
                  id: info.id,
                  name: info.name,
                  nameEn: info.nameEn, // Include English name
                  image: info.image,
                  category: info.category,
                  totalOrdered: count,
                  averagePrice: averagePrice,
                  normalizedName,
                };
              })
              .sort((a, b) => b.totalOrdered - a.totalOrdered)
              .slice(0, 5);

            if (sortedProducts.length > 0) {
              console.log(
                "[DEBUG] Successfully calculated most ordered products from orders:",
                sortedProducts
              );
              products = sortedProducts;
              apiError = false;
            } else {
              throw new Error("No products found in orders");
            }
          } else {
            throw new Error(
              "Failed to fetch orders for alternative calculation"
            );
          }
        } catch (altError) {
          console.error("[DEBUG] Alternative approach also failed:", altError);

          // Instead of using mock data, show a message that no data is available
          console.log("[DEBUG] No product data available, showing empty state");
          products = [];
          apiError = true;
        }
      }

      // Hide spinner
      spinner.style.display = "none";

      // If no products, show empty message
      if (!products || products.length === 0) {
        console.log("[DEBUG] No best products to display");

        if (apiError) {
          // Show a message indicating no data is available
          emptyMessage.innerHTML = `
            <i class="fas fa-chart-bar"></i>
            <p>لا توجد بيانات كافية عن المنتجات الأكثر طلباً</p>
            <small>ستظهر البيانات بمجرد وجود طلبات كافية</small>
          `;
        } else {
          emptyMessage.innerHTML = `
            <i class="fas fa-info-circle"></i>
            <p>لا توجد منتجات مطلوبة بعد</p>
            <small>ستظهر هنا بمجرد وجود طلبات</small>
          `;
        }

        emptyMessage.style.display = "block";
        return;
      }

      // Clear previous products
      productsList.innerHTML = "";

      // Default fallback image paths - using absolute paths for reliability
      const placeholderImages = {
        default: "/public/images/placeholder.svg",
        pizza: "/public/images/products/pizza-placeholder.jpg",
        burger: "/public/images/products/burger-placeholder.jpg",
        sandwich: "/public/images/products/sandwich-placeholder.jpg",
        drink: "/public/images/products/drink-placeholder.jpg",
      };

      // Helper to get appropriate fallback image based on product category
      const getImageUrl = (product) => {
        // If product has a valid image URL, use it
        if (
          product.image &&
          product.image !== "" &&
          !product.image.includes("undefined")
        ) {
          // If image URL is from database and doesn't have http/https, add proper path
          if (!product.image.startsWith("http")) {
            // Handle relative paths from database
            if (product.image.startsWith("/")) {
              return product.image; // Already has leading slash
            } else {
              return `/${product.image}`; // Add leading slash for proper path resolution
            }
          }
          return product.image;
        }

        // Otherwise use category-specific placeholder
        const category = product.category ? product.category.toLowerCase() : "";
        if (category === "pizza") {
          return placeholderImages.pizza;
        } else if (category === "burger") {
          return placeholderImages.burger;
        } else if (category === "sandwich") {
          return placeholderImages.sandwich;
        } else if (category === "drink") {
          return placeholderImages.drink;
        }

        // If no category or unrecognized category, check name
        const name = product.name ? product.name.toLowerCase() : "";
        if (name.includes("بيتزا") || name.includes("pizza")) {
          return placeholderImages.pizza;
        } else if (name.includes("برجر") || name.includes("burger")) {
          return placeholderImages.burger;
        } else if (name.includes("سندوتش") || name.includes("sandwich")) {
          return placeholderImages.sandwich;
        } else if (
          name.includes("عصير") ||
          name.includes("مشروب") ||
          name.includes("drink")
        ) {
          return placeholderImages.drink;
        }

        // Default fallback
        return placeholderImages.default;
      };

      // Add products to the list
      products.forEach((product, index) => {
        const listItem = document.createElement("li");
        listItem.className = "best-product-item";

        const rankClass = index < 3 ? `top-${index + 1}` : "";

        // Get current language setting
        const currentLang = localStorage.getItem("admin-language") || "ar";

        // Determine which name to display based on current language
        const arabicName = product.name || "منتج غير معروف";
        const englishName =
          product.nameEn && product.nameEn.trim() !== ""
            ? product.nameEn
            : arabicName;
        const displayName = currentLang === "en" ? englishName : arabicName;

        const imageUrl = getImageUrl(product);
        const totalOrdered = product.totalOrdered || 0;
        const averagePrice = product.averagePrice || 0;

        listItem.innerHTML = `
          <div class="best-product-rank ${rankClass}">${index + 1}</div>
          <img src="${imageUrl}" alt="${displayName}" class="best-product-image" onerror="this.onerror=null; this.src='/public/images/placeholder.svg';">
          <div class="best-product-info">
            <h4 class="best-product-name">${displayName}</h4>
            <div class="best-product-stats">
              <span class="best-product-stat">
                <i class="fas fa-shopping-cart"></i>
                ${totalOrdered} <span data-i18n="orderText">${getTranslation(
          "orderText"
        )}</span>
              </span>
              <span class="best-product-price">${Number(averagePrice).toFixed(
                2
              )} <span class="currency-text">${getCurrencyText()}</span></span>
            </div>
          </div>
        `;

        const nameElement = listItem.querySelector(".best-product-name");
        if (nameElement) {
          nameElement.setAttribute("data-name-ar", arabicName);
          nameElement.setAttribute("data-name-en", englishName);
          nameElement.textContent = displayName;
        }

        productsList.appendChild(listItem);
      });

      // Show products list
      productsList.style.display = "block";

      // Remove the mock data note
      // If these are mock products, add a note
      // if (apiError) {
      //   const mockNote = document.createElement("div");
      //   mockNote.className = "mock-data-note";
      //   mockNote.innerHTML = "<small>* بيانات تجريبية</small>";
      //   productsList.appendChild(mockNote);
      // }
    } catch (error) {
      console.error("[DEBUG] Fatal error in loadBestProducts:", error);

      // Make sure UI is in a good state even if there's an error
      const spinner = document.getElementById("best-products-spinner");
      const emptyMessage = document.getElementById("empty-best-products");

      if (spinner) spinner.style.display = "none";

      if (emptyMessage) {
        emptyMessage.innerHTML = `
          <i class="fas fa-exclamation-circle"></i>
          <p>حدث خطأ أثناء تحميل المنتجات الأكثر طلباً</p>
        `;
        emptyMessage.style.display = "block";
      }
    }
  }

  // Function to reset the "no sales data" toast flag - should be called when changing time periods
  function resetNoSalesDataToast() {
    noSalesDataToastShown = false;
  }

  /**
   * Check user permissions and hide sections the user doesn't have access to
   */
  function checkSectionPermissions() {
    // Get the session data to check permissions
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) return;

    try {
      const session = JSON.parse(sessionData);
      const permissions = session.permissions || {};
      const loginViaRole = session.loginViaRole || false;
      const roleName = session.roleName || "مستخدم إداري";

      console.log("Checking section permissions:", permissions);

      // If user logged in via role, show a notification
      if (loginViaRole) {
        showAdminNotification(
          getTranslation("loginViaRole").replace("{role}", roleName),
          "info",
          7000
        );
      }

      // Define section permission requirements
      const sectionPermissions = {
        "dashboard-section": ["stats"], // Stats permission needed for dashboard
        "products-section": ["productsView"], // View products permission
        "vouchers-section": ["vouchersView"], // View vouchers permission
        "tax-section": ["tax"], // Tax permission
        "qr-section": ["qr"], // QR permission
        "reservations-section": ["reservations"], // Reservations permission
        "loyalty-points-section": ["points"], // Loyalty points permission
        "customer-accounts-section": ["accounts"], // Users permission
        // Admin settings is always available to anyone with adminPanel permission
      };

      // For admin tokens with role "admin", all sections are accessible
      if (session.role === "admin" && !session.isCustomerAdmin) {
        console.log("Admin role detected, all sections accessible");

        // Reset any previously hidden sections - only remove unauthorized classes
        // Don't change display property to preserve tab navigation state
        Object.keys(sectionPermissions).forEach((sectionId) => {
          const section = document.getElementById(sectionId);
          const sectionTab = document.querySelector(
            `.admin-tab[data-section="${sectionId}"]`
          );

          if (section) {
            // Only remove unauthorized class, don't force display:block
            section.classList.remove("unauthorized-section");
          }

          if (sectionTab) {
            sectionTab.style.display = "block";
            sectionTab.classList.remove("unauthorized-tab");
          }
        });

        return;
      }

      // Process each section based on permissions
      Object.keys(sectionPermissions).forEach((sectionId) => {
        const requiredPermissions = sectionPermissions[sectionId];
        const hasPermission = requiredPermissions.some(
          (permission) => permissions[permission] === true
        );

        const section = document.getElementById(sectionId);
        const sectionTab = document.querySelector(
          `.admin-tab[data-section="${sectionId}"]`
        );

        if (section) {
          if (hasPermission) {
            // Remove unauthorized class if user has permission
            // Don't change display property to preserve tab navigation state
            section.classList.remove("unauthorized-section");

            // If section was previously unauthorized, add a subtle highlight effect
            if (section.hasAttribute("data-was-unauthorized")) {
              section.removeAttribute("data-was-unauthorized");
              section.classList.add("section-highlight");
              setTimeout(() => {
                section.classList.remove("section-highlight");
              }, 1500);
            }
          } else {
            // Add unauthorized overlay if user doesn't have permission
            // Don't change display property to preserve tab navigation state
            section.classList.add("unauthorized-section");
            section.setAttribute("data-was-unauthorized", "true");

            // Set the unauthorized message using i18n
            const unauthorizedMessage = getTranslation(
              "unauthorizedAccessToSection"
            );
            if (unauthorizedMessage) {
              section.setAttribute(
                "data-unauthorized-message",
                unauthorizedMessage
              );
            }

            // Add custom unauthorized message if specified
            const customMessage = section.getAttribute(
              "data-unauthorized-message"
            );
            if (customMessage) {
              const messageElement = document.createElement("div");
              messageElement.className = "unauthorized-message";
              messageElement.textContent = customMessage;

              // Remove any existing message before adding a new one
              const existingMessage = section.querySelector(
                ".unauthorized-message"
              );
              if (existingMessage) {
                existingMessage.remove();
              }

              section.appendChild(messageElement);
            }
          }
        }

        if (sectionTab) {
          if (hasPermission) {
            // Show tab if user has permission
            sectionTab.style.display = "block";
            sectionTab.classList.remove("unauthorized-tab");
            sectionTab.removeAttribute("title"); // Remove any previous tooltip
          } else {
            // Hide tab if user doesn't have permission
            sectionTab.style.display = "block"; // Show but with visual indication of no access
            sectionTab.classList.add("unauthorized-tab");

            // Add tooltip to explain why the tab is disabled
            const sectionName =
              sectionTab.querySelector("span")?.textContent ||
              getTranslation("thisSection") ||
              "هذا القسم";
            const unauthorizedAccessTo = getTranslation("unauthorizedAccessTo");
            if (unauthorizedAccessTo) {
              sectionTab.setAttribute(
                "title",
                `${unauthorizedAccessTo} ${sectionName}`
              );
            }
          }
        }

        console.log(
          `Section ${sectionId}: ${hasPermission ? "visible" : "unauthorized"}`
        );
      });

      // If the active tab is hidden, select the first visible tab
      // But only if this is not a permission update event (to avoid redirecting after saving permissions)
      const activeTab = document.querySelector(".admin-tab.active");
      if (activeTab && activeTab.classList.contains("unauthorized-tab")) {
        // Check if this is being called from a permission update
        const isPermissionUpdate = window.isPermissionUpdateInProgress || false;

        if (!isPermissionUpdate) {
          const firstVisibleTab = document.querySelector(
            ".admin-tab:not(.unauthorized-tab)"
          );
          if (firstVisibleTab) {
            firstVisibleTab.click();
          }
        } else {
          console.log(
            "🔄 Skipping tab switch during permission update to maintain current tab"
          );
        }
      }
    } catch (error) {
      console.error("Error checking section permissions:", error);
    }
  }

  /**
   * Update UI elements based on user permissions
   */
  function updateUIBasedOnPermissions() {
    // Get the session data to check permissions
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) return;

    try {
      const session = JSON.parse(sessionData);
      const permissions = session.permissions || {};

      console.log("Updating UI based on permissions:", permissions);

      // For admin tokens with role "admin", all UI elements are enabled
      if (session.role === "admin" && !session.isCustomerAdmin) {
        console.log("Admin role detected, all UI elements enabled");

        // Enable all previously disabled buttons
        document.querySelectorAll(".disabled-btn").forEach((btn) => {
          btn.disabled = false;
          btn.classList.remove("disabled-btn");
          btn.removeAttribute("title");
        });

        return;
      }

      // Products section
      const addProductBtn = document.getElementById("add-product-btn");
      if (addProductBtn) {
        if (permissions.productsEdit) {
          addProductBtn.disabled = false;
          addProductBtn.classList.remove("disabled-btn");
          addProductBtn.removeAttribute("title");
        } else {
          addProductBtn.disabled = true;
          addProductBtn.title =
            getTranslation("noPermissionToAddProducts") ||
            "ليس لديك صلاحية إضافة منتجات";
          addProductBtn.classList.add("disabled-btn");
        }
      }

      // Update edit/delete buttons on product cards
      document.querySelectorAll(".product-card").forEach((card) => {
        const editBtn = card.querySelector(".edit-product-btn");
        const deleteBtn = card.querySelector(".delete-product-btn");

        if (editBtn && deleteBtn) {
          if (permissions.productsEdit) {
            editBtn.disabled = false;
            deleteBtn.disabled = false;
            editBtn.classList.remove("disabled-btn");
            deleteBtn.classList.remove("disabled-btn");
            editBtn.removeAttribute("title");
            deleteBtn.removeAttribute("title");
          } else {
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            editBtn.title =
              getTranslation("noPermissionToEditProducts") ||
              "ليس لديك صلاحية تعديل المنتجات";
            deleteBtn.title =
              getTranslation("noPermissionToDeleteProducts") ||
              "ليس لديك صلاحية حذف المنتجات";
            editBtn.classList.add("disabled-btn");
            deleteBtn.classList.add("disabled-btn");
          }
        }
      });

      // Vouchers section
      const addVoucherBtn = document.getElementById("add-voucher-btn");
      if (addVoucherBtn) {
        if (permissions.vouchersEdit) {
          addVoucherBtn.disabled = false;
          addVoucherBtn.classList.remove("disabled-btn");
          addVoucherBtn.removeAttribute("title");
        } else {
          addVoucherBtn.disabled = true;
          addVoucherBtn.title =
            getTranslation("noPermissionToAddVouchers") ||
            "ليس لديك صلاحية إضافة قسائم";
          addVoucherBtn.classList.add("disabled-btn");
        }
      }

      // Update edit/delete buttons on voucher cards
      document.querySelectorAll(".voucher-card").forEach((card) => {
        const editBtn = card.querySelector(".edit-voucher-btn");
        const deleteBtn = card.querySelector(".delete-voucher-btn");

        if (editBtn && deleteBtn) {
          if (permissions.vouchersEdit) {
            editBtn.disabled = false;
            deleteBtn.disabled = false;
            editBtn.classList.remove("disabled-btn");
            deleteBtn.classList.remove("disabled-btn");
            editBtn.removeAttribute("title");
            deleteBtn.removeAttribute("title");
          } else {
            editBtn.disabled = true;
            deleteBtn.disabled = true;
            editBtn.title =
              getTranslation("noPermissionToEditVouchers") ||
              "ليس لديك صلاحية تعديل القسائم";
            deleteBtn.title =
              getTranslation("noPermissionToDeleteVouchers") ||
              "ليس لديك صلاحية حذف القسائم";
            editBtn.classList.add("disabled-btn");
            deleteBtn.classList.add("disabled-btn");
          }
        }
      });

      // Global discount buttons
      const globalDiscountBtns = document.querySelectorAll(
        "#apply-global-discount, #reset-global-discount"
      );
      globalDiscountBtns.forEach((btn) => {
        if (btn) {
          if (permissions.productsEdit) {
            btn.disabled = false;
            btn.classList.remove("disabled-btn");
            btn.removeAttribute("title");
          } else {
            btn.disabled = true;
            btn.title =
              getTranslation("noPermissionToEditGlobalDiscount") ||
              "ليس لديك صلاحية تعديل الخصم العام";
            btn.classList.add("disabled-btn");
          }
        }
      });

      // Tax settings save button
      const saveTaxBtn = document.getElementById("save-tax-settings");
      if (saveTaxBtn) {
        if (permissions.tax) {
          saveTaxBtn.disabled = false;
          saveTaxBtn.classList.remove("disabled-btn");
          saveTaxBtn.removeAttribute("title");
        } else {
          saveTaxBtn.disabled = true;
          saveTaxBtn.title =
            getTranslation("noPermissionToEditTaxSettings") ||
            "ليس لديك صلاحية تعديل إعدادات الضريبة";
          saveTaxBtn.classList.add("disabled-btn");
        }
      }

      // QR Code generation buttons
      const createQRBtn = document.getElementById("create-qr-btn");
      if (createQRBtn) {
        if (permissions.qr) {
          createQRBtn.disabled = false;
          createQRBtn.classList.remove("disabled-btn");
          createQRBtn.removeAttribute("title");
        } else {
          createQRBtn.disabled = true;
          createQRBtn.title =
            getTranslation("noPermissionToCreateQR") ||
            "ليس لديك صلاحية إنشاء رموز QR";
          createQRBtn.classList.add("disabled-btn");
        }
      }

      // Loyalty points settings buttons
      const saveLoyaltySettingsBtn = document.getElementById(
        "save-loyalty-settings"
      );
      const adjustPointsBtn = document.getElementById("adjust-points-btn");
      const resetPointsBtn = document.getElementById("reset-points-btn");

      [saveLoyaltySettingsBtn, adjustPointsBtn, resetPointsBtn].forEach(
        (btn) => {
          if (btn) {
            if (permissions.points) {
              btn.disabled = false;
              btn.classList.remove("disabled-btn");
              btn.removeAttribute("title");
            } else {
              btn.disabled = true;
              btn.title =
                getTranslation("noPermissionToManageLoyaltyPoints") ||
                "ليس لديك صلاحية إدارة نقاط الولاء";
              btn.classList.add("disabled-btn");
            }
          }
        }
      );

      // Customer accounts controls
      const addUserBtn = document.getElementById("add-user-btn");
      const userActionBtns = document.querySelectorAll(".account-action-btn");

      if (addUserBtn) {
        if (permissions.accounts) {
          addUserBtn.disabled = false;
          addUserBtn.classList.remove("disabled-btn");
          addUserBtn.removeAttribute("title");
        } else {
          addUserBtn.disabled = true;
          addUserBtn.title =
            getTranslation("noPermissionToAddUsers") ||
            "ليس لديك صلاحية إضافة مستخدمين";
          addUserBtn.classList.add("disabled-btn");
        }
      }

      userActionBtns.forEach((btn) => {
        if (permissions.accounts) {
          btn.disabled = false;
          btn.classList.remove("disabled-btn");
          btn.removeAttribute("title");
        } else {
          btn.disabled = true;
          btn.title =
            getTranslation("noPermissionToManageUsers") ||
            "ليس لديك صلاحية إدارة المستخدمين";
          btn.classList.add("disabled-btn");
        }
      });

      // Update other API-dependent features based on permissions
      document.querySelectorAll(".api-dependent-feature").forEach((element) => {
        // Check if this element is already controlled by specific permission checks
        if (
          element.id === "add-product-btn" ||
          element.id === "add-voucher-btn" ||
          element.id === "save-tax-settings" ||
          element.id === "apply-global-discount" ||
          element.id === "reset-global-discount"
        ) {
          return; // Skip elements that are already handled specifically
        }

        // For other API-dependent elements, make sure they're enabled if we're online
        if (navigator.onLine) {
          element.classList.remove("disabled-btn");
        }
      });
    } catch (error) {
      console.error("Error updating UI based on permissions:", error);
    }
  }

  // Listen for permission changes and update UI accordingly
  document.addEventListener("permissionsChanged", function (event) {
    console.log("🔄 Permissions changed event received:", event.detail);
    console.log("🔄 New permissions:", event.detail.permissions);

    // Set flag to prevent automatic tab switching during permission updates
    window.isPermissionUpdateInProgress = true;

    // Store the current active tab to restore it later
    const currentActiveTab = document.querySelector(".admin-tab.active");
    const currentActiveTabId = currentActiveTab
      ? currentActiveTab.getAttribute("data-section")
      : null;
    console.log("🔄 Preserving current active tab:", currentActiveTabId);

    // Update UI based on new permissions with a slight delay to ensure session is updated
    console.log("🔄 Updating section permissions...");
    setTimeout(() => {
      checkSectionPermissions();
      console.log("🔄 Section permissions checked");
    }, 100);

    console.log("🔄 Updating UI based on permissions...");
    updateUIBasedOnPermissions();

    // Update unauthorized sections with new language
    if (typeof updateUnauthorizedSections === "function") {
      console.log("🔄 Updating unauthorized sections...");
      updateUnauthorizedSections();
    }

    // Force refresh unauthorized sections to ensure they disappear if permissions are granted
    setTimeout(() => {
      console.log("🔄 Force refreshing unauthorized sections...");
      forceRefreshUnauthorizedSections();
    }, 200);

    // Force refresh of any permission-dependent content
    console.log("🔄 Refreshing permission-dependent content...");
    refreshPermissionDependentContent();

    // Show a notification to inform the user
    console.log("🔄 Showing success notification...");
    showAdminNotification(
      getTranslation("permissionsUpdatedSuccessfully") ||
        "تم تحديث الصلاحيات وتطبيقها بنجاح",
      "success",
      3000
    );

    console.log("✅ Permission update process completed!");

    // Clear the flag and restore the original tab after permission update is complete
    setTimeout(() => {
      window.isPermissionUpdateInProgress = false;
      console.log("🔄 Permission update flag cleared");

      // Restore the original active tab if it was preserved
      if (currentActiveTabId) {
        const originalTab = document.querySelector(
          `[data-section="${currentActiveTabId}"]`
        );
        if (
          originalTab &&
          !originalTab.classList.contains("unauthorized-tab")
        ) {
          console.log("🔄 Restoring original active tab:", currentActiveTabId);
          originalTab.click();
        } else {
          console.log(
            "🔄 Original tab is now unauthorized, keeping current tab"
          );
        }
      }
    }, 100);
  });

  // Function to force refresh unauthorized sections
  function forceRefreshUnauthorizedSections() {
    console.log("🔄 Force refreshing unauthorized sections...");

    // Get current session data
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) {
      console.log("❌ No session data found for force refresh");
      return;
    }

    try {
      const session = JSON.parse(sessionData);
      const permissions = session.permissions || {};

      console.log("🔄 Current permissions for force refresh:", permissions);

      // Define section permission requirements
      const sectionPermissions = {
        "dashboard-section": ["stats"],
        "products-section": ["productsView"],
        "vouchers-section": ["vouchersView"],
        "tax-section": ["tax"],
        "qr-section": ["qr"],
        "reservations-section": ["reservations"],
        "loyalty-points-section": ["points"],
        "customer-accounts-section": ["accounts"],
      };

      // Process each section
      Object.keys(sectionPermissions).forEach((sectionId) => {
        const requiredPermissions = sectionPermissions[sectionId];
        const hasPermission = requiredPermissions.some(
          (permission) => permissions[permission] === true
        );

        const section = document.getElementById(sectionId);
        const sectionTab = document.querySelector(
          `.admin-tab[data-section="${sectionId}"]`
        );

        console.log(
          `🔄 Checking section ${sectionId}: hasPermission=${hasPermission}`
        );

        if (section) {
          if (hasPermission) {
            // Remove unauthorized class and attributes
            section.classList.remove("unauthorized-section");
            section.removeAttribute("data-unauthorized-message");
            section.removeAttribute("data-was-unauthorized");
            console.log(`✅ Section ${sectionId} is now authorized`);
          } else {
            // Add unauthorized class and message
            section.classList.add("unauthorized-section");
            const unauthorizedMessage = getTranslation(
              "unauthorizedAccessToSection"
            );
            if (unauthorizedMessage) {
              section.setAttribute(
                "data-unauthorized-message",
                unauthorizedMessage
              );
            }
            console.log(`❌ Section ${sectionId} is still unauthorized`);
          }
        }

        if (sectionTab) {
          if (hasPermission) {
            sectionTab.classList.remove("unauthorized-tab");
            sectionTab.removeAttribute("title");
            console.log(`✅ Tab for ${sectionId} is now authorized`);
          } else {
            sectionTab.classList.add("unauthorized-tab");
            const sectionName =
              sectionTab.querySelector("span")?.textContent || "هذا القسم";
            const unauthorizedAccessTo = getTranslation("unauthorizedAccessTo");
            if (unauthorizedAccessTo) {
              sectionTab.setAttribute(
                "title",
                `${unauthorizedAccessTo} ${sectionName}`
              );
            }
            console.log(`❌ Tab for ${sectionId} is still unauthorized`);
          }
        }
      });

      console.log("✅ Force refresh of unauthorized sections completed");
    } catch (error) {
      console.error("❌ Error in force refresh unauthorized sections:", error);
    }
  }

  // Function to refresh content that depends on permissions
  function refreshPermissionDependentContent() {
    // Refresh products list if it's visible
    const productsSection = document.getElementById("products-section");
    if (
      productsSection &&
      window.getComputedStyle(productsSection).display !== "none"
    ) {
      if (typeof loadProducts === "function") {
        loadProducts();
      }
    }

    // Refresh vouchers list if it's visible
    const vouchersSection = document.getElementById("vouchers-section");
    if (
      vouchersSection &&
      window.getComputedStyle(vouchersSection).display !== "none"
    ) {
      if (typeof loadVouchers === "function") {
        loadVouchers();
      }
    }

    // Refresh dashboard stats if they're visible
    const dashboardSection = document.getElementById("dashboard-section");
    if (
      dashboardSection &&
      window.getComputedStyle(dashboardSection).display !== "none"
    ) {
      if (typeof updateStats === "function") {
        updateStats();
      }
    }

    // Refresh tax settings if they're visible
    const taxSection = document.getElementById("tax-section");
    if (taxSection && window.getComputedStyle(taxSection).display !== "none") {
      if (typeof loadTaxSettings === "function") {
        loadTaxSettings();
      }
    }

    // Refresh QR codes if they're visible
    const qrSection = document.getElementById("qr-section");
    if (qrSection && window.getComputedStyle(qrSection).display !== "none") {
      if (typeof loadSavedQRCodes === "function") {
        loadSavedQRCodes();
      }
    }

    // Refresh loyalty points if they're visible
    const loyaltyPointsSection = document.getElementById(
      "loyalty-points-section"
    );
    if (
      loyaltyPointsSection &&
      window.getComputedStyle(loyaltyPointsSection).display !== "none"
    ) {
      if (typeof loadLoyaltySettings === "function") {
        loadLoyaltySettings();
      }
    }

    // Refresh accounts if they're visible
    const accountsSection = document.getElementById(
      "customer-accounts-section"
    );
    if (
      accountsSection &&
      window.getComputedStyle(accountsSection).display !== "none"
    ) {
      if (typeof loadCustomerAccounts === "function") {
        loadCustomerAccounts();
      }
    }
  }

  // Add event listener for WebSocket tax settings updates
  if (typeof socket !== "undefined" && socket) {
    socket.addEventListener("message", function (event) {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "tax-settings-updated" && data.data) {
          // Update tax settings object with new values
          taxSettings = data.data;

          // Save to localStorage for offline use
          localStorage.setItem("taxSettings", JSON.stringify(taxSettings));

          // Update UI with new settings
          updateTaxSettingsUI();

          // Show notification
          showNotification(getTranslation("taxSettingsUpdated"), "info");
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
  }

  // Initialize Data
  initData();

  // Hide loading spinner after initialization
  const loadingSpinner = document.getElementById("admin-loading");
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }

  // Functions to control the loading spinner
  function showLoadingSpinner() {
    const loadingSpinner = document.getElementById("admin-loading");
    if (loadingSpinner) {
      loadingSpinner.style.display = "flex";
    }
  }

  function hideLoadingSpinner() {
    const loadingSpinner = document.getElementById("admin-loading");
    if (loadingSpinner) {
      loadingSpinner.style.display = "none";
    }
  }

  // Functions - Initialization
  function initData() {
    // Show loading spinner
    showLoadingSpinner();

    // Load products
    loadProducts();

    // Load orders
    loadOrders();

    // Load vouchers
    loadVouchers();

    // Load tax settings
    loadTaxSettings();

    // Render products
    renderProducts();

    // Render vouchers
    renderVouchers();

    // Initialize image preview and upload functionality
    initImageHandling();

    // Initialize QR code generator
    initQRCodeGenerator();

    // Check global discount status
    checkGlobalDiscount();

    // Create crowded hours chart
    createCrowdedHoursChart();

    // Update all currency text elements
    updateAllCurrencyText();

    // Hide the loading spinner after initialization
    hideLoadingSpinner();
  }

  /**
   * Set up handling for service worker updates
   */
  function setupServiceWorkerUpdateHandler() {
    if ("serviceWorker" in navigator) {
      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener("message", function (event) {
        if (event.data && event.data.type === "UPDATE_AVAILABLE") {
          console.log("Service worker update available");

          // Show a notification to the user
          showAdminNotification(
            getTranslation("updateAvailable"),
            "info",
            10000,
            function () {
              // When notification is clicked, tell the service worker to skip waiting
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                  type: "SKIP_WAITING",
                });
              }
            }
          );
        }
      });
    }
  }

  // Function to fix the "All Customers" option text based on current language
  function fixAllCustomersOptionText() {
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const allCustomersOption = document.querySelector(
      "#reset-points-customer option[value='all']"
    );

    if (allCustomersOption) {
      if (currentLang === "en") {
        allCustomersOption.textContent = "All Customers";
      } else {
        allCustomersOption.textContent = "جميع العملاء";
      }
      console.log(
        `Updated "All Customers" option text for language: ${currentLang}`
      );
    }
  }

  // Function to update addon currency symbols based on language
  function updateAddonCurrencySymbols(language) {
    const currencySymbols = document.querySelectorAll(
      ".addon-option-price .currency-symbol"
    );
    const currencyText = getCurrencyText();

    currencySymbols.forEach((symbol) => {
      symbol.textContent = currencyText;
    });

    console.log(
      `Updated ${currencySymbols.length} addon currency symbols to: ${currencyText}`
    );
  }

  // Expose currency update utilities to global scope for external triggers
  window.updateAllCurrencyText = updateAllCurrencyText;
  window.forceRefreshUnauthorizedSections = forceRefreshUnauthorizedSections;

  // Call this function when the DOM is loaded
});

function updateBestProductNames(language) {
  const effectiveLanguage =
    language || localStorage.getItem("admin-language") || "ar";

  const nameElements = document.querySelectorAll(".best-product-name");
  nameElements.forEach((element) => {
    const nameAr = element.getAttribute("data-name-ar");
    const nameEn = element.getAttribute("data-name-en");

    let nextName = effectiveLanguage === "en" ? nameEn : nameAr;
    if (!nextName) {
      nextName = effectiveLanguage === "en" ? nameAr : nameEn;
    }

    if (nextName) {
      element.textContent = nextName;

      const listItem = element.closest(".best-product-item");
      if (listItem) {
        const image = listItem.querySelector(".best-product-image");
        if (image) {
          image.alt = nextName;
        }
      }
    }
  });
}

// Listen for language changes and update dynamic content
document.addEventListener("languageChanged", function (event) {
  const language =
    event && event.detail
      ? event.detail.language
      : localStorage.getItem("admin-language") || "ar";

  // Update all currency text elements (guard if not defined)
  if (typeof window.updateAllCurrencyText === "function") {
    window.updateAllCurrencyText();
  }

  // Update currency symbols in charts
  if (
    typeof salesChart !== "undefined" &&
    typeof updateSalesChart === "function"
  ) {
    updateSalesChart();
  }

  // Update addon currency symbols
  if (typeof updateAddonCurrencySymbols === "function") {
    updateAddonCurrencySymbols(language);
  }

  // Update crowded hours chart if it exists
  if (typeof renderCrowdedHoursChart === "function") {
    renderCrowdedHoursChart();
  }

  // Re-render products to update category names
  if (typeof renderProducts === "function") {
    renderProducts();
  }

  updateBestProductNames(language);
});

// Enhanced Product Modal Functions
function enhanceProductModalExperience() {
  // Auto-suggest English names based on Arabic input
  document.addEventListener("input", function (e) {
    if (
      e.target.classList.contains("addon-section-title") &&
      !e.target.classList.contains("addon-section-title-en")
    ) {
      const arabicInput = e.target;
      const englishInput = arabicInput.parentElement.querySelector(
        ".addon-section-title-en"
      );

      if (englishInput && !englishInput.value) {
        // Simple transliteration suggestions (can be enhanced with a proper translation API)
        const suggestions = {
          "اختر الصلصة": "Choose Sauce",
          "اختر الحجم": "Choose Size",
          إضافات: "Add-ons",
          مشروبات: "Drinks",
          حلويات: "Desserts",
          سلطات: "Salads",
        };

        if (suggestions[arabicInput.value]) {
          englishInput.placeholder = `Suggestion: ${
            suggestions[arabicInput.value]
          }`;
        }
      }
    }

    if (
      e.target.classList.contains("addon-option-name") &&
      !e.target.classList.contains("addon-option-name-en")
    ) {
      const arabicInput = e.target;
      const englishInput = arabicInput.parentElement.querySelector(
        ".addon-option-name-en"
      );

      if (englishInput && !englishInput.value) {
        const suggestions = {
          كبير: "Large",
          متوسط: "Medium",
          صغير: "Small",
          حار: "Spicy",
          عادي: "Regular",
          بدون: "Without",
          إضافي: "Extra",
        };

        if (suggestions[arabicInput.value]) {
          englishInput.placeholder = `Suggestion: ${
            suggestions[arabicInput.value]
          }`;
        }
      }
    }
  });

  // Add visual indicators for completed English translations
  document.addEventListener("input", function (e) {
    if (
      e.target.classList.contains("addon-section-title-en") ||
      e.target.classList.contains("addon-option-name-en")
    ) {
      const indicator = e.target.parentElement.querySelector(
        ".translation-indicator"
      );
      if (e.target.value.trim()) {
        if (!indicator) {
          const checkmark = document.createElement("span");
          checkmark.className = "translation-indicator";
          checkmark.innerHTML =
            '<i class="fas fa-check-circle" style="color: #28a745; margin-left: 8px;"></i>';
          e.target.parentElement.appendChild(checkmark);
        }
      } else {
        if (indicator) {
          indicator.remove();
        }
      }
    }
  });

  // Enhanced price input functionality
  const priceInput = document.getElementById("product-price");
  if (priceInput) {
    // Format price on input
    priceInput.addEventListener("input", function (e) {
      let value = e.target.value;

      // Remove any non-numeric characters except decimal point
      value = value.replace(/[^0-9.]/g, "");

      // Ensure only one decimal point
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }

      // Limit to 2 decimal places
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + "." + parts[1].substring(0, 2);
      }

      e.target.value = value;
    });

    // Format price on blur (add .00 if needed)
    priceInput.addEventListener("blur", function (e) {
      let value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        e.target.value = value.toFixed(2);
      }
    });

    // Add visual feedback for valid/invalid prices
    priceInput.addEventListener("input", function (e) {
      const priceContainer = e.target.closest(".price-input");
      const value = parseFloat(e.target.value);

      if (priceContainer) {
        if (isNaN(value) || value <= 0) {
          priceContainer.classList.add("invalid");
          priceContainer.classList.remove("valid");
        } else {
          priceContainer.classList.add("valid");
          priceContainer.classList.remove("invalid");
        }
      }
    });
  }
}

// Initialize enhanced experience when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceProductModalExperience);
} else {
  enhanceProductModalExperience();
}

// Listen for language changes to update dynamically created addon labels
document.addEventListener("languageChanged", function (event) {
  console.log("Language changed, updating addon section labels");

  // Update all addon section labels with data-i18n attributes
  const addonLabels = document.querySelectorAll(
    ".addon-section-toggle label[data-i18n]"
  );
  addonLabels.forEach((label) => {
    const key = label.getAttribute("data-i18n");
    const currentLang = window.getCurrentLanguage
      ? window.getCurrentLanguage()
      : "ar";

    if (currentLang === "en" && label.hasAttribute("data-i18n-en")) {
      label.textContent = label.getAttribute("data-i18n-en");
    } else if (window.getTranslation) {
      label.textContent = window.getTranslation(key);
    }
  });
});

// ============================================
// Categories Management
// ============================================

(function () {
  "use strict";

  let categories = [];
  let editingCategoryId = null;
  let selectedCategories = new Set();

  // DOM Elements
  const categoriesList = document.getElementById("categories-list");
  const addCategoryBtn = document.getElementById("add-category-btn");
  const categoryModal = document.getElementById("category-modal");
  const closeCategoryModal = document.getElementById("close-category-modal");
  const categoryForm = document.getElementById("category-form");
  const categoryModalTitle = document.getElementById("category-modal-title");

  // Initialize categories management
  function initCategories() {
    if (!categoriesList || !addCategoryBtn || !categoryModal) {
      console.warn("Categories management elements not found");
      return;
    }

    // Load categories
    loadCategories();

    // Event listeners
    addCategoryBtn.addEventListener("click", openAddCategoryModal);
    closeCategoryModal.addEventListener("click", closeCategoryModalHandler);
    categoryForm.addEventListener("submit", handleCategorySubmit);

    // Icon picker functionality
    const iconInput = document.getElementById("category-icon");
    const iconPreview = document.getElementById("category-icon-preview");
    const cancelCategoryBtn = document.getElementById("cancel-category-btn");

    // Update icon preview when input changes
    if (iconInput && iconPreview) {
      iconInput.addEventListener("input", function () {
        const iconClass = this.value.trim() || "fas fa-th-large";
        iconPreview.innerHTML = `<i class="${iconClass}"></i>`;
      });
    }

    // Quick icon picker buttons
    const quickIconBtns = document.querySelectorAll(".quick-icon-btn");
    quickIconBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const iconClass = this.dataset.icon;
        if (iconInput) {
          iconInput.value = iconClass;
          iconPreview.innerHTML = `<i class="${iconClass}"></i>`;
        }

        // Update selected state
        quickIconBtns.forEach((b) => b.classList.remove("selected"));
        this.classList.add("selected");
      });
    });

    // Cancel button
    if (cancelCategoryBtn) {
      cancelCategoryBtn.addEventListener("click", closeCategoryModalHandler);
    }

    // Close modal when clicking outside
    window.addEventListener("click", function (e) {
      if (e.target === categoryModal) {
        closeCategoryModalHandler();
      }
    });
  }

  // Load categories from localStorage or API
  async function loadCategories() {
    try {
      // First load from localStorage as fallback
      const savedCategories = localStorage.getItem("categories");
      if (savedCategories) {
        categories = JSON.parse(savedCategories);
        renderCategories();
      }

      // Then try to load from API (if available)
      const apiService = new ApiService();
      const response = await apiService.request("categories", "GET");

      if (response && response.success && response.data) {
        categories = response.data;
        localStorage.setItem("categories", JSON.stringify(categories));
        renderCategories();
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // If no saved categories, initialize with default ones
      if (categories.length === 0) {
        categories = getDefaultCategories();
        localStorage.setItem("categories", JSON.stringify(categories));
        renderCategories();
      }
    }
  }

  // Get default categories - now returns empty array
  // Categories should be added by admin through the UI
  function getDefaultCategories() {
    return [];
  }

  // Render categories list
  function renderCategories() {
    if (!categoriesList) return;

    categoriesList.innerHTML = "";

    if (categories.length === 0) {
      categoriesList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-th-large"></i>
          <p data-i18n="noCategories">${getTranslation("noCategories")}</p>
        </div>
      `;
      return;
    }

    // Sort categories by sortOrder before rendering
    const sortedCategories = [...categories].sort((a, b) => {
      const orderA = a.sortOrder || 0;
      const orderB = b.sortOrder || 0;
      return orderA - orderB;
    });

    sortedCategories.forEach((category) => {
      const categoryCard = createCategoryCard(category);
      categoriesList.appendChild(categoryCard);
    });
  }

  // Create category card element
  function createCategoryCard(category) {
    const card = document.createElement("div");
    card.className = "category-card";
    card.dataset.categoryId = category.id;

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const categoryName =
      currentLang === "en" && category.nameEn ? category.nameEn : category.name;
    const icon = category.icon || "fas fa-th-large";
    const sortLabel = currentLang === "en" ? "Sort Order" : "ترتيب العرض";

    card.innerHTML = `
      <div class="category-header">
        <div class="category-icon">
          <i class="${icon}"></i>
        </div>
        <div class="category-info">
          <h3 class="category-name">${categoryName}</h3>
          <div class="category-sort-order">
            <i class="fas fa-sort-amount-down"></i>
            <div class="sort-order-content">
              <div class="sort-label">
                <span class="sort-label-${currentLang}" data-i18n="sortOrder" data-i18n-en="Sort Order">${sortLabel}</span>
              </div>
              <span class="sort-value">${category.sortOrder || 0}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="category-actions">
        <button class="edit-button" data-id="${category.id}">
          <i class="fas fa-edit"></i>
          <span data-i18n="editCategory">${getTranslation(
            "editCategory"
          )}</span>
        </button>
        <button class="delete-button" data-id="${category.id}">
          <i class="fas fa-trash"></i>
          <span data-i18n="deleteCategory">${getTranslation(
            "deleteCategory"
          )}</span>
        </button>
      </div>
    `;

    // Add event listeners
    const editBtn = card.querySelector(".edit-button");
    const deleteBtn = card.querySelector(".delete-button");

    editBtn.addEventListener("click", () => openEditCategoryModal(category.id));
    deleteBtn.addEventListener("click", () => deleteCategory(category.id));

    return card;
  }

  // Open add category modal
  function openAddCategoryModal() {
    editingCategoryId = null;
    categoryForm.reset();
    categoryModalTitle.textContent = getTranslation("addNewCategory");

    // Reset icon preview
    const iconPreview = document.getElementById("category-icon-preview");
    if (iconPreview) {
      iconPreview.innerHTML = '<i class="fas fa-th-large"></i>';
    }

    // Clear selected icon
    document.querySelectorAll(".quick-icon-btn").forEach((btn) => {
      btn.classList.remove("selected");
    });

    categoryModal.classList.add("show");
  }

  // Open edit category modal
  function openEditCategoryModal(categoryId) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    editingCategoryId = categoryId;
    categoryModalTitle.textContent = getTranslation("editCategory");

    // Fill form with category data
    document.getElementById("category-id").value = category.id || "";
    document.getElementById("category-name").value = category.name || "";
    document.getElementById("category-name-en").value = category.nameEn || "";
    document.getElementById("category-icon").value =
      category.icon || "fas fa-th-large";
    document.getElementById("category-sort-order").value =
      category.sortOrder || 0;

    // Update icon preview
    const iconPreview = document.getElementById("category-icon-preview");
    if (iconPreview) {
      const iconClass = category.icon || "fas fa-th-large";
      iconPreview.innerHTML = `<i class="${iconClass}"></i>`;
    }

    // Highlight selected icon if it's in quick picker
    document.querySelectorAll(".quick-icon-btn").forEach((btn) => {
      btn.classList.remove("selected");
      if (btn.dataset.icon === category.icon) {
        btn.classList.add("selected");
      }
    });

    categoryModal.classList.add("show");
  }

  // Close category modal
  function closeCategoryModalHandler() {
    categoryModal.classList.remove("show");
    setTimeout(() => {
      categoryForm.reset();
      editingCategoryId = null;

      // Reset icon preview
      const iconPreview = document.getElementById("category-icon-preview");
      if (iconPreview) {
        iconPreview.innerHTML = '<i class="fas fa-th-large"></i>';
      }

      // Clear selected icons
      document.querySelectorAll(".quick-icon-btn").forEach((btn) => {
        btn.classList.remove("selected");
      });
    }, 300);
  }

  // CATEGORY NOTIFICATION SYSTEM - Matches admin notification style
  function showCategoryNotification(message, type = "success") {
    // Remove any existing category notifications
    const existingNotif = document.getElementById(
      "category-notification-fixed"
    );
    if (existingNotif) {
      existingNotif.remove();
    }

    // Create notification element with fixed ID
    const notification = document.createElement("div");
    notification.id = "category-notification-fixed";
    notification.className = `category-notification ${type}`;

    notification.textContent = message;

    // Add to body
    document.body.appendChild(notification);

    // Force reflow
    notification.offsetHeight;

    // Show notification
    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    // Remove after 3 seconds (same as other admin notifications)
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  // Handle category form submit
  async function handleCategorySubmit(e) {
    e.preventDefault();

    const categoryName = document.getElementById("category-name").value.trim();
    const categoryNameEn = document
      .getElementById("category-name-en")
      .value.trim();

    // Generate ID from category name (use English name if available, otherwise Arabic)
    const generatedId = (categoryNameEn || categoryName)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const categoryData = {
      id: editingCategoryId || generatedId,
      name: categoryName,
      nameEn: categoryNameEn,
      value: generatedId,
      icon:
        document.getElementById("category-icon").value.trim() ||
        "fas fa-th-large",
      sortOrder:
        parseInt(document.getElementById("category-sort-order").value) || 0,
    };

    // Validate
    if (!categoryData.name) {
      showCategoryNotification(
        getTranslation("fillAllRequiredFields"),
        "error"
      );
      return;
    }

    try {
      const apiService = new ApiService();

      if (editingCategoryId) {
        // Update existing category
        const response = await apiService.request(
          `categories/${editingCategoryId}`,
          "PUT",
          categoryData
        );

        if (response && response.success) {
          const index = categories.findIndex((c) => c.id === editingCategoryId);
          if (index !== -1) {
            categories[index] = categoryData;
          }
          showCategoryNotification(
            getTranslation("categoryUpdated"),
            "success"
          );
        } else {
          throw new Error("Failed to update category");
        }
      } else {
        // Add new category
        const response = await apiService.request(
          "categories",
          "POST",
          categoryData
        );

        if (response && response.success) {
          categories.push(categoryData);
          showCategoryNotification(getTranslation("categoryAdded"), "success");
        } else {
          throw new Error("Failed to add category");
        }
      }

      // Save to localStorage
      localStorage.setItem("categories", JSON.stringify(categories));

      // Update UI
      renderCategories();
      updateProductCategoryDropdowns();
      closeCategoryModalHandler();
    } catch (error) {
      console.error("Error saving category:", error);

      // Fallback to localStorage only
      if (editingCategoryId) {
        const index = categories.findIndex((c) => c.id === editingCategoryId);
        if (index !== -1) {
          categories[index] = categoryData;
        }
        showCategoryNotification(getTranslation("categoryUpdated"), "success");
      } else {
        categories.push(categoryData);
        showCategoryNotification(getTranslation("categoryAdded"), "success");
      }

      localStorage.setItem("categories", JSON.stringify(categories));
      renderCategories();
      updateProductCategoryDropdowns();
      closeCategoryModalHandler();
    }
  }

  // Delete category
  async function deleteCategory(categoryId) {
    if (!confirm(getTranslation("confirmDeleteCategory"))) {
      return;
    }

    try {
      const apiService = new ApiService();
      const response = await apiService.request(
        `categories/${categoryId}`,
        "DELETE"
      );

      if (response && response.success) {
        categories = categories.filter((c) => c.id !== categoryId);
        showCategoryNotification(getTranslation("categoryDeleted"), "success");
      } else {
        throw new Error("Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);

      // Fallback to localStorage only
      categories = categories.filter((c) => c.id !== categoryId);
      showCategoryNotification(getTranslation("categoryDeleted"), "success");
    }

    localStorage.setItem("categories", JSON.stringify(categories));
    renderCategories();
    updateProductCategoryDropdowns();
  }

  // Update product category dropdowns
  function updateProductCategoryDropdowns() {
    const productCategorySelect = document.getElementById("product-category");
    const voucherCategorySelect = document.getElementById("voucher-category");
    const currentLang = localStorage.getItem("admin-language") || "ar";

    if (productCategorySelect) {
      const currentValue = productCategorySelect.value;
      productCategorySelect.innerHTML = "";

      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.value;
        // Use the appropriate language based on current language setting
        const categoryName =
          currentLang === "en" && category.nameEn
            ? category.nameEn
            : category.name;
        option.textContent = categoryName;
        // Store both names as data attributes for language switching
        option.dataset.nameAr = category.name;
        option.dataset.nameEn = category.nameEn || category.name;
        productCategorySelect.appendChild(option);
      });

      // Restore previous value if it exists
      if (currentValue && categories.find((c) => c.value === currentValue)) {
        productCategorySelect.value = currentValue;
      }
    }

    if (voucherCategorySelect) {
      const currentValue = voucherCategorySelect.value;
      const allCategoriesText =
        currentLang === "en" ? "All Categories" : "جميع الفئات";
      voucherCategorySelect.innerHTML = `<option value="all" data-i18n="allCategories" data-i18n-en="All Categories">${allCategoriesText}</option>`;

      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.value;
        // Use the appropriate language based on current language setting
        const categoryName =
          currentLang === "en" && category.nameEn
            ? category.nameEn
            : category.name;
        option.textContent = categoryName;
        // Store both names as data attributes for language switching
        option.dataset.nameAr = category.name;
        option.dataset.nameEn = category.nameEn || category.name;
        voucherCategorySelect.appendChild(option);
      });

      // Restore previous value if it exists
      if (currentValue) {
        voucherCategorySelect.value = currentValue;
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCategories);
  } else {
    initCategories();
  }

  // Listen for language change events to update category displays
  document.addEventListener("languageChanged", function (event) {
    console.log("Language changed, updating categories display");
    const currentLang =
      event.detail?.language || localStorage.getItem("admin-language") || "ar";

    // Update category option texts without rebuilding dropdowns
    updateCategoryOptionTexts(currentLang);

    renderCategories();
    updateProductCategoryDropdowns();
  });

  // Function to update category option texts based on language
  function updateCategoryOptionTexts(lang) {
    // Update all select options that have category data attributes
    const allOptions = document.querySelectorAll(
      "option[data-name-ar][data-name-en]"
    );
    allOptions.forEach((option) => {
      const nameAr = option.dataset.nameAr;
      const nameEn = option.dataset.nameEn;
      if (nameAr && nameEn) {
        option.textContent = lang === "en" ? nameEn : nameAr;
      }
    });
  }

  // Toggle category selection
  function toggleCategorySelection(categoryId, isSelected) {
    if (isSelected) {
      selectedCategories.add(categoryId);
    } else {
      selectedCategories.delete(categoryId);
    }
    updateCategoriesBulkActionsBar();
  }

  // Select all categories
  function selectAllCategories(isSelected) {
    if (isSelected) {
      categories.forEach((category) => selectedCategories.add(category.id));
    } else {
      selectedCategories.clear();
    }
    renderCategories();
  }

  // Update categories bulk actions bar
  function updateCategoriesBulkActionsBar() {
    const bulkActionsBar = document.getElementById(
      "categories-bulk-actions-bar"
    );
    const selectedCountSpan = document.getElementById(
      "categories-selected-count"
    );
    const selectAllCheckbox = document.getElementById("select-all-categories");

    if (bulkActionsBar && selectedCountSpan) {
      if (selectedCategories.size > 0) {
        bulkActionsBar.style.display = "flex";
        selectedCountSpan.textContent = selectedCategories.size;
        if (selectAllCheckbox) {
          selectAllCheckbox.checked =
            selectedCategories.size === categories.length;
        }
      } else {
        bulkActionsBar.style.display = "none";
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = false;
        }
      }
    }
  }

  // Bulk delete categories
  function bulkDeleteCategories() {
    if (selectedCategories.size === 0) return;

    const currentLang = localStorage.getItem("admin-language") || "ar";
    const confirmMessage =
      currentLang === "en"
        ? `Are you sure you want to delete ${selectedCategories.size} category(ies)?`
        : `هل أنت متأكد من حذف ${selectedCategories.size} فئة؟`;

    if (confirm(confirmMessage)) {
      selectedCategories.forEach((categoryId) => {
        const index = categories.findIndex((c) => c.id === categoryId);
        if (index !== -1) {
          categories.splice(index, 1);
        }
      });

      selectedCategories.clear();
      localStorage.setItem("categories", JSON.stringify(categories));
      renderCategories();
      updateProductCategoryDropdowns();

      const successMessage =
        currentLang === "en"
          ? "Categories deleted successfully"
          : "تم حذف الفئات بنجاح";
      if (typeof showAdminNotification === "function") {
        showAdminNotification(successMessage, "success");
      }
    }
  }

  // Expose functions globally if needed
  window.categoriesManager = {
    loadCategories,
    renderCategories,
    updateProductCategoryDropdowns,
    selectAllCategories,
    bulkDeleteCategories,
  };
})();

// Expose updateDashboardOfferStats globally for admin-offers.js
// This is defined in the global scope above, so we can access it here
if (typeof updateDashboardOfferStats !== "undefined") {
  window.updateDashboardOfferStats = updateDashboardOfferStats;
}
