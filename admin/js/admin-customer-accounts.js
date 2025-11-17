/**
 * Customer Accounts Management
 * Handles the customer accounts section in the admin panel
 */

// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearch = "";
let selectedCustomerId = null;
let allCustomers = []; // Store all customers for dropdowns
let freeItems = []; // Store free items
let currentAccountFilters = {
  status: "all",
  role: "",
  dateFrom: "",
  dateTo: "",
};
let accountsFilterModal = null;

function escapeHtml(input) {
  if (input === null || input === undefined) {
    return "";
  }

  const element = document.createElement("div");
  element.textContent = String(input);
  return element.innerHTML;
}

function sanitizeRoleClassName(name) {
  if (!name) return "user";

  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "user"
  );
}

// DOM Elements - Customer Accounts
const customerSearchInput = document.getElementById("customer-search");
const customerSearchBtn = document.getElementById("customer-search-btn");
const filterAccountsBtn = document.getElementById("filter-accounts-btn");
const refreshAccountsBtn = document.getElementById("refresh-accounts-btn");
const customerAccountsTable = document.getElementById(
  "customer-accounts-tbody"
);
const accountsPagination = document.getElementById(
  "customer-accounts-pagination"
);

// Modal elements
const accountPermissionsModal = document.getElementById(
  "account-permissions-modal"
);
const closePermissionsModal = document.getElementById(
  "close-permissions-modal"
);
const savePermissionsBtn = document.getElementById("save-permissions");
const cancelPermissionsBtn = document.getElementById("cancel-permissions");
const permissionCustomerId = document.getElementById("permission-customer-id");
const productsViewPerm = document.getElementById("customer-perm-products-view");
const productsEditPerm = document.getElementById("customer-perm-products-edit");
const vouchersViewPerm = document.getElementById("customer-perm-vouchers-view");
const vouchersEditPerm = document.getElementById("customer-perm-vouchers-edit");

// DOM Elements - Loyalty Points
let resetPointsCustomer = document.getElementById("reset-points-customer");
let resetPointsBtn = document.getElementById("reset-points-btn");
let adjustPointsCustomer = document.getElementById("adjust-points-customer");
let adjustPointsValue = document.getElementById("adjust-points-value");
let adjustPointsBtn = document.getElementById("adjust-points-btn");
let discountPerPointInput = document.getElementById("discount-per-point");
let minPointsForDiscountInput = document.getElementById(
  "min-points-for-discount"
);
let enableCustomDiscount = document.getElementById("enable-custom-discount");
let maxDiscountValue = document.getElementById("max-discount-value");
let saveDiscountSettingsBtn = document.getElementById(
  "save-discount-settings-btn"
);
let freeItemProduct = document.getElementById("free-item-product");
let freeItemPoints = document.getElementById("free-item-points");
let addFreeItemBtn = document.getElementById("add-free-item-btn");
let pointsExchangeRateInput = document.getElementById("points-exchange-rate");
let pointsExpiryDaysInput = document.getElementById("points-expiry-days");
let savePointsSettingsBtn = document.getElementById("save-points-settings-btn");
const freeItemsList = document.getElementById("free-items-list");
const emptyFreeItems = document.getElementById("empty-free-items");

// Permission checkboxes
const adminPanelPerm = document.getElementById("customer-perm-admin-panel");
const cashierPerm = document.getElementById("customer-perm-cashier");
const statsPerm = document.getElementById("customer-perm-stats");
const reservationsPerm = document.getElementById("customer-perm-reservations");
const kitchenPerm = document.getElementById("customer-perm-kitchen");

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the customer accounts management
  initCustomerAccounts();

  // Initialize the loyalty points management separately
  initLoyaltyPointsManagement();

  // Initialize permission updates
  initPermissionUpdates();
});

// Initialize customer accounts management
function initCustomerAccounts() {
  // Load customer accounts
  loadCustomerAccounts();

  // Set up event listeners for customer accounts
  document
    .getElementById("customer-search-btn")
    .addEventListener("click", handleSearch);
  document
    .getElementById("customer-search")
    .addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        handleSearch();
      }
    });

  document
    .getElementById("filter-accounts-btn")
    .addEventListener("click", handleFilterAccounts);
  document
    .getElementById("refresh-accounts-btn")
    .addEventListener("click", handleRefreshAccounts);

  // Event delegation for customer actions
  document
    .getElementById("customer-accounts-tbody")
    .addEventListener("click", handleCustomerAction);

  // Pagination event handling
  document
    .getElementById("customer-accounts-pagination")
    .addEventListener("click", handlePaginationClick);

  // Modal event handlers
  document
    .getElementById("close-permissions-modal")
    .addEventListener("click", closeModal);
  document
    .getElementById("cancel-permissions")
    .addEventListener("click", closeModal);
  document
    .getElementById("save-permissions")
    .addEventListener("click", savePermissions);

  // Add clear input button functionality
  customerSearchInput.addEventListener("input", function () {
    if (this.value.length > 0) {
      customerSearchBtn.innerHTML = '<i class="fas fa-times"></i>';
      customerSearchBtn.title = "مسح البحث";
      customerSearchBtn.classList.add("clear-search");
    } else {
      customerSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
      customerSearchBtn.title = "بحث";
      customerSearchBtn.classList.remove("clear-search");
    }
  });

  // When productsEdit is checked, also check productsView
  productsEditPerm.addEventListener("change", function () {
    if (this.checked) {
      productsViewPerm.checked = true;
    }
  });

  // When vouchersEdit is checked, also check vouchersView
  vouchersEditPerm.addEventListener("change", function () {
    if (this.checked) {
      vouchersViewPerm.checked = true;
    }
  });

  // Initialize tooltips
  initializeTooltips();

  // Fix account action buttons text based on current language
  fixAccountActionButtonsText();

  // Listen for language change events
  document.addEventListener("languageChanged", fixAccountActionButtonsText);
}

// Fix account action buttons text based on current language
function fixAccountActionButtonsText() {
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  console.log("Fixing account action buttons text for language:", currentLang);

  setTimeout(() => {
    // Handle specific buttons by class
    const permissionsBtns = document.querySelectorAll(".permissions-btn span");
    permissionsBtns.forEach((span) => {
      span.textContent = isEnglish ? "Permissions" : "الصلاحيات";
      console.log(`Updated permissions button text to: ${span.textContent}`);
    });

    const suspendBtns = document.querySelectorAll(".suspend-btn span");
    suspendBtns.forEach((span) => {
      span.textContent = isEnglish ? "Suspend" : "إيقاف";
      console.log(`Updated suspend button text to: ${span.textContent}`);
    });

    const activateBtns = document.querySelectorAll(".activate-btn span");
    activateBtns.forEach((span) => {
      span.textContent = isEnglish ? "Activate" : "تنشيط";
      console.log(`Updated activate button text to: ${span.textContent}`);
    });

    const deleteBtns = document.querySelectorAll(".delete-btn span");
    deleteBtns.forEach((span) => {
      span.textContent = isEnglish ? "Delete" : "حذف";
      console.log(`Updated delete button text to: ${span.textContent}`);
    });

    const assignRoleBtns = document.querySelectorAll(".assign-role-btn span");
    assignRoleBtns.forEach((span) => {
      span.textContent = isEnglish ? "Assign Role" : "تعيين دور";
      console.log(`Updated assign role button text to: ${span.textContent}`);
    });
  }, 500); // Small delay to ensure the DOM is fully updated
}

// Initialize loyalty points management
function initLoyaltyPointsManagement() {
  // Load customer data for dropdowns
  loadAllCustomersForDropdowns();

  // Load products for free items
  loadProductsForFreeItems();

  // Load loyalty settings and free items
  loadLoyaltySettings().catch((error) => {
    console.error("Error loading loyalty settings:", error);
  });

  loadLoyaltyPointsSettings().catch((error) => {
    console.error("Error loading loyalty points settings:", error);
  });

  loadFreeItems();

  // Event listeners for loyalty points management
  document
    .getElementById("reset-points-btn")
    .addEventListener("click", handleResetPoints);
  document
    .getElementById("adjust-points-btn")
    .addEventListener("click", handleAdjustPoints);
  document
    .getElementById("save-discount-settings-btn")
    .addEventListener("click", saveLoyaltyDiscountSettings);
  document
    .getElementById("save-points-settings-btn")
    .addEventListener("click", saveLoyaltyPointsSettings);
  document
    .getElementById("add-free-item-btn")
    .addEventListener("click", handleAddFreeItem);

  // Event listener for the discount per point input to update the max discount
  document
    .getElementById("discount-per-point")
    .addEventListener("input", updateMaxDiscount);

  // Event delegation for free item actions
  document
    .getElementById("free-items-list")
    .addEventListener("click", handleFreeItemAction);

  // Listen for language change events
  document.addEventListener("languageChanged", updateDropdownsLanguage);
  document.addEventListener("languageChanged", renderFreeItems);

  // Update max discount value on load
  updateMaxDiscount();
}

// Update dropdown text when language changes
function updateDropdownsLanguage(event) {
  const currentLang =
    event.detail.language || localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  console.log("Updating dropdowns language to:", currentLang);

  // Update select first options if they exist
  try {
    // Update adjust-points-customer first option
    const adjustFirstOption = adjustPointsCustomer?.options[0];
    if (adjustFirstOption) {
      adjustFirstOption.textContent = isEnglish
        ? "Select Customer"
        : "اختر عميل";
    }

    // Update free-item-product first option
    const productFirstOption = freeItemProduct?.options[0];
    if (productFirstOption) {
      productFirstOption.textContent = isEnglish
        ? "Select Product"
        : "اختر منتج";
    }

    // Reload products for free items dropdown to show correct language names
    loadProductsForFreeItems();

    console.log("Dropdown languages updated successfully");
  } catch (error) {
    console.error("Error updating dropdown languages:", error);
  }
}

// Load all customers for dropdown selects
async function loadAllCustomersForDropdowns() {
  try {
    // Show loading state for dropdowns
    resetPointsCustomer.innerHTML =
      '<option value="loading">جاري التحميل...</option>';
    adjustPointsCustomer.innerHTML =
      '<option value="loading">جاري التحميل...</option>';

    const response = await apiService.getCustomerAccounts(1, 100, "");
    console.log("Dropdown customers response:", response);

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Reset dropdowns with default options
    resetPointsCustomer.innerHTML = `<option value="all" class="all-customers-option" data-i18n="allCustomers" data-i18n-en="All Customers">${
      isEnglish ? "All Customers" : "جميع العملاء"
    }</option>`;
    adjustPointsCustomer.innerHTML = `<option value="" data-i18n-en="Select Customer">${
      isEnglish ? "Select Customer" : "اختر عميل"
    }</option>`;

    // Check for the specific "Customer not found" message
    if (response.success && response.message === "Customer not found") {
      console.log(
        "API returned success but with 'Customer not found' message for dropdowns"
      );

      // Store empty array for customers
      allCustomers = [];

      // Add a disabled option to indicate no customers
      const noCustomersOption = document.createElement("option");
      noCustomersOption.disabled = true;
      noCustomersOption.textContent = isEnglish
        ? "No customers found"
        : "لا يوجد عملاء";
      noCustomersOption.setAttribute("data-i18n-en", "No customers found");

      resetPointsCustomer.appendChild(noCustomersOption.cloneNode(true));
      adjustPointsCustomer.appendChild(noCustomersOption);

      return;
    }

    // Handle different response structures
    let customersData = null;

    // Check various possible locations for customer data
    if (Array.isArray(response.data)) {
      console.log("Dropdown: Found customers in response.data array");
      customersData = response.data;
    } else if (response.data && Array.isArray(response.data.customers)) {
      console.log("Dropdown: Found customers in response.data.customers array");
      customersData = response.data.customers;
    } else if (Array.isArray(response.customers)) {
      console.log("Dropdown: Found customers in response.customers array");
      customersData = response.customers;
    } else if (response.users && Array.isArray(response.users)) {
      console.log("Dropdown: Found customers in response.users array");
      customersData = response.users;
    } else {
      console.warn(
        "Dropdown: Could not find customers array in response:",
        response
      );
      customersData = [];
    }

    // Store all customers for later use
    allCustomers = customersData || [];

    // Add customer options to dropdowns
    if (allCustomers.length > 0) {
      allCustomers.forEach((customer) => {
        if (customer) {
          const customerName =
            customer.name || customer.displayName || customer.email || "مستخدم";
          const customerEmail = customer.email || "";

          // Add to reset points dropdown
          const resetOption = document.createElement("option");
          resetOption.value = customer._id || customer.id || "";
          resetOption.textContent = `${customerName} (${customerEmail})`;
          resetPointsCustomer.appendChild(resetOption);

          // Add to adjust points dropdown
          const adjustOption = document.createElement("option");
          adjustOption.value = customer._id || customer.id || "";
          adjustOption.textContent = `${customerName} (${customerEmail})`;
          adjustPointsCustomer.appendChild(adjustOption);
        }
      });
    } else {
      console.log("No customers found in response data");
      // Add a disabled option to indicate no customers
      const noCustomersOption = document.createElement("option");
      noCustomersOption.disabled = true;
      noCustomersOption.textContent = "لا يوجد عملاء";

      resetPointsCustomer.appendChild(noCustomersOption.cloneNode(true));
      adjustPointsCustomer.appendChild(noCustomersOption);
    }
  } catch (error) {
    console.error("Error loading customers for dropdowns:", error);
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    resetPointsCustomer.innerHTML =
      `<option value="all" class="all-customers-option" data-i18n="allCustomers" data-i18n-en="All Customers">${
        isEnglish ? "All Customers" : "جميع العملاء"
      }</option>` +
      `<option value="" disabled>${
        isEnglish ? "Failed to load customers" : "فشل تحميل العملاء"
      }</option>`;
    adjustPointsCustomer.innerHTML =
      `<option value="" data-i18n-en="Select Customer">${
        isEnglish ? "Select Customer" : "اختر عميل"
      }</option>` +
      `<option value="" disabled>${
        isEnglish ? "Failed to load customers" : "فشل تحميل العملاء"
      }</option>`;
  }
}

// Load products for free items dropdown
async function loadProductsForFreeItems() {
  try {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Show loading state
    freeItemProduct.innerHTML = `<option value="loading">${
      isEnglish ? "Loading products..." : "جاري تحميل المنتجات..."
    }</option>`;

    // Get products
    const response = await apiService.getProducts();

    if (response.success) {
      freeItemProduct.innerHTML = `<option value="">${
        isEnglish ? "Select Product" : "اختر منتج"
      }</option>`;

      // Get list of product IDs that are already added as free items
      const addedProductIds = freeItems.map(item => item.productId);

      // Add products to dropdown (excluding already added ones)
      response.data.forEach((product) => {
        // Skip if this product is already added as a free item
        if (addedProductIds.includes(product._id)) {
          return;
        }

        const option = document.createElement("option");
        option.value = product._id;
        option.dataset.name = product.name;
        option.dataset.nameEn = product.nameEn || "";
        option.dataset.image = product.image;

        // Determine which name to display based on current language
        let displayName;
        if (isEnglish && product.nameEn && product.nameEn.trim() !== "") {
          // Use English name if language is English and English name exists
          displayName = product.nameEn;
        } else {
          // Use Arabic name as fallback or when language is Arabic
          displayName = product.name;
        }

        option.textContent = displayName;
        freeItemProduct.appendChild(option);
      });
    } else {
      freeItemProduct.innerHTML = `<option value="">${
        isEnglish ? "Failed to load products" : "فشل تحميل المنتجات"
      }</option>`;
    }
  } catch (error) {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    console.error("Error loading products for free items:", error);
    freeItemProduct.innerHTML = `<option value="">${
      isEnglish ? "Failed to load products" : "فشل تحميل المنتجات"
    }</option>`;
  }
}

// Handle reset points button click
async function handleResetPoints() {
  const customerId = resetPointsCustomer.value;
  const isAllCustomers = customerId === "all";

  // Confirm with user
  const confirmMessage = isAllCustomers
    ? "هل أنت متأكد من إعادة تعيين نقاط الولاء لجميع العملاء؟"
    : "هل أنت متأكد من إعادة تعيين نقاط الولاء لهذا العميل؟";

  if (!confirm(confirmMessage)) {
    return;
  }

  // Disable button during processing
  resetPointsBtn.disabled = true;
  const processingText =
    (typeof getTranslation === "function" &&
      getTranslation("processingAction")) ||
    "جاري المعالجة...";
  resetPointsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> ' + processingText;

  try {
    let success = false;
    let message = "";

    if (isAllCustomers) {
      // Reset points for all customers
      const response = await apiService.resetAllLoyaltyPoints();
      success = response.success;
      message = success
        ? getTranslation("resetAllPointsSuccess")
        : getTranslation("resetPointsFailed");
    } else {
      // Reset points for specific customer
      const response = await apiService.resetCustomerLoyaltyPoints(customerId);
      success = response.success;
      message = success
        ? getTranslation("resetPointsSuccess")
        : getTranslation("resetPointsFailed");
    }

    // Show notification
    showPointsNotification(message, success ? "success" : "error");

    // Refresh customer accounts
    if (success) {
      loadCustomerAccounts();
    }
  } catch (error) {
    console.error("Error resetting loyalty points:", error);
    showPointsNotification(getTranslation("errorResettingPoints"), "error");
  } finally {
    // Re-enable button
    resetPointsBtn.disabled = false;
    const resetText =
      (typeof getTranslation === "function" &&
        getTranslation("reset")) ||
      "إعادة تعيين";
    resetPointsBtn.innerHTML = '<i class="fas fa-undo-alt"></i> ' + resetText;
  }
}

// Handle adjust points button click
async function handleAdjustPoints() {
  const customerId = adjustPointsCustomer.value;
  const pointsValue = parseInt(adjustPointsValue.value, 10);

  // Validate inputs
  if (!customerId) {
    showPointsNotification(getTranslation("pleaseSelectCustomer"), "error");
    return;
  }

  if (isNaN(pointsValue) || pointsValue === 0) {
    showPointsNotification(getTranslation("enterValidPointsValue"), "error");
    return;
  }

  // Disable button during processing
  adjustPointsBtn.disabled = true;
  const processingText =
    (typeof getTranslation === "function" &&
      getTranslation("processingAction")) ||
    "جاري المعالجة...";
  adjustPointsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> ' + processingText;

  try {
    // Adjust points for customer
    const response = await apiService.adjustCustomerLoyaltyPoints(
      customerId,
      pointsValue
    );

    if (response.success) {
      // Show success notification
      const translationKey = pointsValue > 0 ? "pointsAdded" : "pointsDeducted";
      const message = getTranslation(translationKey).replace("{points}", Math.abs(pointsValue));
      showPointsNotification(message, "success");

      // Reset input
      adjustPointsValue.value = "0";

      // Refresh customer accounts
      loadCustomerAccounts();
    } else {
      showPointsNotification(getTranslation("failedToAdjustPoints"), "error");
    }
  } catch (error) {
    console.error("Error adjusting loyalty points:", error);
    showPointsNotification(getTranslation("errorAdjustingPoints"), "error");
  } finally {
    // Re-enable button
    adjustPointsBtn.disabled = false;
    const applyText =
      (typeof getTranslation === "function" &&
        getTranslation("apply")) ||
      "تطبيق";
    adjustPointsBtn.innerHTML = '<i class="fas fa-check"></i> ' + applyText;
  }
}

// Update max discount value based on discount per point
function updateMaxDiscount() {
  const discountPerPoint = parseFloat(discountPerPointInput.value);
  if (!isNaN(discountPerPoint)) {
    // No longer needed as we have an input field now
    // const maxDiscount = Math.min(discountPerPoint * 100, 90); // Cap at 90%
    // maxDiscountValue.textContent = maxDiscount.toFixed(0);
  }
}

// Save loyalty discount settings
async function saveLoyaltyDiscountSettings() {
  const discountPerPoint = parseFloat(discountPerPointInput.value);
  const minPointsForDiscount = parseInt(minPointsForDiscountInput.value, 10);
  const maxDiscountValue = parseInt(
    document.getElementById("max-discount-value").value,
    10
  );
  const isEnabled = enableCustomDiscount.checked;

  // Validate inputs
  if (isNaN(discountPerPoint) || discountPerPoint <= 0) {
    showPointsNotification(getTranslation("enterValidDiscountPerPoint"), "error");
    return;
  }

  if (isNaN(minPointsForDiscount) || minPointsForDiscount <= 0) {
    showPointsNotification(getTranslation("enterValidMinPoints"), "error");
    return;
  }

  if (
    isNaN(maxDiscountValue) ||
    maxDiscountValue < 1 ||
    maxDiscountValue > 100
  ) {
    showPointsNotification(
      getTranslation("enterValidMaxDiscount"),
      "error"
    );
    return;
  }

  // Disable button during processing
  saveDiscountSettingsBtn.disabled = true;
  const savingText =
    (typeof getTranslation === "function" && getTranslation("saving")) ||
    "جاري الحفظ...";
  saveDiscountSettingsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> ' + savingText;

  try {
    // Save settings
    const settings = {
      discountPerPoint,
      minPointsForDiscount,
      maxDiscountValue,
      isEnabled,
    };

    // Call API to update settings
    const response = await apiService.updateLoyaltyDiscountSettings(settings);

    if (response.success) {
      // Store in localStorage as backup
      localStorage.setItem("loyaltyDiscountSettings", JSON.stringify(settings));

      // Show success notification
      showPointsNotification(getTranslation("discountSettingsSaved"), "success");
    } else {
      throw new Error(response.message || "Failed to save settings");
    }
  } catch (error) {
    console.error("Error saving loyalty discount settings:", error);
    showPointsNotification(getTranslation("errorSavingSettings"), "error");
  } finally {
    // Re-enable button
    saveDiscountSettingsBtn.disabled = false;
    const saveSettingsText =
      (typeof getTranslation === "function" &&
        getTranslation("saveSettings")) ||
      "حفظ الإعدادات";
    saveDiscountSettingsBtn.innerHTML =
      '<i class="fas fa-save"></i> ' + saveSettingsText;
  }
}

// Load loyalty settings from storage
async function loadLoyaltySettings() {
  try {
    // Show loading state
    discountPerPointInput.disabled = true;
    minPointsForDiscountInput.disabled = true;
    enableCustomDiscount.disabled = true;
    document.getElementById("max-discount-value").disabled = true;

    // Try to get settings from API
    const response = await apiService.getLoyaltyDiscountSettings();

    if (response.success && response.data) {
      // Apply settings to form
      discountPerPointInput.value = response.data.discountPerPoint || 0.5;
      minPointsForDiscountInput.value =
        response.data.minPointsForDiscount || 10;
      enableCustomDiscount.checked = response.data.isEnabled !== false;
      document.getElementById("max-discount-value").value =
        response.data.maxDiscountValue || 50;

      // Store in localStorage as backup
      localStorage.setItem(
        "loyaltyDiscountSettings",
        JSON.stringify(response.data)
      );
    } else {
      // If API fails, try to load from localStorage
      console.warn("API response failed, falling back to localStorage");
      const settingsJson = localStorage.getItem("loyaltyDiscountSettings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        discountPerPointInput.value = settings.discountPerPoint || 0.5;
        minPointsForDiscountInput.value = settings.minPointsForDiscount || 10;
        enableCustomDiscount.checked = settings.isEnabled !== false;
        document.getElementById("max-discount-value").value =
          settings.maxDiscountValue || 50;
      } else {
        // Use defaults if no saved settings
        discountPerPointInput.value = 0.5;
        minPointsForDiscountInput.value = 10;
        enableCustomDiscount.checked = true;
        document.getElementById("max-discount-value").value = 50;
      }
    }

    // Update max discount display
    updateMaxDiscount();
  } catch (error) {
    console.error("Error loading loyalty settings:", error);

    // Try to load from localStorage as fallback
    try {
      const settingsJson = localStorage.getItem("loyaltyDiscountSettings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        discountPerPointInput.value = settings.discountPerPoint || 0.5;
        minPointsForDiscountInput.value = settings.minPointsForDiscount || 10;
        enableCustomDiscount.checked = settings.isEnabled !== false;
        document.getElementById("max-discount-value").value =
          settings.maxDiscountValue || 50;
      }
    } catch (innerError) {
      console.error("Error loading from localStorage:", innerError);
    }

    // Update max discount display regardless of errors
    updateMaxDiscount();
  } finally {
    // Enable inputs
    discountPerPointInput.disabled = false;
    minPointsForDiscountInput.disabled = false;
    enableCustomDiscount.disabled = false;
    document.getElementById("max-discount-value").disabled = false;
  }
}

// Load loyalty points settings from API
async function loadLoyaltyPointsSettings() {
  try {
    // Show loading state
    pointsExchangeRateInput.disabled = true;
    pointsExpiryDaysInput.disabled = true;

    // Try to get settings from API
    const response = await apiService.getLoyaltyPointsSettings();

    if (response.success && response.data) {
      // Apply settings to form
      pointsExchangeRateInput.value = response.data.exchangeRate || 10;
      pointsExpiryDaysInput.value = response.data.expiryDays || 365;

      // Store in localStorage as backup
      localStorage.setItem(
        "loyaltyPointsSettings",
        JSON.stringify(response.data)
      );
    } else {
      // If API fails, try to load from localStorage
      console.warn("API response failed, falling back to localStorage");
      const settingsJson = localStorage.getItem("loyaltyPointsSettings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        pointsExchangeRateInput.value = settings.exchangeRate || 10;
        pointsExpiryDaysInput.value = settings.expiryDays || 365;
      } else {
        // Use defaults if no saved settings
        pointsExchangeRateInput.value = 10;
        pointsExpiryDaysInput.value = 365;
      }
    }
  } catch (error) {
    console.error("Error loading loyalty points settings:", error);

    // Try to load from localStorage as fallback
    try {
      const settingsJson = localStorage.getItem("loyaltyPointsSettings");
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        pointsExchangeRateInput.value = settings.exchangeRate || 10;
        pointsExpiryDaysInput.value = settings.expiryDays || 365;
      }
    } catch (innerError) {
      console.error("Error loading from localStorage:", innerError);
    }
  } finally {
    // Enable inputs
    pointsExchangeRateInput.disabled = false;
    pointsExpiryDaysInput.disabled = false;
  }
}

// Handle adding a free item
function handleAddFreeItem() {
  const productId = freeItemProduct.value;
  const pointsRequired = parseInt(freeItemPoints.value, 10);

  // Validate inputs
  if (!productId) {
    showPointsNotification(getTranslation("pleaseSelectProduct"), "error");
    return;
  }

  if (isNaN(pointsRequired) || pointsRequired < 50) {
    showPointsNotification(
      getTranslation("enterValidPointsRequired"),
      "error"
    );
    return;
  }

  // Get product details from the selected option
  const selectedOption = freeItemProduct.options[freeItemProduct.selectedIndex];
  const productImage = selectedOption.dataset.image;

  // Store both Arabic and English names
  const productName = selectedOption.dataset.name; // Arabic name
  const productNameEn = selectedOption.dataset.nameEn || ""; // English name

  // Create new free item with both language names
  const newFreeItem = {
    id: Date.now().toString(), // Generate a unique ID
    productId,
    productName, // Arabic name
    productNameEn, // English name
    productImage,
    pointsRequired,
  };

  // Add to free items array
  freeItems.push(newFreeItem);

  // Save to storage
  saveFreeItems();

  // Render free items
  renderFreeItems();

  // Reload products dropdown to remove the added product
  loadProductsForFreeItems();

  // Reset form
  freeItemPoints.value = "100";

  // Show success notification
  showPointsNotification(getTranslation("freeItemAdded"), "success");
}

// Handle free item actions (edit, delete)
function handleFreeItemAction(event) {
  const target = event.target.closest(".free-item-action-btn");
  if (!target) return;

  const freeItemId = target.closest(".free-item").dataset.id;
  const action = target.dataset.action;

  if (action === "edit") {
    // Open edit modal for the free item
    openEditFreeItemModal(freeItemId);
  } else if (action === "delete") {
    // Delete the free item
    deleteFreeItem(freeItemId);
  }
}

// Delete a free item
function deleteFreeItem(itemId) {
  // Confirm with user
  if (!confirm(getTranslation("confirmDeleteFreeItem"))) {
    return;
  }

  // Filter out the deleted item
  freeItems = freeItems.filter((item) => item.id !== itemId);

  // Save to storage
  saveFreeItems();

  // Render free items
  renderFreeItems();

  // Reload products dropdown to add back the deleted product
  loadProductsForFreeItems();

  // Show success notification
  showPointsNotification(getTranslation("freeItemDeleted"), "success");
}

// Save free items to storage
function saveFreeItems() {
  // Store in localStorage for UI purposes
  localStorage.setItem("freeItems", JSON.stringify(freeItems));

  // Save to database via API
  apiService
    .updateFreeItems(freeItems)
    .then((response) => {
      if (!response.success) {
        console.error("Error saving free items to database:", response.message);
      }
    })
    .catch((error) => {
      console.error("Failed to save free items to database:", error);
    });
}

// Load free items from storage
function loadFreeItems() {
  try {
    // First try to get from API
    apiService
      .getFreeItems()
      .then((response) => {
        if (response.success && Array.isArray(response.data)) {
          freeItems = response.data;
          // Update localStorage for backup
          localStorage.setItem("freeItems", JSON.stringify(freeItems));
          renderFreeItems();
        } else {
          // Fallback to localStorage if API fails
          const freeItemsJson = localStorage.getItem("freeItems");
          if (freeItemsJson) {
            freeItems = JSON.parse(freeItemsJson);
          } else {
            freeItems = [];
          }
          renderFreeItems();
        }
      })
      .catch((error) => {
        console.error("Error loading free items from API:", error);
        // Fallback to localStorage
        const freeItemsJson = localStorage.getItem("freeItems");
        if (freeItemsJson) {
          freeItems = JSON.parse(freeItemsJson);
        } else {
          freeItems = [];
        }
        renderFreeItems();
      });
  } catch (error) {
    console.error("Error loading free items:", error);
    freeItems = [];
    renderFreeItems();
  }
}

// Render free items in the list
function renderFreeItems() {
  if (freeItems.length === 0) {
    // Show empty message
    emptyFreeItems.style.display = "flex";
    return;
  }

  // Hide empty message
  emptyFreeItems.style.display = "none";

  // Generate HTML for free items
  let html = "";

  // Check current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const pointsText = currentLang === "ar" ? "نقطة" : "points";

  freeItems.forEach((item) => {
    // Determine which name to display based on current language
    let displayName;
    if (currentLang === "en" && item.productNameEn && item.productNameEn.trim() !== "") {
      // Use English name if language is English and English name exists
      displayName = item.productNameEn;
    } else {
      // Use Arabic name as fallback or when language is Arabic
      displayName = item.productName;
    }

    html += `
      <div class="free-item" data-id="${item.id}">
        <div class="free-item-image">
          <img src="${
            item.productImage || "../images/default-food.jpg"
          }" alt="${displayName}">
        </div>
        <div class="free-item-details">
          <div class="free-item-name">${displayName}</div>
          <div class="free-item-points">
            <i class="fas fa-gift"></i> ${item.pointsRequired} ${pointsText}
          </div>
        </div>
        <div class="free-item-actions">
          <button class="free-item-action-btn delete-btn" data-action="delete" title="حذف">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `;
  });

  // Update the free items list
  // Keep the empty message element but add the new items before it
  const listContent = emptyFreeItems.outerHTML + html;
  freeItemsList.innerHTML = listContent;
  emptyFreeItems.style.display = "none";
}

// Handle search
function handleSearch() {
  if (customerSearchBtn.classList.contains("clear-search")) {
    customerSearchInput.value = "";
    customerSearchBtn.innerHTML = '<i class="fas fa-search"></i>';
    customerSearchBtn.title = "بحث";
    customerSearchBtn.classList.remove("clear-search");
  }

  currentSearch = customerSearchInput.value.trim();
  currentPage = 1;
  loadCustomerAccounts();
}

// Load customer accounts
async function loadCustomerAccounts() {
  try {
    showLoading(customerAccountsTable);
    console.log("Loading customer accounts...");

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Check if we're online before making the API call
    if (!navigator.onLine) {
      const offlineMessage = isEnglish
        ? "No internet connection. Please check your connection and try again."
        : "لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";
      addRetryButton(customerAccountsTable, offlineMessage);

      // Hide pagination when offline
      if (accountsPagination) {
        accountsPagination.innerHTML = "";
      }

      showNotification(
        isEnglish ? "No internet connection" : "لا يوجد اتصال بالإنترنت",
        "warning"
      );
      return;
    }

    console.log(
      `Fetching customer accounts: page=${currentPage}, search=${currentSearch}`
    );
    const response = await apiService.getCustomerAccounts(
      currentPage,
      10,
      currentSearch
    );

    console.log("API Response:", response);

    // Check for the specific "Customer not found" message with success:true
    if (response.success && response.message === "Customer not found") {
      console.log("API returned success but with 'Customer not found' message");

      // Display empty state with appropriate message
      customerAccountsTable.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-message">
            <i class="fas fa-users-slash"></i>
            <p>${
              isEnglish ? "No customer accounts" : "لا يوجد حسابات عملاء"
            }</p>
            <p class="empty-message-sub">${
              isEnglish
                ? "No customer accounts found in the system"
                : "لم يتم العثور على أي حسابات عملاء في النظام"
            }</p>
          </td>
        </tr>
      `;

      // Hide pagination
      if (accountsPagination) {
        accountsPagination.innerHTML = "";
      }

      return;
    }

    if (response.success) {
      // Handle different response structures
      let customersData = null;
      let paginationData = response.pagination || {
        currentPage: 1,
        totalPages: 1,
      };

      // Check various possible locations for customer data
      if (Array.isArray(response.data)) {
        console.log("Found customers in response.data array");
        customersData = response.data;
      } else if (response.data && Array.isArray(response.data.customers)) {
        console.log("Found customers in response.data.customers array");
        customersData = response.data.customers;
        // Also check for pagination in this structure
        if (response.data.pagination) {
          paginationData = response.data.pagination;
        }
      } else if (Array.isArray(response.customers)) {
        console.log("Found customers in response.customers array");
        customersData = response.customers;
      } else if (response.users && Array.isArray(response.users)) {
        console.log("Found customers in response.users array");
        customersData = response.users;
      } else {
        console.warn("Could not find customers array in response:", response);
        customersData = [];
      }

      // Log the extracted data
      console.log("Extracted customers data:", customersData);
      if (customersData && customersData.length > 0) {
        console.log("First customer sample:", customersData[0]);
      } else {
        console.warn("No customer data found in the response");
      }

      // Apply client-side filters if any are set
      try {
        // Load saved filters once (if present) when page loads
        if (
          !currentAccountFilters ||
          typeof currentAccountFilters !== "object"
        ) {
          const saved = localStorage.getItem("accountsFilters");
          currentAccountFilters = saved
            ? JSON.parse(saved)
            : { status: "all", role: "", dateFrom: "", dateTo: "" };
        }
      } catch (e) {
        console.warn("Failed to parse saved accounts filters:", e);
        currentAccountFilters = {
          status: "all",
          role: "",
          dateFrom: "",
          dateTo: "",
        };
      }

      if (hasActiveAccountFilters(currentAccountFilters)) {
        customersData = applyClientCustomerFilters(
          customersData,
          currentAccountFilters
        );
      }

      // If we have an empty array, display a nice empty state
      if (!customersData || customersData.length === 0) {
        customerAccountsTable.innerHTML = `
          <tr>
            <td colspan="7" class="empty-table-message">
              <i class="fas fa-users-slash"></i>
              <p>${
                isEnglish ? "No customer accounts" : "لا يوجد حسابات عملاء"
              }</p>
              <p class="empty-message-sub">${
                isEnglish
                  ? "No customer accounts match your search criteria"
                  : "لم يتم العثور على أي حسابات عملاء تطابق معايير البحث"
              }</p>
            </td>
          </tr>
        `;

        // Hide pagination for empty results
        if (accountsPagination) {
          accountsPagination.innerHTML = "";
        }

        return;
      }

      await renderCustomerAccounts(customersData);
      renderPagination(paginationData);
    } else {
      // Check if this is an unauthorized error
      if (response.unauthorized) {
        console.warn("Unauthorized access to customer accounts");

        // Create a container for unauthorized message
        const unauthorizedContainer = document.createElement("div");
        unauthorizedContainer.className = "unauthorized-section";

        // Set custom message using i18n
        const unauthorizedMessage = getTranslation("unauthorizedAccessMessage");
        if (unauthorizedMessage) {
          unauthorizedContainer.setAttribute(
            "data-unauthorized-message",
            unauthorizedMessage
          );
        }

        // Create table with empty message
        const emptyTable = `
          <table class="accounts-table">
            <thead>
              <tr>
                <th>${isEnglish ? "Name" : "الاسم"}</th>
                <th>${isEnglish ? "Email" : "البريد الإلكتروني"}</th>
                <th>${isEnglish ? "Phone" : "الهاتف"}</th>
                <th>${isEnglish ? "Registration Date" : "تاريخ التسجيل"}</th>
                <th>${isEnglish ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="5" class="empty-message">
                  <i class="fas fa-lock"></i>
                  <p>${
                    getTranslation("unauthorizedAccessToCustomerAccounts") ||
                    "غير مصرح بالوصول لإدارة حسابات العملاء"
                  }</p>
                  <p class="empty-message-sub">${
                    getTranslation("contactAdministratorForPermissions") ||
                    "يرجى التواصل مع المسؤول للحصول على الصلاحيات اللازمة"
                  }</p>
                </td>
              </tr>
            </tbody>
          </table>
        `;

        // Set the HTML content
        unauthorizedContainer.innerHTML = emptyTable;

        // Replace the table with our unauthorized container
        customerAccountsTable.parentNode.replaceChild(
          unauthorizedContainer,
          customerAccountsTable
        );

        // Hide pagination
        if (accountsPagination) {
          accountsPagination.innerHTML = "";
        }

        // Show notification
        showNotification(
          isEnglish
            ? "Unauthorized access to customer accounts management"
            : "غير مصرح بالوصول لإدارة حسابات العملاء",
          "warning",
          5000
        );

        return;
      }

      // Handle server error with specific message
      const errorMessage =
        response.message ||
        (isEnglish
          ? "Failed to load customer accounts"
          : "فشل في تحميل حسابات العملاء");
      console.error("Error loading customer accounts:", errorMessage);
      showNotification(errorMessage, "error");

      // Use the addRetryButton function instead of direct HTML
      addRetryButton(customerAccountsTable, errorMessage);
    }
  } catch (error) {
    console.error("Error loading customer accounts:", error);

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Check if it's a network error
    const isNetworkError =
      error.message &&
      (error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("Network request failed"));

    const errorMessage = isNetworkError
      ? isEnglish
        ? "Could not connect to the server. Please check your internet connection."
        : "تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت."
      : isEnglish
      ? "An error occurred while loading customer accounts"
      : "حدث خطأ أثناء تحميل حسابات العملاء";

    showNotification(errorMessage, "error");

    // Use the addRetryButton function
    addRetryButton(customerAccountsTable, errorMessage);

    // Hide pagination on error
    if (accountsPagination) {
      accountsPagination.innerHTML = "";
    }
  }
}

// Render customer accounts table
async function renderCustomerAccounts(customers) {
  if (!customerAccountsTable) {
    console.error("Customer accounts table element not found");
    return;
  }

  // Clear current table
  customerAccountsTable.innerHTML = "";

  // Get current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  // Handle different data structures
  let customersArray = [];

  // Check if data is an array or object with data property
  if (Array.isArray(customers)) {
    customersArray = customers;
    console.log(
      "Customers data is an array with",
      customersArray.length,
      "items"
    );
  } else if (customers && typeof customers === "object") {
    // Check if data is in a nested property
    if (Array.isArray(customers.data)) {
      customersArray = customers.data;
      console.log(
        "Customers data found in data property with",
        customersArray.length,
        "items"
      );
    } else if (Array.isArray(customers.customers)) {
      customersArray = customers.customers;
      console.log(
        "Customers data found in customers property with",
        customersArray.length,
        "items"
      );
    } else if (Array.isArray(customers.users)) {
      customersArray = customers.users;
      console.log(
        "Customers data found in users property with",
        customersArray.length,
        "items"
      );
    } else {
      console.warn("Unexpected data structure for customers:", customers);
    }
  } else {
    console.warn("Invalid customers data:", customers);
  }

  // Check if there are no customers
  if (!customersArray || customersArray.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="7" class="empty-table-message">
        <i class="fas fa-users-slash"></i>
        <p data-i18n="noCustomerAccounts" data-i18n-en="No customer accounts found">${
          isEnglish ? "No customer accounts found" : "لا يوجد حسابات عملاء"
        }</p>
      </td>
    `;
    customerAccountsTable.appendChild(emptyRow);
    return;
  }

  // Define button text based on current language
  const permissionsText = isEnglish ? "Permissions" : "الصلاحيات";
  const permissionsTitle = isEnglish ? "Permissions" : "الصلاحيات";

  const suspendText = isEnglish ? "Suspend" : "إيقاف";
  const suspendTitle = isEnglish ? "Suspend" : "إيقاف";

  const activateText = isEnglish ? "Activate" : "تنشيط";
  const activateTitle = isEnglish ? "Activate" : "تنشيط";

  const deleteText = isEnglish ? "Delete" : "حذف";
  const deleteTitle = isEnglish ? "Delete" : "حذف";

  const assignRoleText = isEnglish ? "Assign Role" : "تعيين دور";
  const assignRoleTitle = isEnglish ? "Assign Role" : "تعيين دور";

  const undefinedText = isEnglish ? "Undefined" : "غير محدد";
  const userText = isEnglish ? "User" : "مستخدم";

  // Loop through customers and add rows
  customersArray.forEach((customer) => {
    if (!customer) {
      console.warn("Skipping undefined or null customer");
      return;
    }

    console.log("Processing customer:", customer);

    const row = document.createElement("tr");

    // Get values with fallbacks
    const username = customer.username || "";
    const registrationDate = formatDate(
      customer.createdAt || customer.registrationDate || new Date()
    );
    const customerId = customer.id || customer._id || "";
    // Extract role ID from various possible formats
    let roleId = null;
    if (customer.roleId) {
      roleId = typeof customer.roleId === 'object' ? (customer.roleId._id || customer.roleId.id) : customer.roleId;
    } else if (customer.role) {
      if (typeof customer.role === 'object') {
        roleId = customer.role._id || customer.role.id;
      } else if (typeof customer.role === 'string') {
        roleId = customer.role;
      }
    }

    row.innerHTML = `
      <td>
        <div class="user-name">${
          escapeHtml(customer.displayName || customer.name || undefinedText)
        }</div>
      </td>
      <td>${escapeHtml(customer.email || undefinedText)}</td>
      <td>${escapeHtml(username || undefinedText)}</td>
      <td>
        <div class="role-badge" data-userid="${escapeHtml(customerId)}" data-role-id="${escapeHtml(roleId || '')}">
          <i class="fas fa-user"></i>
          <span class="role-name-text">${isEnglish ? 'Loading...' : 'جاري التحميل...'}</span>
        </div>
      </td>
      <td>
        <div class="registration-date">${registrationDate}</div>
      </td>
      <td>${customer.loyaltyPoints || 0}</td>
      <td class="actions-cell">
        <div class="account-actions">
          <button class="account-action-btn action-edit-permissions permissions-btn" title="${permissionsTitle}" data-i18n-title="permissions" data-i18n-en-title="Permissions" data-id="${customerId}">
            <i class="fas fa-key"></i> <span data-i18n="permissions" data-i18n-en="Permissions">${permissionsText}</span>
          </button>
          ${
            customer.status === "suspended"
              ? `<button class="account-action-btn action-activate activate-btn" title="${activateTitle}" data-i18n-title="activate" data-i18n-en-title="Activate" data-id="${customerId}">
              <i class="fas fa-user-check"></i> <span data-i18n="activate" data-i18n-en="Activate">${activateText}</span>
            </button>`
              : `<button class="account-action-btn action-suspend suspend-btn" title="${suspendTitle}" data-i18n-title="suspend" data-i18n-en-title="Suspend" data-id="${customerId}">
              <i class="fas fa-user-slash"></i> <span data-i18n="suspend" data-i18n-en="Suspend">${suspendText}</span>
            </button>`
          }
          <button class="account-action-btn action-delete delete-btn" title="${deleteTitle}" data-i18n-title="delete" data-i18n-en-title="Delete" data-id="${customerId}">
            <i class="fas fa-trash-alt"></i> <span data-i18n="delete" data-i18n-en="Delete">${deleteText}</span>
          </button>
          <button class="account-action-btn action-assign-role assign-role-btn" title="${assignRoleTitle}" data-i18n-title="assignRole" data-i18n-en-title="Assign Role" data-id="${customerId}" data-name="${
      customer.displayName || customer.name || username || ""
    }">
            <i class="fas fa-user-tag"></i> <span data-i18n="assignRole" data-i18n-en="Assign Role">${assignRoleText}</span>
          </button>
        </div>
      </td>
    `;

    customerAccountsTable.appendChild(row);
  });

  // Add event listeners for the assign role buttons
  document.querySelectorAll(".assign-role-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const userId = e.currentTarget.getAttribute("data-id");
      const userName = e.currentTarget.getAttribute("data-name");

      // Call openAssignRoleModal from admin-role-management.js
      if (typeof openAssignRoleModal === "function") {
        openAssignRoleModal(userId, userName);
      } else {
        console.error("openAssignRoleModal function not found");
        showNotification(getTranslation("loadRoleManagementFirst"), "error");
      }
    });
  });

  // Add event listeners for role badges to show role details
  document.querySelectorAll(".role-badge").forEach((badge) => {
    badge.addEventListener("click", (e) => {
      const userId = e.currentTarget.getAttribute("data-userid");
      showRoleDetails(userId);
    });
  });

  // Initialize tooltips for the action buttons
  initializeTooltips();

  // Load dynamic role badges
  await loadDynamicRoleBadges(currentLang);
}

/**
 * Load dynamic role badges by fetching role data from database
 * @param {string} language - Current language preference
 */
async function loadDynamicRoleBadges(language) {
  const effectiveLanguage = language || localStorage.getItem("admin-language") || "ar";
  const isEnglish = effectiveLanguage === "en";

  try {
    // Fetch roles from database
    const rolesResponse = await apiService.getRoles();
    const roles = (rolesResponse && rolesResponse.data) || [];
    
    // Create a map of role ID to role data for quick lookup
    const roleMap = new Map();
    roles.forEach(role => {
      if (role && (role._id || role.id)) {
        const roleId = role._id || role.id;
        roleMap.set(roleId, role);
      }
    });

    // Update each role badge
    document.querySelectorAll(".role-badge").forEach((badge) => {
      const roleId = badge.getAttribute("data-role-id");
      const userId = badge.getAttribute("data-userid");
      const textContainer = badge.querySelector(".role-name-text");
      const iconContainer = badge.querySelector("i");
      
      if (!textContainer) return;

      let displayName = isEnglish ? "User" : "مستخدم";
      let roleColor = "#6c757d";
      let roleIcon = "fas fa-user";
      let roleData = null;
      
      if (roleId && roleMap.has(roleId)) {
        // Get role from database
        roleData = roleMap.get(roleId);
        
        // Use appropriate language name
        if (isEnglish && roleData.nameEn) {
          displayName = roleData.nameEn;
        } else if (roleData.name) {
          displayName = roleData.name;
        }
        
        // Use custom color and icon if available
        roleColor = roleData.color || "#6c757d";
        roleIcon = roleData.icon || "fas fa-user";
        
      } else if (roleId) {
        // Handle legacy role IDs or string-based roles
        const legacyRoleNames = {
          "admin": { ar: "مدير", en: "Administrator", color: "#42d158", icon: "fas fa-crown" },
          "editor": { ar: "محرر", en: "Editor", color: "#5b7cff", icon: "fas fa-edit" },
          "viewer": { ar: "مشاهد", en: "Viewer", color: "#6c757d", icon: "fas fa-eye" },
          "cashier": { ar: "كاشير", en: "Cashier", color: "#ff9500", icon: "fas fa-cash-register" },
          "user": { ar: "مستخدم", en: "User", color: "#6c757d", icon: "fas fa-user" }
        };
        
        const legacyRole = legacyRoleNames[roleId.toLowerCase()];
        if (legacyRole) {
          displayName = isEnglish ? legacyRole.en : legacyRole.ar;
          roleColor = legacyRole.color;
          roleIcon = legacyRole.icon;
        } else {
          displayName = roleId;
        }
      }
      
      // Update the badge content and styling
      textContainer.textContent = displayName;
      
      // Update icon
      if (iconContainer) {
        iconContainer.className = roleIcon;
      }
      
      // Apply dynamic colors
      const rgb = hexToRgb(roleColor);
      if (rgb) {
        badge.style.backgroundColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
        badge.style.color = roleColor;
        badge.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
      }
      
      // Remove old static classes and add base class
      badge.className = "role-badge";
      
      // Store role data for future reference
      if (roleData) {
        badge.setAttribute("data-role-name-ar", roleData.name || "");
        badge.setAttribute("data-role-name-en", roleData.nameEn || "");
        badge.setAttribute("data-role-color", roleData.color || "");
        badge.setAttribute("data-role-icon", roleData.icon || "");
      } else {
        badge.setAttribute("data-role-name-ar", displayName);
        badge.setAttribute("data-role-name-en", displayName);
        badge.setAttribute("data-role-color", roleColor);
        badge.setAttribute("data-role-icon", roleIcon);
      }
    });
    
  } catch (error) {
    console.error("Error loading dynamic role badges:", error);
    
    // Fallback: show default role names
    document.querySelectorAll(".role-badge").forEach((badge) => {
      const textContainer = badge.querySelector(".role-name-text");
      if (textContainer) {
        textContainer.textContent = isEnglish ? "User" : "مستخدم";
        badge.className = "role-badge user";
      }
    });
  }
}

/**
 * Update role badges language when language is changed
 * @param {string} language - New language preference
 */
async function updateRoleBadgesLanguage(language) {
  await loadDynamicRoleBadges(language);
}

document.addEventListener("languageChanged", async (event) => {
  const language = event && event.detail ? event.detail.language : null;
  await updateRoleBadgesLanguage(language);
});

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Show role details in a popup
 * @param {string} userId - User ID to fetch role details for
 */
async function showRoleDetails(userId) {
  try {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Show loading notification
    showNotification(
      isEnglish ? "Loading role details..." : "جاري تحميل تفاصيل الدور...",
      "info",
      2000
    );

    // Fetch role details
    const response = await apiService.getUserRole(userId);

    if (!response || !response.success) {
      throw new Error(
        isEnglish ? "Failed to load role details" : "فشل في تحميل تفاصيل الدور"
      );
    }

    const roleData = response.data;

    // If no role found or no permissions to display
    if (!roleData || (!roleData.role && !roleData.roleName)) {
      showNotification(
        isEnglish ? "No role details found" : "لا توجد تفاصيل للدور",
        "warning"
      );
      return;
    }

    // Get role permissions from response
    let roleName = roleData.roleName || (isEnglish ? "User" : "مستخدم");

    // If we have a role object with English name and language is English, use it
    if (roleData.role && roleData.role.nameEn && isEnglish) {
      roleName = roleData.role.nameEn;
    } else if (roleData.role && roleData.role.name) {
      roleName = roleData.role.name;
    }

    const permissions = roleData.role?.permissions || {};

    // Create permissions display HTML
    const permissionsHTML = Object.entries(permissions)
      .map(([key, value]) => {
        const icon = value
          ? '<i class="fas fa-check text-success"></i>'
          : '<i class="fas fa-times text-danger"></i>';
        let permName = key;

        // Map permission keys to localized names
        switch (key) {
          case "adminPanel":
            permName = isEnglish ? "Admin Panel" : "لوحة الإدارة";
            break;
          case "cashier":
            permName = isEnglish ? "Cashier" : "الكاشير";
            break;
          case "kitchen":
            permName = isEnglish ? "Kitchen" : "المطبخ";
            break;
          case "stats":
            permName = isEnglish ? "Statistics" : "الإحصائيات";
            break;
          case "productsView":
            permName = isEnglish ? "View Products" : "عرض المنتجات";
            break;
          case "productsEdit":
            permName = isEnglish ? "Edit Products" : "تعديل المنتجات";
            break;
          case "vouchersView":
            permName = isEnglish ? "View Vouchers" : "عرض القسائم";
            break;
          case "vouchersEdit":
            permName = isEnglish ? "Edit Vouchers" : "تعديل القسائم";
            break;
          case "reservations":
            permName = isEnglish ? "Reservations" : "الحجوزات";
            break;
          case "tax":
            permName = isEnglish ? "Tax" : "الضرائب";
            break;
          case "points":
            permName = isEnglish ? "Loyalty Points" : "نقاط الولاء";
            break;
          case "accounts":
            permName = isEnglish ? "Account Management" : "إدارة الحسابات";
            break;
          case "qr":
            permName = isEnglish ? "QR Code" : "رمز QR";
            break;
        }

        return `
          <div class="permission-item">
            <span class="permission-name">${permName}</span>
            <span class="permission-value">${icon}</span>
          </div>
        `;
      })
      .join("");

    // Create and show custom modal
    const modalHTML = `
      <div class="role-details-modal-content">
        <div class="role-details-header">
          <h3>${roleName}</h3>
          <span class="close-modal">&times;</span>
        </div>
        <div class="role-details-body">
          <div class="role-permissions-list">
            ${
              permissionsHTML ||
              `<div class="no-permissions">${
                isEnglish
                  ? "No specific permissions defined"
                  : "لا توجد صلاحيات محددة"
              }</div>`
            }
          </div>
        </div>
      </div>
    `;

    // Create modal container if it doesn't exist
    let roleDetailsModal = document.getElementById("role-details-modal");

    if (!roleDetailsModal) {
      roleDetailsModal = document.createElement("div");
      roleDetailsModal.id = "role-details-modal";
      roleDetailsModal.className = "modal";
      document.body.appendChild(roleDetailsModal);
    }

    // Add content and show modal
    roleDetailsModal.innerHTML = modalHTML;
    roleDetailsModal.classList.add("show");

    // Add close event listener
    const closeButton = roleDetailsModal.querySelector(".close-modal");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        roleDetailsModal.classList.remove("show");
      });
    }

    // Close modal when clicking outside
    roleDetailsModal.addEventListener("click", (e) => {
      if (e.target === roleDetailsModal) {
        roleDetailsModal.classList.remove("show");
      }
    });
  } catch (error) {
    console.error("Error showing role details:", error);

    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    showNotification(
      error.message ||
        (isEnglish
          ? "Failed to display role details"
          : "فشل في عرض تفاصيل الدور"),
      "error"
    );
  }
}

// Render pagination
function renderPagination(pagination) {
  if (!pagination) return;

  // Get current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  totalPages = pagination.totalPages || 1;
  currentPage = pagination.currentPage || 1;

  let html = "";

  // Previous button
  html += `
    <button class="pagination-button" data-page="prev" ${
      currentPage === 1 ? "disabled" : ""
    }>
      <i class="fas fa-chevron-${isEnglish ? "left" : "right"}"></i>
    </button>
  `;

  // Calculate page range
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);

  if (endPage - startPage < 4 && totalPages > 4) {
    startPage = Math.max(1, endPage - 4);
  }

  // Page buttons
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="pagination-button ${
        i === currentPage ? "active" : ""
      }" data-page="${i}">
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button class="pagination-button" data-page="next" ${
      currentPage === totalPages ? "disabled" : ""
    }>
      <i class="fas fa-chevron-${isEnglish ? "right" : "left"}"></i>
    </button>
  `;

  // Page info
  html += `
    <span class="page-info">
      ${
        isEnglish
          ? `Page ${currentPage} of ${totalPages}`
          : `صفحة ${currentPage} من ${totalPages}`
      }
    </span>
  `;

  accountsPagination.innerHTML = html;
}

// Handle pagination click
function handlePaginationClick(event) {
  const target = event.target.closest(".pagination-button");
  if (!target || target.disabled) return;

  const page = target.dataset.page;

  if (page === "prev") {
    changePage(currentPage - 1);
  } else if (page === "next") {
    changePage(currentPage + 1);
  } else {
    changePage(parseInt(page));
  }
}

// Change page
function changePage(page) {
  if (page < 1 || page > totalPages) return;

  currentPage = page;
  loadCustomerAccounts();

  // No need to scroll since we've removed the scrollbar
}

// Open permissions modal
async function openPermissionsModal(customerId) {
  try {
    console.log("🔄 Opening permissions modal for customer:", customerId);

    // Reset form state first to ensure clean state
    resetPermissionsForm();

    selectedCustomerId = customerId;
    permissionCustomerId.value = customerId;

    // Add opening animation class
    document.body.classList.add("modal-open");
    accountPermissionsModal.classList.add("show");

    // Show loading state in the modal
    const modalBody = accountPermissionsModal.querySelector(".modal-body");
    const originalContent = modalBody.innerHTML;
    modalBody.innerHTML = `
      <div class="modal-loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>جاري تحميل صلاحيات المستخدم...</p>
      </div>
    `;

    // Set default permission values (all unchecked)
    const permissions = {
      adminPanel: false,
      cashier: false,
      kitchen: false,
      stats: false,
      productsView: false,
      productsEdit: false,
      vouchersView: false,
      vouchersEdit: false,
      reservations: false,
      tax: false,
      points: false,
      accounts: false,
      qr: false,
      username: "المستخدم", // Default username
    };

    // Try to get account info for better user experience
    try {
      const accountResponse = await apiService.getCustomerAccount(customerId);
      console.log("Account response:", JSON.stringify(accountResponse));

      if (accountResponse && accountResponse.success && accountResponse.data) {
        const userData = accountResponse.data;
        // Get username with proper fallbacks
        permissions.username =
          userData.displayName ||
          userData.name ||
          userData.username ||
          userData.userName ||
          userData.user_name ||
          userData.email ||
          "المستخدم";

        // Get current permissions
        if (userData.permissions) {
          console.log(
            "Current permissions from API:",
            JSON.stringify(userData.permissions)
          );
          Object.assign(permissions, userData.permissions);
        }
      }
    } catch (error) {
      console.log("Could not fetch customer details:", error);
    }

    // Restore original content
    modalBody.innerHTML = originalContent;

    // Set username in the modal header
    const userDisplayName = document.getElementById("user-display-name");
    if (userDisplayName) {
      userDisplayName.textContent = `(${permissions.username})`;
      userDisplayName.classList.add("animate-fade-in");
    }

    console.log("Setting checkbox values:", JSON.stringify(permissions));

    // Set checkboxes based on permissions, ensuring they're actually attached to the DOM
    setTimeout(() => {
      const adminPanelCheckbox = document.getElementById(
        "customer-perm-admin-panel"
      );
      const cashierCheckbox = document.getElementById("customer-perm-cashier");
      const statsCheckbox = document.getElementById("customer-perm-stats");
      const productsViewCheckbox = document.getElementById(
        "customer-perm-products-view"
      );
      const productsEditCheckbox = document.getElementById(
        "customer-perm-products-edit"
      );
      const vouchersViewCheckbox = document.getElementById(
        "customer-perm-vouchers-view"
      );
      const vouchersEditCheckbox = document.getElementById(
        "customer-perm-vouchers-edit"
      );
      const reservationsCheckbox = document.getElementById(
        "customer-perm-reservations"
      );
      const taxCheckbox = document.getElementById("customer-perm-tax");
      const pointsCheckbox = document.getElementById("customer-perm-points");
      const accountsCheckbox = document.getElementById(
        "customer-perm-accounts"
      );
      const qrCheckbox = document.getElementById("customer-perm-qr");

      if (
        !adminPanelCheckbox ||
        !cashierCheckbox ||
        !statsCheckbox ||
        !productsViewCheckbox ||
        !productsEditCheckbox ||
        !vouchersViewCheckbox ||
        !vouchersEditCheckbox ||
        !reservationsCheckbox ||
        !taxCheckbox ||
        !pointsCheckbox ||
        !accountsCheckbox ||
        !qrCheckbox
      ) {
        console.error("One or more permission checkboxes not found");
        return;
      }

      // Set checkbox values
      adminPanelCheckbox.checked = permissions.adminPanel === true;
      cashierCheckbox.checked = permissions.cashier === true;
      statsCheckbox.checked = permissions.stats === true;
      productsViewCheckbox.checked = permissions.productsView === true;
      productsEditCheckbox.checked = permissions.productsEdit === true;
      vouchersViewCheckbox.checked = permissions.vouchersView === true;
      vouchersEditCheckbox.checked = permissions.vouchersEdit === true;
      reservationsCheckbox.checked = permissions.reservations === true;
      taxCheckbox.checked = permissions.tax === true;
      pointsCheckbox.checked = permissions.points === true;
      accountsCheckbox.checked = permissions.accounts === true;
      qrCheckbox.checked = permissions.qr === true;

      console.log("Checkbox values after setting:");
      console.log("- adminPanel:", adminPanelCheckbox?.checked);
      console.log("- cashier:", cashierCheckbox?.checked);
      console.log("- stats:", statsCheckbox?.checked);
      console.log("- productsView:", productsViewCheckbox?.checked);
      console.log("- productsEdit:", productsEditCheckbox?.checked);
      console.log("- vouchersView:", vouchersViewCheckbox?.checked);
      console.log("- vouchersEdit:", vouchersEditCheckbox?.checked);
      console.log("- reservations:", reservationsCheckbox?.checked);
      console.log("- tax:", taxCheckbox?.checked);
      console.log("- points:", pointsCheckbox?.checked);
      console.log("- accounts:", accountsCheckbox?.checked);
      console.log("- qr:", qrCheckbox?.checked);
    }, 100); // Small delay to ensure DOM is updated

    // Add subtle animation to the permission groups
    const permissionGroups =
      accountPermissionsModal.querySelectorAll(".permissions-group");
    permissionGroups.forEach((group, index) => {
      setTimeout(() => {
        group.classList.add("fade-in");
      }, 100 * (index + 1));
    });
  } catch (error) {
    console.error("Error opening permissions modal:", error);
    showNotification(getTranslation("errorOpeningPermissionsModal"), "error");
    closeModal();
  }
}

// Reset permissions form to default state
function resetPermissionsForm() {
  console.log("🔄 Resetting permissions form...");

  // Reset all permission checkboxes to unchecked
  const permissionCheckboxes = accountPermissionsModal.querySelectorAll(
    'input[type="checkbox"]'
  );
  permissionCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  // Reset the customer ID field
  if (permissionCustomerId) {
    permissionCustomerId.value = "";
  }

  // Reset user display name
  const userDisplayName = document.getElementById("user-display-name");
  if (userDisplayName) {
    userDisplayName.textContent = "";
    userDisplayName.classList.remove("animate-fade-in");
  }

  // Reset any loading states in the modal body
  const modalBody = accountPermissionsModal.querySelector(".modal-body");
  if (modalBody) {
    // Remove any loading spinners or temporary content
    const loadingElements = modalBody.querySelectorAll(".modal-loading");
    loadingElements.forEach((element) => element.remove());
  }

  console.log("✅ Permissions form reset completed");
}

// Close permissions modal
function closeModal() {
  // Add closing animation
  accountPermissionsModal.classList.add("fade-out");

  // Remove classes after animation completes
  setTimeout(() => {
    accountPermissionsModal.classList.remove("show", "fade-out");
    document.body.classList.remove("modal-open");

    // Reset form state
    const userDisplayName = document.getElementById("user-display-name");
    if (userDisplayName) {
      userDisplayName.textContent = "";
      userDisplayName.classList.remove("animate-fade-in");
    }

    const permissionGroups =
      accountPermissionsModal.querySelectorAll(".permissions-group");
    permissionGroups.forEach((group) => {
      group.classList.remove("fade-in");
    });

    // Reset all form fields to default state
    resetPermissionsForm();

    // Reset global variables
    selectedCustomerId = null;
    permissionCustomerId.value = "";

    // Reset button states using i18n
    const savePermissionsText =
      getTranslation("savePermissions") || "حفظ الصلاحيات";
    savePermissionsBtn.innerHTML = `<i class="fas fa-save"></i> ${savePermissionsText}`;
    savePermissionsBtn.disabled = false;
    cancelPermissionsBtn.disabled = false;

    // Remove any loading/saving states
    accountPermissionsModal
      .querySelector(".modal-content")
      .classList.remove("saving");

    console.log("🔄 Modal closed and form reset");
  }, 300);
}

// Save permissions
async function savePermissions() {
  if (!selectedCustomerId) return;

  try {
    // Show loading state on button using i18n
    const savingText = getTranslation("saving") || "جاري الحفظ...";
    savePermissionsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${savingText}`;
    savePermissionsBtn.disabled = true;
    cancelPermissionsBtn.disabled = false;

    // Add visual feedback to the modal
    accountPermissionsModal
      .querySelector(".modal-content")
      .classList.add("saving");

    // Debug the checkboxes
    console.log("adminPanelPerm checked state:", adminPanelPerm.checked);
    console.log("adminPanelPerm element:", adminPanelPerm);

    // Force re-read checkbox values directly from DOM to ensure they're current
    const currentAdminPanelValue = document.getElementById(
      "customer-perm-admin-panel"
    ).checked;
    const currentCashierValue = document.getElementById(
      "customer-perm-cashier"
    ).checked;
    const currentStatsValue = document.getElementById(
      "customer-perm-stats"
    ).checked;
    const currentProductsViewValue = document.getElementById(
      "customer-perm-products-view"
    ).checked;
    const currentProductsEditValue = document.getElementById(
      "customer-perm-products-edit"
    ).checked;
    const currentVouchersViewValue = document.getElementById(
      "customer-perm-vouchers-view"
    ).checked;
    const currentVouchersEditValue = document.getElementById(
      "customer-perm-vouchers-edit"
    ).checked;
    const currentReservationsValue = document.getElementById(
      "customer-perm-reservations"
    ).checked;
    const currentTaxValue =
      document.getElementById("customer-perm-tax").checked;
    const currentPointsValue = document.getElementById(
      "customer-perm-points"
    ).checked;
    const currentAccountsValue = document.getElementById(
      "customer-perm-accounts"
    ).checked;
    const currentQRValue = document.getElementById("customer-perm-qr").checked;

    console.log("Direct DOM check values:");
    console.log("- adminPanel:", currentAdminPanelValue);
    console.log("- cashier:", currentCashierValue);
    console.log("- stats:", currentStatsValue);
    console.log("- productsView:", currentProductsViewValue);
    console.log("- productsEdit:", currentProductsEditValue);
    console.log("- vouchersView:", currentVouchersViewValue);
    console.log("- vouchersEdit:", currentVouchersEditValue);
    console.log("- reservations:", currentReservationsValue);
    console.log("- tax:", currentTaxValue);
    console.log("- points:", currentPointsValue);
    console.log("- accounts:", currentAccountsValue);
    console.log("- qr:", currentQRValue);

    // Collect permissions from checkboxes using the direct DOM values
    const permissions = {
      adminPanel: currentAdminPanelValue,
      cashier: currentCashierValue,
      stats: currentStatsValue,
      productsView: currentProductsViewValue,
      productsEdit: currentProductsEditValue,
      vouchersView: currentVouchersViewValue,
      vouchersEdit: currentVouchersEditValue,
      reservations: currentReservationsValue,
      tax: currentTaxValue,
      points: currentPointsValue,
      accounts: currentAccountsValue,
      qr: currentQRValue,
    };

    console.log("Sending permissions update:", JSON.stringify(permissions));
    console.log("Customer ID:", selectedCustomerId);

    // Send to API
    const response = await apiService.updateCustomerPermissions(
      selectedCustomerId,
      permissions
    );

    console.log("API Response:", JSON.stringify(response));

    // Remove saving state
    accountPermissionsModal
      .querySelector(".modal-content")
      .classList.remove("saving");

    if (response && response.success) {
      // Show success state
      savePermissionsBtn.innerHTML = '<i class="fas fa-check"></i> تم الحفظ';
      savePermissionsBtn.classList.add("saved");

      // Show notification
      showNotification(getTranslation("userPermissionsUpdated"));

      // Briefly highlight the updated row in the table
      const userRow = document.querySelector(
        `tr[data-customer-id="${selectedCustomerId}"]`
      );
      if (userRow) {
        userRow.classList.add("highlight-row");
        setTimeout(() => {
          userRow.classList.remove("highlight-row");
        }, 2000);
      }

      // Check if current user's permissions are being updated
      // This will only update the session if the edited user is the current logged-in user
      updateCurrentUserPermissions(selectedCustomerId, permissions);

      // Close modal after a brief delay
      setTimeout(() => {
        savePermissionsBtn.classList.remove("saved");
        closeModal();
      }, 1200);
    } else {
      showNotification(
        response.message || "فشل في تحديث صلاحيات المستخدم",
        "error"
      );
      // Reset button state
      savePermissionsBtn.innerHTML =
        '<i class="fas fa-save"></i> حفظ الصلاحيات';
      savePermissionsBtn.disabled = false;
      cancelPermissionsBtn.disabled = false;
    }
  } catch (error) {
    console.error("Error saving permissions:", error);
    showNotification(getTranslation("errorSavingPermissions"), "error");

    // Reset button state
    accountPermissionsModal
      .querySelector(".modal-content")
      .classList.remove("saving");
    savePermissionsBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الصلاحيات';
    savePermissionsBtn.disabled = false;
    cancelPermissionsBtn.disabled = false;
  }
}

// Check if current user's permissions are being updated
function updateCurrentUserPermissions(customerId, permissions) {
  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("No session data found");
    return false;
  }

  try {
    const session = JSON.parse(sessionData);
    console.log("🔍 Session data:", session);
    console.log("🔍 Current session userId:", session.userId);
    console.log("🔍 Updated customerId:", customerId);
    console.log("🔍 Session userId type:", typeof session.userId);
    console.log("🔍 CustomerId type:", typeof customerId);

    // Convert both to strings for comparison to handle different formats
    const sessionUserIdStr = String(session.userId);
    const customerIdStr = String(customerId);

    console.log("🔍 Session userId as string:", sessionUserIdStr);
    console.log("🔍 CustomerId as string:", customerIdStr);

    // If this is the current logged-in user, update their session permissions
    if (sessionUserIdStr === customerIdStr) {
      console.log("✅ Updating current user's permissions in session");
      console.log("Old permissions:", session.permissions);
      console.log("New permissions:", permissions);

      session.permissions = permissions;
      localStorage.setItem("adminSession", JSON.stringify(session));

      // Dispatch a custom event to notify the application about permission changes
      const permissionsChangedEvent = new CustomEvent("permissionsChanged", {
        detail: { permissions },
      });
      document.dispatchEvent(permissionsChangedEvent);
      console.log("✅ Permissions changed event dispatched");
      return true;
    } else {
      console.log("❌ Not the current user, no session update needed");
      console.log(
        "❌ Comparison failed:",
        sessionUserIdStr,
        "!=",
        customerIdStr
      );
    }
  } catch (error) {
    console.error("Error updating session permissions:", error);
  }

  return false;
}

// Show loading indicator
function showLoading(element) {
  element.innerHTML = `
    <tr>
      <td colspan="7" class="loading-message">
        <div class="loading-spinner"></div>
        <p>جاري تحميل حسابات العملاء...</p>
      </td>
    </tr>
  `;
}

// Handle customer action button clicks
function handleCustomerAction(event) {
  const target =
    event.target.closest(".account-action-btn") ||
    event.target.closest(".action-btn");
  if (!target) return;

  const customerId = target.dataset.id;

  if (target.classList.contains("permissions-btn")) {
    openPermissionsModal(customerId);
  } else if (target.classList.contains("suspend-btn")) {
    suspendAccount(customerId, target);
  } else if (target.classList.contains("activate-btn")) {
    activateAccount(customerId, target);
  } else if (target.classList.contains("delete-btn")) {
    deleteAccount(customerId, target);
  } else if (target.classList.contains("assign-role-btn")) {
    // Handle by the event listener added in renderCustomerAccounts
  }
}

// Suspend account
async function suspendAccount(customerId, buttonElement) {
  try {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Confirm action with appropriate language
    const confirmMessage = isEnglish
      ? "Are you sure you want to suspend this account?"
      : "هل أنت متأكد من رغبتك في إيقاف هذا الحساب؟";

    if (!confirm(confirmMessage)) {
      return;
    }

    // Set loading state
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    // Call the API to update customer status
    const response = await apiService.suspendCustomerAccount(customerId);

    if (response.success) {
      // Success message
      const successMessage = isEnglish
        ? "Account suspended successfully"
        : "تم إيقاف الحساب بنجاح";
      showNotification(successMessage);

      // Update the button to "activate" instead of refreshing the entire list
      const activateText = isEnglish ? "Activate" : "تنشيط";
      buttonElement.innerHTML = `<i class="fas fa-user-check"></i> <span data-i18n="activate" data-i18n-en="Activate">${activateText}</span>`;
      buttonElement.classList.remove("action-suspend", "suspend-btn");
      buttonElement.classList.add("action-activate", "activate-btn");
      buttonElement.disabled = false;
      buttonElement.dataset.action = "activate";
      buttonElement.setAttribute(
        "data-tooltip",
        isEnglish ? "Activate account" : "تفعيل الحساب"
      );
      buttonElement.setAttribute("data-i18n-title", "activate");
      buttonElement.setAttribute("data-i18n-en-title", "Activate");

      // Update the row status - find by either data-id or data-customer-id
      const row = document.querySelector(
        `tr[data-id="${customerId}"], tr[data-customer-id="${customerId}"]`
      );
      if (row) {
        row.classList.remove("account-active");
        row.classList.add("account-suspended");

        // Add status icon if it doesn't exist
        const nameCell = row.querySelector("td:first-child");
        const customerNameSpan = row.querySelector(".customer-name");
        if (nameCell && !row.querySelector(".status-icon.suspended")) {
          // Insert the icon before the name
          const statusIcon = document.createElement("i");
          statusIcon.className = "fas fa-ban status-icon suspended";
          nameCell.insertBefore(statusIcon, customerNameSpan);
        }
      }
    } else {
      // Error message
      const errorMessage = isEnglish
        ? response.message || "Failed to suspend account"
        : response.message || "فشل في إيقاف الحساب";
      showNotification(errorMessage, "error");
      // Reset button
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
    }
  } catch (error) {
    console.error("Error suspending account:", error);

    // Get current language for error message
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";
    const errorMessage = isEnglish
      ? "An error occurred while trying to suspend the account"
      : "حدث خطأ أثناء محاولة إيقاف الحساب";

    showNotification(errorMessage, "error");
    buttonElement.innerHTML = originalHTML;
    buttonElement.disabled = false;
  }
}

// Activate account
async function activateAccount(customerId, buttonElement) {
  try {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Confirm action with appropriate language
    const confirmMessage = isEnglish
      ? "Are you sure you want to activate this account?"
      : "هل أنت متأكد من رغبتك في تنشيط هذا الحساب؟";

    if (!confirm(confirmMessage)) {
      return;
    }

    // Set loading state
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    // Call the API to activate customer account
    const response = await apiService.activateCustomerAccount(customerId);

    if (response.success) {
      // Success message
      const successMessage = isEnglish
        ? "Account activated successfully"
        : "تم تفعيل الحساب بنجاح";
      showNotification(successMessage);

      // Update the button to "suspend" instead of refreshing the entire list
      const suspendText = isEnglish ? "Suspend" : "إيقاف";
      buttonElement.innerHTML = `<i class="fas fa-user-slash"></i> <span data-i18n="suspend" data-i18n-en="Suspend">${suspendText}</span>`;
      buttonElement.classList.remove("action-activate", "activate-btn");
      buttonElement.classList.add("action-suspend", "suspend-btn");
      buttonElement.disabled = false;
      buttonElement.dataset.action = "suspend";
      buttonElement.setAttribute(
        "data-tooltip",
        isEnglish ? "Suspend account" : "إيقاف الحساب"
      );
      buttonElement.setAttribute("data-i18n-title", "suspend");
      buttonElement.setAttribute("data-i18n-en-title", "Suspend");

      // Update the row status - find by either data-id or data-customer-id
      const row = document.querySelector(
        `tr[data-id="${customerId}"], tr[data-customer-id="${customerId}"]`
      );
      if (row) {
        row.classList.remove("account-suspended");
        row.classList.add("account-active");

        // Remove status icon if it exists
        const statusIcon = row.querySelector(".status-icon.suspended");
        if (statusIcon) {
          statusIcon.remove();
        }
      }
    } else {
      // Error message
      const errorMessage = isEnglish
        ? response.message || "Failed to activate account"
        : response.message || "فشل في تفعيل الحساب";
      showNotification(errorMessage, "error");
      // Reset button
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
    }
  } catch (error) {
    console.error("Error activating account:", error);

    // Get current language for error message
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";
    const errorMessage = isEnglish
      ? "An error occurred while trying to activate the account"
      : "حدث خطأ أثناء محاولة تفعيل الحساب";

    showNotification(errorMessage, "error");
    buttonElement.innerHTML = originalHTML;
    buttonElement.disabled = false;
  }
}

// Delete account
async function deleteAccount(customerId, buttonElement) {
  try {
    // Get current language
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Confirm deletion with appropriate language
    const confirmMessage = isEnglish
      ? "Are you sure you want to delete this account? This action cannot be undone."
      : "هل أنت متأكد من رغبتك في حذف هذا الحساب؟ هذا الإجراء لا يمكن التراجع عنه.";

    if (!confirm(confirmMessage)) {
      return;
    }

    // Set loading state
    const originalHTML = buttonElement.innerHTML;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    buttonElement.disabled = true;

    // Find the row
    const row = document.querySelector(
      `tr[data-id="${customerId}"], tr[data-customer-id="${customerId}"]`
    );

    // Call the API to delete the account
    const response = await apiService.deleteCustomerAccount(customerId);

    if (response.success) {
      // Success message
      const successMessage = isEnglish
        ? "Account deleted successfully"
        : "تم حذف الحساب بنجاح";
      showNotification(successMessage);

      // Animate row deletion
      if (row) {
        row.classList.add("row-deleted");
        // Remove row after animation
        setTimeout(() => {
          if (row.parentNode) {
            row.parentNode.removeChild(row);
          }
          // Reload accounts if the list is now empty
          const remainingRows = customerAccountsTable.querySelectorAll(
            "tr:not(.row-deleted)"
          );
          if (remainingRows.length === 0) {
            loadCustomerAccounts();
          }
        }, 500);
      } else {
        // If row not found, reload the list
        loadCustomerAccounts();
      }
    } else {
      // Error message
      const errorMessage = isEnglish
        ? response.message || "Failed to delete account"
        : response.message || "فشل في حذف الحساب";
      showNotification(errorMessage, "error");
      // Reset button
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
    }
  } catch (error) {
    console.error("Error deleting account:", error);

    // Get current language for error message
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";
    const errorMessage = isEnglish
      ? "An error occurred while trying to delete the account"
      : "حدث خطأ أثناء محاولة حذف الحساب";

    showNotification(errorMessage, "error");
    buttonElement.innerHTML = originalHTML;
    buttonElement.disabled = false;
  }
}

// Initialize tooltips
function initializeTooltips() {
  const tooltipElements = document.querySelectorAll("[data-tooltip]");

  tooltipElements.forEach((element) => {
    element.addEventListener("mouseenter", function (e) {
      const tooltipText = this.getAttribute("data-tooltip");

      // Create tooltip element
      const tooltip = document.createElement("div");
      tooltip.className = "account-tooltip";
      tooltip.textContent = tooltipText;
      tooltip.style.direction = "rtl"; // Ensure proper RTL display for Arabic text

      // Add tooltip to DOM first to calculate dimensions
      document.body.appendChild(tooltip);

      // Calculate position
      const rect = this.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      // Center tooltip horizontally over the element
      tooltip.style.left =
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";

      // Position above the element with proper spacing
      tooltip.style.top =
        rect.top + scrollTop - tooltip.offsetHeight - 10 + "px";

      // Add visible class for transition
      setTimeout(() => tooltip.classList.add("visible"), 10);

      // Store reference to tooltip
      this.tooltip = tooltip;
    });

    element.addEventListener("mouseleave", function () {
      if (this.tooltip) {
        this.tooltip.classList.remove("visible");
        // Remove after transition
        setTimeout(() => {
          if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
          }
          this.tooltip = null;
        }, 200);
      }
    });
  });
}

// POINTS NOTIFICATION SYSTEM - Matches admin notification style
function showPointsNotification(message, type = "success") {
  // Remove any existing points notifications
  const existingNotif = document.getElementById("points-notification-fixed");
  if (existingNotif) {
    existingNotif.remove();
  }

  // Create notification element with fixed ID
  const notification = document.createElement("div");
  notification.id = "points-notification-fixed";
  notification.className = `points-notification ${type}`;

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

// Handle filter accounts
function handleFilterAccounts() {
  try {
    const currentLang = localStorage.getItem("admin-language") || "ar";
    const isEnglish = currentLang === "en";

    // Ensure filters state is loaded from storage once
    try {
      const saved = localStorage.getItem("accountsFilters");
      if (saved) {
        currentAccountFilters = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse saved filters:", e);
    }

    if (!accountsFilterModal) {
      accountsFilterModal = document.createElement("div");
      accountsFilterModal.id = "accounts-filter-modal";
      accountsFilterModal.className = "modal";

      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";

      modalContent.innerHTML = `
        <div class="modal-header">
          <h3>${isEnglish ? "Filter Accounts" : "تصفية الحسابات"}</h3>
          <span class="close-modal" aria-label="Close">&times;</span>
        </div>
        <div class="modal-body">
          <form id="accounts-filter-form" onsubmit="return false;">
            <div class="form-row">
              <div class="form-group">
                <label for="accounts-filter-status">${
                  isEnglish ? "Status" : "الحالة"
                }:</label>
                <select id="accounts-filter-status">
                  <option value="all">${isEnglish ? "All" : "الكل"}</option>
                  <option value="active">${
                    isEnglish ? "Active" : "نشط"
                  }</option>
                  <option value="suspended">${
                    isEnglish ? "Suspended" : "موقوف"
                  }</option>
                </select>
              </div>
              <div class="form-group">
                <label for="accounts-filter-role">${
                  isEnglish ? "Role" : "الدور"
                }:</label>
                <select id="accounts-filter-role">
                  <option value="">${isEnglish ? "Any" : "أي"}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="accounts-filter-from">${
                  isEnglish ? "From date" : "من تاريخ"
                }:</label>
                <input type="date" id="accounts-filter-from" />
              </div>
              <div class="form-group">
                <label for="accounts-filter-to">${
                  isEnglish ? "To date" : "إلى تاريخ"
                }:</label>
                <input type="date" id="accounts-filter-to" />
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="accounts-filters-clear" class="secondary-btn">${
            isEnglish ? "Clear" : "مسح"
          }</button>
          <button id="accounts-filters-apply" class="primary-btn">${
            isEnglish ? "Apply" : "تطبيق"
          }</button>
        </div>
      `;

      accountsFilterModal.appendChild(modalContent);
      document.body.appendChild(accountsFilterModal);

      // Close handlers
      const closeEl = modalContent.querySelector(".close-modal");
      closeEl.addEventListener("click", () =>
        accountsFilterModal.classList.remove("show")
      );
      accountsFilterModal.addEventListener("click", (e) => {
        if (e.target === accountsFilterModal)
          accountsFilterModal.classList.remove("show");
      });

      // Apply handler
      modalContent
        .querySelector("#accounts-filters-apply")
        .addEventListener("click", async () => {
          const statusEl = modalContent.querySelector(
            "#accounts-filter-status"
          );
          const roleEl = modalContent.querySelector("#accounts-filter-role");
          const fromEl = modalContent.querySelector("#accounts-filter-from");
          const toEl = modalContent.querySelector("#accounts-filter-to");

          currentAccountFilters = {
            status: statusEl.value,
            role: roleEl.value,
            dateFrom: fromEl.value,
            dateTo: toEl.value,
          };

          try {
            localStorage.setItem(
              "accountsFilters",
              JSON.stringify(currentAccountFilters)
            );
          } catch (e) {
            console.warn("Failed to save accounts filters:", e);
          }

          accountsFilterModal.classList.remove("show");
          currentPage = 1;
          await loadCustomerAccounts();
          showNotification(
            isEnglish ? "Filters applied" : "تم تطبيق عوامل التصفية",
            "success"
          );
        });

      // Clear handler
      modalContent
        .querySelector("#accounts-filters-clear")
        .addEventListener("click", async () => {
          currentAccountFilters = {
            status: "all",
            role: "",
            dateFrom: "",
            dateTo: "",
          };
          try {
            localStorage.removeItem("accountsFilters");
          } catch (_) {}
          // Reset inputs
          modalContent.querySelector("#accounts-filter-status").value = "all";
          modalContent.querySelector("#accounts-filter-role").value = "";
          modalContent.querySelector("#accounts-filter-from").value = "";
          modalContent.querySelector("#accounts-filter-to").value = "";
          accountsFilterModal.classList.remove("show");
          currentPage = 1;
          await loadCustomerAccounts();
          showNotification(
            isEnglish ? "Filters cleared" : "تم مسح عوامل التصفية",
            "info"
          );
        });
    }

    // Populate roles each time we open to reflect latest
    (async () => {
      try {
        const roleSelect = accountsFilterModal.querySelector(
          "#accounts-filter-role"
        );
        // Clear except the first option
        roleSelect.innerHTML = `<option value="">${
          isEnglish ? "Any" : "أي"
        }</option>`;
        const rolesResp = await apiService.getRoles();
        const roles = (rolesResp && rolesResp.data) || [];
        roles.forEach((r) => {
          if (!r) return;
          // Use English name if available and language is English, otherwise use Arabic name
          const name = isEnglish && r.nameEn ? r.nameEn : r.name || r.roleName;
          if (!name) return;
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          roleSelect.appendChild(opt);
        });
      } catch (err) {
        console.warn("Failed to load roles for filters:", err);
      }
    })();

    // Set current values
    try {
      const statusEl = accountsFilterModal.querySelector(
        "#accounts-filter-status"
      );
      const roleEl = accountsFilterModal.querySelector("#accounts-filter-role");
      const fromEl = accountsFilterModal.querySelector("#accounts-filter-from");
      const toEl = accountsFilterModal.querySelector("#accounts-filter-to");

      statusEl.value = currentAccountFilters.status || "all";
      fromEl.value = currentAccountFilters.dateFrom || "";
      toEl.value = currentAccountFilters.dateTo || "";

      // Delay setting role until roles are populated
      setTimeout(() => {
        try {
          const roleElLate = accountsFilterModal.querySelector(
            "#accounts-filter-role"
          );
          roleElLate.value = currentAccountFilters.role || "";
        } catch (_) {}
      }, 300);
    } catch (e) {
      console.warn("Failed to set filter defaults:", e);
    }

    // Show modal
    accountsFilterModal.classList.add("show");
  } catch (error) {
    console.error("Error opening accounts filter modal:", error);
    showNotification(getTranslation("cannotOpenFilterModal"), "error");
  }
}

// Handle refresh accounts
function handleRefreshAccounts() {
  // Add refresh animation to the button
  if (!refreshAccountsBtn) {
    console.warn("Refresh accounts button not found");
    loadCustomerAccounts();
    return;
  }

  const refreshIcon = refreshAccountsBtn.querySelector("i");
  if (refreshIcon) {
    refreshIcon.classList.add("fa-spin");
  }

  // Clear existing search and reset to page 1
  if (customerSearchInput) {
    customerSearchInput.value = "";
  }
  currentSearch = "";
  currentPage = 1;

  // Reload accounts
  try {
    loadCustomerAccounts()
      .then(() => {
        // Stop animation after loading
        setTimeout(() => {
          if (refreshIcon) {
            refreshIcon.classList.remove("fa-spin");
          }
          showNotification(getTranslation("customerListRefreshed"));
        }, 500);
      })
      .catch((error) => {
        console.error("Error refreshing customer accounts:", error);
        if (refreshIcon) {
          refreshIcon.classList.remove("fa-spin");
        }
        showNotification(
          "فشل تحديث قائمة العملاء. يرجى المحاولة مرة أخرى",
          "error"
        );
      });
  } catch (error) {
    console.error("Exception during refresh:", error);
    if (refreshIcon) {
      refreshIcon.classList.remove("fa-spin");
    }
    showNotification(getTranslation("errorRefreshingCustomers"), "error");
  }
}

// Save loyalty points settings
async function saveLoyaltyPointsSettings() {
  const exchangeRate = parseInt(pointsExchangeRateInput.value, 10);
  const expiryDays = parseInt(pointsExpiryDaysInput.value, 10);

  // Validate inputs
  if (isNaN(exchangeRate) || exchangeRate <= 0) {
    showNotification(getTranslation("enterValidExchangeRate"), "error");
    return;
  }

  if (isNaN(expiryDays) || expiryDays < 0) {
    showNotification(getTranslation("enterValidExpiryDays"), "error");
    return;
  }

  // Disable button during processing
  savePointsSettingsBtn.disabled = true;
  const savingText =
    (typeof getTranslation === "function" && getTranslation("saving")) ||
    "جاري الحفظ...";
  savePointsSettingsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> ' + savingText;

  try {
    // Save settings to API
    const settings = {
      exchangeRate,
      expiryDays,
    };

    // Call API to update settings
    const response = await apiService.updateLoyaltyPointsSettings(settings);

    if (response.success) {
      // Store in localStorage as backup
      localStorage.setItem("loyaltyPointsSettings", JSON.stringify(settings));

      // Broadcast the change to other parts of the application
      // This will trigger a storage event in other tabs/windows
      localStorage.setItem(
        "loyalty_points_settings_updated",
        Date.now().toString()
      );

      // Dispatch a custom event for the current window
      const updateEvent = new CustomEvent("loyalty_points_settings_updated", {
        detail: settings,
      });
      window.dispatchEvent(updateEvent);

      // Show success notification
      showNotification(getTranslation("pointsSettingsSaved"), "success");
    } else {
      throw new Error(response.message || "Failed to save settings");
    }
  } catch (error) {
    console.error("Error saving loyalty points settings:", error);
    showNotification(getTranslation("errorSavingSettings"), "error");
  } finally {
    // Re-enable button
    savePointsSettingsBtn.disabled = false;
    const saveSettingsText =
      (typeof getTranslation === "function" &&
        getTranslation("saveSettings")) ||
      "حفظ الإعدادات";
    savePointsSettingsBtn.innerHTML =
      '<i class="fas fa-save"></i> ' + saveSettingsText;
  }
}

// Add a function to handle retry button click
function addRetryButton(container, message) {
  // Get current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  const isEnglish = currentLang === "en";

  const retryButton = document.createElement("button");
  retryButton.className = "retry-button";
  retryButton.innerHTML = `<i class="fas fa-redo"></i> ${
    isEnglish ? "Retry" : "إعادة المحاولة"
  }`;
  retryButton.addEventListener("click", handleRefreshAccounts);

  // Create or update the error message container
  const errorContainer = document.createElement("div");
  errorContainer.className = "error-container";
  errorContainer.innerHTML = `
    <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
    <div class="error-message">${message}</div>
  `;

  errorContainer.appendChild(retryButton);

  // Clear the container and add our error message with retry button
  container.innerHTML = "";
  container.appendChild(errorContainer);
}

// Expose the function globally so it can be called from HTML
window.retryLoadCustomerAccounts = handleRefreshAccounts;

// Add a function to periodically check for permission updates
function initPermissionUpdates() {
  // Initial check for permissions on page load
  checkCurrentUserPermissions();

  // Set up interval to periodically check for permission updates
  const permissionCheckInterval = setInterval(
    checkCurrentUserPermissions,
    60000
  ); // Check every minute

  // Clean up interval on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(permissionCheckInterval);
  });

  // Listen for permission update events from other parts of the application
  window.addEventListener(
    "permission_update_event",
    handlePermissionUpdateEvent
  );
}

// Check if current user's permissions have been updated in the database
async function checkCurrentUserPermissions() {
  try {
    // Get current user ID from session
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) return;

    const session = JSON.parse(sessionData);
    const userId = session.userId;

    if (!userId) return;

    // Fetch latest user data from API
    const response = await apiService.getCustomerAccount(userId);

    if (response && response.success && response.data) {
      const latestPermissions = response.data.permissions || {};
      const currentPermissions = session.permissions || {};

      // Compare permissions to see if they've changed
      if (
        JSON.stringify(latestPermissions) !== JSON.stringify(currentPermissions)
      ) {
        console.log("Permissions updated in database, refreshing local data");

        // Update session with new permissions
        session.permissions = latestPermissions;
        localStorage.setItem("adminSession", JSON.stringify(session));

        // Dispatch event to update UI
        const permissionsChangedEvent = new CustomEvent("permissionsChanged", {
          detail: { permissions: latestPermissions },
        });
        document.dispatchEvent(permissionsChangedEvent);

        // Show notification to user
        showNotification(getTranslation("permissionsUpdatedFromDB"), "info");
      }
    }
  } catch (error) {
    console.error("Error checking for permission updates:", error);
  }
}

// Handle permission update event from other parts of the application
function handlePermissionUpdateEvent(event) {
  if (event.detail && event.detail.userId) {
    const sessionData = localStorage.getItem("adminSession");
    if (!sessionData) return;

    const session = JSON.parse(sessionData);

    // If this is for the current user, refresh permissions
    if (session.userId === event.detail.userId) {
      checkCurrentUserPermissions();
    }
  }
}

// Function to manually refresh permissions
function refreshPermissions() {
  return checkCurrentUserPermissions();
}

// Function to manually trigger permission update for current user (for testing)
function triggerPermissionUpdate(permissions) {
  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("No session data found");
    return false;
  }

  try {
    const session = JSON.parse(sessionData);
    console.log(
      "Manually triggering permission update for user:",
      session.userId
    );

    // Update session permissions
    session.permissions = permissions;
    localStorage.setItem("adminSession", JSON.stringify(session));

    // Dispatch event
    const permissionsChangedEvent = new CustomEvent("permissionsChanged", {
      detail: { permissions },
    });
    document.dispatchEvent(permissionsChangedEvent);
    console.log("✅ Manual permission update triggered");
    return true;
  } catch (error) {
    console.error("Error in manual permission update:", error);
    return false;
  }
}

// Make functions globally accessible for testing
window.refreshPermissions = refreshPermissions;
window.triggerPermissionUpdate = triggerPermissionUpdate;

// Test function to verify permission updates work
function testPermissionUpdate() {
  console.log("🧪 Testing permission update system...");

  // Test with sample permissions
  const testPermissions = {
    adminPanel: true,
    cashier: false,
    stats: true,
    productsView: true,
    productsEdit: false,
    vouchersView: true,
    vouchersEdit: false,
    reservations: true,
    tax: false,
    points: true,
    accounts: false,
    qr: true,
  };

  console.log("🧪 Testing with permissions:", testPermissions);
  return triggerPermissionUpdate(testPermissions);
}

// Function to get current user ID from session
function getCurrentUserId() {
  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("No session data found");
    return null;
  }

  try {
    const session = JSON.parse(sessionData);
    console.log("🔍 Current session:", session);
    console.log("🔍 User ID from session:", session.userId);
    return session.userId;
  } catch (error) {
    console.error("Error getting current user ID:", error);
    return null;
  }
}

// Function to force update current user permissions (bypass ID check)
function forceUpdateCurrentUserPermissions(permissions) {
  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("No session data found");
    return false;
  }

  try {
    const session = JSON.parse(sessionData);
    console.log("🔄 Force updating current user permissions...");
    console.log("Old permissions:", session.permissions);
    console.log("New permissions:", permissions);

    session.permissions = permissions;
    localStorage.setItem("adminSession", JSON.stringify(session));

    // Dispatch a custom event to notify the application about permission changes
    const permissionsChangedEvent = new CustomEvent("permissionsChanged", {
      detail: { permissions },
    });
    document.dispatchEvent(permissionsChangedEvent);
    console.log("✅ Force permission update completed");
    return true;
  } catch (error) {
    console.error("Error in force permission update:", error);
    return false;
  }
}

window.testPermissionUpdate = testPermissionUpdate;
window.getCurrentUserId = getCurrentUserId;
window.forceUpdateCurrentUserPermissions = forceUpdateCurrentUserPermissions;
window.resetPermissionsForm = resetPermissionsForm;
window.closeModal = closeModal;

// Debug function to check session and permissions
function debugSessionAndPermissions() {
  console.log("🔍 === SESSION DEBUG INFO ===");

  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("❌ No session data found");
    return;
  }

  try {
    const session = JSON.parse(sessionData);
    console.log("✅ Session data:", session);
    console.log("✅ User ID:", session.userId);
    console.log("✅ User ID type:", typeof session.userId);
    console.log("✅ Current permissions:", session.permissions);
    console.log("✅ Is logged in:", session.isLoggedIn);
    console.log("✅ Role:", session.role);
    console.log("✅ Display name:", session.displayName);
  } catch (error) {
    console.error("❌ Error parsing session:", error);
  }

  console.log("🔍 === END DEBUG INFO ===");
}

window.debugSessionAndPermissions = debugSessionAndPermissions;

// Test function to verify modal reset works
function testModalReset() {
  console.log("🧪 Testing modal reset functionality...");

  // Test 1: Check if form resets properly
  console.log("🧪 Test 1: Resetting form...");
  resetPermissionsForm();

  // Check if all checkboxes are unchecked
  const checkboxes = accountPermissionsModal.querySelectorAll(
    'input[type="checkbox"]'
  );
  const checkedBoxes = Array.from(checkboxes).filter((cb) => cb.checked);

  if (checkedBoxes.length === 0) {
    console.log("✅ Test 1 PASSED: All checkboxes are unchecked");
  } else {
    console.log(
      "❌ Test 1 FAILED: Some checkboxes are still checked:",
      checkedBoxes.length
    );
  }

  // Test 2: Check if selectedCustomerId is reset
  console.log("🧪 Test 2: Checking selectedCustomerId reset...");
  if (selectedCustomerId === null) {
    console.log("✅ Test 2 PASSED: selectedCustomerId is null");
  } else {
    console.log(
      "❌ Test 2 FAILED: selectedCustomerId is not null:",
      selectedCustomerId
    );
  }

  // Test 3: Check if permissionCustomerId field is empty
  console.log("🧪 Test 3: Checking permissionCustomerId field...");
  if (permissionCustomerId.value === "") {
    console.log("✅ Test 3 PASSED: permissionCustomerId field is empty");
  } else {
    console.log(
      "❌ Test 3 FAILED: permissionCustomerId field is not empty:",
      permissionCustomerId.value
    );
  }

  console.log("🧪 Modal reset test completed!");
}

window.testModalReset = testModalReset;

// Test function to verify language switching works for modal buttons
function testModalLanguageSwitch() {
  console.log("🧪 Testing modal language switch functionality...");

  // Test 1: Check current language
  const currentLang = localStorage.getItem("admin-language") || "ar";
  console.log("🧪 Test 1: Current language:", currentLang);

  // Test 2: Check if modal buttons exist
  const saveBtn = document.getElementById("save-permissions");
  const cancelBtn = document.getElementById("cancel-permissions");

  if (saveBtn && cancelBtn) {
    console.log("✅ Test 2 PASSED: Modal buttons found");
    console.log("Save button text:", saveBtn.textContent);
    console.log("Cancel button text:", cancelBtn.textContent);
  } else {
    console.log("❌ Test 2 FAILED: Modal buttons not found");
    return;
  }

  // Test 3: Test language switching
  console.log("🧪 Test 3: Testing language switch...");

  // Simulate language switch
  if (typeof updateModalButtonTexts === "function") {
    updateModalButtonTexts();
    console.log("✅ Test 3 PASSED: updateModalButtonTexts function called");
    console.log("Updated save button text:", saveBtn.textContent);
    console.log("Updated cancel button text:", cancelBtn.textContent);
  } else {
    console.log("❌ Test 3 FAILED: updateModalButtonTexts function not found");
  }

  console.log("🧪 Modal language switch test completed!");
}

window.testModalLanguageSwitch = testModalLanguageSwitch;

// Test function to verify unauthorized sections disappear after permission updates
function testUnauthorizedSectionsFix() {
  console.log("🧪 Testing unauthorized sections fix...");

  // Test 1: Check current session
  const sessionData = localStorage.getItem("adminSession");
  if (!sessionData) {
    console.log("❌ Test 1 FAILED: No session data found");
    return;
  }

  try {
    const session = JSON.parse(sessionData);
    const permissions = session.permissions || {};
    console.log("✅ Test 1 PASSED: Session data found");
    console.log("Current permissions:", permissions);
  } catch (error) {
    console.log("❌ Test 1 FAILED: Error parsing session data:", error);
    return;
  }

  // Test 2: Check if force refresh function exists
  if (typeof forceRefreshUnauthorizedSections === "function") {
    console.log(
      "✅ Test 2 PASSED: forceRefreshUnauthorizedSections function found"
    );
  } else {
    console.log(
      "❌ Test 2 FAILED: forceRefreshUnauthorizedSections function not found"
    );
    return;
  }

  // Test 3: Check current unauthorized sections
  const unauthorizedSections = document.querySelectorAll(
    ".unauthorized-section"
  );
  console.log(
    "🧪 Test 3: Found",
    unauthorizedSections.length,
    "unauthorized sections"
  );

  unauthorizedSections.forEach((section, index) => {
    console.log(
      `Section ${index + 1}:`,
      section.id,
      "classes:",
      section.className
    );
  });

  // Test 4: Run force refresh
  console.log("🧪 Test 4: Running force refresh...");
  forceRefreshUnauthorizedSections();

  // Test 5: Check sections after refresh
  setTimeout(() => {
    const unauthorizedSectionsAfter = document.querySelectorAll(
      ".unauthorized-section"
    );
    console.log(
      "🧪 Test 5: Found",
      unauthorizedSectionsAfter.length,
      "unauthorized sections after refresh"
    );

    unauthorizedSectionsAfter.forEach((section, index) => {
      console.log(
        `Section ${index + 1} after refresh:`,
        section.id,
        "classes:",
        section.className
      );
    });

    if (unauthorizedSectionsAfter.length < unauthorizedSections.length) {
      console.log("✅ Test 5 PASSED: Some unauthorized sections were removed");
    } else {
      console.log("❌ Test 5 FAILED: No unauthorized sections were removed");
    }
  }, 500);

  console.log("🧪 Unauthorized sections fix test completed!");
}

window.testUnauthorizedSectionsFix = testUnauthorizedSectionsFix;

/**
 * Format date for display in Arabic format
 * @param {string} dateString - The date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return "غير محدد";

  try {
    // Handle different date formats
    let date;

    // Try parsing as ISO date string
    date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      // Try parsing as timestamp
      if (typeof dateString === "number" || !isNaN(Number(dateString))) {
        date = new Date(Number(dateString));
      }

      // If still invalid, return the original string
      if (isNaN(date.getTime())) {
        return "غير محدد";
      }
    }

    // Format: DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "غير محدد";
  }
}

/**
 * Get role name from customer data
 * @param {Object} customer - Customer data object
 * @returns {string} - Role name or empty string if not found
 */
function getRoleName(customer, preferredLanguage) {
  const language = preferredLanguage || localStorage.getItem("admin-language") || "ar";
  const useEnglish = language === "en";

  const roleSources = [
    () => {
      if (customer.roleId && typeof customer.roleId === "object") {
        return useEnglish
          ? customer.roleId.nameEn || customer.roleId.name
          : customer.roleId.name || customer.roleId.nameEn;
      }
      return null;
    },
    () => {
      if (customer.role && typeof customer.role === "object") {
        return useEnglish
          ? customer.role.nameEn || customer.role.name
          : customer.role.name || customer.role.nameEn;
      }
      return null;
    },
    () => {
      if (typeof customer.role === "string") {
        return customer.role;
      }
      return null;
    },
    () => {
      if (customer.roleName || customer.roleNameEn) {
        return useEnglish
          ? customer.roleNameEn || customer.roleName
          : customer.roleName || customer.roleNameEn;
      }
      return null;
    },
    () => {
      if (customer.role_name || customer.role_name_en) {
        return useEnglish
          ? customer.role_name_en || customer.role_name
          : customer.role_name || customer.role_name_en;
      }
      return null;
    },
    () => {
      if (useEnglish && customer.roleNameEnglish) {
        return customer.roleNameEnglish;
      }
      if (!useEnglish && customer.roleNameAr) {
        return customer.roleNameAr;
      }
      return null;
    },
  ];

  for (const resolver of roleSources) {
    const value = resolver();
    if (value && typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }

  if (customer.permissions && customer.permissions.adminPanel === true) {
    return useEnglish ? "Administrator" : "مدير";
  }

  return useEnglish ? "User" : "مستخدم";
}

function hasActiveAccountFilters(filters) {
  if (!filters) return false;
  const { status, role, dateFrom, dateTo } = filters;
  return (
    (status && status !== "all") ||
    (role && role.trim() !== "") ||
    (dateFrom && dateFrom.trim() !== "") ||
    (dateTo && dateTo.trim() !== "")
  );
}

function applyClientCustomerFilters(customers, filters) {
  try {
    const { status, role, dateFrom, dateTo } = filters || {};
    const fromTime = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    return (customers || []).filter((customer) => {
      if (!customer) return false;

      // Status filter (active/suspended)
      if (status && status !== "all") {
        const isSuspended = customer.status === "suspended";
        if (status === "active" && isSuspended) return false;
        if (status === "suspended" && !isSuspended) return false;
      }

      // Role filter (by role name)
      if (role && role.trim() !== "") {
        const roleName = (getRoleName(customer) || "").toLowerCase();
        if (roleName !== role.toLowerCase()) return false;
      }

      // Date range filter (by createdAt/registrationDate)
      if (fromTime || toTime) {
        const rawDate = customer.createdAt || customer.registrationDate;
        const d = rawDate ? new Date(rawDate) : null;
        if (!d || isNaN(d.getTime())) return false;
        const t = d.getTime();
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
      }

      return true;
    });
  } catch (err) {
    console.error("Error applying client filters:", err);
    return customers || [];
  }
}
