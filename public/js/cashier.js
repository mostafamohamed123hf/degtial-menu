// Cashier System JavaScript

// Authentication check - must be done before anything else
(function checkCashierAccess() {
  // Function to show access denied modal
  function showAccessDenied(message, redirectUrl) {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        displayModal(message, redirectUrl);
      });
    } else {
      displayModal(message, redirectUrl);
    }
  }

  function displayModal(message, redirectUrl) {
    const overlay = document.getElementById("access-denied-overlay");
    const messageEl = document.getElementById("access-denied-message");
    const button = document.getElementById("access-denied-button");

    if (overlay && messageEl && button) {
      messageEl.textContent = message;
      overlay.classList.add("show");

      button.onclick = function () {
        window.location.href = redirectUrl;
      };
    } else {
      // Fallback to alert if modal elements not found
      alert(message);
      window.location.href = redirectUrl;
    }
  }

  // Check if user is logged in
  if (typeof isLoggedIn !== "function" || !isLoggedIn()) {
    // User is not logged in, show custom modal
    showAccessDenied(
      "You must login with an account that has cashier access to view this page.",
      "/public/pages/register.html?redirect=cashier"
    );
    return;
  }

  // Check if user has cashier permission
  if (typeof hasPermission !== "function" || !hasPermission("cashier")) {
    // User doesn't have cashier permission
    showAccessDenied(
      "You do not have permission to access the cashier page. Please contact an administrator.",
      "/public/pages/index.html"
    );
    return;
  }
})();

let soundEnabled = false;
// Make notificationsEnabled available globally
window.notificationsEnabled = true;
let notificationsEnabled = window.notificationsEnabled;

window.API_BASE_URL = window.API_BASE_URL || (function () {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? "http://localhost:5000" : origin;
})();

// Sound system initialization
function initSoundSystem() {
  // Get the audio element
  const audio = document.getElementById("notification-sound");
  if (!audio) return;

  // Add click event listener to the document to enable sound
  document.addEventListener(
    "click",
    function enableSound() {
      if (!soundEnabled) {
        // Try to play and immediately pause to enable sound
        audio
          .play()
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            soundEnabled = true;
            console.log("Sound system enabled");
          })
          .catch((error) => {
            console.log("Sound system not enabled:", error);
          });
        // Remove the event listener after first interaction
        document.removeEventListener("click", enableSound);
      }
    },
    { once: true }
  );
}

// Initialize language toggle
function initLanguageToggle() {
  const languageToggleBtn = document.getElementById("language-toggle-btn");
  if (!languageToggleBtn) return;

  // Set the title based on current language
  const currentLang = getCurrentLanguage();
  languageToggleBtn.setAttribute("title", getTranslation("changeLanguage"));

  // Add click event listener
  languageToggleBtn.addEventListener("click", () => {
    switchLanguage();

    // Update the title after language switch
    languageToggleBtn.setAttribute("title", getTranslation("changeLanguage"));

    // Update document direction and language
    const htmlAttrs = getTranslation("htmlAttributes");
    document.documentElement.setAttribute("lang", htmlAttrs.lang);
    document.documentElement.setAttribute("dir", htmlAttrs.dir);

    // Update document title
    document.title = getTranslation("cashierPageTitle");

    // Update input placeholders
    const tableNumberInput = document.getElementById("table-number-input");
    if (tableNumberInput) {
      tableNumberInput.placeholder = getTranslation("tableNumber");
    }

    // Update all data-i18n-title attributes
    const elementsWithTitleAttr =
      document.querySelectorAll("[data-i18n-title]");
    elementsWithTitleAttr.forEach((el) => {
      const titleKey = el.getAttribute("data-i18n-title");
      if (titleKey) {
        el.setAttribute("title", getTranslation(titleKey));
      }
    });

    // Update notification toggle button title based on current state
    const notificationBtn = document.getElementById("notification-toggle-btn");
    if (notificationBtn) {
      const titleKey = notificationsEnabled
        ? "notificationsOff"
        : "notificationsOn";
      notificationBtn.setAttribute("title", getTranslation(titleKey));
    }
  });
}

// Play notification sound
function playNotificationSound() {
  // Don't play sound if disabled or if notifications are disabled
  if (!soundEnabled || !notificationsEnabled) return;

  // Get the audio element
  const audio = document.getElementById("notification-sound");
  if (!audio) return;

  // Try to play the sound
  audio.currentTime = 0; // Reset to start
  audio.play().catch((error) => {
    console.log("Could not play notification sound:", error);
    // If sound fails to play, disable sound system
    soundEnabled = false;
  });
}

// Show fixed notification
function showFixedNotification(
  title,
  message,
  type = "info",
  forceShow = false
) {
  // Don't show notifications if disabled, unless forceShow is true
  if (!notificationsEnabled && !forceShow) {
    return;
  }

  // Don't show success notifications
  if (type === "success" && !forceShow) {
    return;
  }

  const container = document.getElementById("fixed-notifications");
  if (!container) {
    console.error("Fixed notifications container not found");
    return;
  }

  // Create notification element with HTML
  const notification = document.createElement("div");
  notification.className = `fixed-notification ${type}`;

  // Set direction based on current language
  const currentLang = getCurrentLanguage();
  notification.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");

  // Set icon based on type
  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";
  if (type === "warning") icon = "exclamation-triangle";

  // Use HTML for content to ensure text appears correctly
  notification.innerHTML = `
    <div class="fixed-notification-icon">
        <i class="fas fa-${icon}"></i>
    </div>
    <div class="fixed-notification-content">
        <span class="fixed-notification-title">${title}</span>
        <span class="fixed-notification-message">${message}</span>
    </div>
    <button class="fixed-notification-close">
        <i class="fas fa-times"></i>
    </button>
  `;

  // Add to container
  container.appendChild(notification);

  // Play sound for important types
  if ((type === "error" || type === "warning") && !forceShow) {
    playNotificationSound();
  }

  // Add close button event
  const closeButton = notification.querySelector(".fixed-notification-close");
  closeButton.addEventListener("click", () => {
    dismissFixedNotification(notification);
  });

  // Auto dismiss after 5 seconds
  const timeout = setTimeout(() => {
    dismissFixedNotification(notification);
  }, 5000);

  // Store timeout
  notification.dataset.timeoutId = timeout;

  return notification;
}

// Dismiss fixed notification
function dismissFixedNotification(notification) {
  if (!notification.classList.contains("exiting")) {
    // Clear timeout
    if (notification.dataset.timeoutId) {
      clearTimeout(parseInt(notification.dataset.timeoutId));
    }

    // Add exit animation
    notification.classList.add("exiting");

    // Remove after animation completes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

// Show modal
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add("show");
}

// Close order details modal
function closeOrderModal() {
  // Reset buttons state and text
  const completeButton = document.getElementById("complete-order-button");
  const cancelButton = document.getElementById("cancel-order-button");

  // Reset disabled state
  completeButton.disabled = false;
  cancelButton.disabled = false;

  // Reset button text to original values using translations
  completeButton.innerHTML = `<i class="fas fa-check-circle"></i><span data-i18n="completeOrderAndBill">${getTranslation(
    "completeOrderAndBill"
  )}</span>`;
  cancelButton.innerHTML = `<i class="fas fa-ban"></i><span data-i18n="cancelOrder">${getTranslation(
    "cancelOrder"
  )}</span>`;

  // Hide the modal
  const modal = document.getElementById("order-details-modal");
  modal.classList.remove("show");

  // Clear any order info that was added dynamically
  const orderInfo = document.getElementById("order-info");
  if (orderInfo) {
    orderInfo.remove();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  console.log("Cashier system initialized");

  // Initialize the WebSocket connection
  initWebSocketConnection();

  // Initialize i18n
  if (typeof initI18n === "function") {
    initI18n();
  } else {
    console.error(
      "i18n.js is not loaded properly. Make sure it's included before cashier.js"
    );
  }

  // Make sure i18n functions are available
  if (
    typeof getTranslation !== "function" ||
    typeof switchLanguage !== "function"
  ) {
    console.error(
      "i18n functions are not available. Make sure i18n.js is loaded properly."
    );
  }

  // Load settings from local storage
  loadSettings();

  // Initialize theme toggle functionality
  initThemeToggle();

  // Initialize notification toggle
  initNotificationToggle();

  // Initialize language toggle
  initLanguageToggle();

  // Initialize sound system
  initSoundSystem();

  // Check if user is logged in and has cashier permission
  const userLoggedIn = typeof isLoggedIn === "function" && isLoggedIn();
  const hasCashierPermission =
    typeof hasPermission === "function" && hasPermission("cashier");

  // Disable create order button if not logged in or no permission
  const createOrderButton = document.getElementById("create-order-button");
  if (createOrderButton) {
    if (!userLoggedIn || !hasCashierPermission) {
      createOrderButton.disabled = true;
      createOrderButton.style.opacity = "0.5";
      createOrderButton.style.cursor = "not-allowed";
      createOrderButton.title =
        getTranslation("loginRequired") || "Login required";
    }
  }

  // Load initial data only if user is logged in and has permission
  if (userLoggedIn && hasCashierPermission) {
    loadActiveOrders();
    loadRecentActivity();
  } else {
    // Show message that login is required
    const ordersGrid = document.getElementById("orders-grid");
    if (ordersGrid) {
      ordersGrid.innerHTML = `
        <div class="no-orders-message">
          <i class="fas fa-lock"></i>
          <p>${getTranslation("loginRequired") || "Login Required"}</p>
          <small>${
            getTranslation("pleaseLoginToViewOrders") ||
            "Please login with cashier access to view orders"
          }</small>
        </div>
      `;
    }

    const activityList = document.getElementById("activity-list");
    if (activityList) {
      activityList.innerHTML = `
        <div class="empty-message">
          <i class="fas fa-lock"></i>
          <p>${getTranslation("loginRequired") || "Login Required"}</p>
        </div>
      `;
    }
  }

  // Initialize the reservations section with the current date only if logged in
  const reservationDateInput = document.getElementById("reservation-date");
  if (userLoggedIn && hasCashierPermission) {
    if (reservationDateInput && reservationDateInput.value) {
      loadReservationsForDate(reservationDateInput.value);
    } else if (reservationDateInput) {
      // Set today's date if not already set
      const today = new Date();
      const formattedDate = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      reservationDateInput.value = formattedDate;
      loadReservationsForDate(formattedDate);
    }

    // Start auto-refresh for checking new orders only if logged in
    startAutoRefresh();
  } else {
    // Show login required message for reservations
    const reservationsGrid = document.getElementById("reservations-grid");
    if (reservationsGrid) {
      reservationsGrid.innerHTML = `
        <div class="no-reservations-message">
          <i class="fas fa-lock"></i>
          <p>${getTranslation("loginRequired") || "Login Required"}</p>
          <small>${
            getTranslation("pleaseLoginToViewOrders") ||
            "Please login with cashier access to view reservations"
          }</small>
        </div>
      `;
    }
  }

  // Handle checking for table orders
  document
    .getElementById("check-table-button")
    .addEventListener("click", function () {
      checkTableOrder();
    });

  // Allow pressing Enter in the table number input to check
  document
    .getElementById("table-number-input")
    .addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        checkTableOrder();
      }
    });

  // Modal close buttons
  document
    .getElementById("close-order-modal")
    .addEventListener("click", closeOrderModal);

  // Order action buttons
  document
    .getElementById("complete-order-button")
    .addEventListener("click", completeOrder);
  document
    .getElementById("print-receipt-button")
    .addEventListener("click", printReceipt);

  // Check if kitchen receipt buttons exist before adding event listener
  const kitchenReceiptButtons = document.querySelectorAll(
    ".print-kitchen-receipt-button"
  );
  if (kitchenReceiptButtons.length > 0) {
    kitchenReceiptButtons.forEach((button) => {
      button.addEventListener("click", function (event) {
        printKitchenReceipt(event.currentTarget);
      });
    });
  } else {
    // If the button doesn't exist yet (might be added dynamically later)
    // Add a single event listener to the parent element and use event delegation
    document.addEventListener("click", function (event) {
      if (event.target.closest("#print-kitchen-receipt-button")) {
        printKitchenReceipt(
          event.target.closest("#print-kitchen-receipt-button")
        );
      }
    });
  }

  document
    .getElementById("cancel-order-button")
    .addEventListener("click", cancelOrder);

  // Close modal when clicking outside
  const modal = document.getElementById("order-details-modal");
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeOrderModal();
    }
  });

  // Add keyboard shortcut for closing modal (Escape)
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      closeOrderModal();
    }
  });

  // Listen for new orders from other pages (like cart.html)
  window.addEventListener("newOrderCreated", function (event) {
    console.log("New order created event received:", event.detail);
    // Immediately refresh orders to show the new order
    loadActiveOrders();
    // Play notification sound and show alert
    const tableNumber = event.detail.tableNumber || "0";
    const total = event.detail.total.toFixed(2);
    const message = getTranslation("newOrderMessage")
      .replace("%s", tableNumber)
      .replace("%s", total);

    showFixedNotification(getTranslation("newOrder"), message, "success");
  });

  // Also listen for storage events (for when orders are created in other tabs)
  window.addEventListener("storage", function (e) {
    if (e.key === "orders") {
      console.log("Orders changed in another tab, refreshing...");
      loadActiveOrders();
      // Check for new orders that haven't been notified
      checkForNewOrders();
    }

    // Refresh when discount or menu items change
    if (e.key === "original_prices" || e.key === "menuItems") {
      // Refresh active orders to reflect updated prices
      loadActiveOrders();
    }

    // Handle cross-tab discount change event
    if (e.key === "discount_change_event") {
      loadActiveOrders();
    }

    // Handle cross-tab cart change event
    if (e.key === "cart_change_event" || e.key === "cartItems") {
      console.log("Cart updated in another tab");
      // This might not need immediate action in cashier view
      // unless we want to show pending carts before checkout
    }

    // Handle reservation changes
    if (e.key === "reservations") {
      console.log("Reservations changed in another tab, refreshing...");
      // Reload reservations for the current date
      const reservationDateInput = document.getElementById("reservation-date");
      if (reservationDateInput && reservationDateInput.value) {
        loadReservationsForDate(reservationDateInput.value);
      }
    }
  });

  // Listen for custom discount change event
  window.addEventListener("digital_menu_discount_change", function () {
    // Refresh active orders with new prices
    loadActiveOrders();
  });

  // Listen for custom cart change event
  window.addEventListener("digital_menu_cart_change", function () {
    console.log("Cart change event received");
    // This might not need immediate action in cashier view
    // unless we want to show pending carts before checkout
  });

  // Remove old notification wrapper if it exists
  const oldWrapper = document.querySelector(".notifications-wrapper");
  if (oldWrapper) {
    oldWrapper.remove();
  }

  // Make sure our new container exists
  if (!document.getElementById("cashier-notifications")) {
    const container = document.createElement("div");
    container.id = "cashier-notifications";
    container.className = "cashier-notifications";
    document.body.appendChild(container);
  }

  // Show welcome notification after a short delay
  setTimeout(() => {
    showFixedNotification(
      getTranslation("welcomeToCashier"),
      getTranslation("systemLoadedSuccessfully"),
      "info"
    );
  }, 1000);

  // Test the new fixed notification system
  setTimeout(() => {
    console.log("Testing fixed notification system");
    showFixedNotification(
      getTranslation("newNotificationSystem"),
      getTranslation("notificationSystemUpdated"),
      "success"
    );
  }, 1500);

  // Set up event listener for date change in reservation date input
  if (reservationDateInput) {
    reservationDateInput.addEventListener("change", function () {
      // Load reservations with the selected date
      loadReservationsForDate(this.value);
    });
  }

  // Set up refresh button for reservations with animation effect
  const refreshButton = document.getElementById("refresh-reservations");
  if (refreshButton) {
    refreshButton.addEventListener("click", function () {
      // Add a small animation before refreshing
      const icon = this.querySelector("i");
      if (icon) {
        icon.classList.add("fa-spin");
        setTimeout(() => {
          icon.classList.remove("fa-spin");
        }, 500);
      }

      // Get the current date from the input
      const dateInput = document.getElementById("reservation-date");
      if (dateInput && dateInput.value) {
        // Show a custom notification
        showFixedNotification(
          getTranslation("updatingReservations"),
          getTranslation("updatingReservationsMessage"),
          "info"
        );

        // Load reservations with the current date
        loadReservationsForDate(dateInput.value);
      }
    });
  }
});

// Load settings from localStorage
function loadSettings() {
  // Load theme settings
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    const themeToggle = document.getElementById("switch");
    if (themeToggle) themeToggle.checked = false;
  }

  // Load notification settings
  if (localStorage.getItem("notifications") === "off") {
    notificationsEnabled = false;
    window.notificationsEnabled = false; // Update the global variable
    const notificationBtn = document.getElementById("notification-toggle-btn");
    if (notificationBtn) notificationBtn.classList.add("disabled");
  }

  console.log("Settings loaded from localStorage");
}

// Theme functionality has been moved to theme.js
function initThemeToggle() {
  // Reference the implementation in theme.js if it's available
  if (
    typeof window.themeJs !== "undefined" &&
    typeof window.themeJs.initThemeToggle === "function"
  ) {
    window.themeJs.initThemeToggle();
  } else {
    console.log("Theme functionality is now handled by theme.js");
    // Fallback if theme.js is not loaded for some reason
    const themeToggle = document.getElementById("switch");
    if (!themeToggle) return;

    // Apply saved theme
    if (localStorage.getItem("theme") === "light") {
      document.body.classList.add("light-mode");
      themeToggle.checked = false;
    }

    // Toggle theme when switch is clicked
    themeToggle.addEventListener("change", function () {
      if (this.checked) {
        document.body.classList.remove("light-mode");
        localStorage.setItem("theme", "dark");
      } else {
        document.body.classList.add("light-mode");
        localStorage.setItem("theme", "light");
      }
    });
  }
}

// Notification toggle functionality
function initNotificationToggle() {
  const notificationBtn = document.getElementById("notification-toggle-btn");
  if (!notificationBtn) return;

  // Set initial title based on current state
  const titleKey = notificationsEnabled
    ? "notificationsOff"
    : "notificationsOn";
  notificationBtn.setAttribute("title", getTranslation(titleKey));

  // Toggle notifications when button is clicked
  notificationBtn.addEventListener("click", function () {
    notificationsEnabled = !notificationsEnabled;
    window.notificationsEnabled = notificationsEnabled; // Update the global variable

    // Update button appearance
    if (notificationsEnabled) {
      this.classList.remove("disabled");
      localStorage.setItem("notifications", "on");
      // Update title
      this.setAttribute("title", getTranslation("notificationsOff"));
      // Show confirmation notification
      showFixedNotification(
        getTranslation("notificationsOn"),
        getTranslation("notificationsEnabledMessage"),
        "info",
        true // Force show even if notifications are disabled
      );
    } else {
      this.classList.add("disabled");
      localStorage.setItem("notifications", "off");
      // Update title
      this.setAttribute("title", getTranslation("notificationsOn"));
      // Show confirmation notification
      showFixedNotification(
        getTranslation("notificationsOff"),
        getTranslation("notificationsDisabledMessage"),
        "info",
        true // Force show even if notifications are disabled
      );
    }
  });
}

// Load active orders from the database API
function loadActiveOrders() {
  // Show loading indicator
  const ordersGrid = document.getElementById("orders-grid");
  ordersGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> ${getTranslation(
    "loadingOrders"
  )}...</div>`;

  // Fetch orders from the API
  fetch(`${API_BASE_URL}/api/orders`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Clear existing content
      ordersGrid.innerHTML = "";

      // Check if we have data and orders
      if (
        !data ||
        !data.data ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        const noOrdersMessage = createNoOrdersMessage();
        ordersGrid.appendChild(noOrdersMessage);
        return;
      }

      // Filter only active (not completed) orders
      let activeOrders = data.data.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled"
      );

      if (activeOrders.length === 0) {
        const noOrdersMessage = createNoOrdersMessage();
        ordersGrid.appendChild(noOrdersMessage);
        return;
      }

      // Sort by most recent first
      activeOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Create order cards
      activeOrders.forEach((order) => {
        // Convert the database order format to the format expected by createOrderCard
        const formattedOrder = {
          id: order._id || order.orderId || order.orderNumber,
          orderNumber: order.orderNumber,
          date: order.date || order.createdAt,
          tableNumber: order.tableNumber || "0",
          items: order.items || [],
          subtotal: order.subtotal,
          tax: order.tax,
          serviceTax: order.serviceTax,
          discount: order.discount,
          total: order.total || order.totalAmount,
          status: order.status,
        };

        const orderCard = createOrderCard(formattedOrder);
        ordersGrid.appendChild(orderCard);
      });
    })
    .catch((error) => {
      console.error("Error fetching orders:", error);
      ordersGrid.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${getTranslation("errorLoadingOrders")}</p>
          <button id="retry-load-orders" class="retry-button">${getTranslation(
            "retry"
          )}</button>
        </div>
      `;

      // Add event listener for retry button
      const retryButton = document.getElementById("retry-load-orders");
      if (retryButton) {
        retryButton.addEventListener("click", loadActiveOrders);
      }

      // Fallback to localStorage if API fails
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const activeOrders = orders.filter(
            (order) =>
              order.status !== "completed" && order.status !== "cancelled"
          );

          if (activeOrders.length > 0) {
            showFixedNotification(
              getTranslation("usingLocalData"),
              getTranslation("serverConnectionError"),
              "warning",
              true
            );

            // Clear error message
            ordersGrid.innerHTML = "";

            // Sort and display orders
            activeOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            activeOrders.forEach((order) => {
              const orderCard = createOrderCard(order);
              ordersGrid.appendChild(orderCard);
            });
          }
        }
      } catch (localStorageError) {
        console.error(
          "Error loading orders from localStorage:",
          localStorageError
        );
      }
    });
}

// Create an order card element
function createOrderCard(order) {
  const orderCard = document.createElement("div");
  orderCard.className = "order-card";
  orderCard.dataset.orderId = order.id;
  orderCard.dataset.tableNumber = order.tableNumber || "0";

  // Format date and time
  const orderDate = new Date(order.date);
  const currentLang = getCurrentLanguage();
  const timeOrdered = orderDate.toLocaleTimeString(
    currentLang === "ar" ? "ar-EG" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Always show as table order
  const tableIcon = "fa-table";
  const tableLabel =
    currentLang === "ar"
      ? `طاولة ${order.tableNumber || "0"}`
      : `Table ${order.tableNumber || "0"}`;

  // Use orderNumber if available, otherwise fall back to id
  const displayOrderId = order.orderNumber || order.id;

  orderCard.innerHTML = `
        <div class="order-header">
            <div class="table-number">
                <i class="fas ${tableIcon}"></i> ${tableLabel}
            </div>
            <div class="order-time">${timeOrdered}</div>
        </div>
        <div class="order-info">
            <div class="order-info-row">
                <span class="info-label">${getTranslation(
                  "orderNumber"
                )}:</span>
                <span class="info-value">${displayOrderId}</span>
            </div>
            <div class="order-info-row">
                <span class="info-label">${getTranslation("itemCount")}:</span>
                <span class="info-value">${order.items.length}</span>
            </div>
        </div>
        <div class="order-footer">
            <button class="view-order-button" data-order-id="${
              order.id
            }">${getTranslation("viewDetails")}</button>
        </div>
    `;

  // Add event listener for view order button
  const viewButton = orderCard.querySelector(".view-order-button");
  if (viewButton) {
    viewButton.addEventListener("click", function () {
      viewOrderDetails(order.id);
    });
  }

  return orderCard;
}

// Create a "no orders" message element
function createNoOrdersMessage() {
  const noOrdersMessage = document.createElement("div");
  noOrdersMessage.id = "no-orders-message";
  noOrdersMessage.className = "empty-message";
  noOrdersMessage.innerHTML = `
                    <i class="fas fa-receipt"></i>
            <p>${getTranslation("noActiveOrders")}</p>
            <small>${getTranslation("tableOrdersWillAppear")}</small>
    `;
  return noOrdersMessage;
}

// Load recent activity from the database API
function loadRecentActivity() {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const activityList = document.getElementById("activity-list");
  const activityHeader = document.querySelector(".recent-activity-header");

  // Add reset button if it doesn't exist
  if (!document.getElementById("hide-activity-button")) {
    const resetButton = document.createElement("button");
    resetButton.id = "hide-activity-button";
    resetButton.className = "hide-button";
    resetButton.innerHTML = `<i class="fas fa-eye-slash"></i> ${
      isEnglish ? "Hide History" : "اخفاء السجل"
    }`;
    resetButton.addEventListener("click", resetRecentActivity);
    activityHeader.appendChild(resetButton);
  }

  // Check if activity history was hidden previously
  const isHistoryHidden =
    localStorage.getItem("activity_history_hidden") === "true";

  if (isHistoryHidden) {
    // If history was hidden, show empty message
    activityList.innerHTML = `
      <div class="empty-message">
        <i class="fas fa-history"></i>
        <p>${isEnglish ? "No recent activity" : "لا يوجد نشاط حديث"}</p>
      </div>
    `;

    // Change button to show activities
    const resetButton = document.getElementById("hide-activity-button");
    if (resetButton) {
      resetButton.innerHTML = `<i class="fas fa-eye"></i> ${
        isEnglish ? "Show History" : "إظهار السجل"
      }`;
      resetButton.removeEventListener("click", resetRecentActivity);
      resetButton.addEventListener("click", showHiddenActivity);
    }

    return;
  }

  // Show loading indicator
  activityList.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i> ${
        isEnglish ? "Loading history..." : "جاري تحميل السجل..."
      }
    </div>`;

  // Fetch completed and cancelled orders from the API
  fetch(`${API_BASE_URL}/api/orders?status=completed,cancelled`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Clear existing content
      activityList.innerHTML = "";

      // Check if we have data and orders
      if (
        !data ||
        !data.data ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        activityList.innerHTML = `
          <div class="empty-message">
            <i class="fas fa-history"></i>
            <p>${isEnglish ? "No recent activity" : "لا يوجد نشاط حديث"}</p>
          </div>
        `;
        return;
      }

      // Get completed or cancelled orders
      const completedOrders = data.data;

      // Sort by most recent first and limit to recent 10
      completedOrders.sort((a, b) => {
        const dateA = new Date(
          a.completedDate || a.date || a.createdAt || a.updatedAt
        );
        const dateB = new Date(
          b.completedDate || b.date || b.createdAt || b.updatedAt
        );
        return dateB - dateA;
      });

      const recentActivity = completedOrders.slice(0, 10);

      // Create activity items
      recentActivity.forEach((order) => {
        const activityItem = document.createElement("div");
        activityItem.className = `activity-item ${order.status}`;

        const iconClass =
          order.status === "completed" ? "fa-check-circle" : "fa-times-circle";

        // Action text based on language and status
        const actionText =
          order.status === "completed"
            ? isEnglish
              ? "Completed"
              : "تم إنهاء"
            : isEnglish
            ? "Cancelled"
            : "تم إلغاء";

        // Get the order ID and table number
        const orderId = order._id || order.orderId || order.orderNumber;
        const tableNumber = order.tableNumber || "0";

        // Order label based on language
        const orderLabel = isEnglish
          ? `Table ${tableNumber} Order`
          : `طلب الطاولة ${tableNumber}`;

        // Format date and time based on language
        const orderDate = new Date(
          order.completedDate ||
            order.date ||
            order.createdAt ||
            order.updatedAt
        );
        const timeCompleted = orderDate.toLocaleTimeString(
          isEnglish ? "en-US" : "ar-EG",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        );
        const dateFormatted = orderDate.toLocaleDateString(
          isEnglish ? "en-US" : "ar-EG",
          {
            day: "numeric",
            month: "long",
          }
        );

        // Get the total amount
        const total = order.total || order.totalAmount || 0;
        // Currency symbol based on language
        const currencySymbol =
          typeof getCurrencyText === "function"
            ? getCurrencyText()
            : isEnglish
            ? "EGP"
            : "جنية";

        activityItem.innerHTML = `
          <div class="activity-icon">
            <i class="fas ${iconClass}"></i>
          </div>
          <div class="activity-details">
            <div class="activity-title">${actionText} ${orderLabel}</div>
            <div class="activity-meta">
              <span>${timeCompleted} - ${dateFormatted}</span>
              <span>${parseFloat(total).toFixed(2)} ${currencySymbol}</span>
            </div>
          </div>
        `;

        // Add event listener to view order details when clicked
        activityItem.addEventListener("click", () => {
          viewOrderDetails(orderId);
        });

        activityList.appendChild(activityItem);
      });

      // Add "View All Orders" button if there are more orders than shown
      if (completedOrders.length > 10) {
        const viewAllButton = document.createElement("button");
        viewAllButton.className = "view-all-button";
        viewAllButton.innerHTML = `<i class="fas fa-list"></i> ${
          isEnglish ? "View All Orders" : "عرض كل الطلبات"
        }`;
        viewAllButton.addEventListener("click", viewAllOrders);
        activityList.appendChild(viewAllButton);
      }
    })
    .catch((error) => {
      console.error("Error loading recent activity:", error);

      // Show error message
      activityList.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${
            isEnglish
              ? "Error loading activity history"
              : "حدث خطأ أثناء تحميل سجل النشاط"
          }</p>
          <button id="retry-load-activity" class="retry-button">${
            isEnglish ? "Retry" : "إعادة المحاولة"
          }</button>
        </div>
      `;

      // Add event listener for retry button
      const retryButton = document.getElementById("retry-load-activity");
      if (retryButton) {
        retryButton.addEventListener("click", loadRecentActivity);
      }

      // Fallback to localStorage if API fails
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const completedOrders = orders.filter(
            (order) =>
              order.status === "completed" || order.status === "cancelled"
          );

          if (completedOrders.length > 0) {
            showFixedNotification(
              getTranslation("usingLocalData"),
              getTranslation("serverConnectionError"),
              "warning",
              true
            );

            // Clear error message
            activityList.innerHTML = "";

            // Sort and limit to recent 10
            completedOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentActivity = completedOrders.slice(0, 10);

            // Display the orders
            recentActivity.forEach((order) => {
              const activityItem = document.createElement("div");
              activityItem.className = `activity-item ${order.status}`;

              const iconClass =
                order.status === "completed"
                  ? "fa-check-circle"
                  : "fa-times-circle";

              // Action text based on language and status
              const actionText =
                order.status === "completed"
                  ? isEnglish
                    ? "Completed"
                    : "تم إنهاء"
                  : isEnglish
                  ? "Cancelled"
                  : "تم إلغاء";

              // Order label based on language
              const orderLabel = isEnglish
                ? `Table ${order.tableNumber || "0"} Order`
                : `طلب الطاولة ${order.tableNumber || "0"}`;

              // Format date and time based on language
              const orderDate = new Date(order.date);
              const timeCompleted = orderDate.toLocaleTimeString(
                isEnglish ? "en-US" : "ar-EG",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );
              const dateFormatted = orderDate.toLocaleDateString(
                isEnglish ? "en-US" : "ar-EG",
                {
                  day: "numeric",
                  month: "long",
                }
              );

              // Currency symbol based on language
              const currencySymbol =
                typeof getCurrencyText === "function"
                  ? getCurrencyText()
                  : isEnglish
                  ? "EGP"
                  : "جنية";

              activityItem.innerHTML = `
                <div class="activity-icon">
                  <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-details">
                  <div class="activity-title">${actionText} ${orderLabel}</div>
                  <div class="activity-meta">
                    <span>${timeCompleted} - ${dateFormatted}</span>
                    <span>${order.total.toFixed(2)} ${currencySymbol}</span>
                  </div>
                </div>
              `;

              // Add event listener to view order details when clicked
              activityItem.addEventListener("click", () => {
                viewOrderDetails(order.id);
              });

              activityList.appendChild(activityItem);
            });

            // Add "View All Orders" button if there are more orders than shown
            if (completedOrders.length > 10) {
              const viewAllButton = document.createElement("button");
              viewAllButton.className = "view-all-button";
              viewAllButton.innerHTML = `<i class="fas fa-list"></i> ${
                isEnglish ? "View All Orders" : "عرض كل الطلبات"
              }`;
              viewAllButton.addEventListener("click", viewAllOrders);
              activityList.appendChild(viewAllButton);
            }
          }
        }
      } catch (localStorageError) {
        console.error(
          "Error loading orders from localStorage:",
          localStorageError
        );
      }
    });
}

// Reset recent activity (visual only since we're using the database)
function resetRecentActivity() {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // Get the activity list element
  const activityList = document.getElementById("activity-list");

  // Store the current activities in a hidden div for later retrieval
  const hiddenActivities = document.createElement("div");
  hiddenActivities.id = "hidden-activities";
  hiddenActivities.style.display = "none";

  // Move all activity items to the hidden div
  while (activityList.firstChild) {
    hiddenActivities.appendChild(activityList.firstChild);
  }

  // Append the hidden div to the activity list container
  activityList.appendChild(hiddenActivities);

  // Show empty message
  const emptyMessage = document.createElement("div");
  emptyMessage.className = "empty-message";
  emptyMessage.innerHTML = `
    <i class="fas fa-history"></i>
    <p>${isEnglish ? "No recent activity" : "لا يوجد نشاط حديث"}</p>
  `;
  activityList.appendChild(emptyMessage);

  // Change reset button to show activities button
  const resetButton = document.getElementById("hide-activity-button");
  if (resetButton) {
    resetButton.innerHTML = `<i class="fas fa-eye"></i> ${
      isEnglish ? "Show History" : "إظهار السجل"
    }`;
    resetButton.removeEventListener("click", resetRecentActivity);
    resetButton.addEventListener("click", showHiddenActivity);
  }

  // Save hidden state to localStorage
  localStorage.setItem("activity_history_hidden", "true");

  // Show notification
  showFixedNotification(
    isEnglish ? "History Hidden" : "تم إخفاء السجل",
    isEnglish
      ? "Recent activity history has been hidden successfully"
      : "تم إخفاء سجل النشاط الحديث بنجاح",
    "success"
  );
}

// Show hidden activity
function showHiddenActivity() {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const activityList = document.getElementById("activity-list");
  const hiddenActivities = document.getElementById("hidden-activities");

  if (hiddenActivities) {
    // Remove empty message
    const emptyMessage = activityList.querySelector(".empty-message");
    if (emptyMessage) {
      emptyMessage.remove();
    }

    // Restore hidden activities
    while (hiddenActivities.firstChild) {
      activityList.appendChild(hiddenActivities.firstChild);
    }

    // Remove the hidden container
    hiddenActivities.remove();

    // Change button back to reset
    const resetButton = document.getElementById("hide-activity-button");
    if (resetButton) {
      resetButton.innerHTML = `<i class="fas fa-eye-slash"></i> ${
        isEnglish ? "Hide History" : "اخفاء السجل"
      }`;
      resetButton.removeEventListener("click", showHiddenActivity);
      resetButton.addEventListener("click", resetRecentActivity);
    }

    // Remove hidden state from localStorage
    localStorage.removeItem("activity_history_hidden");

    // Show notification
    showFixedNotification(
      isEnglish ? "History Shown" : "تم إظهار السجل",
      isEnglish
        ? "Recent activity history has been shown successfully"
        : "تم إظهار سجل النشاط الحديث بنجاح",
      "success"
    );
  } else {
    // If no hidden activities exist, reload from server
    loadRecentActivity();
    // Remove hidden state from localStorage
    localStorage.removeItem("activity_history_hidden");
  }
}

// View All Orders History
function viewAllOrders() {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // Would navigate to a full orders history page in a real app
  showFixedNotification(
    isEnglish ? "Coming Soon" : "قادم قريباً",
    isEnglish
      ? "A complete order history page will be added in the next update"
      : "سيتم إضافة صفحة كاملة لسجل الطلبات في التحديث القادم",
    "info"
  );
}

// View order details
function viewOrderDetails(orderId) {
  if (!orderId) {
    showFixedNotification("خطأ", "لم يتم تحديد معرف الطلب", "error");
    return;
  }

  // Show loading in the modal
  showModal("order-details-modal");
  const orderItems = document.getElementById("order-items");
  orderItems.innerHTML =
    '<tr><td colspan="4" class="loading-spinner-container"><i class="fas fa-spinner fa-spin"></i> جاري تحميل بيانات الطلب...</td></tr>';

  // Fetch order from the API
  fetch(`${API_BASE_URL}/api/orders/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      if (!result || !result.data) {
        throw new Error("Invalid order data received");
      }

      const order = result.data;

      // Convert API order format to the expected format
      const formattedOrder = {
        id: order._id || order.orderId || order.orderNumber,
        orderNumber: order.orderNumber,
        date: order.date || order.createdAt,
        tableNumber: order.tableNumber || "0",
        items: order.items || [],
        subtotal: order.subtotal,
        tax: order.tax,
        serviceTax: order.serviceTax,
        discount: order.discount,
        total: order.total || order.totalAmount,
        status: order.status,
      };

      displayOrderDetails(formattedOrder);
    })
    .catch((error) => {
      console.error("Error fetching order details:", error);

      // Try fallback to localStorage if API fails
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const order = orders.find((o) => o.id === orderId);

          if (order) {
            showFixedNotification(
              "تم استخدام النسخة المحلية",
              "تعذر الاتصال بالخادم، تم استخدام البيانات المخزنة محلياً",
              "warning",
              true
            );
            displayOrderDetails(order);
            return;
          }
        }
      } catch (localStorageError) {
        console.error(
          "Error loading orders from localStorage:",
          localStorageError
        );
      }

      // If we get here, we couldn't load the order
      showFixedNotification("خطأ", "لم يتم العثور على الطلب", "error");
      closeOrderModal();
    });
}

// Helper function to display order details in the modal
function displayOrderDetails(order) {
  // Get current language
  const currentLang = getCurrentLanguage();

  // Format date/time for the order based on current language
  const orderDate = new Date(order.date || order.createdAt || Date.now());
  const formattedDate = orderDate.toLocaleDateString(
    currentLang === "ar" ? "ar-EG" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
  const formattedTime = orderDate.toLocaleTimeString(
    currentLang === "ar" ? "ar-EG" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Get modal elements
  const modal = document.getElementById("order-details-modal");
  const modalTitle = document.getElementById("order-details-title");
  const orderItems = document.getElementById("order-items");
  const orderSubtotal = document.getElementById("order-subtotal");
  const orderTax = document.getElementById("order-tax");
  const orderDiscount = document.getElementById("order-discount");
  const orderTotal = document.getElementById("order-total");
  const completeButton = document.getElementById("complete-order-button");
  const cancelButton = document.getElementById("cancel-order-button");
  const printButton = document.getElementById("print-receipt-button");

  // Set modal title with i18n support
  const orderDetailsText = getTranslation("orderDetails");
  const tableText = getTranslation("table");
  modalTitle.textContent = `${orderDetailsText}: ${
    order.orderNumber || order.id
  }${order.tableNumber ? ` - ${tableText} ${order.tableNumber}` : ""}`;

  // Clear previous items
  orderItems.innerHTML = "";

  // Currency symbol based on language
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنية"
      : "EGP";

  // Add order items
  order.items.forEach((item) => {
    const row = document.createElement("tr");
    const itemTotal = ((item.price || 0) * (item.quantity || 0)).toFixed(2);

    // Check if the item has add-ons and build the add-ons HTML
    let addonsHTML = "";
    if (item.addons && item.addons.length > 0) {
      addonsHTML = '<div class="item-addons">';

      item.addons.forEach((section) => {
        if (section.options && section.options.length > 0) {
          section.options.forEach((option) => {
            const displaySection =
              currentLang === "en" && section.titleEn
                ? section.titleEn
                : section.title;
            const displayOption =
              currentLang === "en" && option.nameEn
                ? option.nameEn
                : option.name;
            addonsHTML += `<div class="addon-item">
              <span class="addon-name">${displaySection}: ${displayOption}</span>
              ${
                option.price > 0
                  ? `<span class="addon-price">+${option.price.toFixed(
                      2
                    )}</span>`
                  : ""
              }
            </div>`;
          });
        }
      });

      addonsHTML += "</div>";
    }

    // Display product name based on current language
    const displayItemName =
      currentLang === "en" && item.nameEn
        ? item.nameEn
        : item.nameAr || item.name || "";

    row.innerHTML = `
            <td>
              <div class="item-name">${displayItemName}</div>
              ${addonsHTML}
            </td>
            <td>${(item.price || 0).toFixed(2)} ${currencySymbol}</td>
            <td>${item.quantity || 0}</td>
            <td>${itemTotal} ${currencySymbol}</td>
        `;

    orderItems.appendChild(row);
  });

  // Set order totals
  const subtotal = parseFloat(order.subtotal) || 0;
  orderSubtotal.textContent = `${subtotal.toFixed(2)} ${currencySymbol}`;

  // Handle tax display
  if (order.tax && orderTax) {
    const taxValue = parseFloat(order.tax.value) || 0;
    const taxRate = parseFloat(order.tax.rate) || 0;
    orderTax.textContent = `${taxValue.toFixed(2)} ${currencySymbol}`;
    document.getElementById("tax-row").style.display = "table-row";

    // Update tax info percentage
    const taxInfoElement = document.getElementById("tax-info");
    if (taxInfoElement) {
      taxInfoElement.textContent = ` (${taxRate}%)`;
    }
  } else {
    document.getElementById("tax-row").style.display = "none";
  }

  // Handle service tax display
  const orderServiceTax = document.getElementById("order-service-tax");
  if (order.serviceTax && orderServiceTax) {
    const serviceTaxValue = parseFloat(order.serviceTax.value) || 0;
    const serviceTaxRate = parseFloat(order.serviceTax.rate) || 0;
    orderServiceTax.textContent = `${serviceTaxValue.toFixed(
      2
    )} ${currencySymbol}`;
    document.getElementById("service-tax-row").style.display = "table-row";

    // Update service tax info percentage
    const serviceTaxInfoElement = document.getElementById("service-tax-info");
    if (serviceTaxInfoElement) {
      serviceTaxInfoElement.textContent = ` (${serviceTaxRate}%)`;
    }
  } else {
    document.getElementById("service-tax-row").style.display = "none";
  }

  // Handle voucher discount display
  if (order.discount && orderDiscount) {
    const discountValue = parseFloat(order.discount.value) || 0;
    orderDiscount.textContent = `${discountValue.toFixed(2)} ${currencySymbol}`;
    document.getElementById("discount-row").style.display = "table-row";

    // Add discount code if available
    if (order.discount.code) {
      const discountInfoElement = document.getElementById("discount-info");
      if (discountInfoElement) {
        discountInfoElement.textContent = ` (${order.discount.code})`;
      }
    }
  } else {
    document.getElementById("discount-row").style.display = "none";
  }

  // Handle loyalty points discount display
  const loyaltyDiscountRow = document.getElementById("loyalty-discount-row");
  const orderLoyaltyDiscount = document.getElementById(
    "order-loyalty-discount"
  );

  if (order.loyaltyDiscount && orderLoyaltyDiscount && loyaltyDiscountRow) {
    const loyaltyDiscountValue = parseFloat(order.loyaltyDiscount.value) || 0;
    orderLoyaltyDiscount.textContent = `${loyaltyDiscountValue.toFixed(
      2
    )} ${currencySymbol}`;
    loyaltyDiscountRow.style.display = "table-row";

    // Add points used info if available
    if (order.loyaltyDiscount.pointsUsed) {
      const loyaltyDiscountInfoElement = document.getElementById(
        "loyalty-discount-info"
      );
      if (loyaltyDiscountInfoElement) {
        const pointsText = currentLang === "ar" ? "نقطة" : "points";
        loyaltyDiscountInfoElement.textContent = ` (${order.loyaltyDiscount.pointsUsed} ${pointsText})`;
      }
    }
  } else if (loyaltyDiscountRow) {
    loyaltyDiscountRow.style.display = "none";
  }

  const total = parseFloat(order.total) || 0;
  orderTotal.textContent = `${total.toFixed(2)} ${currencySymbol}`;

  // Translate order info labels
  const orderDateLabel = currentLang === "ar" ? "تاريخ الطلب" : "Order Date";
  const orderTimeLabel = currentLang === "ar" ? "وقت الطلب" : "Order Time";
  const tableNumberLabel =
    currentLang === "ar" ? "رقم الطاولة" : "Table Number";
  const orderStatusLabel = currentLang === "ar" ? "حالة الطلب" : "Order Status";

  // Add information about when the order was placed
  const orderInfoDiv =
    document.getElementById("order-info") || document.createElement("div");
  orderInfoDiv.id = "order-info";
  orderInfoDiv.className = "order-info mb-3";
  orderInfoDiv.innerHTML = `
        <p><strong>${orderDateLabel}:</strong> ${formattedDate}</p>
        <p><strong>${orderTimeLabel}:</strong> ${formattedTime}</p>
        ${
          order.tableNumber
            ? `<p><strong>${tableNumberLabel}:</strong> ${order.tableNumber}</p>`
            : ""
        }
        <p><strong>${orderStatusLabel}:</strong> <span class="status-badge status-${
    order.status
  }">${getStatusText(order.status)}</span></p>
    `;

  // Insert the order info before the items table
  const itemsTable = document.querySelector(".order-items-table");
  itemsTable.parentNode.insertBefore(orderInfoDiv, itemsTable);

  // Set data attributes for buttons
  completeButton.dataset.orderId = order.id;
  cancelButton.dataset.orderId = order.id;
  printButton.dataset.orderId = order.id;

  // Check if kitchen receipt button exists before setting its data attribute
  const kitchenReceiptButton = document.getElementById(
    "print-kitchen-receipt-button"
  );
  if (kitchenReceiptButton) {
    kitchenReceiptButton.dataset.orderId = order.id;

    // Set button style based on status - keep it clickable
    if (order.status === "pending") {
      kitchenReceiptButton.style.backgroundColor = "#7b68ee"; // Original color
      kitchenReceiptButton.style.boxShadow = "";
      kitchenReceiptButton.innerHTML = `<i class="fas fa-utensils"></i> <span>${getTranslation(
        "printKitchenReceipt"
      )}</span>`;
      kitchenReceiptButton.disabled = false;
    } else if (order.status === "processing") {
      // If order is already in processing state, show the button as gray but still clickable
      kitchenReceiptButton.style.backgroundColor = "#999999";
      kitchenReceiptButton.style.boxShadow = "none";
      const reprintText =
        currentLang === "ar"
          ? "إعادة طباعة إيصال المطبخ"
          : "Reprint Kitchen Receipt";
      kitchenReceiptButton.innerHTML = `<i class="fas fa-print"></i> <span>${reprintText}</span>`;
      kitchenReceiptButton.disabled = false; // Not disabled, can click again
    }

    // Remove any existing event listeners by cloning and replacing the element
    const newKitchenReceiptButton = kitchenReceiptButton.cloneNode(true);
    kitchenReceiptButton.parentNode.replaceChild(
      newKitchenReceiptButton,
      kitchenReceiptButton
    );

    // Add the event listener to the specific button
    newKitchenReceiptButton.addEventListener("click", function () {
      printKitchenReceipt(this);
    });
  }

  // Disable buttons if the order is already completed or cancelled
  const isActive = order.status !== "completed" && order.status !== "cancelled";
  completeButton.disabled = !isActive;
  cancelButton.disabled = !isActive;

  // Show the modal
  showModal("order-details-modal");
}

// Get status text based on status code
function getStatusText(status) {
  // Map status codes to i18n translation keys
  const statusTranslationKeys = {
    pending: "statusPending",
    processing: "statusProcessing",
    inProgress: "statusInProgress",
    ready: "statusReady",
    completed: "statusCompleted",
    cancelled: "statusCancelled",
  };

  // Get the translation key for the status
  const translationKey = statusTranslationKeys[status] || "unknown";

  // Return the translated text or a default value
  return getTranslation(translationKey) || status;
}

// Check table order
function checkTableOrder() {
  const tableNumberInput = document.getElementById("table-number-input");
  const tableNumber = tableNumberInput.value.trim();

  if (!tableNumber) {
    showFixedNotification("خطأ", "الرجاء إدخال رقم الطاولة", "error");
    return;
  }

  // Get orders from localStorage
  let orders = [];
  try {
    const savedOrders = localStorage.getItem("orders");
    if (savedOrders) {
      orders = JSON.parse(savedOrders);
    }
  } catch (error) {
    console.error("Error loading orders:", error);
  }

  // Filter active orders for this table
  const tableOrders = orders.filter(
    (order) =>
      order.tableNumber === tableNumber &&
      order.status !== "completed" &&
      order.status !== "cancelled"
  );

  if (tableOrders.length === 0) {
    showFixedNotification(
      "تنبيه",
      `لا توجد طلبات نشطة للطاولة رقم ${tableNumber}`,
      "warning"
    );
    return;
  }

  // If there's more than one order, show the most recent one
  tableOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestOrder = tableOrders[0];

  // View the order details
  viewOrderDetails(latestOrder.id);
}

// Check table order from the database API
function checkTableOrder() {
  const tableNumberInput = document.getElementById("table-number-input");
  const tableNumber = tableNumberInput.value.trim();

  if (!tableNumber) {
    showFixedNotification("خطأ", "الرجاء إدخال رقم الطاولة", "error");
    return;
  }

  // Show loading indicator in the table number input area
  const quickActionsContainer = document.querySelector(".quick-actions");
  const loadingIndicator = document.createElement("div");
  loadingIndicator.className = "table-loading-indicator";
  loadingIndicator.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> جاري البحث...';

  // Add loading indicator after the table input container
  const manualTableEntry = document.querySelector(".manual-table-entry");
  manualTableEntry.parentNode.insertBefore(
    loadingIndicator,
    manualTableEntry.nextSibling
  );

  // Fetch active orders for this table from the API
  fetch(
    `${API_BASE_URL}/api/orders?tableNumber=${tableNumber}&status=pending,processing`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Remove loading indicator
      document.querySelector(".table-loading-indicator").remove();

      // Check if we have data and orders
      if (
        !data ||
        !data.data ||
        !Array.isArray(data.data) ||
        data.data.length === 0
      ) {
        showFixedNotification(
          "تنبيه",
          `لا توجد طلبات نشطة للطاولة رقم ${tableNumber}`,
          "warning"
        );
        return;
      }

      // Get active orders for this table
      const tableOrders = data.data;

      // If there's more than one order, show the most recent one
      tableOrders.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt);
        const dateB = new Date(b.date || b.createdAt);
        return dateB - dateA;
      });

      const latestOrder = tableOrders[0];
      const orderId =
        latestOrder._id || latestOrder.orderId || latestOrder.orderNumber;

      // View the order details
      viewOrderDetails(orderId);
    })
    .catch((error) => {
      console.error("Error checking table order:", error);

      // Remove loading indicator
      const loadingElement = document.querySelector(".table-loading-indicator");
      if (loadingElement) {
        loadingElement.remove();
      }

      // Show error notification
      showFixedNotification(
        "خطأ",
        "حدث خطأ أثناء البحث عن طلبات الطاولة",
        "error"
      );

      // Try localStorage fallback if API fails
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const tableOrders = orders.filter(
            (order) =>
              order.tableNumber === tableNumber &&
              order.status !== "completed" &&
              order.status !== "cancelled"
          );

          if (tableOrders.length > 0) {
            showFixedNotification(
              getTranslation("usingLocalData"),
              getTranslation("serverConnectionError"),
              "warning",
              true
            );

            // If there's more than one order, show the most recent one
            tableOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            const latestOrder = tableOrders[0];

            // View the order details
            viewOrderDetails(latestOrder.id);
          } else {
            showFixedNotification(
              "تنبيه",
              `لا توجد طلبات نشطة للطاولة رقم ${tableNumber}`,
              "warning"
            );
          }
        } else {
          showFixedNotification(
            "تنبيه",
            `لا توجد طلبات نشطة للطاولة رقم ${tableNumber}`,
            "warning"
          );
        }
      } catch (localStorageError) {
        console.error(
          "Error loading orders from localStorage:",
          localStorageError
        );
        showFixedNotification(
          "تنبيه",
          `لا توجد طلبات نشطة للطاولة رقم ${tableNumber}`,
          "warning"
        );
      }
    });
}

// Complete an order
function completeOrder() {
  // Get the current order ID
  const orderId = document.getElementById("complete-order-button").dataset
    .orderId;

  if (!orderId) {
    showFixedNotification("خطأ", "لم يتم العثور على معرف الطلب", "error");
    return;
  }

  // Disable buttons to prevent double submission
  const completeButton = document.getElementById("complete-order-button");
  const cancelButton = document.getElementById("cancel-order-button");
  const printButton = document.getElementById("print-receipt-button");

  completeButton.disabled = true;
  completeButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
  cancelButton.disabled = true;

  // Update order status using the API
  fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "completed",
      completedDate: new Date().toISOString(),
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Close the order modal
      closeOrderModal();

      // Display success notification
      showFixedNotification(
        "تم إنهاء الطلب",
        `تم إنهاء الطلب #${orderId} بنجاح وإضافته إلى سجل اليوم`,
        "success"
      );

      // If this was a registered customer (not a guest), show loyalty points notification
      if (
        data.data.customerId &&
        !data.data.customerId.toString().startsWith("new")
      ) {
        const total = data.data.total || data.data.totalAmount || 0;
        const pointsEarned = Math.floor(total / 10);

        if (pointsEarned > 0) {
          setTimeout(() => {
            showFixedNotification(
              "نقاط الولاء",
              `تم إضافة ${pointsEarned} نقطة ولاء لحساب العميل`,
              "info"
            );
          }, 2000); // Show after a short delay so notifications don't overlap
        }
      }

      // Optional: Generate receipt
      printReceipt(orderId);

      // Update the orders list
      loadActiveOrders();

      // Update the recent activity list
      loadRecentActivity();

      // Get table number and total from the returned data
      const tableNumber = data.data.tableNumber || "0";
      const total = data.data.total || data.data.totalAmount || 0;

      // Notify the customer if applicable
      if (tableNumber) {
        sendCustomerNotification(orderId, tableNumber, total);
      }

      // Store the completed order data for potential rating
      storeCompletedOrderData(data.data);
    })
    .catch((error) => {
      console.error("Error completing order:", error);
      showFixedNotification("خطأ", "حدث خطأ أثناء تحديث حالة الطلب", "error");

      // Re-enable buttons
      completeButton.disabled = false;
      completeButton.innerHTML =
        '<i class="fas fa-check-circle"></i><span>إنهاء الطلب وإصدار الفاتورة</span>';
      cancelButton.disabled = false;

      // Try localStorage fallback
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const orderIndex = orders.findIndex((o) => o.id === orderId);

          if (orderIndex !== -1) {
            // Update order status
            orders[orderIndex].status = "completed";
            orders[orderIndex].completedDate = new Date().toISOString();

            // Save updated orders
            localStorage.setItem("orders", JSON.stringify(orders));

            // Close the order modal
            closeOrderModal();

            // Display success notification
            showFixedNotification(
              "تم إنهاء الطلب (محلياً)",
              `تم إنهاء الطلب #${orderId} محلياً بنجاح`,
              "warning"
            );

            // Optional: Generate receipt
            printReceipt(orderId);

            // Update the orders list
            loadActiveOrders();

            // Update the recent activity list
            loadRecentActivity();

            // Notify the customer if applicable
            if (orders[orderIndex].tableNumber) {
              sendCustomerNotification(
                orderId,
                orders[orderIndex].tableNumber,
                orders[orderIndex].total
              );
            }

            // Store the completed order data for potential rating
            storeCompletedOrderData(orders[orderIndex]);
          }
        }
      } catch (localStorageError) {
        console.error(
          "Error updating order in localStorage:",
          localStorageError
        );
      }
    });
}

// Store completed order data for rating
function storeCompletedOrderData(orderData) {
  try {
    // Extract basic order info for logging purposes
    const orderInfo = {
      orderId: orderData._id || orderData.orderId || orderData.orderNumber,
      items: orderData.items || [],
      timestamp: new Date().toISOString(),
      tableNumber: orderData.tableNumber || "0",
    };

    console.log("Order completed:", orderInfo);
    console.log(
      "Rating notification will be sent via WebSocket to all connected clients"
    );

    // We no longer need to store in localStorage as WebSocket notifications are now used
    // The backend will send a WebSocket notification to all connected clients when an order is completed

    // The WebSocket handler will take care of showing the rating modal
    // based on the page type and table number

    // If we have showToast function, tell the cashier the customer can now rate their order
    if (typeof showToast === "function") {
      showToast(
        "يمكن للعميل الآن تقييم طلبه من خلال صفحة المنيو",
        "info",
        5000
      );
    }

    return orderInfo;
  } catch (error) {
    console.error("Error handling order data for rating:", error);
    return null;
  }
}

// Print a receipt for the order
function printReceipt() {
  const orderId = document.getElementById("print-receipt-button").dataset
    .orderId;
  if (!orderId) {
    showFixedNotification("خطأ", "لم يتم العثور على معرف الطلب", "error");
    return;
  }

  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // Show print preparation message
  showFixedNotification(
    isEnglish ? "Preparing" : "جاري التحضير",
    isEnglish
      ? "Preparing receipt for printing..."
      : "جاري تحضير الإيصال للطباعة...",
    "info"
  );

  // Fetch order details from the API
  fetch(`${API_BASE_URL}/api/orders/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      if (!result || !result.data) {
        throw new Error("Invalid order data received");
      }

      const order = result.data;

      // Convert API order format to the expected format
      const formattedOrder = {
        id: order._id || order.orderId || order.orderNumber,
        orderNumber: order.orderNumber,
        date: order.date || order.createdAt,
        tableNumber: order.tableNumber || "0",
        items: order.items || [],
        subtotal: order.subtotal,
        tax: order.tax,
        serviceTax: order.serviceTax,
        discount: order.discount,
        total: order.total || order.totalAmount,
        status: order.status,
      };

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showFixedNotification(
          isEnglish ? "Print Error" : "خطأ في الطباعة",
          isEnglish
            ? "Please allow pop-ups for printing"
            : "يرجى السماح بالنوافذ المنبثقة للطباعة",
          "error"
        );
        return;
      }

      // Create receipt content
      const receiptContent = generateReceiptContent(formattedOrder);

      // Set document direction and title based on language
      const htmlDir = isEnglish ? "ltr" : "rtl";
      const bodyDir = isEnglish ? "ltr" : "rtl";
      const receiptTitle = isEnglish
        ? `Order Receipt ${orderId}`
        : `إيصال الطلب ${orderId}`;

      // Write to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${htmlDir}">
          <head>
            <title>${receiptTitle}</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 10px;
                max-width: 400px;
                margin: 0 auto;
                direction: ${bodyDir};
                background-color: #ffffff;
                color: #333;
                line-height: 1.4;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 1px dashed #ccc;
                padding-bottom: 10px;
              }
              .receipt-header h1 {
                margin: 10px 0;
                font-size: 24px;
                color: #333;
              }
              .logo-container {
                text-align: center;
                margin-bottom: 8px;
              }
              .receipt-logo {
                max-width: 120px;
                max-height: 70px;
              }
              .restaurant-info {
                font-size: 14px;
                margin: 5px 0;
                line-height: 1.3;
              }
              .restaurant-info p {
                margin: 3px 0;
              }
              .restaurant-name {
                font-weight: bold;
                font-size: 16px;
              }
              .receipt-order-info {
                background-color: #f9f9f9;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 15px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                font-size: 14px;
              }
              .order-detail {
                display: flex;
                flex-direction: column;
              }
              .detail-label {
                color: #777;
                font-size: 12px;
              }
              .detail-value {
                font-weight: bold;
              }
              .receipt-items-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid #333;
                padding-bottom: 5px;
                margin-bottom: 8px;
                font-weight: bold;
                font-size: 15px;
              }
              .items-header-pricing {
                display: grid;
                grid-template-columns: 50px 50px 60px;
                text-align: center;
                font-size: 13px;
              }
              .receipt-items {
                margin: 10px 0 20px;
              }
              .receipt-item {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                padding: 8px 0;
                border-bottom: 1px dotted #eee;
              }
              .item-details {
                display: flex;
                flex-direction: column;
                flex: 1;
              }
              .item-name {
                font-weight: 600;
              }
              .item-notes {
                font-size: 12px;
                color: #777;
                margin-top: 3px;
              }
              .item-pricing {
                display: grid;
                grid-template-columns: 50px 50px 60px;
                text-align: center;
                align-items: center;
              }
              .item-quantity {
                font-weight: 600;
              }
              .receipt-totals {
                margin-top: 15px;
                border-top: 1px dashed #ccc;
                padding-top: 10px;
              }
              .receipt-total-row {
                display: flex;
                justify-content: space-between;
                margin: 5px 0;
              }
              .discount-row {
                color: #2e7d32;
              }
              .receipt-grand-total {
                font-weight: bold;
                font-size: 18px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 2px solid #000;
              }
              .receipt-payment-method {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                padding: 8px;
                background-color: #f5f5f5;
                border-radius: 4px;
                font-weight: 500;
              }
              .points-earned {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                margin: 15px 0;
                padding: 10px;
                background-color: #fff9e6;
                border-radius: 6px;
                font-weight: 600;
                color: #ff9800;
                text-align: center;
              }
              .points-earned i {
                color: #ffc107;
              }
              .receipt-footer {
                text-align: center;
                margin-top: 20px;
                font-size: 14px;
                border-top: 1px dashed #ccc;
                padding-top: 15px;
              }
              .thank-you-message {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 5px;
              }
              .footer-note, .footer-social {
                margin: 5px 0;
                color: #666;
              }
              .qr-code {
                display: flex;
                justify-content: center;
                margin-top: 15px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 5px;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${receiptContent}
            <div class="no-print" style="margin-top: 20px; text-align: center;">
              <button onclick="window.print()" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ${isEnglish ? "Print Receipt" : "طباعة الإيصال"}
              </button>
              <button onclick="window.close()" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; font-weight: bold;">
                ${isEnglish ? "Close" : "إغلاق"}
              </button>
            </div>
            <script>
              // Auto print after a short delay
              setTimeout(() => {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();
    })
    .catch((error) => {
      console.error("Error printing receipt:", error);
      showFixedNotification(
        isEnglish ? "Error" : "خطأ",
        isEnglish ? "Could not find the order" : "لم يتم العثور على الطلب",
        "error"
      );
    });
}

// Function to generate receipt content
function generateReceiptContent(order) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const orderDate = new Date(order.date);
  const formattedDate = orderDate.toLocaleDateString(
    isEnglish ? "en-US" : "ar-EG"
  );
  const formattedTime = orderDate.toLocaleTimeString(
    isEnglish ? "en-US" : "ar-EG",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Get customer name if available
  const customerName =
    order.customerName || (order.customer ? order.customer.name : "");
  const customerPhone =
    order.customerPhone || (order.customer ? order.customer.phone : "");
  const tableNumber = order.tableNumber || "";
  const orderType =
    order.type || (isEnglish ? "Dine-in Order" : "طلب في المطعم");
  const orderNumber = order.id || order._id || "";

  // Currency symbol based on language
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : isEnglish
      ? "EGP"
      : "جنية";

  let itemsHtml = order.items
    .map((item) => {
      // Display product name based on current language
      const displayItemName =
        isEnglish && item.nameEn ? item.nameEn : item.nameAr || item.name || "";
      return `
    <div class="receipt-item">
      <div class="item-details">
        <span class="item-name">${displayItemName}</span>
        ${item.notes ? `<small class="item-notes">${item.notes}</small>` : ""}
      </div>
      <div class="item-pricing">
        <span class="item-quantity">${item.quantity}×</span>
        <span class="item-price">${parseFloat(item.price).toFixed(2)}</span>
        <span class="item-total">${(item.price * item.quantity).toFixed(
          2
        )}</span>
      </div>
    </div>
  `;
    })
    .join("");

  // Generate totals section with translations
  let totalsHtml = `
    <div class="receipt-total-row">
      <span>${isEnglish ? "Subtotal:" : "المجموع الفرعي:"}</span>
      <span>${parseFloat(order.subtotal).toFixed(2)} ${currencySymbol}</span>
    </div>
  `;

  // Add tax if applicable
  if (order.tax && order.tax.value > 0) {
    totalsHtml += `
      <div class="receipt-total-row">
        <span>${isEnglish ? "Tax" : "الضريبة"} (${order.tax.rate}%):</span>
        <span>${parseFloat(order.tax.value).toFixed(2)} ${currencySymbol}</span>
      </div>
    `;
  }

  // Add service tax if applicable
  if (order.serviceTax && order.serviceTax.value > 0) {
    totalsHtml += `
      <div class="receipt-total-row">
        <span>${isEnglish ? "Service Tax" : "ضريبة الخدمة"} (${
      order.serviceTax.rate
    }%):</span>
        <span>${parseFloat(order.serviceTax.value).toFixed(
          2
        )} ${currencySymbol}</span>
      </div>
    `;
  }

  // Add discount if applicable
  if (order.discount && order.discount.value > 0) {
    totalsHtml += `
      <div class="receipt-total-row discount-row">
        <span>${isEnglish ? "Discount" : "الخصم"}${
      order.discount.code ? ` (${order.discount.code})` : ""
    }:</span>
        <span>-${parseFloat(order.discount.value).toFixed(
          2
        )} ${currencySymbol}</span>
      </div>
    `;
  }

  // Add loyalty points discount if applicable
  if (order.loyaltyDiscount && order.loyaltyDiscount.value > 0) {
    totalsHtml += `
      <div class="receipt-total-row discount-row">
        <span>${isEnglish ? "Loyalty Points Discount" : "خصم نقاط الولاء"}${
      order.loyaltyDiscount.pointsUsed
        ? ` (${order.loyaltyDiscount.pointsUsed} ${
            isEnglish ? "points" : "نقطة"
          })`
        : ""
    }:</span>
        <span>-${parseFloat(order.loyaltyDiscount.value).toFixed(
          2
        )} ${currencySymbol}</span>
      </div>
    `;
  }

  // Add grand total
  totalsHtml += `
    <div class="receipt-total-row receipt-grand-total">
      <span>${isEnglish ? "Total:" : "الإجمالي:"}</span>
      <span>${parseFloat(order.total).toFixed(2)} ${currencySymbol}</span>
    </div>
  `;

  // Add payment method if available
  if (order.paymentMethod) {
    totalsHtml += `
      <div class="receipt-payment-method">
        <span>${isEnglish ? "Payment Method:" : "طريقة الدفع:"}</span>
        <span>${order.paymentMethod}</span>
      </div>
    `;
  }

  // Create points earned section if applicable (for registered customers)
  let pointsEarnedHtml = "";
  if (order.customerId && !order.customerId.toString().startsWith("new")) {
    const pointsEarned = Math.floor(order.total / 10);
    if (pointsEarned > 0) {
      pointsEarnedHtml = `
        <div class="points-earned">
          <i class="fas fa-star"></i>
          <span>${
            isEnglish ? "Loyalty Points Earned:" : "نقاط الولاء المكتسبة:"
          } ${pointsEarned} ${isEnglish ? "points" : "نقطة"}</span>
        </div>
      `;
    }
  }

  return `
    <div class="receipt-header">
      <div class="logo-container">
        <img src="/images/logo.png" alt="Logo" class="receipt-logo" onerror="this.style.display='none'">
      </div>
      <h1>${isEnglish ? "Order Receipt" : "إيصال الطلب"}</h1>
      <div class="restaurant-info">
        <p class="restaurant-name">Digital Menu Restaurant</p>
        <p class="restaurant-address">123 Main St, City, Country</p>
        <p class="restaurant-contact">${
          isEnglish ? "Phone:" : "هاتف:"
        } 123-456-7890</p>
      </div>
    </div>
    
    <div class="receipt-order-info">
      <div class="order-detail">
        <span class="detail-label">${
          isEnglish ? "Order Number:" : "رقم الطلب:"
        }</span>
        <span class="detail-value">#${orderNumber}</span>
      </div>
      <div class="order-detail">
        <span class="detail-label">${isEnglish ? "Date:" : "التاريخ:"}</span>
        <span class="detail-value">${formattedDate}</span>
      </div>
      <div class="order-detail">
        <span class="detail-label">${isEnglish ? "Time:" : "الوقت:"}</span>
        <span class="detail-value">${formattedTime}</span>
      </div>
      ${
        tableNumber
          ? `
      <div class="order-detail">
        <span class="detail-label">${
          isEnglish ? "Table Number:" : "رقم الطاولة:"
        }</span>
        <span class="detail-value">${tableNumber}</span>
      </div>
      `
          : ""
      }
      <div class="order-detail">
        <span class="detail-label">${
          isEnglish ? "Order Type:" : "نوع الطلب:"
        }</span>
        <span class="detail-value">${orderType}</span>
      </div>
      ${
        customerName
          ? `
      <div class="order-detail">
        <span class="detail-label">${isEnglish ? "Customer:" : "العميل:"}</span>
        <span class="detail-value">${customerName}</span>
      </div>
      `
          : ""
      }
      ${
        customerPhone
          ? `
      <div class="order-detail">
        <span class="detail-label">${
          isEnglish ? "Customer Phone:" : "هاتف العميل:"
        }</span>
        <span class="detail-value">${customerPhone}</span>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="receipt-items-header">
      <span class="items-header-label">${isEnglish ? "Items" : "الأصناف"}</span>
      <div class="items-header-pricing">
        <span>${isEnglish ? "Qty" : "الكمية"}</span>
        <span>${isEnglish ? "Price" : "السعر"}</span>
        <span>${isEnglish ? "Total" : "المجموع"}</span>
      </div>
    </div>
    
    <div class="receipt-items">
      ${itemsHtml}
    </div>
    
    <div class="receipt-totals">
      ${totalsHtml}
    </div>
    
    ${pointsEarnedHtml}
    
    <div class="receipt-footer">
      <p class="thank-you-message">${
        isEnglish
          ? "Thank you for choosing Digital Menu Restaurant"
          : "شكراً لاختياركم Digital Menu Restaurant"
      }</p>
      <p class="footer-note">${
        isEnglish
          ? "We hope you enjoyed your meal"
          : "نتمنى لكم تجربة طعام ممتازة"
      }</p>
      <p class="footer-social">${
        isEnglish ? "Follow us:" : "تابعونا:"
      } @DigitalMenuRestaurant</p>
      <div class="qr-code" id="receipt-qr">
        <!-- QR Code placeholder - could be generated via JS if needed -->
      </div>
    </div>
  `;
}

// Function to load reservations for a specific date
function loadReservationsForDate(dateStr) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // Get the reservations grid
  const reservationsGrid = document.getElementById("reservations-grid");

  if (!reservationsGrid) {
    console.error("Reservations grid not found");
    return;
  }

  // Show loading message
  reservationsGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> ${
    isEnglish ? "Loading reservations..." : "جاري تحميل الحجوزات..."
  }</div>`;

  // Show the no reservations message if needed
  const noReservationsMessage = document.getElementById(
    "no-reservations-message"
  );
  if (noReservationsMessage) {
    noReservationsMessage.style.display = "none";
  }

  // Fetch reservations from the API for the specified date
  fetch(`${API_BASE_URL}/api/reservations/cashier?date=${dateStr}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          isEnglish
            ? "Error loading reservations"
            : "حدث خطأ أثناء تحميل الحجوزات"
        );
      }
      return response.json();
    })
    .then((result) => {
      // Clear the grid
      reservationsGrid.innerHTML = "";

      // Check if we have any reservations
      if (!result.data || result.data.length === 0) {
        if (noReservationsMessage) {
          noReservationsMessage.style.display = "flex";
        } else {
          reservationsGrid.innerHTML = `
            <div class="no-reservations-message">
              <i class="fas fa-calendar-alt"></i>
              <p>${
                isEnglish
                  ? "No reservations for the selected date"
                  : "لا توجد حجوزات لليوم المحدد"
              }</p>
              <small>${
                isEnglish
                  ? "All available reservations for the selected date will appear here"
                  : "ستظهر هنا جميع الحجوزات المتاحة في اليوم المحدد"
              }</small>
            </div>
          `;
        }
        return;
      }

      // Group reservations by time slot for better organization
      const reservationsByTime = {};
      result.data.forEach((reservation) => {
        const time =
          reservation.time || (isEnglish ? "Not specified" : "غير محدد");
        if (!reservationsByTime[time]) {
          reservationsByTime[time] = [];
        }
        reservationsByTime[time].push(reservation);
      });

      // Sort time slots
      const sortedTimes = Object.keys(reservationsByTime).sort();

      // Display reservations grouped by time
      sortedTimes.forEach((time) => {
        const reservations = reservationsByTime[time];

        // Create cards for each reservation
        reservations.forEach((reservation) => {
          const card = createReservationCard(reservation);
          reservationsGrid.appendChild(card);
        });
      });
    })
    .catch((error) => {
      console.error("Error loading reservations:", error);
      reservationsGrid.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${
            isEnglish
              ? "Error loading reservations"
              : "حدث خطأ أثناء تحميل الحجوزات"
          }</p>
          <button class="retry-button" onclick="loadReservationsForDate('${dateStr}')">${
        isEnglish ? "Retry" : "إعادة المحاولة"
      }</button>
        </div>
      `;
    });
}

// Helper function to create a reservation card
function createReservationCard(reservation) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const card = document.createElement("div");
  card.className = `reservation-card status-${reservation.status || "pending"}`;
  card.dataset.id = reservation._id;

  // Format the date
  const reservationDate = new Date(reservation.date);
  const formattedDate = reservationDate.toLocaleDateString(
    isEnglish ? "en-US" : "ar-EG",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  // Status text
  let statusText = isEnglish ? "Pending" : "قيد الانتظار";
  if (reservation.status === "confirmed")
    statusText = isEnglish ? "Confirmed" : "مؤكد";
  if (reservation.status === "completed")
    statusText = isEnglish ? "Completed" : "مكتمل";
  if (reservation.status === "cancelled")
    statusText = isEnglish ? "Cancelled" : "ملغي";

  card.innerHTML = `
    <div class="reservation-header">
      <div class="reservation-name">
        <i class="fas fa-user"></i>
        ${reservation.name || (isEnglish ? "Guest" : "زائر")}
      </div>
      <div class="reservation-time">${
        reservation.time || (isEnglish ? "Not specified" : "غير محدد")
      }</div>
    </div>
    <div class="reservation-details">
      <div class="detail-row">
        <span class="detail-label"><i class="fas fa-users"></i> ${
          isEnglish ? "Number of people:" : "عدد الأشخاص:"
        }</span>
        <span class="detail-value">${reservation.people || 1}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label"><i class="fas fa-phone"></i> ${
          isEnglish ? "Phone number:" : "رقم الهاتف:"
        }</span>
        <span class="detail-value">${
          reservation.phone || (isEnglish ? "Not available" : "غير متاح")
        }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label"><i class="fas fa-calendar-day"></i> ${
          isEnglish ? "Date:" : "التاريخ:"
        }</span>
        <span class="detail-value">${formattedDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label"><i class="fas fa-info-circle"></i> ${
          isEnglish ? "Status:" : "الحالة:"
        }</span>
        <span class="detail-value status-badge status-${
          reservation.status || "pending"
        }">${statusText}</span>
      </div>
      ${
        reservation.notes
          ? `
        <div class="reservation-notes">
          <i class="fas fa-sticky-note"></i>
          <p>${reservation.notes}</p>
        </div>
      `
          : ""
      }
    </div>
    <div class="reservation-actions">
      ${
        reservation.status === "pending"
          ? `
        <button class="action-button confirm" data-id="${
          reservation._id
        }" onclick="confirmReservation('${reservation._id}')">
          <i class="fas fa-check-circle"></i> ${isEnglish ? "Confirm" : "تأكيد"}
        </button>
      `
          : ""
      }
      ${
        reservation.status === "pending" || reservation.status === "confirmed"
          ? `
        <button class="action-button complete" data-id="${
          reservation._id
        }" onclick="completeReservation('${reservation._id}')">
          <i class="fas fa-calendar-check"></i> ${
            isEnglish ? "Complete" : "إكمال"
          }
        </button>
        <button class="action-button cancel" data-id="${
          reservation._id
        }" onclick="cancelReservation('${reservation._id}')">
          <i class="fas fa-times-circle"></i> ${isEnglish ? "Cancel" : "إلغاء"}
        </button>
      `
          : ""
      }
    </div>
  `;

  return card;
}

// Reservation action functions
function confirmReservation(id) {
  updateReservationStatus(id, "confirm");
}

function completeReservation(id) {
  updateReservationStatus(id, "complete");
}

function cancelReservation(id) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const confirmMessage = isEnglish
    ? "Are you sure you want to cancel this reservation?"
    : "هل أنت متأكد من إلغاء هذا الحجز؟";

  if (confirm(confirmMessage)) {
    updateReservationStatus(id, "cancel");
  }
}

// Function to update reservation status
function updateReservationStatus(id, action) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // Disable the button to prevent multiple clicks
  const button = document.querySelector(`.action-button[data-id="${id}"]`);
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${
      isEnglish ? "Updating..." : "جاري التحديث..."
    }`;
  }

  // Update the reservation status
  fetch(`${API_BASE_URL}/api/reservations/cashier/${id}/${action}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          isEnglish ? "Error updating reservation" : "حدث خطأ أثناء تحديث الحجز"
        );
      }
      return response.json();
    })
    .then((result) => {
      // Show success notification
      let actionText = isEnglish ? "Confirmed" : "تم تأكيد";
      if (action === "complete")
        actionText = isEnglish ? "Completed" : "تم إكمال";
      if (action === "cancel")
        actionText = isEnglish ? "Cancelled" : "تم إلغاء";

      showFixedNotification(
        isEnglish ? "Reservation Updated" : "تم تحديث الحجز",
        isEnglish
          ? `Reservation ${actionText.toLowerCase()} successfully`
          : `${actionText} الحجز بنجاح`,
        "success"
      );

      // Refresh the reservations
      const dateInput = document.getElementById("reservation-date");
      if (dateInput && dateInput.value) {
        loadReservationsForDate(dateInput.value);
      }

      // Update local storage for cross-tab communication
      try {
        localStorage.setItem("reservation_update", Date.now().toString());
      } catch (e) {
        console.error("Error updating localStorage:", e);
      }
    })
    .catch((error) => {
      console.error("Error updating reservation:", error);
      showFixedNotification(
        isEnglish ? "Error" : "خطأ",
        isEnglish ? "Error updating reservation" : "حدث خطأ أثناء تحديث الحجز",
        "error"
      );

      // Re-enable the button
      if (button) {
        let actionText = isEnglish ? "Confirm" : "تأكيد";
        let iconClass = "check-circle";

        if (action === "complete") {
          actionText = isEnglish ? "Complete" : "إكمال";
          iconClass = "calendar-check";
        }
        if (action === "cancel") {
          actionText = isEnglish ? "Cancel" : "إلغاء";
          iconClass = "times-circle";
        }

        button.disabled = false;
        button.innerHTML = `<i class="fas fa-${iconClass}"></i> ${actionText}`;
      }
    });
}

// Function to check for new orders and notify the user
function checkForNewOrders() {
  // Get the last notification timestamp
  const lastNotificationTime =
    localStorage.getItem("lastOrderNotificationTime") || 0;

  // Fetch recent orders from the API
  fetch(`${API_BASE_URL}/api/orders?status=pending`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error fetching new orders");
      }
      return response.json();
    })
    .then((result) => {
      if (!result.data || !result.data.length) return;

      // Get the current timestamp
      const currentTime = Date.now();

      // Filter orders that were created after the last notification
      const newOrders = result.data.filter((order) => {
        const orderTime = new Date(order.date || order.createdAt).getTime();
        return orderTime > lastNotificationTime;
      });

      // If there are new orders, notify the user
      if (newOrders.length > 0) {
        // Update the last notification time
        localStorage.setItem(
          "lastOrderNotificationTime",
          currentTime.toString()
        );

        // Play notification sound if enabled
        playNotificationSound();

        // Show notification for each new order (up to 3)
        const ordersToNotify = newOrders.slice(0, 3);

        ordersToNotify.forEach((order, index) => {
          // Add a slight delay for each notification to avoid overlap
          setTimeout(() => {
            showFixedNotification(
              "طلب جديد!",
              `تم استلام طلب جديد للطاولة رقم ${
                order.tableNumber || "0"
              } بقيمة ${parseFloat(order.total).toFixed(2)} جنية`,
              "success",
              true
            );
          }, index * 1500);
        });

        // If there are more than 3 new orders, show a summary notification
        if (newOrders.length > 3) {
          setTimeout(() => {
            showFixedNotification(
              "طلبات جديدة",
              `هناك ${newOrders.length - 3} طلبات جديدة إضافية`,
              "info",
              true
            );
          }, 4500);
        }
      }
    })
    .catch((error) => {
      console.error("Error checking for new orders:", error);
    });
}

// Start auto-refresh for orders
function startAutoRefresh() {
  // Check for new orders every 30 seconds
  setInterval(() => {
    loadActiveOrders();
    checkForNewOrders();
  }, 30000);
}

// Send notification to customer
function sendCustomerNotification(orderId, tableNumber, total) {
  console.log(
    `Sending notification for order ${orderId} to table ${tableNumber}`
  );

  // This is a placeholder for actual customer notification functionality
  // In a real production environment, this could:
  // 1. Send a push notification to a customer app
  // 2. Send an SMS via an API
  // 3. Update a display screen in the restaurant
  // 4. Alert waitstaff via a separate system

  // For now, we'll just show a notification in the UI to simulate this
  showFixedNotification(
    "إشعار للعميل",
    `تم إرسال إشعار لطاولة رقم ${tableNumber} بإكمال الطلب وإعداد الفاتورة`,
    "info"
  );
}

// Cancel an order
function cancelOrder() {
  // Get the current order ID
  const orderId = document.getElementById("cancel-order-button").dataset
    .orderId;

  if (!orderId) {
    showFixedNotification("خطأ", "لم يتم العثور على معرف الطلب", "error");
    return;
  }

  // Confirm cancellation
  if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) {
    return;
  }

  // Disable buttons to prevent double submission
  const completeButton = document.getElementById("complete-order-button");
  const cancelButton = document.getElementById("cancel-order-button");
  const printButton = document.getElementById("print-receipt-button");

  cancelButton.disabled = true;
  cancelButton.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> جاري الإلغاء...';
  completeButton.disabled = true;

  // Update order status using the API
  fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "cancelled",
      cancelledDate: new Date().toISOString(),
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // Close the order modal
      closeOrderModal();

      // Display success notification
      showFixedNotification(
        "تم إلغاء الطلب",
        `تم إلغاء الطلب #${orderId} بنجاح`,
        "success"
      );

      // Update the orders list
      loadActiveOrders();

      // Update the recent activity list
      loadRecentActivity();
    })
    .catch((error) => {
      console.error("Error cancelling order:", error);
      showFixedNotification("خطأ", "حدث خطأ أثناء إلغاء الطلب", "error");

      // Re-enable buttons
      cancelButton.disabled = false;
      cancelButton.innerHTML =
        '<i class="fas fa-times-circle"></i><span>إلغاء الطلب</span>';
      completeButton.disabled = false;

      // Try localStorage fallback
      try {
        const savedOrders = localStorage.getItem("orders");
        if (savedOrders) {
          const orders = JSON.parse(savedOrders);
          const orderIndex = orders.findIndex((o) => o.id === orderId);

          if (orderIndex !== -1) {
            // Update order status
            orders[orderIndex].status = "cancelled";
            orders[orderIndex].cancelledDate = new Date().toISOString();

            // Save updated orders
            localStorage.setItem("orders", JSON.stringify(orders));

            // Close the order modal
            closeOrderModal();

            // Display success notification
            showFixedNotification(
              "تم إلغاء الطلب (محلياً)",
              `تم إلغاء الطلب #${orderId} محلياً بنجاح`,
              "warning"
            );

            // Update the orders list
            loadActiveOrders();

            // Update the recent activity list
            loadRecentActivity();
          }
        }
      } catch (localStorageError) {
        console.error(
          "Error updating order in localStorage:",
          localStorageError
        );
      }
    });
}

// Initialize WebSocket connection for real-time notifications
function initWebSocketConnection() {
  try {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      window.cashierSocket = null;
      return;
    }
    console.log("Initializing WebSocket connection for cashier page...");

    // Create WebSocket connection
    const socketProtocol =
      window.location.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = isLocal
      ? `${socketProtocol}//localhost:5000`
      : `${socketProtocol}//${window.location.host}`;
    const socket = new WebSocket(socketUrl);

    // Connection opened
    socket.addEventListener("open", (event) => {
      console.log("WebSocket connection established");
      showFixedNotification(
        "اتصال مباشر",
        "تم الاتصال بالخادم للحصول على الإشعارات المباشرة",
        "success",
        false
      );
    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        // Handle different message types
        switch (message.type) {
          case "newOrder":
            // Refresh active orders when a new order comes in
            loadActiveOrders();
            playNotificationSound();
            showFixedNotification(
              "طلب جديد",
              `تم استلام طلب جديد رقم #${
                message.data.order.orderNumber || message.data.order._id
              }`,
              "info"
            );
            break;

          case "order_completed_for_rating":
            // The notification is sent to all clients including this one
            console.log("Order completed for rating:", message.data);
            showFixedNotification(
              "تم اكتمال الطلب",
              `يمكن للعميل الآن تقييم الطلب رقم #${message.data.orderId}`,
              "info"
            );

            // Show rating modal on the cashier page for the customer to rate
            if (typeof promptRatingForCompletedOrder === "function") {
              console.log("Showing rating modal on cashier page for customer");
              setTimeout(() => {
                promptRatingForCompletedOrder(message.data.orderId);
              }, 1500);
            }
            break;

          case "order_rated":
            // Notification that an order was rated
            console.log("Order rated notification:", message.data);
            showFixedNotification(
              "تم التقييم",
              `تم تقييم الطلب رقم #${message.data.orderId}`,
              "success"
            );
            break;

          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (parseError) {
        console.error("Error parsing WebSocket message:", parseError);
      }
    });

    // Connection closed
    socket.addEventListener("close", (event) => {
      console.log("WebSocket connection closed");
      showFixedNotification(
        "انقطع الاتصال",
        "تم فقد الاتصال بالخادم، جاري إعادة المحاولة...",
        "warning"
      );

      // Attempt to reconnect after a delay
      setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        initWebSocketConnection();
      }, 5000);
    });

    // Connection error
    socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      showFixedNotification(
        "خطأ في الاتصال",
        "حدث خطأ أثناء الاتصال بالخادم",
        "error"
      );
    });

    // Store socket in window for potential later use
    window.cashierSocket = socket;
  } catch (error) {
    console.error("Error initializing WebSocket:", error);
    showFixedNotification(
      "خطأ في الاتصال",
      "تعذر الاتصال بخادم الإشعارات المباشرة",
      "error"
    );
  }
}

// Print a kitchen receipt for the order
function printKitchenReceipt(kitchenReceiptButton) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  // If no button was provided (for backward compatibility)
  if (!kitchenReceiptButton) {
    kitchenReceiptButton = document.getElementById(
      "print-kitchen-receipt-button"
    );
  }

  if (!kitchenReceiptButton) {
    showFixedNotification(
      isEnglish ? "Error" : "خطأ",
      isEnglish
        ? "Kitchen receipt button not found"
        : "زر إيصال المطبخ غير موجود",
      "error"
    );
    return;
  }

  const orderId = kitchenReceiptButton.dataset.orderId;
  if (!orderId) {
    showFixedNotification(
      isEnglish ? "Error" : "خطأ",
      isEnglish ? "Order ID not found" : "لم يتم العثور على معرف الطلب",
      "error"
    );
    return;
  }

  // Change button color to indicate it was clicked, but keep it enabled
  kitchenReceiptButton.style.backgroundColor = "#999999";
  kitchenReceiptButton.style.boxShadow = "none";
  const reprintText = isEnglish
    ? "Reprint Kitchen Receipt"
    : "إعادة طباعة إيصال المطبخ";
  kitchenReceiptButton.innerHTML = `<i class="fas fa-print"></i> <span>${reprintText}</span>`;
  // Keep the button enabled
  kitchenReceiptButton.disabled = false;

  // Show print preparation message
  showFixedNotification(
    isEnglish ? "Preparing" : "جاري التحضير",
    isEnglish
      ? "Preparing kitchen receipt for printing..."
      : "جاري تحضير إيصال المطبخ للطباعة...",
    "info"
  );

  // First update the order status to "processing" (preparing)
  fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "processing", // Update status to processing (preparing)
      processingDate: new Date().toISOString(),
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((statusUpdateResult) => {
      // After status update, proceed with fetching order details and printing
      return fetch(`${API_BASE_URL}/api/orders/${orderId}`);
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((result) => {
      if (!result || !result.data) {
        throw new Error("Invalid order data received");
      }

      const order = result.data;

      // Convert API order format to the expected format
      const formattedOrder = {
        id: order._id || order.orderId || order.orderNumber,
        orderNumber: order.orderNumber,
        date: order.date || order.createdAt,
        tableNumber: order.tableNumber || "0",
        items: order.items || [],
        notes: order.notes || "",
        status: order.status,
      };

      // Create a new window for printing
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        showFixedNotification(
          isEnglish ? "Print Error" : "خطأ في الطباعة",
          isEnglish
            ? "Please allow pop-ups for printing"
            : "يرجى السماح بالنوافذ المنبثقة للطباعة",
          "error"
        );
        return;
      }

      // Create kitchen receipt content
      const kitchenReceiptContent =
        generateKitchenReceiptContent(formattedOrder);

      // Set document direction and title based on language
      const htmlDir = isEnglish ? "ltr" : "rtl";
      const bodyDir = isEnglish ? "ltr" : "rtl";
      const receiptTitle = isEnglish
        ? `Kitchen Receipt for Order ${orderId}`
        : `إيصال المطبخ للطلب ${orderId}`;
      const printButtonText = isEnglish
        ? "Print Kitchen Receipt"
        : "طباعة إيصال المطبخ";

      // Write to print window
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${htmlDir}">
          <head>
            <title>${receiptTitle}</title>
            <style>
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none;
                }
              }
              
              body {
                font-family: 'Courier New', monospace;
                padding: 0;
                max-width: 100%;
                margin: 0 auto;
                direction: ${bodyDir};
                background-color: #f8f9fa;
              }
              
              .receipt-container {
                max-width: 400px;
                margin: 0 auto;
                padding: 10px;
                background-color: white;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              
              .receipt-header {
                text-align: center;
                border-bottom: 2px dashed #333;
                padding-bottom: 15px;
                margin-bottom: 10px;
              }
              
              .receipt-header h1 {
                margin: 5px 0;
                font-size: 24px;
                text-transform: uppercase;
                color: #333;
              }
              
              .receipt-header p {
                margin: 5px 0;
                font-size: 14px;
              }
              
              .order-info {
                background-color: #f1f1f1;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                font-size: 16px;
                font-weight: bold;
                border-left: 4px solid #333;
              }
              
              .receipt-items {
                margin: 20px 0;
              }
              
              .receipt-item {
                margin: 0 0 15px 0;
                padding: 15px;
                border-bottom: 1px solid #eee;
                position: relative;
              }
              
              .receipt-item:last-child {
                border-bottom: 2px dashed #333;
              }
              
              .item-quantity {
                font-weight: bold;
                font-size: 24px;
                margin-left: 8px;
                background-color: #333;
                color: white;
                padding: 2px 8px;
                border-radius: 5px;
                display: inline-block;
                min-width: 20px;
                text-align: center;
              }
              
              .item-name {
                font-weight: bold;
                font-size: 18px;
                display: inline-block;
                margin-right: 5px;
              }
              
              .item-notes {
                margin-top: 8px;
                color: #666;
              }
              
              .order-notes {
                margin: 20px 0;
                padding: 15px;
                background-color: #fff9e6;
                border: 1px dashed #ffd700;
                border-radius: 5px;
              }
              
              .order-notes-title {
                font-weight: bold;
                margin-bottom: 10px;
              }
              
              .receipt-footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 10px;
                border-top: 2px dashed #333;
                font-size: 12px;
                font-style: italic;
              }
              
              .print-btn {
                display: block;
                width: 80%;
                max-width: 300px;
                margin: 20px auto;
                padding: 15px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.3s;
              }
              
              .print-btn:hover {
                background-color: #3e8e41;
              }
            </style>
          </head>
          <body>
            <div class="receipt-container">
              ${kitchenReceiptContent}
              <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button class="print-btn" onclick="window.print()">${printButtonText}</button>
                <button class="print-btn" onclick="window.close()" style="background-color: #f44336; margin-top: 10px;">
                  ${isEnglish ? "Close" : "إغلاق"}
                </button>
              </div>
            </div>
            <script>
              // Auto print after a short delay
              setTimeout(() => {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);

      // Close the document for writing
      printWindow.document.close();

      // After successful printing, update the UI to reflect the new status
      loadActiveOrders();
    })
    .catch((error) => {
      console.error("Error fetching order for kitchen receipt:", error);
      showFixedNotification(
        isEnglish ? "Error" : "خطأ",
        isEnglish
          ? "An error occurred while preparing the kitchen receipt"
          : "حدث خطأ أثناء تحضير إيصال المطبخ",
        "error"
      );

      // Reset button appearance if there was an error
      kitchenReceiptButton.style.backgroundColor = "#7b68ee";
      kitchenReceiptButton.style.boxShadow = "";
      const buttonText = isEnglish
        ? "Print Kitchen Receipt"
        : "طباعة إيصال المطبخ";
      kitchenReceiptButton.innerHTML = `<i class="fas fa-utensils"></i> <span>${buttonText}</span>`;
      kitchenReceiptButton.disabled = false;
    });
}

// Generate content for kitchen receipt
function generateKitchenReceiptContent(order) {
  // Get current language
  const currentLang = getCurrentLanguage();
  const isEnglish = currentLang === "en";

  const orderDate = new Date(order.date);
  const formattedDate = orderDate.toLocaleDateString(
    isEnglish ? "en-US" : "ar-EG"
  );
  const formattedTime = orderDate.toLocaleTimeString(
    isEnglish ? "en-US" : "ar-EG",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Order info section
  const orderInfoHtml = `
    <div class="order-info">
      <div>
        <strong>${isEnglish ? "Order Number:" : "رقم الطلب:"}</strong> ${
    order.orderNumber || order.id
  }
      </div>
      <div>
        <strong>${isEnglish ? "Table:" : "الطاولة:"}</strong> ${
    order.tableNumber
  }
      </div>
      <div>
        <strong>${isEnglish ? "Time:" : "الوقت:"}</strong> ${formattedTime}
      </div>
    </div>
  `;

  // Items section with focus on quantity, name and any special instructions or addons
  let itemsHtml = order.items
    .map((item) => {
      // Display product name based on current language
      const displayItemName =
        currentLang === "en" && item.nameEn
          ? item.nameEn
          : item.nameAr || item.name || "";
      let itemHtml = `
          <div class="receipt-item">
            <div class="item-header">
              <span class="item-quantity">${item.quantity}</span>
              <span class="item-name">${displayItemName}</span>
            </div>
        `;

      // Add item notes if available
      if (item.notes) {
        itemHtml += `
            <div class="item-notes">
              ${item.notes}
            </div>
          `;
      }

      // Add addons if available - Fixed to handle the correct addon structure
      if (item.addons && item.addons.length > 0) {
        itemHtml += '<div class="item-addons">';

        item.addons.forEach((section) => {
          if (section.options && section.options.length > 0) {
            section.options.forEach((option) => {
              const displaySection =
                currentLang === "en" && section.titleEn
                  ? section.titleEn
                  : section.title;
              const displayOption =
                currentLang === "en" && option.nameEn
                  ? option.nameEn
                  : option.name;
              itemHtml += `<div class="addon-item">
                ${displaySection}: ${displayOption}
              </div>`;
            });
          }
        });

        itemHtml += "</div>";
      }

      itemHtml += `</div>`;
      return itemHtml;
    })
    .join("");

  // Order notes section if available
  let orderNotesHtml = "";
  if (order.notes && order.notes.trim() !== "") {
    orderNotesHtml = `
      <div class="order-notes">
        <div class="order-notes-title">${
          isEnglish ? "Order Notes:" : "ملاحظات الطلب:"
        }</div>
        <div>${order.notes}</div>
      </div>
    `;
  }

  const currentTime = new Date();
  const orderTimeText = `${formattedTime} - ${formattedDate}`;
  const printTime = currentTime.toLocaleTimeString(
    isEnglish ? "en-US" : "ar-EG",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return `
    <div class="receipt-header">
      <h1>${isEnglish ? "Kitchen Receipt" : "إيصال المطبخ"}</h1>
      <p>${orderTimeText}</p>
      <p>${isEnglish ? "Print Time:" : "وقت الطباعة:"} ${printTime}</p>
    </div>
    ${orderInfoHtml}
    <div class="receipt-items">
      ${itemsHtml}
    </div>
    ${orderNotesHtml}
    <div class="receipt-footer">
      <p>${
        isEnglish
          ? "*** FOR KITCHEN USE ONLY - NOT A CUSTOMER RECEIPT ***"
          : "*** للمطبخ فقط - ليس إيصالاً للعميل ***"
      }</p>
    </div>
  `;
}

// ==================== NEW ORDER CREATION FUNCTIONALITY ====================

// Global variables for new order
let newOrderCart = [];
let allProducts = [];
let allCategories = [];
let allOffers = [];
let taxSettings = { rate: 0, serviceRate: 0 };
let currentProduct = null;
let selectedAddons = [];

// Initialize new order modal
function initNewOrderModal() {
  const createOrderBtn = document.getElementById("create-order-button");
  const closeCreateOrderModal = document.getElementById(
    "close-create-order-modal"
  );
  const submitOrderBtn = document.getElementById("submit-new-order-button");

  if (createOrderBtn) {
    createOrderBtn.addEventListener("click", openNewOrderModal);
  }

  if (closeCreateOrderModal) {
    closeCreateOrderModal.addEventListener("click", closeNewOrderModal);
  }

  if (submitOrderBtn) {
    submitOrderBtn.addEventListener("click", submitNewOrder);
  }

  // Initialize tabs
  initTabs();

  // Close modal when clicking outside
  const modal = document.getElementById("create-order-modal");
  if (modal) {
    window.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeNewOrderModal();
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    const modal = document.getElementById("create-order-modal");
    if (modal && modal.classList.contains("show")) {
      // ESC to close
      if (e.key === "Escape") {
        closeNewOrderModal();
      }
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        submitNewOrder();
      }
    }
  });
}

// Initialize tabs functionality
function initTabs() {
  const productsTab = document.getElementById("products-tab");
  const offersTab = document.getElementById("offers-tab");
  const productsContent = document.getElementById("products-content");
  const offersContent = document.getElementById("offers-content");

  if (productsTab && offersTab && productsContent && offersContent) {
    productsTab.addEventListener("click", () => switchTab("products"));
    offersTab.addEventListener("click", () => switchTab("offers"));
  }
}

// Switch between tabs
function switchTab(tabName) {
  const productsTab = document.getElementById("products-tab");
  const offersTab = document.getElementById("offers-tab");
  const productsContent = document.getElementById("products-content");
  const offersContent = document.getElementById("offers-content");

  if (!productsTab || !offersTab || !productsContent || !offersContent) return;

  // Remove active class from all tabs and contents
  productsTab.classList.remove("active");
  offersTab.classList.remove("active");
  productsContent.classList.remove("active");
  offersContent.classList.remove("active");

  // Add active class to selected tab and content
  if (tabName === "products") {
    productsTab.classList.add("active");
    productsContent.classList.add("active");
  } else if (tabName === "offers") {
    offersTab.classList.add("active");
    offersContent.classList.add("active");
  }
}

// Open new order modal
async function openNewOrderModal() {
  // Check if user is logged in and has permission
  const userLoggedIn = typeof isLoggedIn === "function" && isLoggedIn();
  const hasCashierPermission =
    typeof hasPermission === "function" && hasPermission("cashier");

  if (!userLoggedIn || !hasCashierPermission) {
    const currentLang = getCurrentLanguage();
    const errorTitle = currentLang === "ar" ? "تم رفض الوصول" : "Access Denied";
    const errorMsg =
      currentLang === "ar"
        ? "يجب تسجيل الدخول بحساب لديه صلاحية الكاشير لإنشاء طلب جديد"
        : "You must login with cashier access to create a new order";
    showFixedNotification(errorTitle, errorMsg, "error");
    return;
  }

  const modal = document.getElementById("create-order-modal");
  modal.classList.add("show");

  // Reset cart
  newOrderCart = [];
  updateCartDisplay();

  // Reset to products tab
  switchTab("products");

  // Load products, categories, and offers
  await loadProductsForOrder();
  await loadOffersForOrder();
  await loadTaxSettings();

  // Focus on table number input
  setTimeout(() => {
    const tableInput = document.getElementById("new-order-table-number");
    if (tableInput) {
      tableInput.focus();
    }
  }, 300);
}

// Close new order modal
function closeNewOrderModal() {
  const modal = document.getElementById("create-order-modal");
  modal.classList.remove("show");

  // Reset form
  document.getElementById("new-order-table-number").value = "";
  newOrderCart = [];
  updateCartDisplay();
}

// Load products for order
async function loadProductsForOrder() {
  const productsGrid = document.getElementById("new-order-products-grid");
  const currentLang = getCurrentLanguage();
  const loadingText =
    currentLang === "ar" ? "جاري تحميل المنتجات..." : "Loading products...";
  productsGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>${loadingText}</span></div>`;

  try {
    // Fetch products
    const productsResponse = await fetch(`${API_BASE_URL}/api/products`);
    const productsData = await productsResponse.json();
    allProducts = productsData.data || [];

    // Fetch categories
    const categoriesResponse = await fetch(
      `${API_BASE_URL}/api/categories`
    );
    const categoriesData = await categoriesResponse.json();
    allCategories = categoriesData.data || [];

    // Display category filters
    displayCategoryFilters();

    // Display products
    displayProducts(allProducts);
  } catch (error) {
    console.error("Error loading products:", error);
    const errorText =
      currentLang === "ar" ? "خطأ في تحميل المنتجات" : "Error loading products";
    productsGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>${errorText}</p></div>`;
  }
}

// Load offers for order
async function loadOffersForOrder() {
  const offersGrid = document.getElementById("new-order-offers-grid");
  if (!offersGrid) return;

  const currentLang = getCurrentLanguage();
  const loadingText =
    getTranslation("loadingOffers") ||
    (currentLang === "ar" ? "جاري تحميل العروض..." : "Loading offers...");
  offersGrid.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><span>${loadingText}</span></div>`;

  try {
    // Fetch active offers
    const offersResponse = await fetch(
      `${API_BASE_URL}/api/offers?active=true`
    );
    const offersData = await offersResponse.json();
    allOffers = offersData.data || [];

    // Display offers
    displayOffers(allOffers);
  } catch (error) {
    console.error("Error loading offers:", error);
    const errorText =
      getTranslation("errorLoadingOffers") ||
      (currentLang === "ar" ? "خطأ في تحميل العروض" : "Error loading offers");
    offersGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><p>${errorText}</p></div>`;
  }
}

// Display offers
function displayOffers(offers) {
  const offersGrid = document.getElementById("new-order-offers-grid");
  if (!offersGrid) return;

  const currentLang = getCurrentLanguage();

  // Filter only active offers
  const activeOffers = offers.filter((offer) => offer.isActive);

  if (activeOffers.length === 0) {
    const noOffersText =
      getTranslation("noOffersAvailable") ||
      (currentLang === "ar" ? "لا توجد عروض متاحة" : "No offers available");
    offersGrid.innerHTML = `<div class="empty-message"><i class="fas fa-tag"></i><p>${noOffersText}</p></div>`;
    return;
  }

  offersGrid.innerHTML = "";
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنيه"
      : "EGP";

  activeOffers.forEach((offer) => {
    const offerCard = document.createElement("div");
    offerCard.className = "offer-card product-card";
    const offerTitle =
      currentLang === "en" && offer.titleEn ? offer.titleEn : offer.title;
    const offerDescription =
      currentLang === "en" && offer.descriptionEn
        ? offer.descriptionEn
        : offer.description;

    offerCard.innerHTML = `
      <img src="${
        offer.image || "../images/placeholder.png"
      }" alt="${offerTitle}" class="product-image" onerror="this.src='../images/placeholder.png'">
      <div class="product-info">
        <div class="product-name">${offerTitle}</div>
        <div class="offer-description">${offerDescription}</div>
        <div class="offer-prices">
          <span class="original-price">${parseFloat(
            offer.originalPrice
          ).toFixed(2)} ${currencySymbol}</span>
          <span class="discounted-price">${parseFloat(
            offer.discountedPrice
          ).toFixed(2)} ${currencySymbol}</span>
          <span class="discount-badge">-${offer.discountPercentage}%</span>
        </div>
      </div>
    `;

    offerCard.addEventListener("click", () => selectOffer(offer));
    offersGrid.appendChild(offerCard);
  });
}

// Select offer (add to cart)
function selectOffer(offer) {
  const currentLang = getCurrentLanguage();
  const offerTitle =
    currentLang === "en" && offer.titleEn ? offer.titleEn : offer.title;

  // Add offer to cart as an item
  const cartItem = {
    id: offer.id,
    name: offer.title,
    nameEn: offer.titleEn || "",
    nameAr: offer.title || "",
    price: offer.discountedPrice, // Use discounted price
    basePrice: offer.discountedPrice,
    quantity: 1,
    addons: [],
    image: offer.image,
    isOffer: true, // Mark as offer
    originalPrice: offer.originalPrice,
    discountPercentage: offer.discountPercentage,
  };

  // Check if offer already exists in cart
  const existingIndex = newOrderCart.findIndex(
    (item) => item.id === offer.id && item.isOffer
  );

  if (existingIndex !== -1) {
    // Increase quantity if already in cart
    newOrderCart[existingIndex].quantity += 1;
  } else {
    // Add new offer to cart
    newOrderCart.push(cartItem);
  }

  updateCartDisplay();

  // Show success notification
  const successTitle = currentLang === "ar" ? "تمت الإضافة" : "Added";
  const successMsg =
    currentLang === "ar"
      ? `تمت إضافة ${offerTitle} إلى السلة`
      : `${offerTitle} added to cart`;
  showFixedNotification(successTitle, successMsg, "success", true);
}

// Display category filters
function displayCategoryFilters() {
  const currentLang = getCurrentLanguage();
  const allCategoriesText =
    currentLang === "ar" ? "جميع الفئات" : "All Categories";
  const categoryFilter = document.querySelector(".category-filter");
  categoryFilter.innerHTML = `<button class="category-btn active" data-category="all"><span>${allCategoriesText}</span></button>`;

  allCategories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = "category-btn";
    btn.dataset.category = category.value;
    const categoryName =
      currentLang === "en" && category.nameEn ? category.nameEn : category.name;
    btn.innerHTML = `<span>${categoryName}</span>`;
    btn.addEventListener("click", () => filterByCategory(category.value, btn));
    categoryFilter.appendChild(btn);
  });

  // Add event listener for "all" button
  const allBtn = categoryFilter.querySelector('[data-category="all"]');
  allBtn.addEventListener("click", () => filterByCategory("all", allBtn));
}

// Filter products by category
function filterByCategory(categoryValue, clickedBtn) {
  // Update active button
  document
    .querySelectorAll(".category-btn")
    .forEach((btn) => btn.classList.remove("active"));
  clickedBtn.classList.add("active");

  // Filter and display products
  const filteredProducts =
    categoryValue === "all"
      ? allProducts
      : allProducts.filter((p) => p.category === categoryValue);

  displayProducts(filteredProducts);
}

// Display products
function displayProducts(products) {
  const productsGrid = document.getElementById("new-order-products-grid");
  const currentLang = getCurrentLanguage();

  if (products.length === 0) {
    const noProductsText =
      currentLang === "ar" ? "لا توجد منتجات" : "No products available";
    productsGrid.innerHTML = `<div class="empty-message"><i class="fas fa-box-open"></i><p>${noProductsText}</p></div>`;
    return;
  }

  productsGrid.innerHTML = "";
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنيه"
      : "EGP";

  products.forEach((product) => {
    const productCard = document.createElement("div");
    productCard.className = "product-card";
    const productName =
      currentLang === "en" && product.nameEn ? product.nameEn : product.name;
    productCard.innerHTML = `
      <img src="${
        product.image || "../images/placeholder.png"
      }" alt="${productName}" class="product-image" onerror="this.src='../images/placeholder.png'">
      <div class="product-info">
        <div class="product-name">${productName}</div>
        <div class="product-price">${parseFloat(product.price).toFixed(
          2
        )} ${currencySymbol}</div>
      </div>
    `;

    productCard.addEventListener("click", () => selectProduct(product));
    productsGrid.appendChild(productCard);
  });
}

// Select product (open addons modal if product has addons)
function selectProduct(product) {
  currentProduct = product;

  // Check if product has addons
  if (product.addOns && product.addOns.length > 0) {
    openAddonsModal(product);
  } else {
    // Add directly to cart
    addToCart(product, [], 1);
  }
}

// Open addons modal
function openAddonsModal(product) {
  const modal = document.getElementById("product-addons-modal");
  const productName = document.getElementById("addons-product-name");
  const addonsContainer = document.getElementById("addons-container");
  const currentLang = getCurrentLanguage();

  const displayProductName =
    currentLang === "en" && product.nameEn ? product.nameEn : product.name;
  productName.textContent = displayProductName;
  selectedAddons = [];

  // Store product for total calculation
  window.currentAddonProduct = product;

  // Display addons
  addonsContainer.innerHTML = "";

  if (product.addOns && product.addOns.length > 0) {
    product.addOns.forEach((section, sectionIndex) => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "addon-section";

      const titleDiv = document.createElement("div");
      titleDiv.className = "addon-section-title";
      const currentLang = getCurrentLanguage();
      const sectionTitle =
        currentLang === "en" && section.titleEn
          ? section.titleEn
          : section.title;
      const requiredText = currentLang === "ar" ? "(مطلوب)" : "(Required)";
      titleDiv.innerHTML = `
        ${sectionTitle}
        ${
          section.required
            ? `<span class="addon-required">${requiredText}</span>`
            : ""
        }
      `;
      sectionDiv.appendChild(titleDiv);

      const optionsDiv = document.createElement("div");
      optionsDiv.className = "addon-options";

      section.options.forEach((option, optionIndex) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "addon-option";

        const inputType = section.required ? "radio" : "checkbox";
        const inputName = section.required
          ? `addon-section-${sectionIndex}`
          : "";
        const currentLang = getCurrentLanguage();
        const currencySymbol =
          typeof getCurrencyText === "function"
            ? getCurrencyText()
            : currentLang === "ar"
            ? "جنيه"
            : "EGP";
        const optionName =
          currentLang === "en" && option.nameEn ? option.nameEn : option.name;

        optionDiv.innerHTML = `
          <input type="${inputType}" 
                 ${inputName ? `name="${inputName}"` : ""} 
                 id="addon-${sectionIndex}-${optionIndex}"
                 data-section-index="${sectionIndex}"
                 data-option-index="${optionIndex}">
          <label for="addon-${sectionIndex}-${optionIndex}" class="addon-option-label">
            <span class="addon-option-name">${optionName}</span>
            <span class="addon-option-price">+${parseFloat(
              option.price
            ).toFixed(2)} ${currencySymbol}</span>
          </label>
        `;

        const input = optionDiv.querySelector("input");
        input.addEventListener("change", () => {
          handleAddonSelection(
            sectionIndex,
            optionIndex,
            section,
            option,
            input.checked
          );

          // Add visual feedback
          if (input.checked) {
            optionDiv.style.background =
              "linear-gradient(90deg, rgba(66, 209, 88, 0.15), var(--admin-card-bg))";
            optionDiv.style.borderColor = "var(--cashier-primary)";
          } else {
            optionDiv.style.background = "";
            optionDiv.style.borderColor = "";
          }
        });

        // Click on option div to toggle input
        optionDiv.addEventListener("click", (e) => {
          if (e.target !== input && e.target.tagName !== "LABEL") {
            input.click();
          }
        });

        optionsDiv.appendChild(optionDiv);
      });

      sectionDiv.appendChild(optionsDiv);
      addonsContainer.appendChild(sectionDiv);
    });
  }

  // Reset quantity
  document.getElementById("addon-quantity").value = 1;

  // Update total price initially
  updateAddonsTotalPrice();

  // Setup quantity buttons
  setupAddonQuantityButtons();

  // Setup add to cart button
  const addToCartBtn = document.getElementById("add-to-cart-button");
  addToCartBtn.onclick = () => {
    const quantity = parseInt(document.getElementById("addon-quantity").value);

    // Validate required addons
    if (!validateRequiredAddons(product)) {
      const currentLang = getCurrentLanguage();
      const errorTitle = currentLang === "ar" ? "خطأ" : "Error";
      const errorMsg =
        currentLang === "ar"
          ? "يرجى اختيار جميع الإضافات المطلوبة"
          : "Please select all required add-ons";
      showFixedNotification(errorTitle, errorMsg, "error");
      return;
    }

    addToCart(product, selectedAddons, quantity);
    closeAddonsModal();
  };

  // Setup close button
  const closeBtn = document.getElementById("close-addons-modal");
  closeBtn.onclick = closeAddonsModal;

  // Keyboard shortcuts for addons modal
  const addonModalKeyHandler = (e) => {
    if (modal.classList.contains("show")) {
      // ESC to close
      if (e.key === "Escape") {
        closeAddonsModal();
      }
      // Enter to add to cart
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
        const addBtn = document.getElementById("add-to-cart-button");
        if (addBtn) addBtn.click();
      }
    }
  };

  document.addEventListener("keydown", addonModalKeyHandler);

  // Show modal with animation
  modal.classList.add("show");

  // Focus on first addon option
  setTimeout(() => {
    const firstOption = modal.querySelector(".addon-option input");
    if (firstOption) firstOption.focus();
  }, 300);
}

// Close addons modal
function closeAddonsModal() {
  const modal = document.getElementById("product-addons-modal");
  modal.classList.remove("show");
  selectedAddons = [];
  document.getElementById("addon-quantity").value = 1;

  // Clear any selected states
  const allInputs = modal.querySelectorAll(
    'input[type="radio"], input[type="checkbox"]'
  );
  allInputs.forEach((input) => (input.checked = false));
}

// Update addons total price
function updateAddonsTotalPrice() {
  const product = window.currentAddonProduct;
  if (!product) return;

  const currentLang = getCurrentLanguage();
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنيه"
      : "EGP";
  const quantity =
    parseInt(document.getElementById("addon-quantity").value) || 1;

  // Calculate base price
  let totalPrice = parseFloat(product.price);

  // Add selected addons price
  selectedAddons.forEach((addon) => {
    totalPrice += parseFloat(addon.price);
  });

  // Multiply by quantity
  totalPrice *= quantity;

  // Update display
  const totalPriceElement = document.getElementById("addons-total-price");
  if (totalPriceElement) {
    totalPriceElement.textContent = `${totalPrice.toFixed(
      2
    )} ${currencySymbol}`;
  }
}

// Setup addon quantity buttons
function setupAddonQuantityButtons() {
  const minusBtn = document.getElementById("addon-quantity-minus");
  const plusBtn = document.getElementById("addon-quantity-plus");
  const quantityInput = document.getElementById("addon-quantity");

  minusBtn.onclick = () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue > 1) {
      quantityInput.value = currentValue - 1;
      updateAddonsTotalPrice();
    }
  };

  plusBtn.onclick = () => {
    const currentValue = parseInt(quantityInput.value);
    quantityInput.value = currentValue + 1;
    updateAddonsTotalPrice();
  };

  // Update price when quantity input changes
  quantityInput.addEventListener("input", () => {
    if (parseInt(quantityInput.value) < 1) {
      quantityInput.value = 1;
    }
    updateAddonsTotalPrice();
  });
}

// Handle addon selection
function handleAddonSelection(
  sectionIndex,
  optionIndex,
  section,
  option,
  isChecked
) {
  if (isChecked) {
    // If required (radio), remove other selections from this section
    if (section.required) {
      selectedAddons = selectedAddons.filter(
        (addon) => addon.sectionIndex !== sectionIndex
      );
    }

    selectedAddons.push({
      sectionIndex: sectionIndex,
      optionIndex: optionIndex,
      title: section.title,
      titleEn: section.titleEn,
      name: option.name,
      nameEn: option.nameEn,
      price: option.price,
      required: section.required,
    });
  } else {
    // Remove from selectedAddons
    selectedAddons = selectedAddons.filter(
      (addon) =>
        !(
          addon.sectionIndex === sectionIndex &&
          addon.optionIndex === optionIndex
        )
    );
  }

  // Update total price
  updateAddonsTotalPrice();
}

// Validate required addons
function validateRequiredAddons(product) {
  if (!product.addOns) return true;

  const requiredSections = product.addOns.filter((section) => section.required);

  for (let section of requiredSections) {
    const sectionIndex = product.addOns.indexOf(section);
    const hasSelection = selectedAddons.some(
      (addon) => addon.sectionIndex === sectionIndex
    );

    if (!hasSelection) {
      return false;
    }
  }

  return true;
}

// Add to cart
function addToCart(product, addons, quantity) {
  // Calculate item price including addons
  let itemPrice = parseFloat(product.price);
  const addonsCopy = JSON.parse(JSON.stringify(addons));
  const currentLang = getCurrentLanguage();

  addonsCopy.forEach((addon) => {
    itemPrice += parseFloat(addon.price);
  });

  // Check if same item with same addons exists
  const existingItemIndex = newOrderCart.findIndex((item) => {
    if (item.id !== product.id) return false;
    if (item.addons.length !== addonsCopy.length) return false;

    // Check if addons match
    return addonsCopy.every((addon) =>
      item.addons.some(
        (itemAddon) =>
          itemAddon.sectionIndex === addon.sectionIndex &&
          itemAddon.optionIndex === addon.optionIndex
      )
    );
  });

  if (existingItemIndex >= 0) {
    // Update quantity
    newOrderCart[existingItemIndex].quantity += quantity;
  } else {
    // Add new item with language-appropriate name
    const productName =
      currentLang === "en" && product.nameEn ? product.nameEn : product.name;
    newOrderCart.push({
      id: product.id,
      name: productName,
      nameAr: product.name,
      nameEn: product.nameEn || product.name,
      price: itemPrice,
      basePrice: parseFloat(product.price),
      quantity: quantity,
      addons: addonsCopy,
      image: product.image,
    });
  }

  updateCartDisplay();
  // currentLang already declared above
  const displayProductName =
    currentLang === "en" && product.nameEn ? product.nameEn : product.name;
  const successTitle = currentLang === "ar" ? "تمت الإضافة" : "Added";
  const successMsg =
    currentLang === "ar"
      ? `تمت إضافة ${displayProductName} إلى السلة`
      : `${displayProductName} added to cart`;
  showFixedNotification(successTitle, successMsg, "success");
}

// Update cart display
function updateCartDisplay() {
  const cartItems = document.getElementById("new-order-cart-items");
  const currentLang = getCurrentLanguage();
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنيه"
      : "EGP";

  // Update cart counter badge
  const cartTitle = document.querySelector(".order-cart-section h3");
  if (cartTitle) {
    cartTitle.setAttribute("data-count", newOrderCart.length);
  }

  if (newOrderCart.length === 0) {
    const emptyCartText =
      currentLang === "ar" ? "السلة فارغة" : "Cart is empty";
    cartItems.innerHTML = `<div class="empty-cart-message"><i class="fas fa-shopping-cart"></i><p>${emptyCartText}</p></div>`;
    updateOrderSummary();
    return;
  }

  cartItems.innerHTML = "";

  newOrderCart.forEach((item, index) => {
    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";

    // Build addons text
    let addonsText = "";
    if (item.addons && item.addons.length > 0) {
      addonsText = '<div class="cart-item-addons">';
      item.addons.forEach((addon) => {
        const addonTitle =
          currentLang === "en" && addon.titleEn ? addon.titleEn : addon.title;
        const addonName =
          currentLang === "en" && addon.nameEn ? addon.nameEn : addon.name;
        addonsText += `${addonTitle}: ${addonName}<br>`;
      });
      addonsText += "</div>";
    }

    const itemTotal = (item.price * item.quantity).toFixed(2);
    const itemName =
      currentLang === "en" && item.nameEn
        ? item.nameEn
        : item.nameAr || item.name;

    // Add offer badge if it's an offer
    let offerBadge = "";
    let priceDisplay = `${itemTotal} ${currencySymbol}`;
    if (item.isOffer && item.originalPrice) {
      const originalTotal = (item.originalPrice * item.quantity).toFixed(2);
      const offerBadgeText =
        getTranslation("offer") || (currentLang === "ar" ? "عرض" : "Offer");
      offerBadge = `<span class="cart-item-offer-badge">${offerBadgeText}</span>`;
      priceDisplay = `
        <div class="cart-item-price-container">
          <span class="cart-item-original-price">${originalTotal} ${currencySymbol}</span>
          <span class="cart-item-price">${itemTotal} ${currencySymbol}</span>
        </div>
      `;
    } else {
      priceDisplay = `<div class="cart-item-price">${itemTotal} ${currencySymbol}</div>`;
    }

    cartItem.innerHTML = `
      <div class="cart-item-header">
        <div class="cart-item-name">
          ${itemName}
          ${offerBadge}
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${index})">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${addonsText}
      <div class="cart-item-footer">
        <div class="cart-item-quantity">
          <button class="cart-qty-btn" onclick="updateCartQuantity(${index}, -1)">
            <i class="fas fa-minus"></i>
          </button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="cart-qty-btn" onclick="updateCartQuantity(${index}, 1)">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        ${priceDisplay}
      </div>
    `;

    cartItems.appendChild(cartItem);
  });

  updateOrderSummary();
}

// Remove from cart
function removeFromCart(index) {
  newOrderCart.splice(index, 1);
  updateCartDisplay();
}

// Update cart quantity
function updateCartQuantity(index, change) {
  newOrderCart[index].quantity += change;

  if (newOrderCart[index].quantity <= 0) {
    removeFromCart(index);
  } else {
    updateCartDisplay();
  }
}

// Update order summary
function updateOrderSummary() {
  const currentLang = getCurrentLanguage();
  const currencySymbol =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "ar"
      ? "جنيه"
      : "EGP";

  // Calculate subtotal
  const subtotal = newOrderCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Calculate tax
  const taxValue = subtotal * (taxSettings.rate / 100);

  // Calculate service tax
  const serviceTaxValue = subtotal * (taxSettings.serviceRate / 100);

  // Calculate total
  const total = subtotal + taxValue + serviceTaxValue;

  // Update display
  document.getElementById(
    "new-order-subtotal"
  ).textContent = `${subtotal.toFixed(2)} ${currencySymbol}`;
  document.getElementById("new-order-tax").textContent = `${taxValue.toFixed(
    2
  )} ${currencySymbol}`;
  document.getElementById(
    "new-order-service-tax"
  ).textContent = `${serviceTaxValue.toFixed(2)} ${currencySymbol}`;
  document.getElementById("new-order-total").textContent = `${total.toFixed(
    2
  )} ${currencySymbol}`;

  // Enable/disable submit button
  const submitBtn = document.getElementById("submit-new-order-button");
  submitBtn.disabled = newOrderCart.length === 0;
}

// Load tax settings
async function loadTaxSettings() {
  try {
    const base = (function () {
      const { hostname, origin } = window.location;
      const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
      return isLocal ? "http://localhost:5000" : origin;
    })();
    const response = await fetch(`${base}/api/tax-settings`);
    const data = await response.json();

    if (data.success && data.data) {
      taxSettings = {
        rate: parseFloat(data.data.rate) || 0,
        serviceRate: parseFloat(data.data.serviceRate) || 0,
      };
    }
  } catch (error) {
    console.error("Error loading tax settings:", error);
    taxSettings = { rate: 0, serviceRate: 0 };
  }

  updateOrderSummary();
}

// Submit new order
async function submitNewOrder() {
  const tableNumberInput = document.getElementById("new-order-table-number");
  const tableNumber = tableNumberInput.value;
  const currentLang = getCurrentLanguage();

  if (!tableNumber || tableNumber < 1) {
    const errorTitle = currentLang === "ar" ? "خطأ" : "Error";
    const errorMsg =
      currentLang === "ar"
        ? "يرجى إدخال رقم الطاولة"
        : "Please enter table number";
    showFixedNotification(errorTitle, errorMsg, "error");

    // Highlight the table number input
    tableNumberInput.style.borderColor = "var(--cashier-danger)";
    tableNumberInput.style.boxShadow = "0 0 0 3px rgba(239, 68, 68, 0.2)";
    tableNumberInput.focus();

    // Shake animation
    tableNumberInput.style.animation = "shake 0.5s";
    setTimeout(() => {
      tableNumberInput.style.animation = "";
    }, 500);

    // Remove highlight after 3 seconds
    setTimeout(() => {
      tableNumberInput.style.borderColor = "";
      tableNumberInput.style.boxShadow = "";
    }, 3000);

    return;
  }

  if (newOrderCart.length === 0) {
    const errorTitle = currentLang === "ar" ? "خطأ" : "Error";
    const errorMsg = currentLang === "ar" ? "السلة فارغة" : "Cart is empty";
    showFixedNotification(errorTitle, errorMsg, "error");
    return;
  }

  const submitBtn = document.getElementById("submit-new-order-button");
  submitBtn.disabled = true;
  const sendingText =
    currentLang === "ar" ? "جاري الإرسال..." : "Submitting...";
  submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>${sendingText}</span>`;

  // Calculate totals
  const subtotal = newOrderCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const taxValue = subtotal * (taxSettings.rate / 100);
  const serviceTaxValue = subtotal * (taxSettings.serviceRate / 100);
  const total = subtotal + taxValue + serviceTaxValue;

  // Prepare order data
  const orderData = {
    tableNumber: parseInt(tableNumber),
    items: newOrderCart.map((item) => ({
      id: item.id,
      name: item.name,
      nameEn: item.nameEn || "", // Include English name for language switching
      nameAr: item.nameAr || item.name || "", // Include Arabic name for language switching
      price: item.basePrice,
      quantity: item.quantity,
      addons: item.addons.map((addon) => ({
        title: addon.title,
        titleEn: addon.titleEn,
        options: [
          {
            name: addon.name,
            nameEn: addon.nameEn,
            price: addon.price,
          },
        ],
      })),
    })),
    subtotal: subtotal,
    tax: {
      rate: taxSettings.rate,
      value: taxValue,
    },
    serviceTax: {
      rate: taxSettings.serviceRate,
      value: serviceTaxValue,
    },
    total: total,
    status: "pending",
    date: new Date().toISOString(),
    customerInfo: {
      name: "Cashier Order",
      phone: "",
      tableNumber: parseInt(tableNumber),
    },
  };

  try {

    let created = false;
    let lastErrorMessage = "";

    // Try authenticated route first (cashier is logged in)
    try {
      let token = null;
      if (typeof refreshToken === "function") {
        try { token = await refreshToken(); } catch (_) { token = null; }
      }
      if (!token && typeof getToken === "function") {
        token = getToken();
      }

      if (token) {
        const authRes = await fetch(`${API_BASE_URL}/api/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(orderData),
        });
        const authDataText = await authRes.text();
        const authData = authDataText ? JSON.parse(authDataText) : {};
        if (authRes.ok && authData && authData.success) {
          created = true;
        } else {
          lastErrorMessage = authData.message || `HTTP ${authRes.status}`;
        }
      }
    } catch (e) {
      lastErrorMessage = e.message || "Auth route error";
    }

    // Fallback to guest route if auth failed
    if (!created) {
      const response = await fetch(`${API_BASE_URL}/api/orders/guest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const resultText = await response.text();
      const result = resultText ? JSON.parse(resultText) : {};

      if (response.ok && result && result.success) {
        created = true;
      } else {
        lastErrorMessage = result.message || `HTTP ${response.status}`;
      }
    }

    if (created) {
      const successTitle = currentLang === "ar" ? "نجح" : "Success";
      const successMsg =
        currentLang === "ar" ? "تم إنشاء الطلب بنجاح" : "Order created successfully";
      showFixedNotification(successTitle, successMsg, "success");
      closeNewOrderModal();
      loadActiveOrders();
    } else {
      throw new Error(lastErrorMessage || (currentLang === "ar" ? "فشل في إنشاء الطلب" : "Failed to create order"));
    }
  } catch (error) {
    console.error("Error submitting order:", error);
    const errorTitle = currentLang === "ar" ? "خطأ" : "Error";
    const errorMsg = (function(){
      const msg = String(error && error.message || "");
      if (msg.includes("Order session required") || msg.includes("QR validation required") || msg.includes("403")) {
        return currentLang === "ar" 
          ? "تم رفض الطلب من الخادم. كاشير يمكنه إنشاء الطلب بدون QR، تأكد من إعدادات الخادم للسماح بذلك"
          : "Order rejected by server. Cashier should be allowed to create orders without QR; check server settings";
      }
      return currentLang === "ar" ? "حدث خطأ أثناء إنشاء الطلب" : "Error creating order";
    })();
    showFixedNotification(errorTitle, error.message || errorMsg, "error");
  } finally {
    submitBtn.disabled = false;
    const submitText = currentLang === "ar" ? "تأكيد الطلب" : "Submit Order";
    submitBtn.innerHTML = `<i class="fas fa-check-circle"></i><span>${submitText}</span>`;
  }
}

async function attemptSessionViaQr(table) { return ""; }

function parseQidFromText(text) { return ""; }

async function ensureOrderSessionForTable(table) { return ""; }

// Initialize new order functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  // Wait a bit to ensure other initializations are complete
  setTimeout(() => {
    initNewOrderModal();
  }, 500);
});

// Listen for global settings changes (currency updates)
window.addEventListener("global-settings-changed", function (event) {
  console.log("Global settings changed in cashier page, refreshing displays");

  // Refresh cart display
  if (typeof updateCartDisplay === "function") {
    updateCartDisplay();
  }

  // Refresh order summary
  if (typeof updateOrderSummary === "function") {
    updateOrderSummary();
  }

  // Refresh products display
  if (typeof displayNewOrderProducts === "function") {
    displayNewOrderProducts();
  }

  // Refresh active orders display
  if (typeof loadActiveOrders === "function") {
    loadActiveOrders();
  }
});

// Listen for global settings loaded event
window.addEventListener("global-settings-loaded", function (event) {
  console.log("Global settings loaded in cashier page");
  // Initial displays will be handled by existing initialization
});

// Listen for language change event to update currency display
document.addEventListener("language_changed", function (event) {
  console.log("Language changed in cashier page, refreshing currency display");

  // Refresh cart display
  if (typeof updateCartDisplay === "function") {
    updateCartDisplay();
  }

  // Refresh order summary
  if (typeof updateOrderSummary === "function") {
    updateOrderSummary();
  }

  // Refresh products display
  if (typeof displayNewOrderProducts === "function") {
    displayNewOrderProducts();
  }

  // Refresh active orders display
  if (typeof loadActiveOrders === "function") {
    loadActiveOrders();
  }
});
