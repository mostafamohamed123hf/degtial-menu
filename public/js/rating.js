/**
 * Rating System
 * Handles product and order ratings
 */

// Variables to store rating data
let currentRating = 0;
let currentOrderId = null;
let currentProductId = null;
let currentProductData = null;
let isRatingAfterOrder = false;
// Add variables to track multiple items
let orderItemsToRate = [];
let currentItemIndex = 0;
// Guards to prevent duplicate prompts/API storms
const ordersBeingRated = new Set();
const ordersIgnored = new Set();
const orderStatusCheckInFlight = new Map();
let ratingModalActive = false;

// Initialize rating system
document.addEventListener("DOMContentLoaded", function () {
  initRatingSystem();

  // Listen for theme changes
  window.addEventListener("theme_changed", handleThemeChange);
});

// Handle theme changes
function handleThemeChange(event) {
  // Update rating modal appearance based on current theme
  const isDarkMode = !document.body.classList.contains("light-mode");
  updateRatingModalTheme(isDarkMode);
}

// Update rating modal theme
function updateRatingModalTheme(isDarkMode) {
  const ratingModal = document.getElementById("rating-modal");
  if (!ratingModal) return;

  // Apply theme-specific styles that can't be handled by CSS alone
  const stars = document.querySelectorAll(".star");

  stars.forEach((star) => {
    // Adjust star appearance based on theme
    if (star.classList.contains("active")) {
      if (isDarkMode) {
        star.style.textShadow = "0 0 15px rgba(255, 215, 0, 0.7)";
      } else {
        star.style.textShadow = "0 0 10px rgba(255, 202, 40, 0.4)";
      }
    }
  });

  // Apply theme-specific animations
  const modalContent = ratingModal.querySelector(".rating-modal-content");
  if (modalContent) {
    // Add subtle animation to modal content based on theme
    if (!isDarkMode) {
      // Light mode specific animations
      modalContent.style.transition =
        "all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)";
    } else {
      // Dark mode specific animations
      modalContent.style.transition = "all 0.3s ease";
    }
  }
}

// Initialize rating functionality
function initRatingSystem() {
  console.log("Initializing rating system");

  // Get DOM elements
  const ratingModal = document.getElementById("rating-modal");
  const closeRatingBtn = document.getElementById("close-rating-modal");
  const starsContainer = document.getElementById("stars-container");
  const submitRatingBtn = document.getElementById("submit-rating-btn");
  const skipRatingBtn = document.getElementById("skip-rating-btn");
  const ratingDoneBtn = document.getElementById("rating-done-btn");
  const stars = document.querySelectorAll(".star");

  // Check if rating elements exist on this page
  if (!ratingModal || !starsContainer) {
    console.log("Rating elements not found, creating them dynamically");
    createRatingModalIfNeeded();
    return;
  }

  // Star rating selection
  stars.forEach((star) => {
    star.addEventListener("click", function () {
      const rating = parseInt(this.getAttribute("data-rating"));
      setRating(rating);

      // Enable submit button when a rating is selected
      if (submitRatingBtn) {
        submitRatingBtn.disabled = false;
      }
    });
  });

  // Submit rating
  if (submitRatingBtn) {
    submitRatingBtn.addEventListener("click", submitRating);
  }

  // Skip rating
  if (skipRatingBtn) {
    skipRatingBtn.addEventListener("click", skipRating);
  }

  // Close modal buttons
  if (closeRatingBtn) {
    closeRatingBtn.addEventListener("click", closeRatingModal);
  }

  if (ratingDoneBtn) {
    ratingDoneBtn.addEventListener("click", closeRatingModal);
  }

  // Close modal when clicking outside
  window.addEventListener("click", function (e) {
    if (e.target === ratingModal) {
      closeRatingModal();
    }
  });

  // Check for completed order in URL for rating
  checkForOrderToRate();

  // Listen for order completion events
  listenForOrderCompletion();

  // Auto-show rating modal on index page if needed
  if (isIndexPage()) {
    autoShowRatingOnIndexPage();
  }
}

// Check if current page is index page
function isIndexPage() {
  const path = window.location.pathname.toLowerCase();
  return (
    path.endsWith("/index.html") ||
    path.endsWith("/") ||
    path.includes("/pages/index") ||
    path.includes("/pages/")
  );
}

// Function to automatically show rating modal on index page
function autoShowRatingOnIndexPage() {
  console.log("Checking for orders to rate on index page");

  // Get the table number from URL (if any)
  const tableNumber = getTableNumberFromURL();

  // If we have a table number, check for recent completed orders for this table
  if (tableNumber) {
    console.log(`Looking for completed orders for table ${tableNumber}`);

    // The WebSocket connection will handle real-time notifications
    // We don't need to check localStorage anymore

    // Optionally, we could fetch recent completed orders for this table
    // This would require a new API endpoint that returns recently completed
    // unrated orders for a specific table

    return true;
  }

  return false;
}

// Create rating modal if it doesn't exist
function createRatingModalIfNeeded() {
  if (document.getElementById("rating-modal")) {
    return; // Modal already exists
  }

  console.log("Creating rating modal dynamically");

  // Create rating modal elements
  const modalHTML = `
    <div class="rating-modal" id="rating-modal">
      <div class="rating-modal-content">
        <span class="close-rating-modal" id="close-rating-modal">&times;</span>
        <div class="rating-modal-header">
          <h2 class="rating-modal-title" data-i18n="rateOrder">$${
            window.i18n && window.i18n.getTranslation
              ? window.i18n.getTranslation("rateOrder")
              : "تقييم الطلب"
          }</h2>
        </div>
        <div class="rating-modal-body">
          <div class="product-preview" id="product-preview">
            <div class="product-image-preview" id="product-image-preview"></div>
            <div class="product-info-preview">
              <div class="product-name-preview" id="product-name-preview"></div>
              <div class="product-price-preview" id="product-price-preview"></div>
            </div>
          </div>
          <div class="rating-stars">
            <label class="rating-stars-label" data-i18n="howWouldYouRateProduct">$${
              window.i18n && window.i18n.getTranslation
                ? window.i18n.getTranslation("howWouldYouRateProduct")
                : "كيف تقيم تجربتك مع هذا المنتج؟"
            }</label>
            <div class="stars-container" id="stars-container">
              <span class="star" data-rating="1"><i class="far fa-star"></i></span>
              <span class="star" data-rating="2"><i class="far fa-star"></i></span>
              <span class="star" data-rating="3"><i class="far fa-star"></i></span>
              <span class="star" data-rating="4"><i class="far fa-star"></i></span>
              <span class="star" data-rating="5"><i class="far fa-star"></i></span>
            </div>
          </div>
          <div class="rating-comment">
            <label for="rating-comment-input">اترك تعليقًا (اختياري)</label>
            <textarea id="rating-comment-input" placeholder="أخبرنا برأيك..."></textarea>
          </div>
        </div>
        <div class="rating-modal-footer">
          <button id="skip-rating-btn" data-i18n="skipRating">$${
            window.i18n && window.i18n.getTranslation
              ? window.i18n.getTranslation("skipRating")
              : "تخطي"
          }</button>
          <button id="submit-rating-btn" disabled>
            <span data-i18n="submitRating">$${
              window.i18n && window.i18n.getTranslation
                ? window.i18n.getTranslation("submitRating")
                : "إرسال التقييم"
            }</span>
          </button>
        </div>
        <div class="rating-success" id="rating-success">
          <i class="fas fa-check-circle"></i>
          <h3>شكرًا لتقييمك!</h3>
          <p>نقدر رأيك ونعمل دائمًا على تحسين خدماتنا</p>
          <button id="rating-done-btn">تم</button>
        </div>
        <div class="rating-error" id="rating-error">
          <i class="fas fa-exclamation-circle"></i>
          <h3>حدث خطأ!</h3>
          <p id="rating-error-message">لم نتمكن من حفظ تقييمك. يرجى المحاولة مرة أخرى.</p>
          <button id="rating-error-btn">حسنًا</button>
        </div>
      </div>
    </div>
  `;

  // Add modal to the page
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer.firstElementChild);

  // Apply translations to the newly added modal
  if (window.i18n && typeof window.i18n.applyTranslations === "function") {
    window.i18n.applyTranslations();
  }

  // Reinitialize rating system now that the modal exists
  setTimeout(() => {
    initRatingSystem();
  }, 100);
}

// Check URL for order ID to rate (for direct links)
function checkForOrderToRate() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("rate-order");

  if (orderId) {
    // Check if this order was already rated or skipped
    if (hasRatingInteraction(orderId)) {
      console.log(
        `Order ${orderId} was already rated or skipped, not showing modal again`
      );

      // Clear URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show toast if available
      if (typeof showToast === "function") {
        showToast("تم تقييم هذا الطلب مسبقاً", "info");
      }

      return;
    }

    checkOrderRatingStatus(orderId);
  }
}

// Listen for order completion events
function listenForOrderCompletion() {
  // On cashier page - listen for order completion as a fallback
  if (window.location.href.includes("cashier.html")) {
    // Create a MutationObserver to detect when fixedNotification is shown
    // This is a fallback in case WebSocket fails
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.classList &&
              node.classList.contains("fixed-notification")
            ) {
              const title = node.querySelector(".fixed-notification-title");
              if (title && title.textContent.includes("تم إنهاء الطلب")) {
                // Extract order ID from notification
                const message = node.querySelector(
                  ".fixed-notification-message"
                ).textContent;
                const orderIdMatch = message.match(/\#([^\s]+)/);
                if (orderIdMatch && orderIdMatch[1]) {
                  const orderId = orderIdMatch[1];

                  // Check if this order is already being rated (to avoid duplicate modals)
                  if (currentOrderId === orderId) {
                    console.log(
                      `Already showing rating modal for order ${orderId}`
                    );
                    return;
                  }

                  // Wait a bit to allow the notification to be seen first
                  setTimeout(() => {
                    promptRatingForCompletedOrder(orderId);
                  }, 3000);
                }
              }
            }
          });
        }
      });
    });

    // Start observing the document body for added nodes
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Listen for WebSocket messages for real-time order completion events
  if (
    typeof window.socket !== "undefined" &&
    window.socket &&
    !window.__ratingWsAttached
  ) {
    window.__ratingWsAttached = true;
    window.socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);

        // Check for order completion event (support multiple types)
        if (
          data.type === "ORDER_COMPLETED" ||
          data.type === "order_completed_for_rating"
        ) {
          console.log("WebSocket: Order completed event received", data);

          // If we have order data, store product images for rating
          if (data.order && data.order.items) {
            storeProductImagesForOrder(data.order);
          }

          // Check if we should show rating for this order
          if (data.tableNumber) {
            const currentTableNumber = getTableNumberFromURL();
            if (currentTableNumber && currentTableNumber === data.tableNumber) {
              console.log(
                `WebSocket: Order completed for current table ${currentTableNumber}`
              );

              // Show rating modal once per order
              const id =
                (data.order && (data.order._id || data.order.orderId)) ||
                data.orderId;
              if (
                id &&
                !ordersBeingRated.has(id) &&
                !ratingModalActive
              ) {
                promptRatingForCompletedOrder(id);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });
  }
}

// Store product images from order in sessionStorage for later use in rating modals
function storeProductImagesForOrder(order) {
  if (!order || !order.items || !Array.isArray(order.items)) {
    console.log("No valid items in order to save images");
    return;
  }

  try {
    // Get existing saved images
    const productImages = JSON.parse(
      sessionStorage.getItem("productImages") || "{}"
    );
    let updated = false;

    // Process each item and save its image
    order.items.forEach((item) => {
      // Make sure we have an ID and image
      if (item.id && item.image && item.image.trim() !== "") {
        // Always save the image even if it already exists to ensure we have the latest version
        productImages[item.id] = item.image;
        updated = true;
        console.log(
          `Saved product image for item ${item.id} for later rating use`
        );
      }
    });

    // Save back to sessionStorage if anything was updated
    if (updated) {
      sessionStorage.setItem("productImages", JSON.stringify(productImages));
      console.log("Updated product images in sessionStorage for rating");
    }
  } catch (error) {
    console.error("Error storing product images for rating:", error);
  }
}

// Get table number from URL if available
function getTableNumberFromURL() {
  try {
    const url = new URL(window.location.href);
    const tableParam =
      url.searchParams.get("table") || url.searchParams.get("tableNumber");

    if (tableParam) {
      return tableParam;
    }

    // Try to extract from path pattern like /table/123
    const pathMatch = window.location.pathname.match(/\/table\/(\d+)/i);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Error getting table number from URL:", error);
    return null;
  }
}

// Prompt rating for completed order
function promptRatingForCompletedOrder(orderId) {
  console.log(`Prompting for rating of order: ${orderId}`);

  // Check if this order was already rated or skipped
  if (hasRatingInteraction(orderId)) {
    console.log(
      `Order ${orderId} was already rated or skipped, not showing modal again`
    );
    ordersIgnored.add(orderId);
    return;
  }

  // Check if we're already showing a rating modal for this order
  if (currentOrderId === orderId) {
    console.log(`Rating modal already showing for order ${orderId}`);

    // Make sure the modal is visible
    const ratingModal = document.getElementById("rating-modal");
    if (ratingModal && !ratingModal.classList.contains("show")) {
      ratingModal.classList.add("show");
    }

    return;
  }

  // Check if another rating modal is already open
  const existingModal = document.getElementById("rating-modal");
  if (
    (existingModal && existingModal.classList.contains("show")) ||
    ratingModalActive ||
    ordersBeingRated.has(orderId)
  ) {
    console.log(
      `Already showing rating modal for order ${currentOrderId}, not showing another one`
    );
    return;
  }

  // Ensure the rating modal exists
  createRatingModalIfNeeded();

  isRatingAfterOrder = true;
  currentOrderId = orderId;
  ratingModalActive = true;
  ordersBeingRated.add(orderId);

  // Reset items to rate array and current index
  orderItemsToRate = [];
  currentItemIndex = 0;

  // First, check which products in this order have already been rated
  fetch(`/api/ratings/order/${orderId}/products`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((ratingData) => {
      const alreadyRatedProducts = ratingData.success
        ? ratingData.ratedProducts
        : {};
      console.log("Already rated products:", alreadyRatedProducts);

      // Now fetch order details
      return fetch(`/api/orders/${orderId}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }).then((response) => ({ response, alreadyRatedProducts }));
    })
    .then(({ response, alreadyRatedProducts }) => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json().then((data) => ({ data, alreadyRatedProducts }));
    })
    .then(async ({ data, alreadyRatedProducts }) => {
      if (data.success && data.data) {
        const order = data.data;

        // Check if order is already rated
        if (order.isRated) {
          console.log("Order already rated");
          return;
        }

        // Check if rating was skipped for this order
        if (order.ratingSkipped) {
          console.log("Order rating was skipped by user");
          ordersIgnored.add(currentOrderId);
          cleanupRatingModal();
          return;
        }

        // Process items for rating
        if (order.items && order.items.length > 0) {
          // Create a copy of items to modify
          const enhancedItems = [...order.items];

          // Fetch full product details for each item that needs an image
          for (let i = 0; i < enhancedItems.length; i++) {
            const item = enhancedItems[i];
            let itemId = item.id || item.productId || item._id;

            // Extract the base product ID by removing any suffix after a dash
            // This is needed because the API expects the base ID (e.g., "burger1" instead of "burger1-25827f4d")
            if (itemId && itemId.includes("-")) {
              itemId = itemId.split("-")[0];
              console.log(`Using base product ID for API request: ${itemId}`);
            }

            // If item doesn't have an image or image URL is incomplete
            if (
              !item.image ||
              item.image === "" ||
              item.image.includes("placeholder")
            ) {
              try {
                console.log(`Fetching product details for item ${itemId}`);
                const productResponse = await fetch(`/api/products/${itemId}`);

                if (productResponse.ok) {
                  const productData = await productResponse.json();

                  if (productData.success && productData.data) {
                    // Update item with complete product data
                    item.image = productData.data.image || item.image;

                    // Also update other properties if needed
                    if (!item.name) item.name = productData.data.name;
                    if (!item.price) item.price = productData.data.price;

                    console.log(
                      `Updated item ${itemId} with image from product data`
                    );

                    // Cache the image in sessionStorage
                    if (item.image) {
                      try {
                        const productImages = JSON.parse(
                          sessionStorage.getItem("productImages") || "{}"
                        );
                        productImages[itemId] = item.image;
                        sessionStorage.setItem(
                          "productImages",
                          JSON.stringify(productImages)
                        );
                        console.log(
                          `Cached image for product ${itemId} in sessionStorage`
                        );
                      } catch (err) {
                        console.error("Error caching product image:", err);
                      }
                    }
                  }
                }
              } catch (fetchError) {
                console.error(
                  `Error fetching details for product ${itemId}:`,
                  fetchError
                );
              }
            }
          }

          // Filter out already rated products
          const unratedItems = enhancedItems.filter((item) => {
            const itemId = item.id || item.productId || item._id;
            const baseItemId =
              itemId && itemId.includes("-") ? itemId.split("-")[0] : itemId;
            const isAlreadyRated =
              alreadyRatedProducts[baseItemId] || alreadyRatedProducts[itemId];

            if (isAlreadyRated) {
              console.log(`Product ${baseItemId} already rated, skipping`);
              return false;
            }
            return true;
          });

          // Check if there are any items left to rate
          if (unratedItems.length === 0) {
            console.log("All products in this order have already been rated");
            storeRatingInteractionStatus(currentOrderId, "rated");
            cleanupRatingModal();
            return;
          }

          // Save the filtered items for rating
          orderItemsToRate = unratedItems;

          // Store all product images
          storeProductImagesForOrder({ items: enhancedItems });

          // Start rating the first item
          showNextItemRating();
        } else {
          throw new Error("No items found in this order");
        }
      } else {
        throw new Error("Invalid order data received");
      }
    })
    .catch((error) => {
      console.error("Error fetching order details:", error);

      // Even if there's an error, let's try to show a rating modal with basic info
      const lastCompletedOrder = sessionStorage.getItem("lastCompletedOrder");

      if (lastCompletedOrder) {
        try {
          const orderInfo = JSON.parse(lastCompletedOrder);
          if (orderInfo.items && orderInfo.items.length > 0) {
            // Try to check for already rated products even in fallback mode
            fetch(`/api/ratings/order/${orderId}/products`)
              .then((response) => response.json())
              .then((ratingData) => {
                const alreadyRatedProducts = ratingData.success
                  ? ratingData.ratedProducts
                  : {};

                // Filter out already rated products
                const unratedItems = orderInfo.items.filter((item) => {
                  const itemId = item.id || item.productId || item._id;
                  const baseItemId =
                    itemId && itemId.includes("-")
                      ? itemId.split("-")[0]
                      : itemId;
                  const isAlreadyRated =
                    alreadyRatedProducts[baseItemId] ||
                    alreadyRatedProducts[itemId];

                  if (isAlreadyRated) {
                    console.log(
                      `Product ${baseItemId} already rated (fallback), skipping`
                    );
                    return false;
                  }
                  return true;
                });

                if (unratedItems.length === 0) {
                  console.log("All products already rated (fallback mode)");
                  storeRatingInteractionStatus(currentOrderId, "rated");
                  cleanupRatingModal();
                  return;
                }

                // Save filtered items to rate
                orderItemsToRate = unratedItems;
                showNextItemRating();
              })
              .catch(() => {
                // If rating check fails, proceed with all items (fallback of fallback)
                console.log("Rating check failed, proceeding with all items");
                orderItemsToRate = [...orderInfo.items];
                showNextItemRating();
              });
          } else {
            // Create a minimal item object if no items found
            const fallbackItem = {
              name: "طلبك",
              price: "0",
              image: "/images/placeholder-small.svg",
            };
            currentProductId = orderId; // Use order ID as product ID
            currentProductData = fallbackItem;
            showRatingModal(fallbackItem);
          }
        } catch (e) {
          console.error("Error parsing last completed order:", e);
          showRatingError(`تعذر العثور على بيانات الطلب: ${error.message}`);
        }
      } else {
        showRatingError(`تعذر العثور على بيانات الطلب: ${error.message}`);
      }
    });
}

// New function to show the next item for rating
function showNextItemRating() {
  // Check if we have more items to rate
  if (currentItemIndex < orderItemsToRate.length) {
    const item = orderItemsToRate[currentItemIndex];

    // Make sure we have a valid product ID - try multiple properties
    currentProductId = item.id || item.productId || item._id;

    // Log the product ID for debugging
    console.log(
      `Rating item ${currentItemIndex + 1}/${orderItemsToRate.length} with ID:`,
      currentProductId
    );

    if (!currentProductId) {
      console.warn("Could not find product ID in item:", item);
      // Try to use order ID as fallback if no product ID is found
      currentProductId = currentOrderId;
    }

    currentProductData = item;

    // Update modal title to show progress
    const modalTitle = document.querySelector(".rating-modal-title");
    if (modalTitle) {
      const isEnglish =
        window.i18n &&
        typeof window.i18n.getCurrentLanguage === "function" &&
        window.i18n.getCurrentLanguage() === "en";
      modalTitle.textContent = isEnglish
        ? `Rating product ${currentItemIndex + 1}/${orderItemsToRate.length}`
        : `تقييم المنتج ${currentItemIndex + 1}/${orderItemsToRate.length}`;
    }

    // Show rating modal for this item
    showRatingModal(item);

    // Make sure the modal is visible
    const ratingModal = document.getElementById("rating-modal");
    if (ratingModal && !ratingModal.classList.contains("show")) {
      ratingModal.classList.add("show");
    }
  } else {
    // All items have been rated
    console.log("All items have been rated");

    // Show final thank you message
    showFinalRatingSuccess();
  }
}

// Add a new function to show final success message
function showFinalRatingSuccess() {
  const ratingForm = document.getElementById("rating-form");
  const ratingSuccess = document.getElementById("rating-success");

  if (ratingForm && ratingSuccess) {
    // Update success message to reflect multiple items
    const successTitle = ratingSuccess.querySelector(".rating-success-title");
    const successMessage = ratingSuccess.querySelector(
      ".rating-success-message"
    );

    if (successTitle) {
      successTitle.textContent =
        window.i18n && window.i18n.getTranslation
          ? window.i18n.getTranslation("allRatingsSubmitted")
          : "تم إرسال جميع التقييمات بنجاح!";
    }

    if (successMessage) {
      successMessage.textContent =
        window.i18n && window.i18n.getTranslation
          ? window.i18n.getTranslation("thanksForYourTimeMulti")
          : "شكراً على وقتك في تقييم منتجاتنا. تقييمك يساعدنا على التحسين المستمر.";
    }

    // Hide form with animation
    ratingForm.style.opacity = "0";
    ratingForm.style.transform = "translateY(-20px)";

    setTimeout(() => {
      ratingForm.style.display = "none";

      // Show success message with animation
      ratingSuccess.classList.add("show", "final-success");
      ratingSuccess.style.opacity = "0";
      ratingSuccess.style.transform = "translateY(20px)";

      setTimeout(() => {
        ratingSuccess.style.opacity = "1";
        ratingSuccess.style.transform = "translateY(0)";
      }, 50);
    }, 300);
  }

  // Auto close after 3 seconds
  setTimeout(() => {
    closeRatingModal();
  }, 4000);
}

// Check if order has already been rated
function checkOrderRatingStatus(orderId) {
  console.log(`Checking rating status for order: ${orderId}`);

  // Use the direct orders endpoint instead of search
  if (orderStatusCheckInFlight.get(orderId)) {
    return; // avoid duplicate checks for same order
  }

  orderStatusCheckInFlight.set(orderId, true);

  fetch(`/api/orders/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        if (response.status === 429) {
          // Too many requests: back off and stop spamming
          console.warn(
            "Too many requests when checking order status, backing off"
          );
          return { success: false, rateLimited: true };
        }
        if (response.status === 404) {
          throw new Error("Order not found");
        }
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then((orderData) => {
      if (orderData && orderData.rateLimited) {
        return false; // stop flow due to rate limit
      }
      if (!orderData.success || !orderData.data) {
        throw new Error("Invalid order data received");
      }

      const order = orderData.data;

      // Check if rating was skipped for this order
      if (order.ratingSkipped) {
        console.log("Order rating was skipped by user");
        ordersIgnored.add(orderId);
        
        // Show toast if available
        if (typeof showToast === "function") {
          showToast("تم تخطي تقييم هذا الطلب مسبقاً", "info");
        }
        
        return true;
      }

      // We now want to allow rating multiple products in the same order
      // So we only check if the order status is completed
      if (order.status !== "completed") {
        console.log("This order is not completed yet");

        // Show toast or notification that order is not completed
        if (typeof showToast === "function") {
          showToast("لا يمكن تقييم طلب غير مكتمل", "info");
        } else {
          showRatingError("لا يمكن تقييم طلب غير مكتمل");
        }

        return true;
      }

      // The order is not yet fully rated, so proceed with rating
      console.log("Order is completed, proceeding with rating");

      // Proceed to fetch order details and show rating modal
      promptRatingForCompletedOrder(orderId);
      return false;
    })
    .catch((error) => {
      console.error("Error checking order rating status:", error);
      return false;
    })
    .finally(() => {
      orderStatusCheckInFlight.delete(orderId);
    });
}

// Function to show rating modal
function showRatingModal(product) {
  // Reset previous state
  resetRatingState();

  // Set current product data
  currentProductId = product.id;
  currentProductData = product;

  // Check if we're in light mode
  const isDarkMode = !document.body.classList.contains("light-mode");

  // Get DOM elements
  const ratingModal = document.getElementById("rating-modal");
  const ratingForm = document.getElementById("rating-form");
  const ratingSuccess = document.getElementById("rating-success");
  const productImage = document.getElementById("rating-product-image");
  const productName = document.getElementById("rating-product-name");
  const productPrice = document.getElementById("rating-product-price");
  const stars = document.querySelectorAll(".star");

  // Apply current theme
  updateRatingModalTheme(isDarkMode);

  // Update modal title to show progress if we're rating multiple items
  const modalTitle = document.querySelector(".rating-modal-title");
  if (modalTitle && orderItemsToRate.length > 1) {
    // Add item counter if not already present
    let itemCounter = modalTitle.querySelector(".item-counter");
    if (!itemCounter) {
      itemCounter = document.createElement("span");
      itemCounter.className = "item-counter";
      modalTitle.appendChild(itemCounter);
    }

    // Update counter text
    itemCounter.textContent = `${currentItemIndex + 1}/${
      orderItemsToRate.length
    }`;

    // Set base title
    const isEnglishTitle =
      window.i18n &&
      typeof window.i18n.getCurrentLanguage === "function" &&
      window.i18n.getCurrentLanguage() === "en";
    modalTitle.childNodes[0].nodeValue = isEnglishTitle
      ? "Rating product "
      : "تقييم المنتج ";
  }

  // Add progress bar if we're rating multiple items
  if (orderItemsToRate.length > 1) {
    let progressBar = document.querySelector(".rating-progress");
    if (!progressBar) {
      // Create progress container
      progressBar = document.createElement("div");
      progressBar.className = "rating-progress";

      // Create progress bar
      const progressBarInner = document.createElement("div");
      progressBarInner.className = "rating-progress-bar";
      progressBar.appendChild(progressBarInner);

      // Insert after header
      const modalHeader = document.querySelector(".rating-modal-header");
      if (modalHeader && modalHeader.nextSibling) {
        ratingForm.insertBefore(progressBar, modalHeader.nextSibling);
      }
    }

    // Update progress bar width
    const progressBarInner = progressBar.querySelector(".rating-progress-bar");
    if (progressBarInner) {
      const progressPercentage =
        ((currentItemIndex + 1) / orderItemsToRate.length) * 100;
      progressBarInner.style.width = `${progressPercentage}%`;

      // Apply light mode specific styling
      if (!isDarkMode && currentItemIndex > 0) {
        // Change color based on progress
        if (progressPercentage >= 75) {
          progressBarInner.style.background =
            "linear-gradient(to right, #2ecc71, #27ae60)";
        } else if (progressPercentage >= 50) {
          progressBarInner.style.background =
            "linear-gradient(to right, #3498db, #2980b9)";
        } else {
          progressBarInner.style.background =
            "linear-gradient(to right, #f39c12, #d35400)";
        }
      }
    }
  }

  // Set product details with animation
  const productContainer = document.querySelector(".product-preview");
  if (productContainer) {
    // Add changing class for animation
    productContainer.classList.add("changing");

    setTimeout(() => {
      // Update product details
      if (productImage) {
        // Try to get image from multiple sources
        let imageSrc = "";

        // 1. First try to get from the product object
        if (product.image) {
          imageSrc = product.image;
        }

        // 2. If no image found, try to get from sessionStorage
        if (!imageSrc || imageSrc === "" || imageSrc.includes("placeholder")) {
          try {
            const productImages = JSON.parse(
              sessionStorage.getItem("productImages") || "{}"
            );
            if (productImages[product.id]) {
              imageSrc = productImages[product.id];
              console.log(
                "Using cached image from sessionStorage for product: " +
                  product.id
              );
            }
          } catch (err) {
            console.error(
              "Error getting product image from sessionStorage:",
              err
            );
          }
        }

        // 3. If still no image, try to find it in the DOM
        if (!imageSrc || imageSrc === "" || imageSrc.includes("placeholder")) {
          const productCard = document.querySelector(
            `.product-card[data-product-id="${product.id}"]`
          );
          if (productCard) {
            const imgElement = productCard.querySelector(".product-image img");
            if (imgElement && imgElement.src) {
              imageSrc = imgElement.src;
              console.log("Found product image in DOM for: " + product.id);
            }
          }
        }

        // Set the image source
        productImage.src = imageSrc || "";

        // Add light mode specific animation for product image
        if (!isDarkMode) {
          productImage.style.transform = "scale(0.9)";
          productImage.style.opacity = "0.8";

          setTimeout(() => {
            productImage.style.transform = "scale(1)";
            productImage.style.opacity = "1";
          }, 100);
        }
      }

      if (productName) {
        const currentLang = window.i18n && typeof window.i18n.getCurrentLanguage === 'function' ? window.i18n.getCurrentLanguage() : 'ar';
        const displayName = (currentLang === 'en' && product.nameEn) ? product.nameEn : (product.nameAr || product.name || "");
        productName.textContent = displayName;
      }
      if (productPrice && product.price) {
        productPrice.textContent = formatCurrency(product.price);
      }

      // Remove changing class to animate back in
      productContainer.classList.remove("changing");
    }, 300);
  } else {
    // No animation if container doesn't exist
    if (productImage) {
      // Try to get image from multiple sources
      let imageSrc = "";

      // 1. First try to get from the product object
      if (product.image) {
        imageSrc = product.image;
      }

      // 2. If no image found, try to get from sessionStorage
      if (!imageSrc || imageSrc === "" || imageSrc.includes("placeholder")) {
        try {
          const productImages = JSON.parse(
            sessionStorage.getItem("productImages") || "{}"
          );
          if (productImages[product.id]) {
            imageSrc = productImages[product.id];
            console.log(
              "Using cached image from sessionStorage for product: " +
                product.id
            );
          }
        } catch (err) {
          console.error(
            "Error getting product image from sessionStorage:",
            err
          );
        }
      }

      // 3. If still no image, try default placeholder
      if (!imageSrc || imageSrc === "") {
        imageSrc = "/images/placeholder-small.svg";
      }

      // Set the image source
      productImage.src = imageSrc;
    }

    if (productName) {
      const currentLang = window.i18n && typeof window.i18n.getCurrentLanguage === 'function' ? window.i18n.getCurrentLanguage() : 'ar';
      const displayName = (currentLang === 'en' && product.nameEn) ? product.nameEn : (product.nameAr || product.name || "");
      productName.textContent = displayName;
    }
    if (productPrice && product.price) {
      productPrice.textContent = formatCurrency(product.price);
    }
  }

  // Reset stars
  stars.forEach((star) => {
    star.classList.remove("active");

    // Add animation delay for each star
    const rating = parseInt(star.getAttribute("data-rating"));
    star.style.animationDelay = `${(rating - 1) * 0.1}s`;

    // Use light mode specific animation
    if (!isDarkMode) {
      star.classList.add("animate-in");
      star.style.transform = "scale(0.8) translateY(10px)";
      star.style.opacity = "0";

      setTimeout(() => {
        star.style.transform = "scale(1) translateY(0)";
        star.style.opacity = "1";
      }, 100 + (rating - 1) * 100);
    } else {
      star.classList.add("animate-in");
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      star.classList.remove("animate-in");
    }, 1000);
  });

  // Reset submit button
  const submitBtn = document.getElementById("submit-rating-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.remove("success", "enabled");
    submitBtn.innerHTML = `<span data-i18n="submitRating">${
      window.i18n && window.i18n.getTranslation
        ? window.i18n.getTranslation("submitRating")
        : "إرسال التقييم"
    }</span>`;
    submitBtn.style.backgroundColor = "";

    // Light mode specific styling
    if (!isDarkMode) {
      submitBtn.style.opacity = "0.9";
      submitBtn.style.transform = "translateY(10px)";

      setTimeout(() => {
        submitBtn.style.opacity = "1";
        submitBtn.style.transform = "translateY(0)";
      }, 500);
    }
  }

  // Reset comment input
  const commentInput = document.getElementById("rating-comment-input");
  if (commentInput) {
    commentInput.value = "";
  }

  // Update rating label
  const ratingLabel = document.querySelector(".rating-stars-label");
  if (ratingLabel) {
    ratingLabel.textContent =
      window.i18n && window.i18n.getTranslation
        ? window.i18n.getTranslation("howWouldYouRateProduct")
        : "كيف تقيم تجربتك مع هذا المنتج؟";
    ratingLabel.style.opacity = "1";
    ratingLabel.style.transform = "translateY(0)";

    // Light mode specific styling
    if (!isDarkMode) {
      ratingLabel.style.color = "#2c3e50";
      ratingLabel.style.fontWeight = "600";
    }
  }

  // Show the modal with animation
  if (ratingModal) {
    document.body.classList.add("modal-open"); // Prevent background scrolling
    ratingModal.classList.add("show");

    // Add entrance animation to modal content
    const modalContent = ratingModal.querySelector(".rating-modal-content");
    if (modalContent) {
      modalContent.style.opacity = "0";

      // Light mode specific animation
      if (!isDarkMode) {
        modalContent.style.transform = "translateY(70px) scale(0.95)";
        modalContent.style.transition =
          "all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)";
      } else {
        modalContent.style.transform = "translateY(50px)";
      }

      setTimeout(() => {
        modalContent.style.opacity = "1";
        modalContent.style.transform = "translateY(0) scale(1)";
      }, 100);
    }

    // Show rating form, hide success message
    if (ratingForm) {
      ratingForm.style.display = "block";
      ratingForm.style.opacity = "1";
      ratingForm.style.transform = "translateY(0)";
    }

    if (ratingSuccess) {
      // Localize success panel texts immediately
      const successTitle = ratingSuccess.querySelector(".rating-success-title");
      const successMsg = ratingSuccess.querySelector(".rating-success-message");
      const doneBtn = ratingSuccess.querySelector("#rating-done-btn");
      if (successTitle && window.i18n && window.i18n.getTranslation) {
        successTitle.textContent = window.i18n.getTranslation(
          "ratingSubmittedSuccessfully"
        );
      }
      if (successMsg && window.i18n && window.i18n.getTranslation) {
        successMsg.textContent =
          window.i18n.getTranslation("thankYouForSharing");
      }
      if (doneBtn && window.i18n && window.i18n.getTranslation) {
        doneBtn.textContent = window.i18n.getTranslation("done");
      }
      ratingSuccess.classList.remove("show", "final-success");
    }

    // Focus trap for accessibility
    setTimeout(() => {
      const firstFocusableElement = ratingModal.querySelector(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (firstFocusableElement) {
        firstFocusableElement.focus();
      }
    }, 300);
  }
}

// Function to set the rating
function setRating(rating) {
  currentRating = rating;

  // Check current theme
  const isDarkMode = !document.body.classList.contains("light-mode");

  // Update UI to reflect the selected rating
  const stars = document.querySelectorAll(".star");

  stars.forEach((star) => {
    const starRating = parseInt(star.getAttribute("data-rating"));

    if (starRating <= rating) {
      star.classList.add("active");

      // Add pulse animation to newly selected stars
      if (isDarkMode) {
        star.classList.add("pulse");
      } else {
        star.classList.add("pulse");
        // Use light mode specific animation
        star.style.animation = "lightModeStarPulse 0.5s ease";
      }

      // Apply theme-specific glow effect
      if (isDarkMode) {
        star.style.textShadow = "0 0 15px rgba(255, 215, 0, 0.7)";
      } else {
        star.style.textShadow = "0 0 10px rgba(255, 202, 40, 0.4)";
        star.style.color = "#ffca28";
      }

      setTimeout(() => {
        star.classList.remove("pulse");
        star.style.animation = "";
      }, 500);
    } else {
      star.classList.remove("active");
      star.style.textShadow = "";

      if (!isDarkMode) {
        star.style.color = "#e0e0e0";
      }
    }
  });

  // Enable submit button
  const submitBtn = document.getElementById("submit-rating-btn");
  if (submitBtn) {
    submitBtn.disabled = false;

    if (isDarkMode) {
      submitBtn.classList.add("enabled");
    } else {
      // Use light mode specific animation
      submitBtn.style.animation = "lightModeButtonEnable 0.5s ease";
      setTimeout(() => {
        submitBtn.style.animation = "";
      }, 500);
    }
  }

  // Update rating label based on selection
  updateRatingLabel(rating);

  // Update progress bar color based on rating
  if (!isDarkMode) {
    const progressBar = document.querySelector(".rating-progress-bar");
    if (progressBar && rating > 0) {
      // Adjust color based on rating
      if (rating >= 4) {
        progressBar.style.background =
          "linear-gradient(to right, #2ecc71, #27ae60)";
      } else if (rating >= 3) {
        progressBar.style.background =
          "linear-gradient(to right, #3498db, #2980b9)";
      } else {
        progressBar.style.background =
          "linear-gradient(to right, #e74c3c, #c0392b)";
      }
    }
  }
}

// New function to update rating label based on selection
function updateRatingLabel(rating) {
  const ratingLabel = document.querySelector(".rating-stars-label");
  if (!ratingLabel) return;

  const isDarkMode = !document.body.classList.contains("light-mode");
  const isEnglish =
    window.i18n &&
    typeof window.i18n.getCurrentLanguage === "function" &&
    window.i18n.getCurrentLanguage() === "en";
  let labelText = "";
  let labelColor = "";

  switch (rating) {
    case 1:
      labelText = isEnglish
        ? "😞 We’re sorry about your experience"
        : "😞 نأسف لتجربتك السيئة";
      labelColor = isDarkMode ? "#ff3b30" : "#e74c3c";
      break;
    case 2:
      labelText = isEnglish ? "🙁 We can do better" : "🙁 يمكننا تحسين الخدمة";
      labelColor = isDarkMode ? "#ff9500" : "#e67e22";
      break;
    case 3:
      labelText = isEnglish ? "😐 Average experience" : "😐 تجربة متوسطة";
      labelColor = isDarkMode ? "#ffcc00" : "#f1c40f";
      break;
    case 4:
      labelText = isEnglish ? "🙂 Good experience" : "🙂 تجربة جيدة";
      labelColor = isDarkMode ? "#34c759" : "#2ecc71";
      break;
    case 5:
      labelText = isEnglish ? "😄 Great experience!" : "😄 تجربة رائعة!";
      labelColor = isDarkMode ? "#5ac8fa" : "#3498db";
      break;
    default:
      labelText =
        window.i18n && window.i18n.getTranslation
          ? window.i18n.getTranslation("howWouldYouRateProduct")
          : "كيف تقيم تجربتك مع هذا المنتج؟";
      labelColor = isDarkMode ? "#ffffff" : "#2c3e50";
  }

  // Animate label change
  ratingLabel.style.opacity = "0";
  ratingLabel.style.transform = "translateY(-10px)";

  setTimeout(() => {
    ratingLabel.textContent = labelText;
    ratingLabel.style.color = labelColor;
    ratingLabel.style.opacity = "1";
    ratingLabel.style.transform = "translateY(0)";

    // Add font weight for light mode
    if (!isDarkMode) {
      ratingLabel.style.fontWeight = "700";
    }
  }, 200);
}

// Submit the rating
function submitRating() {
  if (!currentProductId || !currentOrderId) {
    console.error("Cannot submit rating: Missing product or order ID");
    return;
  }

  // Get the base product ID without any suffixes
  const baseProductId = currentProductId.includes("-")
    ? currentProductId.split("-")[0]
    : currentProductId;

  // Get the rating value
  const ratingValue = currentRating;

  if (!ratingValue || ratingValue < 1) {
    console.error("Invalid rating value:", ratingValue);

    // Show error to user
    showRatingError("يرجى تحديد تقييم من 1 إلى 5 نجوم");
    return;
  }

  // Get comment
  const commentInput = document.getElementById("rating-comment-input");
  const comment = commentInput ? commentInput.value.trim() : "";

  // Get submit button
  const submitBtn = document.getElementById("submit-rating-btn");

  // Disable submit button to prevent multiple submissions
  if (submitBtn) submitBtn.disabled = true;

  // Log what we're submitting for debugging
  console.log("Submitting rating with data:", {
    orderId: currentOrderId,
    productId: currentProductId,
    baseProductId: baseProductId,
    rating: ratingValue,
    comment: comment,
  });

  // Prepare rating data
  const ratingData = {
    productId: currentProductId, // Keep the original ID for local storage
    orderId: currentOrderId,
    rating: ratingValue,
    comment: comment,
    customerId: getCustomerId(),
    timestamp: new Date().toISOString(),
  };

  // Rating will be calculated and stored in the database only
  console.log("Rating will be processed and stored in the database");

  // Try to submit to server if API is available
  fetch(`/api/ratings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      productId: baseProductId,
      orderId: ratingData.orderId,
      rating: ratingData.rating,
      comment: ratingData.comment,
      customerId: ratingData.customerId,
    }),
  })
    .then((response) => {
      if (response.status === 429) {
        console.warn(
          "Rating submission rate-limited (429). Storing for retry and stopping."
        );
        // Rate limited - user will need to try again later
        console.log(
          "Rating submission rate-limited. User can try again later."
        );
        return { success: false, rateLimited: true };
      }
      if (!response.ok) {
        return response.json().then((errorData) => {
          // If product not found, try to update the product ID and retry
          if (
            errorData.message &&
            errorData.message.includes("Product not found")
          ) {
            console.log("Product not found with ID:", currentProductId);

            // Try to get a valid product ID from the order data
            return fetch(`/api/orders/${currentOrderId}`)
              .then((orderResponse) => {
                if (!orderResponse.ok)
                  throw new Error("Could not fetch order details");
                return orderResponse.json();
              })
              .then((orderData) => {
                if (
                  orderData.success &&
                  orderData.data &&
                  orderData.data.items &&
                  orderData.data.items.length > 0
                ) {
                  // Use the first item's ID as fallback
                  const newProductId =
                    orderData.data.items[0].id ||
                    orderData.data.items[0].productId ||
                    orderData.data.items[0]._id;

                  console.log("Using alternative product ID:", newProductId);

                  // Extract base product ID for the API request
                  const baseNewProductId = newProductId.includes("-")
                    ? newProductId.split("-")[0]
                    : newProductId;

                  // Update the rating data with the new product ID
                  ratingData.productId = newProductId;
                  currentProductId = newProductId;

                  // Retry the submission with the new product ID
                  return fetch(`/api/ratings`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      productId: baseNewProductId,
                      orderId: ratingData.orderId,
                      rating: ratingData.rating,
                      comment: ratingData.comment,
                      customerId: ratingData.customerId,
                    }),
                  });
                } else {
                  throw new Error("Could not find valid product ID in order");
                }
              });
          } else if (
            errorData.message &&
            errorData.message.includes("This order has already been rated")
          ) {
            console.log(
              "This order has already been rated, showing existing ratings"
            );
            // Show existing ratings modal instead of continuing
            if (typeof showExistingRatingsModal === "function") {
              showExistingRatingsModal(currentOrderId);
            }
            return {
              success: true,
              message: "Order already rated, showing existing ratings",
            };
          } else if (
            errorData.message &&
            errorData.message.includes(
              "This product in this order has already been rated"
            )
          ) {
            console.log(
              "This product has already been rated, showing existing ratings"
            );
            // Show existing ratings modal instead of continuing
            if (typeof showExistingRatingsModal === "function") {
              showExistingRatingsModal(currentOrderId);
            }
            return {
              success: true,
              message: "Product already rated, showing existing ratings",
            };
          }

          throw new Error(
            errorData.message ||
              `Error: ${response.status} ${response.statusText}`
          );
        });
      }
      return response.json();
  })
    .then((data) => {
      if (data && (data.success === false || data.rateLimited)) {
        throw new Error(data.message || "Error submitting rating");
      }

      console.log("Rating submitted successfully:", data);

      // Move to the next item or show final success
      currentItemIndex++;

      if (currentItemIndex < orderItemsToRate.length) {
        // Reset for next item
        resetRatingState();

        // Show brief success message for this item
        showItemRatingSuccess();

        // Show next item after a brief delay
        setTimeout(() => {
          showNextItemRating();
        }, 1500);
      } else {
        // All items have been rated
        storeRatingInteractionStatus(currentOrderId, "rated");
        if (typeof window.swapOrderRatingButtonToChip === "function") {
          try {
            window.swapOrderRatingButtonToChip(currentOrderId);
          } catch (_) {}
        }

        // Show final success message
        showFinalRatingSuccess();
      }
    })
    .catch((error) => {
      console.error("Error submitting rating:", error);

      // Rating submission failed - user can try again later
      console.log("Rating submission failed. User can try again later.");

      // Continue to next item anyway
      currentItemIndex++;

      if (currentItemIndex < orderItemsToRate.length) {
        // Reset for next item
        resetRatingState();
        showNextItemRating();
      } else {
        // All items have been rated
        storeRatingInteractionStatus(currentOrderId, "rated");
        showFinalRatingSuccess();
      }
    });
}

// Add a new function to show brief success message between items
function showItemRatingSuccess() {
  const submitBtn = document.getElementById("submit-rating-btn");
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fas fa-check"></i> تم التقييم';
    submitBtn.classList.add("success");
    submitBtn.style.backgroundColor = "#4caf50";
  }
}

// Show rating success message
function showRatingSuccess() {
  const ratingForm = document.getElementById("rating-form");
  const ratingSuccess = document.getElementById("rating-success");

  if (ratingForm && ratingSuccess) {
    // Hide form with animation
    ratingForm.style.opacity = "0";
    ratingForm.style.transform = "translateY(-20px)";

    setTimeout(() => {
      ratingForm.style.display = "none";

      // Show success message with animation
      ratingSuccess.classList.add("show");
      ratingSuccess.style.opacity = "0";
      ratingSuccess.style.transform = "translateY(20px)";

      setTimeout(() => {
        ratingSuccess.style.opacity = "1";
        ratingSuccess.style.transform = "translateY(0)";
      }, 50);
    }, 300);
  }

  // Auto close after 3 seconds
  setTimeout(() => {
    closeRatingModal();
  }, 3000);
}

// Show error message for rating
function showRatingError(message) {
  // Create or get error element
  let errorElement = document.getElementById("rating-error");

  if (!errorElement) {
    errorElement = document.createElement("div");
    errorElement.id = "rating-error";
    errorElement.className = "rating-error alert alert-danger";

    // Insert after the comment input or before the submit button
    const commentInput = document.getElementById("rating-comment-input");
    const submitBtn = document.getElementById("submit-rating-btn");

    if (commentInput && commentInput.parentNode) {
      commentInput.parentNode.insertBefore(
        errorElement,
        commentInput.nextSibling
      );
    } else if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(errorElement, submitBtn);
    } else {
      // Fallback - add to the form
      const form = document.getElementById("rating-form");
      if (form) {
        form.appendChild(errorElement);
      }
    }
  }

  // Set error message
  errorElement.textContent = message;
  errorElement.style.display = "block";

  // Hide error after 5 seconds
  setTimeout(() => {
    if (errorElement) {
      errorElement.style.display = "none";
    }
  }, 5000);
}

// Reset rating state
function resetRatingState() {
  currentRating = 0;

  // Reset stars UI
  const stars = document.querySelectorAll(".star");
  stars.forEach((star) => {
    star.classList.remove("active");
  });

  // Reset comment field
  const commentInput = document.getElementById("rating-comment-input");
  if (commentInput) commentInput.value = "";
}

// Skip rating for current order
function skipRating() {
  if (currentOrderId) {
    console.log(`Skipping rating for order: ${currentOrderId}`);
    fetch(`/api/orders/${currentOrderId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("status")))
      .then((orderData) => {
        const isCompleted = !!(orderData && orderData.success && orderData.data && orderData.data.status === 'completed');
        if (isCompleted) {
          return fetch(`/api/ratings/order/${currentOrderId}/skip`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(res => res.json()).then((data) => {
            if (data.success) {
              ordersIgnored.add(currentOrderId);
            }
          });
        }
        ordersIgnored.add(currentOrderId);
      })
      .catch(() => {
        ordersIgnored.add(currentOrderId);
      })
      .finally(() => {
        closeRatingModal();
      });
  } else {
    // No order ID, just close the modal
    closeRatingModal();
  }
}

// Close the rating modal
function closeRatingModal() {
  const ratingModal = document.getElementById("rating-modal");

  if (ratingModal) {
    // Add exit animation
    const modalContent = ratingModal.querySelector(".rating-modal-content");
    if (modalContent) {
      modalContent.style.opacity = "0";
      modalContent.style.transform = "translateY(30px)";
    }

    // Remove modal after animation completes
    setTimeout(() => {
      ratingModal.classList.remove("show");
      document.body.classList.remove("modal-open");
      resetRatingState();
      ratingModalActive = false;
      if (currentOrderId) {
        ordersBeingRated.delete(currentOrderId);
      }
    }, 300);
  }
}

// Store that an order has been rated or skipped
function storeRatingInteractionStatus(orderId, status) {
  try {
    console.log(`Rating interaction for order ${orderId}: ${status}`);
    // Rating interactions are now tracked via database API calls only
    // Mark order as ignored in this session to prevent duplicate prompts
    if (status === 'skipped' || status === 'rated') {
      ordersIgnored.add(orderId);
    }
    return true;
  } catch (error) {
    console.error("Error storing rating interaction status:", error);
    return false;
  }
}

// Check if an order has already been rated or skipped
function hasRatingInteraction(orderId) {
  if (!orderId) return false;

  // Rating interactions are now checked via database API calls only
  // This function is kept for compatibility but always returns false
  // The actual check is done via the API in promptRatingForCompletedOrder
  return false;
}

// Get current customer ID from auth
function getCustomerId() {
  try {
    // Check if auth.js is loaded and has customer data
    if (typeof isLoggedIn === "function" && isLoggedIn()) {
      // Try to get customer data from auth.js functions if available
      if (typeof getCustomerData === "function") {
        const customerData = getCustomerData();
        return customerData?._id || null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting customer ID:", error);
    return null;
  }
}

// Update product rating in UI if we're on a page with product listings
function updateProductRatingInUI(productId, newRating) {
  try {
    // Find product cards with this product ID
    const productCards = document.querySelectorAll(
      `.product-card[data-product-id="${productId}"]`
    );

    if (productCards.length === 0) {
      // No product cards found in this page
      return;
    }

    productCards.forEach((card) => {
      const ratingSpan = card.querySelector(".rating span");
      const ratingContainer = card.querySelector(".rating");

      if (ratingSpan && ratingContainer) {
        // Update rating text
        ratingSpan.textContent = newRating;

        // Update color based on rating
        if (newRating >= 4.5) {
          ratingSpan.style.color = "#42d158"; // Green for high ratings
        } else if (newRating >= 4.0) {
          ratingSpan.style.color = "#ffd700"; // Gold for good ratings
        } else if (newRating >= 3.5) {
          ratingSpan.style.color = "#ffa500"; // Orange for average ratings
        } else {
          ratingSpan.style.color = "#ff4444"; // Red for low ratings
        }

        // Make rating visible if it was hidden
        ratingContainer.classList.remove("rating-zero");
      }
    });

    console.log(
      `Updated UI for product ${productId} with new rating: ${newRating}`
    );
  } catch (error) {
    console.error("Error updating product rating in UI:", error);
  }
}

// Function to load ratings from database via API calls
function loadRatingsFromDatabase() {
  // Ratings are now loaded from the database via API calls
  console.log("Ratings are now loaded from the database via API calls");
}

// Function to cleanup rating modal
function cleanupRatingModal() {
  console.log("Cleaning up rating modal");

  // Close the rating modal
  closeRatingModal();

  // Reset any global state
  currentOrderId = null;
  currentProductId = null;
  currentProductData = null;
  currentRating = 0;
  orderItemsToRate = [];
  currentItemIndex = 0;
}

// Function to show existing ratings modal
function showExistingRatingsModal(orderId) {
  console.log(`Showing existing ratings for order: ${orderId}`);

  // Show the rating modal
  const ratingModal = document.getElementById("rating-modal");
  if (!ratingModal) {
    console.error("Rating modal not found");
    return;
  }

  // Hide all sections first
  const ratingForm = document.getElementById("rating-form");
  const ratingSuccess = document.getElementById("rating-success");
  const existingRatings = document.getElementById("existing-ratings");

  if (ratingForm) ratingForm.style.display = "none";
  if (ratingSuccess) ratingSuccess.style.display = "none";
  if (existingRatings) existingRatings.style.display = "none";

  // Show the existing ratings section
  if (existingRatings) {
    existingRatings.style.display = "block";
    existingRatings.classList.add("show");
  }

  // Load existing ratings
  loadExistingRatings(orderId);

  // Show the modal
  ratingModal.classList.add("show");
  document.body.classList.add("modal-open");

  // Add event listeners for close buttons
  setupExistingRatingsEventListeners();
}

// Function to load existing ratings from the server
async function loadExistingRatings(orderId) {
  try {
    console.log(`Loading existing ratings for order: ${orderId}`);

    const response = await fetch(
      `/api/ratings/order/${orderId}/existing-ratings`
    );

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      displayExistingRatings(data.data);
    } else {
      console.error("Failed to load existing ratings:", data.message);
      showExistingRatingsEmpty();
    }
  } catch (error) {
    console.error("Error loading existing ratings:", error);
    showExistingRatingsEmpty();
  }
}

// Function to display existing ratings
function displayExistingRatings(ratings) {
  const existingRatingsContent = document.getElementById(
    "existing-ratings-content"
  );

  if (!existingRatingsContent) {
    console.error("Existing ratings content element not found");
    return;
  }

  if (!ratings || ratings.length === 0) {
    showExistingRatingsEmpty();
    return;
  }

  // Clear existing content
  existingRatingsContent.innerHTML = "";

  // Display each rating
  ratings.forEach((rating) => {
    const ratingItem = createExistingRatingItem(rating);
    existingRatingsContent.appendChild(ratingItem);
  });
}

// Function to create an existing rating item
function createExistingRatingItem(rating) {
  const ratingItem = document.createElement("div");
  ratingItem.className = "existing-rating-item";

  // Format the date
  const ratingDate = new Date(rating.createdAt);
  const formattedDate = ratingDate.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Create star rating display
  const starsHTML = Array.from({ length: 5 }, (_, index) => {
    const isActive = index < rating.rating;
    return `<i class="fas fa-star existing-rating-star ${
      isActive ? "active" : ""
    }"></i>`;
  }).join("");

  // Handle product image
  let productImage = "/images/placeholder-small.svg";
  if (rating.product && rating.product.image) {
    productImage = rating.product.image.startsWith("http")
      ? rating.product.image
      : `/${rating.product.image}`;
  }

  ratingItem.innerHTML = `
    <img src="${productImage}" alt="${(() => {
      const currentLang = window.i18n && typeof window.i18n.getCurrentLanguage === 'function' ? window.i18n.getCurrentLanguage() : 'ar';
      if (rating.product) {
        return (currentLang === 'en' && rating.product.nameEn) ? rating.product.nameEn : (rating.product.nameAr || rating.product.name || 'Product');
      }
      return currentLang === 'en' ? 'Product' : 'منتج';
    })()}" 
         class="existing-rating-product-image" 
         onerror="this.src='/images/placeholder-small.svg'">
    <div class="existing-rating-product-info">
      <div class="existing-rating-product-name">
        ${(() => {
          const currentLang = window.i18n && typeof window.i18n.getCurrentLanguage === 'function' ? window.i18n.getCurrentLanguage() : 'ar';
          if (rating.product) {
            return (currentLang === 'en' && rating.product.nameEn) ? rating.product.nameEn : (rating.product.nameAr || rating.product.name || (currentLang === 'en' ? 'Unknown Product' : 'منتج غير معروف'));
          }
          return currentLang === 'en' ? 'Unknown Product' : 'منتج غير معروف';
        })()}
      </div>
      <div class="existing-rating-stars">
        ${starsHTML}
      </div>
      ${
        rating.comment
          ? `<div class="existing-rating-comment">"${rating.comment}"</div>`
          : ""
      }
      <div class="existing-rating-date">${formattedDate}</div>
    </div>
  `;

  return ratingItem;
}

// Function to show empty state for existing ratings
function showExistingRatingsEmpty() {
  const existingRatingsContent = document.getElementById(
    "existing-ratings-content"
  );

  if (!existingRatingsContent) {
    console.error("Existing ratings content element not found");
    return;
  }

  existingRatingsContent.innerHTML = `
    <div class="existing-ratings-empty">
      <i class="fas fa-star"></i>
      <h3>لا توجد تقييمات</h3>
      <p>لم يتم العثور على تقييمات لهذا الطلب</p>
    </div>
  `;
}

// Function to setup event listeners for existing ratings modal
function setupExistingRatingsEventListeners() {
  // Close button in header
  const closeExistingRatings = document.getElementById(
    "close-existing-ratings"
  );
  if (closeExistingRatings) {
    closeExistingRatings.onclick = closeRatingModal;
  }

  // Close button in footer
  const closeExistingRatingsBtn = document.getElementById(
    "close-existing-ratings-btn"
  );
  if (closeExistingRatingsBtn) {
    closeExistingRatingsBtn.onclick = closeRatingModal;
  }

  // Close on backdrop click
  const ratingModal = document.getElementById("rating-modal");
  if (ratingModal) {
    ratingModal.onclick = function (event) {
      if (event.target === ratingModal) {
        closeRatingModal();
      }
    };
  }
}

// Function to open rating modal from previous orders section
function openRatingFromPreviousOrders(
  orderId,
  productId,
  productName,
  productPrice,
  productImage
) {
  console.log(`Opening rating from previous orders for order: ${orderId}`);

  // First check if the order is already rated by querying the server
  fetch(`/api/orders/${orderId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && data.data) {
        const order = data.data;

        // Check if order is already rated
        if (order.isRated) {
          console.log(
            `Order ${orderId} is already rated, showing existing ratings`
          );

          // Show existing ratings modal instead of regular rating modal
          showExistingRatingsModal(orderId);
          return; // Exit early
        }

        // Set current data
        currentOrderId = orderId;
        currentProductId = productId;

        // Handle image path
        let imagePath = productImage;

        // If image path is relative (not a data URL and doesn't start with http), prepend server URL
        if (
          imagePath &&
          !imagePath.startsWith("data:") &&
          !imagePath.startsWith("http") &&
          !imagePath.startsWith("/images/placeholder")
        ) {
          // Make sure it has a leading slash if needed
          if (!imagePath.startsWith("/")) {
            imagePath = "/" + imagePath;
          }
          imagePath = imagePath; // Remove the hardcoded localhost prefix
        }

        // Create product data object
        currentProductData = {
          id: productId,
          name: productName,
          price: productPrice,
          image: imagePath,
        };

        // Show the rating modal
        showRatingModal(currentProductData);
      } else {
        throw new Error("Invalid order data received");
      }
    })
    .catch((error) => {
      console.error("Error checking order rating status:", error);

      // Check via database API only
      // No local storage fallback needed

      // Proceed with showing the rating modal as a fallback
      currentOrderId = orderId;
      currentProductId = productId;

      // Handle image path
      let imagePath = productImage;

      // If image path is relative, prepend server URL
      if (
        imagePath &&
        !imagePath.startsWith("data:") &&
        !imagePath.startsWith("http") &&
        !imagePath.startsWith("/images/placeholder")
      ) {
        // Make sure it has a leading slash if needed
        if (!imagePath.startsWith("/")) {
          imagePath = "/" + imagePath;
        }
        imagePath = imagePath; // Remove the hardcoded localhost prefix
      }

      // Create product data object
      currentProductData = {
        id: productId,
        name: productName,
        price: productPrice,
        image: imagePath,
      };

      // Show the rating modal
      showRatingModal(currentProductData);
    });
}

// Expose this function globally so it can be called from other scripts
window.openRatingFromPreviousOrders = openRatingFromPreviousOrders;
window.showExistingRatingsModal = showExistingRatingsModal;
window.loadExistingRatings = loadExistingRatings;
window.displayExistingRatings = displayExistingRatings;
window.cleanupRatingModal = cleanupRatingModal;

// Helper function to format currency
function formatCurrency(price) {
  if (!price) return "";

  // Check if price is a number or string that can be converted to a number
  let numericPrice = parseFloat(price);
  if (isNaN(numericPrice)) return price; // Return original if not a number

  // Format with 2 decimal places and add currency symbol based on current language
  // Use the global settings if available, otherwise fallback to default
  let currencyText = typeof getCurrencyText === "function" ? getCurrencyText() : "جنية";

  if (!window.globalSettings || !window.globalSettings.loaded) {
    // Fallback to language-based default if global settings not loaded
    if (window.i18n && typeof window.i18n.getCurrentLanguage === "function") {
      const lang = window.i18n.getCurrentLanguage();
      currencyText = lang === "en" ? "EGP" : "جنية";
    }
  }

  return `${numericPrice.toFixed(2)} ${currencyText}`;
}
