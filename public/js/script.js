// Base URL for API requests
window.API_BASE_URL =
  window.API_BASE_URL ||
  (function () {
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
  }
}

// Define cartCountElement as a global variable
let cartCountElement;
let cartCount = 0;

// Global variables for free items and user points
let freeItemsData = [];
let userLoyaltyPoints = 0;

// Create a stub for addOfferCardEventListeners that uses fixOffersSection
function addOfferCardEventListeners() {
  // If fixOffersSection exists, call it, otherwise do nothing
  if (typeof fixOffersSection === "function") {
    fixOffersSection();
  } else {
    console.warn("fixOffersSection not available yet");
  }
}

// Function to update cart badge, delegates to updateNotificationBadge
function updateCartBadge() {
  // Simply call the existing notification badge update function
  updateNotificationBadge();
}

// Helper function to get translations
function getTranslation(key) {
  // Check if i18n is available
  if (
    typeof window.i18n !== "undefined" &&
    typeof window.i18n.getTranslation === "function"
  ) {
    return window.i18n.getTranslation(key);
  }

  // Fallback translations if i18n is not available
  const fallbackTranslations = {
    orderTotal: "الإجمالي:",
    reorderButton: "إعادة الطلب",
    orderDetailsButton: "التفاصيل",
    reorderingOrder: "جاري إعادة الطلب...",
    pleaseLoginToReorder: "يرجى تسجيل الدخول لإعادة الطلب",
    reorderError: "عذراً، حدث خطأ أثناء إعادة الطلب",
    loadingDetails: "جاري تحميل التفاصيل...",
    statusCompleted: "مكتمل",
    statusPending: "قيد الانتظار",
    statusProcessing: "جاري التحضير",
    statusCancelled: "ملغي",
    statusUnknown: "غير معروف",
    orderDate: "تاريخ الطلب",
    orderDetailsTitle: "تفاصيل الطلب",
    orderDateLabel: "التاريخ",
    orderStatusLabel: "الحالة",
    tableNumberLabel: "رقم الطاولة",
    orderItemsTitle: "العناصر",
    orderSummaryTitle: "ملخص الطلب",
    subtotalLabel: "المجموع الفرعي",
    taxLabel: "الضريبة",
    serviceTaxLabel: "رسوم الخدمة",
    discountLabel: "الخصم",
    totalLabel: "الإجمالي",
    closeButton: "إغلاق",
    noItemsAvailable: "لا توجد عناصر متاحة لهذا الطلب",
    itemNotes: "ملاحظات:",
    addonSection: "إضافة",
    freeAddon: "مجاني",
    product: "المنتج",
  };

  return fallbackTranslations[key] || key;
}

// Function to add item to cart
function addToCart(id, name, price, image) {
  console.log(`Adding to cart: ${name}, Price: ${price}`);
  console.log(`Product ID: ${id}`);
  console.log(`Free items data available:`, freeItemsData);

  // Get cart from localStorage
  let cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];

  // Try to get the real MongoDB _id if this is a shortId
  let actualId = id;
  let freeItem = null;

  // First check if we need to resolve the real _id from sessionStorage
  try {
    const namesMap = JSON.parse(sessionStorage.getItem("productNames") || "{}");
    if (namesMap[id] && namesMap[id]._id) {
      actualId = namesMap[id]._id;
      console.log(`Resolved real _id: ${actualId} for shortId: ${id}`);
    }
  } catch (e) {
    console.warn("Could not retrieve product ID from sessionStorage");
  }

  // Now try to find free item using the actual ID
  freeItem = freeItemsData.find(
    (item) =>
      item.productId === actualId ||
      item.productId.toLowerCase() === actualId.toLowerCase()
  );

  const isFreeItem = parseFloat(price) === 0;
  const pointsRequired = isFreeItem && freeItem ? freeItem.pointsRequired : 0;

  console.log(`Is free item: ${isFreeItem}`);
  console.log(`Found free item config:`, freeItem);
  console.log(`Points required: ${pointsRequired}`);
  console.log(`Using cart ID: ${actualId}`);

  // Check if item exists in cart using the actual ID
  let existingItem = cartItems.find((item) => item.id === actualId);

  if (existingItem) {
    // Update price if it's different (e.g., became free)
    if (existingItem.price !== parseFloat(price)) {
      existingItem.price = parseFloat(price);
    }
    // Update free item flag and points required
    existingItem.isFreeItem = isFreeItem;
    existingItem.pointsRequired = pointsRequired;
    // Increment quantity
    existingItem.quantity += 1;
    existingItem.subtotal = existingItem.quantity * existingItem.price;
  } else {
    // Try to get both language names from sessionStorage
    let nameAr = "";
    let nameEn = "";
    try {
      const namesMap = JSON.parse(
        sessionStorage.getItem("productNames") || "{}"
      );
      if (namesMap[id]) {
        // Always use the stored original names, not the passed display name
        nameAr = namesMap[id].name || "";
        nameEn = namesMap[id].nameEn || "";
      }
    } catch (e) {
      console.warn("Could not retrieve product names from sessionStorage");
    }

    // Fallback: if we couldn't get names from sessionStorage, use the passed name
    // But we need to determine which language it is
    if (!nameAr && !nameEn) {
      const currentLang = localStorage.getItem("public-language") || "ar";
      if (currentLang === "en") {
        nameEn = name;
        nameAr = name; // Fallback to same name if we don't have Arabic
      } else {
        nameAr = name;
        nameEn = name; // Fallback to same name if we don't have English
      }
    } else if (!nameAr) {
      nameAr = nameEn || name; // Fallback
    } else if (!nameEn) {
      nameEn = nameAr || name; // Fallback
    }

    // Add new item using the actual MongoDB _id
    const newItem = {
      id: actualId,
      name: nameAr, // Always store Arabic as the primary name
      nameEn: nameEn,
      nameAr: nameAr,
      price: parseFloat(price),
      image: image,
      quantity: 1,
      subtotal: parseFloat(price),
      isFreeItem: isFreeItem, // Add free item flag
      pointsRequired: pointsRequired, // Add points required (0 if not a free item)
    };

    cartItems.push(newItem);
  }

  // Save cart to localStorage
  localStorage.setItem("cartItems", JSON.stringify(cartItems));

  console.log(`✅ Item added to cart with pointsRequired: ${pointsRequired}`);
  console.log(`Cart items after adding:`, cartItems);

  // Store the product image in sessionStorage for use in rating modal
  try {
    // Get existing product images or initialize empty object
    const productImages = JSON.parse(
      sessionStorage.getItem("productImages") || "{}"
    );

    // Always save the image if we have one, even if it's already saved
    // This ensures we have the most recent version
    if (image && image.trim() !== "") {
      productImages[actualId] = image;
      sessionStorage.setItem("productImages", JSON.stringify(productImages));
      console.log("Stored product image in sessionStorage for: " + actualId);
    }
  } catch (err) {
    console.error("Error saving product image to sessionStorage:", err);
  }

  // Update cart badge
  updateCartBadge();

  // Show notification
  showCartNotification();

  // Dispatch custom event for cart changes
  dispatchCartChangeEvent();
}

// Function to add offer to cart with bilingual support
function addOfferToCart(id, nameAr, nameEn, price, image) {
  console.log(`Adding offer to cart: ${nameAr} (${nameEn}), Price: ${price}`);

  // Get cart from localStorage
  let cartItems = JSON.parse(localStorage.getItem("cartItems")) || [];

  // Check if item exists in cart
  let existingItem = cartItems.find((item) => item.id === id);

  if (existingItem) {
    // Increment quantity
    existingItem.quantity += 1;
  } else {
    // Add new offer item
    const newItem = {
      id: id,
      name: nameAr, // Always store Arabic as the primary name
      nameEn: nameEn || "",
      nameAr: nameAr,
      price: parseFloat(price),
      image: image,
      quantity: 1,
      subtotal: parseFloat(price),
      isOffer: true, // Flag to identify this as an offer item
    };

    cartItems.push(newItem);
  }

  // Update subtotal for existing item
  if (existingItem) {
    existingItem.subtotal = existingItem.price * existingItem.quantity;
  }

  // Save to localStorage
  localStorage.setItem("cartItems", JSON.stringify(cartItems));

  // Update cart badge
  updateCartBadge();

  // Show notification
  showCartNotification();

  // Dispatch custom event for cart changes
  dispatchCartChangeEvent();

  console.log("Offer added to cart successfully");
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

// Update cart total functionality
function updateCartTotal() {
  const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
  const totalElement = document.querySelector(".cart-total");

  if (totalElement) {
    let total = 0;

    cartItems.forEach((item) => {
      total += item.price * item.quantity;
    });

    // Format total with 2 decimal places
    totalElement.textContent = total.toFixed(2);

    // Update cart count
    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    localStorage.setItem("cartCount", cartCount);

    // Update notification badge
    updateNotificationBadge();
  }
}

// Initialize product rating functionality
function initProductRating() {
  const productCards = document.querySelectorAll(".product-card");

  productCards.forEach((card) => {
    const ratingElement = card.querySelector(".rating span");
    if (ratingElement) {
      const rating = parseFloat(ratingElement.textContent);

      // Hide rating if it's zero (not rated yet)
      if (rating === 0) {
        const ratingContainer = card.querySelector(".rating");
        if (ratingContainer) {
          ratingContainer.classList.add("rating-zero");
        }
        return;
      }

      // Add color based on rating
      if (rating >= 4.5) {
        ratingElement.style.color = "#42d158"; // Green for high ratings
      } else if (rating >= 4.0) {
        ratingElement.style.color = "#ffd700"; // Gold for good ratings
      } else if (rating >= 3.5) {
        ratingElement.style.color = "#ffa500"; // Orange for average ratings
      } else {
        ratingElement.style.color = "#ff4444"; // Red for low ratings
      }
    }

    // Add rating functionality to the product card
    addRatingFunctionality(card);
  });

  // Listen for order completion events that should trigger rating modal
  listenForOrderCompletionEvents();
}

// Listen for order completion events from the cashier page
function listenForOrderCompletionEvents() {
  console.log("Initializing order completion event listeners");

  // Listen for custom event from the same window
  document.addEventListener("orderCompletedForRating", function (event) {
    if (event.detail && event.detail.orderId) {
      console.log("Received order completed event:", event.detail);

      // Check if this is the index page - always show rating on index page
      if (isIndexPage()) {
        console.log("This is the index page, showing rating modal");
        setTimeout(() => {
          if (typeof promptRatingForCompletedOrder === "function") {
            promptRatingForCompletedOrder(event.detail.orderId);
          } else {
            showRatingModalForOrder(event.detail.orderId);
          }
        }, 1500);
        return;
      }

      // Check if this page is for the same table number
      const tableNumber = getTableNumberFromCurrentPage();

      if (tableNumber && tableNumber === event.detail.tableNumber) {
        console.log("This page matches the table number, showing rating modal");

        // Wait a bit to ensure any notifications are seen first
        setTimeout(() => {
          if (typeof promptRatingForCompletedOrder === "function") {
            promptRatingForCompletedOrder(event.detail.orderId);
          } else {
            showRatingModalForOrder(event.detail.orderId);
          }
        }, 1500);
      }
    }
  });

  // Listen for BroadcastChannel messages (for cross-tab communication)
  try {
    const bc = new BroadcastChannel("order_rating_channel");
    bc.onmessage = (event) => {
      if (
        event.data &&
        event.data.type === "order_completed" &&
        event.data.data
      ) {
        console.log("Received broadcast channel message:", event.data.data);

        // Always show on index page
        if (isIndexPage()) {
          console.log(
            "This is the index page, showing rating modal via broadcast"
          );
          setTimeout(() => {
            if (typeof promptRatingForCompletedOrder === "function") {
              promptRatingForCompletedOrder(event.data.data.orderId);
            } else {
              showRatingModalForOrder(event.data.data.orderId);
            }
          }, 1500);
          return;
        }

        // Check table number for other pages
        const tableNumber = getTableNumberFromCurrentPage();
        if (tableNumber && tableNumber === event.data.data.tableNumber) {
          console.log(
            "This page matches the table number, showing rating modal via broadcast"
          );
          setTimeout(() => {
            if (typeof promptRatingForCompletedOrder === "function") {
              promptRatingForCompletedOrder(event.data.data.orderId);
            } else {
              showRatingModalForOrder(event.data.data.orderId);
            }
          }, 1500);
        }
      }
    };
    console.log("BroadcastChannel listener initialized for order ratings");
  } catch (err) {
    console.log("BroadcastChannel not supported, using storage events instead");
  }

  // Also listen for storage events (for when orders are completed in other tabs)
  window.addEventListener("storage", function (event) {
    if (event.key === "order_completed_for_rating") {
      try {
        const completedOrderData = JSON.parse(event.newValue);
        if (completedOrderData && completedOrderData.orderId) {
          console.log(
            "Received order completed event from storage:",
            completedOrderData
          );

          // Always show on index page
          if (isIndexPage()) {
            console.log(
              "This is the index page, showing rating modal via storage event"
            );
            setTimeout(() => {
              if (typeof promptRatingForCompletedOrder === "function") {
                promptRatingForCompletedOrder(completedOrderData.orderId);
              } else {
                showRatingModalForOrder(completedOrderData.orderId);
              }
            }, 1500);
            return;
          }

          // Check if this page is for the same table number
          const tableNumber = getTableNumberFromCurrentPage();

          if (tableNumber && tableNumber === completedOrderData.tableNumber) {
            console.log(
              "This page matches the table number, showing rating modal"
            );

            // Wait a bit to ensure any notifications are seen first
            setTimeout(() => {
              if (typeof promptRatingForCompletedOrder === "function") {
                promptRatingForCompletedOrder(completedOrderData.orderId);
              } else {
                showRatingModalForOrder(completedOrderData.orderId);
              }
            }, 1500);
          }
        }
      } catch (error) {
        console.error("Error handling order completion storage event:", error);
      }
    }

    // Check for rating trigger events (fallback mechanism)
    if (event.key && event.key.startsWith("order_rating_trigger_")) {
      try {
        const orderData = JSON.parse(event.newValue);
        if (orderData && orderData.orderId) {
          console.log("Received order rating trigger event:", orderData);

          // Always show on index page
          if (isIndexPage()) {
            console.log(
              "This is the index page, showing rating modal via trigger event"
            );
            setTimeout(() => {
              if (typeof promptRatingForCompletedOrder === "function") {
                promptRatingForCompletedOrder(orderData.orderId);
              } else {
                showRatingModalForOrder(orderData.orderId);
              }
            }, 1500);
            return;
          }

          // Check table number for other pages
          const tableNumber = getTableNumberFromCurrentPage();
          if (tableNumber && tableNumber === orderData.tableNumber) {
            console.log(
              "This page matches the table number, showing rating modal via trigger"
            );
            setTimeout(() => {
              if (typeof promptRatingForCompletedOrder === "function") {
                promptRatingForCompletedOrder(orderData.orderId);
              } else {
                showRatingModalForOrder(orderData.orderId);
              }
            }, 1500);
          }
        }
      } catch (error) {
        console.error("Error handling rating trigger event:", error);
      }
    }
  });

  // Check for any recently completed orders when the page loads
  checkForRecentlyCompletedOrders();
}

// Get the table number from the current page (from URL or localStorage)
function getTableNumberFromCurrentPage() {
  // First try to get from URL
  const urlParams = new URLSearchParams(window.location.search);
  let tableNumber = urlParams.get("table");

  // If not in URL, try localStorage
  if (!tableNumber) {
    tableNumber = localStorage.getItem("tableNumber");
  }

  return tableNumber;
}

// Helper function to check if current page is an index page
function isIndexPage() {
  const path = window.location.pathname.toLowerCase();
  return (
    path.endsWith("/index.html") ||
    path.endsWith("/") ||
    path.includes("/pages/index") ||
    path === "/public/pages/" ||
    path === "/public/"
  );
}

// Check if there are any recently completed orders that should be rated
function checkForRecentlyCompletedOrders() {
  try {
    console.log("Checking for recently completed orders");

    // Check for recently completed orders in sessionStorage
    const lastCompletedOrderStr = sessionStorage.getItem("lastCompletedOrder");
    if (lastCompletedOrderStr) {
      const lastCompletedOrder = JSON.parse(lastCompletedOrderStr);
      const orderTimestamp = new Date(lastCompletedOrder.timestamp).getTime();
      const currentTime = new Date().getTime();

      // Only show rating modal if the order was completed in the last 30 minutes (increased from 5)
      if (currentTime - orderTimestamp < 30 * 60 * 1000) {
        // Always show rating on index page
        if (isIndexPage()) {
          console.log(
            "Found recent completed order on index page, checking if it needs rating"
          );

          // First check if the order is already rated
          const orderId = lastCompletedOrder.orderId;

          // Check with the server if the order is already rated
          fetch(`http://localhost:5000/api/orders/${orderId}`)
            .then((response) => response.json())
            .then((data) => {
              // Only prompt for rating if the order exists and is not rated
              if (data.success && data.data && data.data.isRated !== true) {
                // Wait a bit to ensure page is fully loaded
                setTimeout(() => {
                  if (typeof promptRatingForCompletedOrder === "function") {
                    promptRatingForCompletedOrder(orderId);
                  } else {
                    showRatingModalForOrder(orderId);
                  }
                }, 2000);
              } else if (
                data.success &&
                data.data &&
                data.data.isRated === true
              ) {
                console.log(
                  `Order ${orderId} is already rated, not showing rating modal`
                );
              }
            })
            .catch((error) => {
              console.error("Error checking order rating status:", error);
              // Fallback to the original behavior if there's an error
              setTimeout(() => {
                if (typeof promptRatingForCompletedOrder === "function") {
                  promptRatingForCompletedOrder(lastCompletedOrder.orderId);
                } else {
                  showRatingModalForOrder(lastCompletedOrder.orderId);
                }
              }, 2000);
            });

          return;
        }

        // For other pages, check table number
        const tableNumber = getTableNumberFromCurrentPage();
        if (tableNumber && tableNumber === lastCompletedOrder.tableNumber) {
          console.log(
            "Found recent completed order for this table, showing rating modal"
          );

          // Wait a bit to ensure page is fully loaded
          setTimeout(() => {
            if (typeof promptRatingForCompletedOrder === "function") {
              promptRatingForCompletedOrder(lastCompletedOrder.orderId);
            } else {
              showRatingModalForOrder(lastCompletedOrder.orderId);
            }
          }, 2000);
        }
      }
    }

    // Order completion tracking is now handled via database API calls only
    console.log("Order completion tracking via database API only");
  } catch (error) {
    console.error("Error checking for recently completed orders:", error);
  }
}

// Show rating modal for a completed order when rating.js is not available
function showRatingModalForOrder(orderId) {
  // First check if products have already been rated
  fetch(`http://localhost:5000/api/ratings/order/${orderId}/products`, {
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

      // Now fetch order details
      return fetch(`http://localhost:5000/api/orders/${orderId}`, {
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
      if (
        data.success &&
        data.data &&
        data.data.items &&
        data.data.items.length > 0
      ) {
        // Filter out already rated products
        const unratedItems = data.data.items.filter((item) => {
          const itemId = item.id || item.productId || item._id;
          const baseItemId =
            itemId && itemId.includes("-") ? itemId.split("-")[0] : itemId;
          const isAlreadyRated =
            alreadyRatedProducts[baseItemId] || alreadyRatedProducts[itemId];

          if (isAlreadyRated) {
            console.log(
              `Product ${baseItemId} already rated (script.js), skipping`
            );
            return false;
          }
          return true;
        });

        // Check if there are any items left to rate
        if (unratedItems.length === 0) {
          console.log(
            "All products in this order have already been rated (script.js)"
          );
          return;
        }

        // Get the first unrated item from the order
        const firstItem = unratedItems[0];
        const itemId = firstItem.id || firstItem.productId || firstItem._id;

        // If the item doesn't have an image or has a placeholder, fetch the complete product data
        if (
          !firstItem.image ||
          firstItem.image === "" ||
          firstItem.image.includes("placeholder")
        ) {
          try {
            // Extract the base product ID by removing any suffix after a dash
            let baseItemId = itemId;
            if (baseItemId && baseItemId.includes("-")) {
              baseItemId = baseItemId.split("-")[0];
              console.log(
                `Using base product ID for API request: ${baseItemId}`
              );
            }

            console.log(`Fetching complete product data for ${baseItemId}`);
            const productResponse = await fetch(
              `http://localhost:5000/api/products/${baseItemId}`
            );

            if (productResponse.ok) {
              const productData = await productResponse.json();

              if (productData.success && productData.data) {
                // Update item with product data
                firstItem.image = productData.data.image || firstItem.image;

                // Also update other properties if needed
                if (!firstItem.name) firstItem.name = productData.data.name;
                if (!firstItem.price) firstItem.price = productData.data.price;

                console.log(`Updated item with product data: ${itemId}`);
              }
            }
          } catch (fetchError) {
            console.error(`Error fetching product details: ${fetchError}`);
          }
        }

        // Cache the item's image in sessionStorage if it has one
        if (itemId && firstItem.image) {
          try {
            const productImages = JSON.parse(
              sessionStorage.getItem("productImages") || "{}"
            );
            productImages[itemId] = firstItem.image;
            sessionStorage.setItem(
              "productImages",
              JSON.stringify(productImages)
            );
            console.log(
              `Saved image for product ${itemId} in sessionStorage for rating modal`
            );
          } catch (err) {
            console.error(
              "Error storing product image in sessionStorage:",
              err
            );
          }
        }

        showRatingModal(firstItem.id, firstItem, orderId);
      } else {
        throw new Error("No items found in this order");
      }
    })
    .catch((error) => {
      console.error("Error fetching order details for rating:", error);

      // Try to use the last completed order from sessionStorage as fallback
      try {
        const lastCompletedOrderStr =
          sessionStorage.getItem("lastCompletedOrder");
        if (lastCompletedOrderStr) {
          const lastCompletedOrder = JSON.parse(lastCompletedOrderStr);
          if (lastCompletedOrder.items && lastCompletedOrder.items.length > 0) {
            const firstItem = lastCompletedOrder.items[0];
            const itemId = firstItem.id || firstItem.productId || firstItem._id;

            // Try to fetch product details even when using the fallback
            if (
              itemId &&
              (!firstItem.image ||
                firstItem.image === "" ||
                firstItem.image.includes("placeholder"))
            ) {
              // Extract base product ID for API request
              let baseItemId = itemId;
              if (baseItemId && baseItemId.includes("-")) {
                baseItemId = baseItemId.split("-")[0];
                console.log(
                  `Using base product ID for fallback API request: ${baseItemId}`
                );
              }

              // Try to fetch the product details
              fetch(`http://localhost:5000/api/products/${baseItemId}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((productData) => {
                  if (productData && productData.success && productData.data) {
                    // Update the item with product data
                    firstItem.image = productData.data.image || firstItem.image;

                    // Store in sessionStorage
                    if (itemId && firstItem.image) {
                      try {
                        const productImages = JSON.parse(
                          sessionStorage.getItem("productImages") || "{}"
                        );
                        productImages[itemId] = firstItem.image;
                        sessionStorage.setItem(
                          "productImages",
                          JSON.stringify(productImages)
                        );
                      } catch (err) {
                        console.error(
                          "Error storing product image from fallback:",
                          err
                        );
                      }
                    }

                    // Show the modal with updated data
                    showRatingModal(firstItem.id, firstItem, orderId);
                  } else {
                    // Show modal with existing data if API fails
                    showRatingModal(firstItem.id, firstItem, orderId);
                  }
                })
                .catch(() => {
                  // Show modal with existing data if fetch fails
                  showRatingModal(firstItem.id, firstItem, orderId);
                });
            } else {
              // Store the image in sessionStorage
              if (itemId && firstItem.image) {
                try {
                  const productImages = JSON.parse(
                    sessionStorage.getItem("productImages") || "{}"
                  );
                  productImages[itemId] = firstItem.image;
                  sessionStorage.setItem(
                    "productImages",
                    JSON.stringify(productImages)
                  );
                  console.log(
                    `Saved image from lastCompletedOrder for product ${itemId}`
                  );
                } catch (err) {
                  console.error(
                    "Error storing product image from lastCompletedOrder:",
                    err
                  );
                }
              }

              showRatingModal(firstItem.id, firstItem, orderId);
            }
          } else {
            // Show a generic modal if no items found
            showToast("تعذر عرض نموذج التقييم. يرجى المحاولة لاحقاً.", "error");
          }
        } else {
          showToast("تعذر عرض نموذج التقييم. يرجى المحاولة لاحقاً.", "error");
        }
      } catch (fallbackError) {
        console.error("Error using fallback for order rating:", fallbackError);
        showToast("تعذر عرض نموذج التقييم. يرجى المحاولة لاحقاً.", "error");
      }
    });
}

// Function to add rating functionality to a product card
function addRatingFunctionality(card) {
  const productId = card.getAttribute("data-product-id");
  const ratingContainer = card.querySelector(".rating");

  if (ratingContainer) {
    // Remove the clickable styling
    ratingContainer.style.cursor = "default";

    // No click event listener - removing this prevents the rating modal from showing
  }
}

// Function to show rating modal
function showRatingModal(productId, productData = null, orderId = null) {
  // Create modal backdrop
  const modalBackdrop = document.createElement("div");
  modalBackdrop.className = "modal-backdrop";
  modalBackdrop.style.position = "fixed";
  modalBackdrop.style.top = "0";
  modalBackdrop.style.left = "0";
  modalBackdrop.style.width = "100%";
  modalBackdrop.style.height = "100%";
  modalBackdrop.style.backgroundColor = "rgba(0,0,0,0.5)";
  modalBackdrop.style.zIndex = "1000";
  modalBackdrop.style.display = "flex";
  modalBackdrop.style.justifyContent = "center";
  modalBackdrop.style.alignItems = "center";

  // Get product details
  let productName = "";
  let productImage = "";

  if (productData) {
    // Use provided product data
    productName = productData.name;
    productImage = productData.image;
  } else {
    // Try to get from product card
    const productCard = document.querySelector(
      `.product-card[data-product-id="${productId}"]`
    );
    if (productCard) {
      productName = productCard.querySelector(".product-name").textContent;
      const imgElement = productCard.querySelector(".product-image img");
      if (imgElement) {
        productImage = imgElement.src;
      }
    }
  }

  // If still no image, try to get from sessionStorage
  if (
    !productImage ||
    productImage === "" ||
    productImage.includes("placeholder")
  ) {
    try {
      const productImages = JSON.parse(
        sessionStorage.getItem("productImages") || "{}"
      );
      if (productImages[productId]) {
        productImage = productImages[productId];
        console.log(
          `Using image from sessionStorage for product: ${productId}`
        );
      }
    } catch (err) {
      console.error("Error getting product image from sessionStorage:", err);
    }
  }

  // Create modal content
  const modalContent = document.createElement("div");
  modalContent.className = "rating-modal";
  modalContent.style.backgroundColor = "var(--surface-color)";
  modalContent.style.padding = "20px";
  modalContent.style.borderRadius = "10px";
  modalContent.style.width = "90%";
  modalContent.style.maxWidth = "400px";
  modalContent.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
  modalContent.style.position = "relative";
  modalContent.style.textAlign = "center";

  // Close button
  const closeButton = document.createElement("button");
  closeButton.innerHTML = '<i class="fas fa-times"></i>';
  closeButton.style.position = "absolute";
  closeButton.style.right = "10px";
  closeButton.style.top = "10px";
  closeButton.style.border = "none";
  closeButton.style.background = "none";
  closeButton.style.fontSize = "20px";
  closeButton.style.cursor = "pointer";
  closeButton.style.color = "var(--text-color)";

  // Title
  const title = document.createElement("h3");
  title.textContent = orderId
    ? `تقييم الطلب #${orderId}`
    : `تقييم ${productName}`;
  title.style.margin = "0 0 20px 0";

  // Product info section (only if we have product data)
  let productInfoDiv = null;
  if (productName) {
    productInfoDiv = document.createElement("div");
    productInfoDiv.className = "rating-product-info";
    productInfoDiv.style.display = "flex";
    productInfoDiv.style.alignItems = "center";
    productInfoDiv.style.marginBottom = "20px";
    productInfoDiv.style.padding = "10px";
    productInfoDiv.style.backgroundColor = "rgba(0,0,0,0.05)";
    productInfoDiv.style.borderRadius = "8px";

    if (productImage) {
      const img = document.createElement("img");
      img.src = productImage;
      img.alt = productName;
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.style.marginRight = "10px";
      productInfoDiv.appendChild(img);
    }

    const nameDiv = document.createElement("div");
    nameDiv.textContent = productName;
    nameDiv.style.fontWeight = "bold";
    productInfoDiv.appendChild(nameDiv);
  }

  // Star rating
  const starsContainer = document.createElement("div");
  starsContainer.className = "stars-container";
  starsContainer.style.display = "flex";
  starsContainer.style.justifyContent = "center";
  starsContainer.style.margin = "20px 0";
  starsContainer.style.gap = "10px";
  starsContainer.style.fontSize = "30px";

  // Add 5 stars
  let selectedRating = 0;

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("span");
    star.className = "rating-star";
    star.innerHTML = '<i class="far fa-star"></i>';
    star.style.cursor = "pointer";
    star.style.color = "#ffd700";
    star.setAttribute("data-rating", i);

    // Hover effect
    star.addEventListener("mouseenter", function () {
      // Fill all stars up to this one
      const rating = parseInt(this.getAttribute("data-rating"));
      const stars = starsContainer.querySelectorAll(".rating-star");

      stars.forEach((s, index) => {
        if (index < rating) {
          s.innerHTML = '<i class="fas fa-star"></i>';
        } else {
          s.innerHTML = '<i class="far fa-star"></i>';
        }
      });
    });

    star.addEventListener("mouseleave", function () {
      // Reset to selected rating
      const stars = starsContainer.querySelectorAll(".rating-star");

      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.innerHTML = '<i class="fas fa-star"></i>';
        } else {
          s.innerHTML = '<i class="far fa-star"></i>';
        }
      });
    });

    // Click to select rating
    star.addEventListener("click", function () {
      selectedRating = parseInt(this.getAttribute("data-rating"));
      const stars = starsContainer.querySelectorAll(".rating-star");

      stars.forEach((s, index) => {
        if (index < selectedRating) {
          s.innerHTML = '<i class="fas fa-star"></i>';
        } else {
          s.innerHTML = '<i class="far fa-star"></i>';
        }
      });
    });

    starsContainer.appendChild(star);
  }

  // Comment field
  const commentDiv = document.createElement("div");
  commentDiv.style.marginBottom = "20px";

  const commentLabel = document.createElement("label");
  commentLabel.textContent = "تعليقك (اختياري)";
  commentLabel.style.display = "block";
  commentLabel.style.marginBottom = "8px";
  commentLabel.style.textAlign = "right";

  const commentInput = document.createElement("textarea");
  commentInput.placeholder = "أخبرنا برأيك حول هذا المنتج...";
  commentInput.style.width = "100%";
  commentInput.style.padding = "10px";
  commentInput.style.borderRadius = "8px";
  commentInput.style.border = "1px solid #ddd";
  commentInput.style.minHeight = "80px";
  commentInput.style.fontFamily = "inherit";

  commentDiv.appendChild(commentLabel);
  commentDiv.appendChild(commentInput);

  // Submit button
  const submitButton = document.createElement("button");
  submitButton.textContent = "إرسال التقييم";
  submitButton.className = "rating-submit-btn";
  submitButton.style.backgroundColor = "var(--primary-color)";
  submitButton.style.color = "white";
  submitButton.style.border = "none";
  submitButton.style.padding = "10px 20px";
  submitButton.style.borderRadius = "5px";
  submitButton.style.marginTop = "20px";
  submitButton.style.cursor = "pointer";
  submitButton.style.fontWeight = "bold";

  // Submit rating handler
  submitButton.addEventListener("click", function () {
    if (selectedRating > 0) {
      if (orderId) {
        // If we have an order ID, use it for the rating
        submitOrderRating(
          orderId,
          productId,
          selectedRating,
          commentInput.value
        );
      } else {
        // Regular product rating
        submitProductRating(productId, selectedRating);
      }
      document.body.removeChild(modalBackdrop);
    } else {
      alert("يرجى اختيار تقييم");
    }
  });

  // Close modal when clicking outside
  modalBackdrop.addEventListener("click", function (e) {
    if (e.target === modalBackdrop) {
      document.body.removeChild(modalBackdrop);
    }
  });

  // Close button handler
  closeButton.addEventListener("click", function () {
    document.body.removeChild(modalBackdrop);
  });

  // Assemble modal
  modalContent.appendChild(closeButton);
  modalContent.appendChild(title);
  if (productInfoDiv) {
    modalContent.appendChild(productInfoDiv);
  }
  modalContent.appendChild(starsContainer);
  modalContent.appendChild(commentDiv);
  modalContent.appendChild(submitButton);
  modalBackdrop.appendChild(modalContent);

  // Add to document
  document.body.appendChild(modalBackdrop);
}

// Function to submit a rating for an order
async function submitOrderRating(orderId, productId, rating, comment) {
  try {
    showToast("جاري إرسال التقييم...", "info");

    // First, submit the rating to the server
    const response = await fetch(`/api/ratings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: orderId,
        productId: productId,
        rating: rating,
        comment: comment,
        customerId: getCustomerId(), // Get customer ID if available
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (
        response.status === 400 &&
        data.message &&
        (data.message.includes("already been rated") ||
          data.message.includes("This order has already been rated"))
      ) {
        showToast("تم تقييم هذا الطلب مسبقاً", "info");
        // Show existing ratings modal
        if (typeof window.showExistingRatingsModal === "function") {
          window.showExistingRatingsModal(orderId);
        }
        return;
      }
      throw new Error(data.message || "Error submitting rating to server");
    }

    // If server update successful, then update UI with the server-returned average
    if (data.success && data.data && data.data.averageRating) {
      // Use the server's calculated average rating
      const serverAverage = data.data.averageRating;

      // Update product rating in UI
      updateProductRatingDisplay(productId, serverAverage);

      // Order rating status is now tracked in database only

      // Show confirmation
      showToast(`تم تقييم الطلب بنجاح (${rating}/5)`, "success");

      // Disable rating in Previous Orders UI if present
      try {
        const selector = `.order-card[data-order-id="${orderId}"]`;
        const orderCard = document.querySelector(selector);
        if (orderCard) {
          orderCard.setAttribute("data-is-rated", "true");
          const btn = orderCard.querySelector(".order-rating-btn");
          if (btn) {
            btn.classList.add("disabled");
            btn.setAttribute("disabled", "true");
            btn.setAttribute("aria-disabled", "true");
            btn.setAttribute(
              "title",
              typeof getTranslation === "function"
                ? getTranslation("orderRatedTooltip")
                : "تم التقييم"
            );
            const icon = btn.querySelector("i") || document.createElement("i");
            if (!icon.parentNode) {
              icon.className = "fas fa-star";
            }
            btn.innerHTML = "";
            btn.appendChild(icon);
            btn.appendChild(
              document.createTextNode(
                typeof getTranslation === "function"
                  ? getTranslation("orderRated")
                  : "تم التقييم"
              )
            );
          }
        }
      } catch (_) {}
    } else {
      // No fallback - ratings are managed by database only
      console.log("Rating processed by database, no local calculation needed");

      // Show confirmation
      showToast(`تم تقييم الطلب بنجاح (${rating}/5)`, "success");

      // Disable rating UI as above when no average returned
      try {
        const selector = `.order-card[data-order-id="${orderId}"]`;
        const orderCard = document.querySelector(selector);
        if (orderCard) {
          orderCard.setAttribute("data-is-rated", "true");
          const btn = orderCard.querySelector(".order-rating-btn");
          if (btn) {
            btn.classList.add("disabled");
            btn.setAttribute("disabled", "true");
            btn.setAttribute("aria-disabled", "true");
            btn.setAttribute(
              "title",
              typeof getTranslation === "function"
                ? getTranslation("orderRatedTooltip")
                : "تم التقييم"
            );
            const icon = btn.querySelector("i") || document.createElement("i");
            if (!icon.parentNode) {
              icon.className = "fas fa-star";
            }
            btn.innerHTML = "";
            btn.appendChild(icon);
            btn.appendChild(
              document.createTextNode(
                typeof getTranslation === "function"
                  ? getTranslation("orderRated")
                  : "تم التقييم"
              )
            );
          }
        }
      } catch (_) {}
    }
  } catch (error) {
    console.error("Error submitting order rating:", error);
    showToast("حدث خطأ أثناء تقييم المنتج", "error");
  }
}

// Function to submit a product rating
async function submitProductRating(productId, rating) {
  try {
    showToast("جاري إرسال التقييم...", "info");

    // First, submit the rating to the server
    const response = await fetch(`/api/ratings/product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: productId,
        rating: rating,
        customerId: getCustomerId(), // Get customer ID if available
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error submitting rating to server");
    }

    // If server update successful, then update UI with the server-returned average
    if (data.success && data.data && data.data.averageRating) {
      // Use the server's calculated average rating
      const serverAverage = data.data.averageRating;

      // Update product rating in UI
      updateProductRatingDisplay(productId, serverAverage);

      // Show confirmation
      showToast(`تم تقييم المنتج بنجاح (${rating}/5)`, "success");
    } else {
      // No fallback - ratings are managed by database only
      console.log("Rating processed by database, no local calculation needed");

      // Show confirmation
      showToast(`تم تقييم المنتج بنجاح (${rating}/5)`, "success");
    }
  } catch (error) {
    console.error("Error submitting product rating:", error);
    showToast("حدث خطأ أثناء تقييم المنتج", "error");
  }
}

// Function to update the product rating display
function updateProductRatingDisplay(productId, newRating) {
  const productCard = document.querySelector(
    `.product-card[data-product-id="${productId}"]`
  );
  if (!productCard) return;

  const ratingSpan = productCard.querySelector(".rating span");
  const ratingContainer = productCard.querySelector(".rating");

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
}

// Function to load ratings from database via API calls
function loadRatingsFromDatabase() {
  // Ratings are now loaded from the database via API calls
  console.log("Ratings are now loaded from the database via API calls");
}

// Initialize quantity controls functionality
function initQuantityControls() {
  const quantityControls = document.querySelectorAll(".quantity-control");

  quantityControls.forEach((control) => {
    const minusBtn = control.querySelector(".quantity-minus");
    const plusBtn = control.querySelector(".quantity-plus");
    const quantityInput = control.querySelector(".quantity-input");

    if (minusBtn && plusBtn && quantityInput) {
      // Decrease quantity
      minusBtn.addEventListener("click", () => {
        let value = parseInt(quantityInput.value);
        if (value > 1) {
          quantityInput.value = value - 1;
          // Trigger change event
          quantityInput.dispatchEvent(new Event("change"));
        }
      });

      // Increase quantity
      plusBtn.addEventListener("click", () => {
        let value = parseInt(quantityInput.value);
        quantityInput.value = value + 1;
        // Trigger change event
        quantityInput.dispatchEvent(new Event("change"));
      });

      // Handle manual input
      quantityInput.addEventListener("change", () => {
        let value = parseInt(quantityInput.value);
        if (isNaN(value) || value < 1) {
          quantityInput.value = 1;
        }
        // Update cart total
        updateCartTotal();
      });
    }
  });
}

// Initialize notification badge functionality
function updateNotificationBadge() {
  const cartCount = localStorage.getItem("cartCount") || 0;
  const notificationBadge = document.querySelector(".cart-count");

  if (notificationBadge) {
    if (cartCount > 0) {
      notificationBadge.textContent = cartCount;
      notificationBadge.style.display = "flex";
    } else {
      notificationBadge.style.display = "none";
    }
  }
}

// Initialize category selection functionality
function initCategorySelection() {
  const categoryFilters = document.querySelectorAll(".filter");
  const productGrid = document.querySelector(".product-grid");

  categoryFilters.forEach((filter) => {
    filter.addEventListener("click", function () {
      // Remove active class from all filters
      categoryFilters.forEach((f) => f.classList.remove("active"));

      // Add active class to clicked filter
      this.classList.add("active");

      const category = this.getAttribute("data-category");

      // Filter products
      const productCards = document.querySelectorAll(".product-card");

      productCards.forEach((card) => {
        if (
          category === "all" ||
          card.getAttribute("data-category") === category
        ) {
          card.style.display = "block";
          // Add fade-in animation
          card.style.animation = "fadeIn 0.5s ease forwards";
        } else {
          card.style.display = "none";
        }
      });

      // Scroll to product grid with smooth animation
      if (productGrid) {
        productGrid.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// Function to check active sidebar item based on current URL
function checkActiveSidebarItem() {
  const currentPath = window.location.pathname;
  const sidebarItems = document.querySelectorAll(".sidebar-item");

  // Get the active section from localStorage first
  const activeSection = localStorage.getItem("activeSection");

  // If active section is set and we're on the index page, respect the saved section preference
  if (
    activeSection &&
    (currentPath === "/" ||
      currentPath.endsWith("index.html") ||
      currentPath.endsWith("/pages/") ||
      currentPath.endsWith("/pages/index.html"))
  ) {
    sidebarItems.forEach((item) => item.classList.remove("active"));

    if (activeSection === "menu") {
      const menuItem = document
        .querySelector(".menu-section-link")
        .closest(".sidebar-item");
      if (menuItem) {
        menuItem.classList.add("active");
      }
    } else if (activeSection === "offers") {
      const offersItem = document
        .querySelector(".offers-section-link")
        .closest(".sidebar-item");
      if (offersItem) {
        offersItem.classList.add("active");
      }
    } else if (activeSection === "reservation") {
      const reservationItem = document
        .querySelector(".reservation-section-link")
        .closest(".sidebar-item");
      if (reservationItem) {
        reservationItem.classList.add("active");
      }
    } else if (activeSection === "previousOrders") {
      const previousOrdersItem = document
        .querySelector(".previous-orders-section-link")
        .closest(".sidebar-item");
      if (previousOrdersItem) {
        previousOrdersItem.classList.add("active");
      }
    }
    return;
  }

  // For the root page or index and no active section, default to menu item
  if (
    !activeSection &&
    (currentPath === "/" ||
      currentPath.endsWith("index.html") ||
      currentPath.endsWith("/pages/") ||
      currentPath.endsWith("/pages/index.html"))
  ) {
    sidebarItems.forEach((item) => item.classList.remove("active"));
    const menuItem = document
      .querySelector(".menu-section-link")
      .closest(".sidebar-item");
    if (menuItem) {
      menuItem.classList.add("active");
    }
    return;
  }

  // For other pages, set active based on current path
  sidebarItems.forEach((item) => {
    const link = item.querySelector(".sidebar-link");
    if (link && link.getAttribute("href") === currentPath) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

// Function to restore active sidebar item from localStorage
function restoreActiveSidebarItem() {
  const savedItemIndex = localStorage.getItem("activeSidebarItemIndex");
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  const activeSection = localStorage.getItem("activeSection");

  if (savedItemIndex !== null) {
    const index = parseInt(savedItemIndex);

    if (index >= 0 && index < sidebarItems.length) {
      sidebarItems.forEach((item) => item.classList.remove("active"));
      sidebarItems[index].classList.add("active");
    }
  } else if (activeSection) {
    // If we have an active section but no index, use the section value
    sidebarItems.forEach((item) => item.classList.remove("active"));

    if (activeSection === "menu") {
      const menuItem = document
        .querySelector(".menu-section-link")
        .closest(".sidebar-item");
      if (menuItem) {
        menuItem.classList.add("active");
        // Save the menu item index to localStorage
        const itemIndex = Array.from(sidebarItems).indexOf(menuItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      }
    } else if (activeSection === "offers") {
      const offersItem = document
        .querySelector(".offers-section-link")
        .closest(".sidebar-item");
      if (offersItem) {
        offersItem.classList.add("active");
        // Save the offers item index to localStorage
        const itemIndex = Array.from(sidebarItems).indexOf(offersItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      }
    } else if (activeSection === "reservation") {
      const reservationItem = document
        .querySelector(".reservation-section-link")
        .closest(".sidebar-item");
      if (reservationItem) {
        reservationItem.classList.add("active");
        // Save the reservation item index to localStorage
        const itemIndex = Array.from(sidebarItems).indexOf(reservationItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      }
    } else if (activeSection === "previousOrders") {
      const previousOrdersItem = document
        .querySelector(".previous-orders-section-link")
        .closest(".sidebar-item");
      if (previousOrdersItem) {
        previousOrdersItem.classList.add("active");
        // Save the previous orders item index to localStorage
        const itemIndex = Array.from(sidebarItems).indexOf(previousOrdersItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      }
    }
  } else {
    // If no active sidebar item is saved, set menu section link as active by default
    sidebarItems.forEach((item) => item.classList.remove("active"));
    const menuItem = document
      .querySelector(".menu-section-link")
      .closest(".sidebar-item");
    if (menuItem) {
      menuItem.classList.add("active");

      // Save the menu section as active in localStorage
      localStorage.setItem("activeSection", "menu");

      // Save the menu item index
      const itemIndex = Array.from(sidebarItems).indexOf(menuItem);
      localStorage.setItem("activeSidebarItemIndex", itemIndex);
    }
  }
}

// Initialize sidebar functionality
function initSidebar() {
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sidebarClose = document.getElementById("sidebar-close");
  const sidebar = document.getElementById("sidebar-menu");
  const overlay = document.getElementById("sidebar-overlay");

  if (!sidebarToggle || !sidebar) return;

  // Toggle sidebar when menu icon is clicked
  sidebarToggle.addEventListener("click", function (e) {
    e.preventDefault();
    sidebar.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  // Close sidebar when close button is clicked
  if (sidebarClose) {
    sidebarClose.addEventListener("click", function (e) {
      e.preventDefault();
      closeSidebar();
    });
  }

  // Close sidebar when overlay is clicked
  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  // Add escape key support to close sidebar
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebar.classList.contains("active")) {
      closeSidebar();
    }
  });

  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// Initialize dark/light mode toggle
function initThemeToggle() {
  // Check if theme.js is available
  if (
    typeof window.themeJs !== "undefined" &&
    typeof window.themeJs.initThemeToggle === "function"
  ) {
    try {
      // Call the implementation from theme.js
      window.themeJs.initThemeToggle();
      console.log("Theme toggle initialized from theme.js");
    } catch (error) {
      console.error("Error initializing theme toggle from theme.js:", error);
      // Fallback to basic implementation
      initThemeToggleFallback();
    }
  } else {
    console.warn(
      "Theme.js functionality not available, using fallback implementation"
    );
    initThemeToggleFallback();
  }
}

// Fallback implementation if theme.js fails or isn't available
function initThemeToggleFallback() {
  const toggleSwitch = document.getElementById("switch");
  const body = document.body;

  if (!toggleSwitch) {
    console.warn("Theme toggle switch element not found");
    return;
  }

  // Check saved preference
  const isDarkMode = localStorage.getItem("darkMode") !== "false";

  // Apply theme
  if (isDarkMode) {
    body.classList.add("dark-mode");
    body.classList.remove("light-mode");
    toggleSwitch.checked = true;
  } else {
    body.classList.add("light-mode");
    body.classList.remove("dark-mode");
    toggleSwitch.checked = false;
  }

  // Add event listener
  toggleSwitch.addEventListener("change", function () {
    if (this.checked) {
      body.classList.add("dark-mode");
      body.classList.remove("light-mode");
      localStorage.setItem("darkMode", "true");
    } else {
      body.classList.add("light-mode");
      body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "false");
    }
  });
}

// Function to load categories dynamically from API
async function loadCategories() {
  const categoryFiltersContainer = document.getElementById("category-filters");
  if (!categoryFiltersContainer) return;

  try {
    console.log("Loading categories from API...");
    const response = await fetch(`${API_BASE_URL}/api/categories`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const result = await response.json();
      console.log("Categories API Response:", result);

      if (result.success && result.data && result.data.length > 0) {
        console.log(`Loaded ${result.data.length} categories from API`);
        renderCategoryFilters(result.data);
        return;
      } else {
        console.warn("No categories found in API response");
      }
    } else {
      console.warn(
        `Categories API request failed with status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Error loading categories from API:", error);
  }

  // If API fails, try localStorage
  try {
    const savedCategories = localStorage.getItem("categories");
    if (savedCategories) {
      const categories = JSON.parse(savedCategories);
      if (categories.length > 0) {
        console.log(`Loaded ${categories.length} categories from localStorage`);
        renderCategoryFilters(categories);
        return;
      }
    }
  } catch (error) {
    console.error("Error loading categories from localStorage:", error);
  }

  console.log("No categories available - only 'All' filter will be shown");
}

// Function to render category filters
function renderCategoryFilters(categories) {
  const categoryFiltersContainer = document.getElementById("category-filters");
  if (!categoryFiltersContainer) return;

  // Get current language
  const currentLang = localStorage.getItem("public-language") || "ar";

  // Keep the "All" filter and clear the rest
  const allText = currentLang === "en" ? "All" : "الكل";
  categoryFiltersContainer.innerHTML = `
    <div class="filter active" data-category="all">
      <span data-i18n="allCategories">${allText}</span>
    </div>
  `;

  // Add category filters dynamically
  categories.forEach((category) => {
    const filterDiv = document.createElement("div");
    filterDiv.className = "filter";
    filterDiv.setAttribute("data-category", category.value);
    filterDiv.setAttribute("data-name-ar", category.name);
    filterDiv.setAttribute("data-name-en", category.nameEn || category.name);

    const categoryName =
      currentLang === "en" && category.nameEn ? category.nameEn : category.name;
    let icon = category.icon || "fa-solid fa-utensils";

    // Normalize icon format - support both FA5 and FA6 formats
    // Convert FA5 format (fas/far/fab) to FA6 format (fa-solid/fa-regular/fa-brands)
    if (icon.includes("fas ") && !icon.includes("fa-solid")) {
      icon = icon.replace("fas ", "fa-solid ");
    } else if (icon.includes("far ") && !icon.includes("fa-regular")) {
      icon = icon.replace("far ", "fa-regular ");
    } else if (icon.includes("fab ") && !icon.includes("fa-brands")) {
      icon = icon.replace("fab ", "fa-brands ");
    }

    // Clean up extra spaces
    icon = icon.replace(/\s+/g, " ").trim();

    // If icon is empty or just whitespace, use default
    if (!icon || icon.trim() === "") {
      icon = "fa-solid fa-utensils";
    }

    filterDiv.innerHTML = `
      <i class="${icon}"></i>
      <span data-i18n="${category.value}">${categoryName}</span>
    `;

    categoryFiltersContainer.appendChild(filterDiv);
  });

  // Re-initialize category filter event listeners
  initCategoryFilter();
}

// Fast update categories language without reloading from API
function updateCategoriesLanguage(lang) {
  // Update the "All" filter
  const allFilter = document.querySelector(".filter[data-category='all'] span");
  if (allFilter) {
    allFilter.textContent = lang === "en" ? "All" : "الكل";
  }

  // Update other category filters
  const filters = document.querySelectorAll(
    ".filter[data-category]:not([data-category='all'])"
  );

  filters.forEach((filter) => {
    const nameAr = filter.getAttribute("data-name-ar");
    const nameEn = filter.getAttribute("data-name-en");
    const span = filter.querySelector("span");

    if (span && nameAr && nameEn) {
      span.textContent = lang === "en" ? nameEn : nameAr;
    }
  });
}

// Function to initialize category filters
function initCategoryFilter() {
  const filters = document.querySelectorAll(".filter");
  const productGrid = document.querySelector(".product-grid");

  if (!filters.length || !productGrid) return;

  filters.forEach((filter) => {
    filter.addEventListener("click", function () {
      // Remove active class from all filters
      filters.forEach((f) => f.classList.remove("active"));

      // Add active class to clicked filter
      this.classList.add("active");

      const category = this.getAttribute("data-category");
      console.log("Filtering by category:", category);

      // Filter products
      const productCards = document.querySelectorAll(".product-card");

      productCards.forEach((card) => {
        // Apply fade in animation
        card.style.animation = "none";
        card.offsetHeight; // Trigger reflow
        card.style.animation = "fadeIn 0.5s ease forwards";

        if (
          category === "all" ||
          card.getAttribute("data-category") === category
        ) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });

      // Only scroll if product grid is not visible in viewport
      const rect = productGrid.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.top <= window.innerHeight;

      if (!isVisible) {
        productGrid.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });

  // Set initial active filter (usually "all")
  const defaultFilter = document.querySelector('.filter[data-category="all"]');
  if (defaultFilter) {
    defaultFilter.classList.add("active");
  }
}

// Initialize the cart notification element
let cartNotification;

function createCartNotification() {
  // Check if notification exists
  let existingNotification = document.querySelector(".cart-notification");
  if (existingNotification) {
    cartNotification = existingNotification;
    return;
  }

  // Create notification element
  cartNotification = document.createElement("div");
  cartNotification.className = "cart-notification";

  const lang = localStorage.getItem("public-language") || "ar";
  const notificationText =
    lang === "en" ? "Added to cart" : "تمت الإضافة إلى السلة";

  cartNotification.innerHTML = `<i class="fas fa-check-circle"></i> ${notificationText}`;
  document.body.appendChild(cartNotification);
}

function showCartNotification() {
  if (!cartNotification) {
    createCartNotification();
  }

  cartNotification.classList.add("show");
  setTimeout(() => {
    if (cartNotification) {
      cartNotification.classList.remove("show");
    }
  }, 2000);
}

// Initialize bottom navigation functionality
function initBottomNav() {
  // Bottom Navigation functionality
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    if (item.id === "cart-icon") {
      // Special case for cart icon - preserve the direct link
      item.addEventListener("click", function () {
        // Add tapped animation class
        this.classList.add("tapped");

        // Remove the class after animation completes
        setTimeout(() => {
          this.classList.remove("tapped");
        }, 300);
      });
    } else {
      item.addEventListener("click", function (e) {
        // Add tapped animation class
        this.classList.add("tapped");

        // Remove the class after animation completes
        setTimeout(() => {
          this.classList.remove("tapped");
        }, 300);

        if (!this.classList.contains("active")) {
          e.preventDefault();

          // Remove active class from all items
          navItems.forEach((navItem) => navItem.classList.remove("active"));

          // Add active class to clicked item
          this.classList.add("active");
        }
      });
    }

    // For mobile touch events
    item.addEventListener("touchstart", function () {
      this.style.opacity = "0.8";
    });

    item.addEventListener("touchend", function () {
      this.style.opacity = "1";
    });
  });
}

// Update cart count from localStorage
function updateCartCountFromStorage() {
  const savedCartItems = localStorage.getItem("cartItems");
  if (savedCartItems) {
    try {
      const cartItems = JSON.parse(savedCartItems);
      cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      if (cartCountElement) {
        cartCountElement.textContent = cartCount;
        cartCountElement.style.display = cartCount > 0 ? "flex" : "none";
      }
    } catch (error) {
      console.error("Error updating cart count:", error);
    }
  } else {
    cartCount = 0;
    if (cartCountElement) {
      cartCountElement.textContent = "0";
      cartCountElement.style.display = "none";
    }
  }
}

// Function to check user permissions and update UI accordingly
function checkUserPermissions() {
  // Check if the user is logged in
  if (typeof isLoggedIn === "function" && isLoggedIn()) {
    // Get user permissions
    let userPermissions = null;

    if (typeof getUserPermissions === "function") {
      userPermissions = getUserPermissions();
    } else {
      // Fallback if the function is not available
      try {
        const permissionsJson = localStorage.getItem("userPermissions");
        if (permissionsJson) {
          userPermissions = JSON.parse(permissionsJson);
        }
      } catch (e) {
        console.error("Error parsing permissions:", e);
      }
    }

    // Update UI based on permissions
    if (userPermissions) {
      // Check for admin panel access
      const adminOnlyElements = document.querySelectorAll(".admin-only-item");
      if (userPermissions.adminPanel === true) {
        adminOnlyElements.forEach((el) => (el.style.display = "block"));
      } else {
        adminOnlyElements.forEach((el) => (el.style.display = "none"));
      }

      // Check for cashier access
      const cashierOnlyElements =
        document.querySelectorAll(".cashier-only-item");
      if (userPermissions.cashier === true) {
        cashierOnlyElements.forEach((el) => (el.style.display = "block"));
      } else {
        cashierOnlyElements.forEach((el) => (el.style.display = "none"));
      }

      // Handle other permission-based elements
      document.querySelectorAll("[data-permission]").forEach((el) => {
        const requiredPermission = el.getAttribute("data-permission");
        if (userPermissions[requiredPermission] === true) {
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      });

      console.log("User permissions applied to UI", userPermissions);
    }

    // If no permissions found but user is logged in, fetch current user data
    else if (typeof getCurrentUser === "function") {
      getCurrentUser()
        .then((userData) => {
          if (userData && userData.permissions) {
            // Store the permissions
            if (typeof setUserPermissions === "function") {
              setUserPermissions(userData.permissions);
            } else {
              localStorage.setItem(
                "userPermissions",
                JSON.stringify(userData.permissions)
              );
            }

            // Rerun this function to apply the permissions
            checkUserPermissions();
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
        });
    }
  }
}

// Initialize everything on DOM loaded
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded");

  // Check user permissions on page load
  checkUserPermissions();

  // Initialize WebSocket connection for real-time notifications
  initWebSocketConnection();

  // Create cart notification
  createCartNotification();

  // Initialize bottom nav click events
  initBottomNav();

  // Initialize sidebar
  initSidebar();

  // Initialize theme toggle
  initThemeToggle();

  // Initialize content section toggle
  initContentSectionToggle();

  // Check and set active sidebar item based on current URL
  checkActiveSidebarItem();

  // Restore active sidebar item on page load
  restoreActiveSidebarItem();

  // Handle table number from URL (for QR code scans)
  checkForTableNumber();

  // Initialize cart count from localStorage
  function initializeCartCount() {
    cartCountElement = document.querySelector(".cart-count");
    cartCount = 0;

    const savedCartItems = localStorage.getItem("cartItems");
    if (savedCartItems) {
      try {
        const cartItems = JSON.parse(savedCartItems);
        cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      } catch (error) {
        console.error("Error initializing cart count:", error);
        cartCount = 0;
      }
    }

    if (cartCountElement) {
      cartCountElement.textContent = cartCount;
      cartCountElement.style.display = cartCount > 0 ? "flex" : "none";
    }

    // Store initial cart count in localStorage
    localStorage.setItem("cartCount", cartCount);
  }

  // Call initialization
  initializeCartCount();

  // Listen for storage events
  window.addEventListener("storage", function (e) {
    if (e.key === "cartItems") {
      updateCartCountFromStorage();
    }
  });

  // Listen for custom cart change event
  window.addEventListener("digital_menu_cart_change", function () {
    updateCartCountFromStorage();
  });

  // Load categories dynamically from API or localStorage
  loadCategories();

  // Load products dynamically from API or localStorage
  loadProducts();

  // Initialize offer category filters
  initOfferCategoryFilters();

  // Listen for changes in localStorage (like when the cart page updates the cart)
  window.addEventListener("storage", function (e) {
    if (e.key === "menuItems" || e.key === "original_prices") {
      console.log("Storage event detected for menu items, refreshing products");
      loadProducts();
    }

    // Handle cross-tab discount change event
    if (e.key === "discount_change_event") {
      loadProducts();
    }

    // Handle category changes
    if (e.key === "categories") {
      console.log("Categories updated, reloading category filters");
      loadCategories();
    }

    // Handle cross-tab cart change event
    if (e.key === "cart_change_event") {
      updateCartCountFromStorage();
    }

    // Handle auth state changes from other tabs
    if (e.key === "token" || e.key === "userPermissions") {
      checkUserPermissions();
    }
  });

  // Listen for custom discount change event
  window.addEventListener("digital_menu_discount_change", function () {
    loadProducts();
  });

  // Listen for custom product change event
  window.addEventListener("digital_menu_product_change", function (event) {
    console.log("Product change event received:", event.detail);
    loadProducts();
  });

  // Function to initialize content section toggle
  function initContentSectionToggle() {
    const menuLink = document.querySelector(".menu-section-link");
    const reservationLink = document.querySelector(".reservation-section-link");
    const offersLink = document.querySelector(".offers-section-link");
    const previousOrdersLink = document.querySelector(
      ".previous-orders-section-link"
    );

    const menuSection = document.getElementById("menu-section");
    const reservationSection = document.getElementById("reservation-section");
    const offersSection = document.getElementById("offers-section");
    const previousOrdersSection = document.getElementById(
      "previous-orders-section"
    );

    // Hide previous orders section by default
    if (previousOrdersSection) {
      previousOrdersSection.style.display = "none";
      previousOrdersSection.classList.remove("active");
    }

    // Restore active section from localStorage only (for better persistence)
    const activeSection = localStorage.getItem("activeSection");

    if (activeSection) {
      hideAllSections();

      // Mark all sidebar items as not active first
      document.querySelectorAll(".sidebar-item").forEach((item) => {
        item.classList.remove("active");
      });

      // Activate the appropriate section based on stored value
      if (activeSection === "menu" && menuSection) {
        menuSection.classList.add("active");

        const menuItem = document
          .querySelector(".menu-section-link")
          .closest(".sidebar-item");
        if (menuItem) {
          menuItem.classList.add("active");
        }
      } else if (activeSection === "reservation" && reservationSection) {
        reservationSection.classList.add("active");

        const reservationItem = document
          .querySelector(".reservation-section-link")
          .closest(".sidebar-item");
        if (reservationItem) {
          reservationItem.classList.add("active");
        }
      } else if (activeSection === "offers" && offersSection) {
        offersSection.classList.add("active");

        const offersItem = document
          .querySelector(".offers-section-link")
          .closest(".sidebar-item");
        if (offersItem) {
          offersItem.classList.add("active");

          // Reload offers data to ensure latest offers are shown
          loadOffers();
        }
      } else if (activeSection === "previousOrders" && previousOrdersSection) {
        // Make previous orders section visible when it's the active section
        previousOrdersSection.style.display = "block";
        previousOrdersSection.classList.add("active");

        const previousOrdersItem = document
          .querySelector(".previous-orders-section-link")
          .closest(".sidebar-item");
        if (previousOrdersItem) {
          previousOrdersItem.classList.add("active");

          // Load previous orders when section is active
          loadPreviousOrders();
        }
      }
    } else {
      // If no active section is stored, set menu section as default
      hideAllSections();

      if (menuSection) {
        menuSection.classList.add("active");

        const menuItem = document
          .querySelector(".menu-section-link")
          .closest(".sidebar-item");
        if (menuItem) {
          menuItem.classList.add("active");

          // Save active section to localStorage only
          localStorage.setItem("activeSection", "menu");

          // Also save the sidebar item index
          const sidebarItems = document.querySelectorAll(".sidebar-item");
          const itemIndex = Array.from(sidebarItems).indexOf(menuItem);
          localStorage.setItem("activeSidebarItemIndex", itemIndex);
        }
      }
    }

    // Handle menu link click
    if (menuLink) {
      menuLink.addEventListener("click", function (e) {
        e.preventDefault();

        hideAllSections();
        menuSection.classList.add("active");

        // Update sidebar active item
        document.querySelectorAll(".sidebar-item").forEach((item) => {
          item.classList.remove("active");
        });

        const menuItem = this.closest(".sidebar-item");
        menuItem.classList.add("active");

        // Save active section to localStorage only
        localStorage.setItem("activeSection", "menu");

        // Also save the sidebar item index
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const itemIndex = Array.from(sidebarItems).indexOf(menuItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      });
    }

    // Handle offers link click
    if (offersLink) {
      offersLink.addEventListener("click", function (e) {
        e.preventDefault();

        hideAllSections();
        offersSection.classList.add("active");

        // Update sidebar active item
        document.querySelectorAll(".sidebar-item").forEach((item) => {
          item.classList.remove("active");
        });

        const offersItem = this.closest(".sidebar-item");
        offersItem.classList.add("active");

        // Save active section to localStorage only
        localStorage.setItem("activeSection", "offers");

        // Also save the sidebar item index
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const itemIndex = Array.from(sidebarItems).indexOf(offersItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);

        // Reload offers data to ensure latest offers are shown
        loadOffers();
      });
    }

    // Handle reservation link click
    if (reservationLink) {
      reservationLink.addEventListener("click", function (e) {
        e.preventDefault();

        hideAllSections();
        reservationSection.classList.add("active");

        // Update sidebar active item
        document.querySelectorAll(".sidebar-item").forEach((item) => {
          item.classList.remove("active");
        });

        const reservationItem = this.closest(".sidebar-item");
        reservationItem.classList.add("active");

        // Save active section to localStorage only
        localStorage.setItem("activeSection", "reservation");

        // Also save the sidebar item index
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const itemIndex = Array.from(sidebarItems).indexOf(reservationItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);
      });
    }

    // Handle previous orders link click
    if (previousOrdersLink) {
      previousOrdersLink.addEventListener("click", function (e) {
        e.preventDefault();

        hideAllSections();

        // Make previous orders section visible when clicked
        if (previousOrdersSection) {
          previousOrdersSection.style.display = "block";
          previousOrdersSection.classList.add("active");
        }

        // Update sidebar active item
        document.querySelectorAll(".sidebar-item").forEach((item) => {
          item.classList.remove("active");
        });

        const previousOrdersItem = this.closest(".sidebar-item");
        previousOrdersItem.classList.add("active");

        // Save active section to localStorage only
        localStorage.setItem("activeSection", "previousOrders");

        // Also save the sidebar item index
        const sidebarItems = document.querySelectorAll(".sidebar-item");
        const itemIndex = Array.from(sidebarItems).indexOf(previousOrdersItem);
        localStorage.setItem("activeSidebarItemIndex", itemIndex);

        // Load previous orders data
        loadPreviousOrders();
      });
    }
  }

  // Function to hide all content sections
  function hideAllSections() {
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");

      // Hide previous orders section specifically
      if (section.id === "previous-orders-section") {
        section.style.display = "none";
      }
    });
  }

  // Function to initialize offer category filters
  function initOfferCategoryFilters() {
    const offerCategories = document.querySelectorAll(".offer-category");

    offerCategories.forEach((category) => {
      category.addEventListener("click", function () {
        // Update active class
        offerCategories.forEach((cat) => cat.classList.remove("active"));
        this.classList.add("active");

        // Filter offers
        const selectedCategory = this.getAttribute("data-offer-category");
        const offerCards = document.querySelectorAll(".offer-card");

        // Show all if "all" category is selected
        if (selectedCategory === "all") {
          offerCards.forEach((card) => {
            card.style.display = "block";
          });
        } else {
          // Filter by category
          offerCards.forEach((card) => {
            if (card.getAttribute("data-offer-category") === selectedCategory) {
              card.style.display = "block";
            } else {
              card.style.display = "none";
            }
          });
        }
      });
    });
  }

  // Helper function to add event listeners to offer cards
  // This needs to be called both for initial static cards and after dynamic loading
  function addOfferCardEventListeners() {
    // Add to cart functionality for offer cards
    const addToCartOfferButtons =
      document.querySelectorAll(".add-to-cart-offer");
    addToCartOfferButtons.forEach((button) => {
      // Only add event listener if not already added
      if (!button.hasAttribute("data-event-added")) {
        button.setAttribute("data-event-added", "true");
        button.addEventListener("click", function () {
          // Get offer data from button attributes
          const nameAr = this.getAttribute("data-name-ar");
          const nameEn = this.getAttribute("data-name-en");
          const price = this.getAttribute("data-price");
          const image = this.getAttribute("data-image");
          const offerId = this.getAttribute("data-offer-id");

          // Add to cart using bilingual offer function
          addOfferToCart("offer-" + offerId, nameAr, nameEn, price, image);

          // Update cart count
          const savedCartItems = localStorage.getItem("cartItems");
          if (savedCartItems) {
            try {
              const cartItems = JSON.parse(savedCartItems);
              cartCount = cartItems.reduce(
                (sum, item) => sum + item.quantity,
                0
              );
              if (cartCountElement) {
                cartCountElement.textContent = cartCount;
                cartCountElement.style.display =
                  cartCount > 0 ? "flex" : "none";
              }
            } catch (error) {
              console.error("Error updating cart count:", error);
            }
          }

          // Show notification
          showCartNotification();

          // Visual feedback
          button.classList.add("clicked");
          setTimeout(() => {
            button.classList.remove("clicked");
          }, 300);
        });
      }
    });

    // Add to cart for main offer banner
    const mainOfferButton = document.querySelector(".offer-btn");
    if (mainOfferButton) {
      // Only add event listener if not already added
      if (!mainOfferButton.hasAttribute("data-event-added")) {
        mainOfferButton.setAttribute("data-event-added", "true");
        mainOfferButton.addEventListener("click", function () {
          // Get offer data from button attributes
          const nameAr = this.getAttribute("data-name-ar");
          const nameEn = this.getAttribute("data-name-en");
          const price = this.getAttribute("data-price");
          const image = this.getAttribute("data-image");
          const offerId = this.getAttribute("data-offer-id");

          // Add to cart using bilingual offer function
          addOfferToCart(
            "offer-featured-" + offerId,
            nameAr,
            nameEn,
            price,
            image
          );

          // Update cart count
          const savedCartItems = localStorage.getItem("cartItems");
          if (savedCartItems) {
            try {
              const cartItems = JSON.parse(savedCartItems);
              cartCount = cartItems.reduce(
                (sum, item) => sum + item.quantity,
                0
              );
              if (cartCountElement) {
                cartCountElement.textContent = cartCount;
                cartCountElement.style.display =
                  cartCount > 0 ? "flex" : "none";
              }
            } catch (error) {
              console.error("Error updating cart count:", error);
            }
          }

          // Show notification
          showCartNotification();
        });
      }
    }
  }

  // Function to fetch free items from API
  async function loadFreeItems() {
    console.log("🔄 Loading free items data from API...");
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/customer/loyalty/free-items`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          freeItemsData = result.data;
          console.log("✅ Loaded free items successfully:", freeItemsData);
          console.log(`   Total free items: ${freeItemsData.length}`);
          freeItemsData.forEach((item) => {
            console.log(
              `   - Product ID: ${item.productId}, Points Required: ${item.pointsRequired}`
            );
          });
        } else {
          console.warn("⚠️ Free items API returned unexpected format:", result);
        }
      } else {
        console.error("❌ Failed to load free items, status:", response.status);
      }
    } catch (error) {
      console.error("❌ Error fetching free items:", error);
    }
  }

  // Function to fetch user loyalty points
  async function loadUserPoints() {
    try {
      // Check if user is logged in
      if (typeof isLoggedIn === "function" && isLoggedIn()) {
        const token =
          typeof getToken === "function"
            ? getToken()
            : localStorage.getItem("token");

        if (token) {
          const response = await fetch(
            `${API_BASE_URL}/api/customer/loyalty-points`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              userLoyaltyPoints = result.data.loyaltyPoints || 0;
              console.log("User loyalty points:", userLoyaltyPoints);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user points:", error);
    }
  }

  // Function to load products from API
  async function loadProducts() {
    const productGrid = document.querySelector(".product-grid");
    console.log("Starting to load products...");

    // Show loading spinner
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="loading-spinner" id="products-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p>${getTranslation("loadingProducts")}</p>
        </div>
      `;
    }

    // Load free items and user points in parallel
    await Promise.all([loadFreeItems(), loadUserPoints()]);

    try {
      console.log("Attempting to fetch products from API...");
      // Try to fetch products from API
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("API Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("API Response:", result);

        if (result.success && result.data && result.data.length > 0) {
          console.log(`Loaded ${result.data.length} products from API`);
          console.log("First product:", result.data[0]);

          // Store all product images in sessionStorage right after they're fetched
          try {
            const productImages = JSON.parse(
              sessionStorage.getItem("productImages") || "{}"
            );
            let updated = false;

            result.data.forEach((product) => {
              if (product.id && product.image && !productImages[product.id]) {
                productImages[product.id] = product.image;
                updated = true;
              }
            });

            if (updated) {
              sessionStorage.setItem(
                "productImages",
                JSON.stringify(productImages)
              );
              console.log(
                "Stored product images from API in sessionStorage for rating use"
              );
            }
          } catch (err) {
            console.error("Error storing product images from API:", err);
          }

          // Render the products
          renderProducts(result.data);
          return;
        } else {
          console.warn("API returned no products or invalid response format");
          console.warn("Response:", result);
          showEmptyProductsMessage();
        }
      } else {
        console.warn(`API request failed with status: ${response.status}`);
        const errorText = await response.text();
        console.warn("Error response:", errorText);
        showEmptyProductsMessage();
      }
    } catch (error) {
      console.error("Error fetching products from API:", error);
      showEmptyProductsMessage();
    }
  }

  // Removed createDefaultProducts function - no longer needed

  // Helper function to show empty products message
  function showEmptyProductsMessage() {
    const productGrid = document.querySelector(".product-grid");
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-utensils"></i>
          <p>${getTranslation("noProductsAvailable")}</p>
        </div>
      `;
    }
  }

  // Function to check if a URL is a data URL
  function isDataUrl(url) {
    return url && url.startsWith("data:");
  }

  // Function to render products
  function renderProducts(products) {
    const productGrid = document.querySelector(".product-grid");
    if (!productGrid || !products || products.length === 0) return;

    // Store product images and names in sessionStorage for later use
    try {
      const productImages = JSON.parse(
        sessionStorage.getItem("productImages") || "{}"
      );
      const productNames = JSON.parse(
        sessionStorage.getItem("productNames") || "{}"
      );
      let updated = false;

      products.forEach((product) => {
        if (product.id && product.image && !productImages[product.id]) {
          productImages[product.id] = product.image;
          updated = true;
          console.log(`Stored product image in sessionStorage: ${product.id}`);
        }
        if (product.id) {
          const existing = productNames[product.id] || {};
          const next = {
            ...existing,
            _id: product._id || existing._id || "", // Store MongoDB _id for matching with free items
            name: product.name,
            nameEn: product.nameEn || existing.nameEn || "",
            description: product.description,
            descriptionEn:
              product.descriptionEn || existing.descriptionEn || "",
          };
          const changed =
            !existing ||
            existing._id !== next._id ||
            existing.name !== next.name ||
            existing.nameEn !== next.nameEn ||
            existing.description !== next.description ||
            existing.descriptionEn !== next.descriptionEn;
          if (changed) {
            productNames[product.id] = next;
            updated = true;
          }
        }
      });

      if (updated) {
        sessionStorage.setItem("productImages", JSON.stringify(productImages));
        sessionStorage.setItem("productNames", JSON.stringify(productNames));
        console.log("Updated product images in sessionStorage for rating use");
      }
    } catch (error) {
      console.error("Error storing product images in sessionStorage:", error);
    }

    // Clear current products
    productGrid.innerHTML = "";

    // Create product cards
    products.forEach((product) => {
      const currentLang = localStorage.getItem("public-language") || "ar";
      const displayName =
        currentLang === "en" && product.nameEn ? product.nameEn : product.name;
      const displayDescription =
        currentLang === "en" && product.descriptionEn
          ? product.descriptionEn
          : product.description;
      // Use product rating from database only
      const displayRating = product.rating || 0;

      const productCard = document.createElement("div");
      productCard.className = "product-card";
      productCard.setAttribute("data-product-id", product.id);
      productCard.setAttribute("data-category", product.category);
      productCard.setAttribute("data-name-ar", product.name);
      productCard.setAttribute("data-name-en", product.nameEn || product.name);
      productCard.setAttribute("data-desc-ar", product.description);
      productCard.setAttribute(
        "data-desc-en",
        product.descriptionEn || product.description
      );

      // Make sure image URL is correctly handled (especially for data URLs)
      const imageUrl = product.image || "";
      // Don't pass data URLs through the server
      const imageHtml = isDataUrl(imageUrl)
        ? `<img src="${imageUrl}" alt="${displayName}" />`
        : `<img src="${imageUrl}" alt="${displayName}" onerror="this.onerror=null; this.src='/public/images/placeholder.svg';" />`;

      const hasDiscount =
        typeof product.discountPercentage === "number" &&
        product.discountPercentage > 0;
      const discountLabel = hasDiscount
        ? `<span class="discount-badge ${
            product.discountPercentage >= 30 ? "high-discount" : ""
          }">-${product.discountPercentage}%</span>`
        : "";

      // Check if this product is a free item and user has enough points
      let freeBadgeHtml = "";
      let priceHtml = "";
      let actualPrice = product.price;
      const freeItem = freeItemsData.find(
        (item) =>
          item.productId === product.id || item.productId === product._id
      );

      if (freeItem && userLoyaltyPoints >= freeItem.pointsRequired) {
        // User has enough points - show free badge and change price
        actualPrice = 0; // Set actual price to 0
        const badgeText = currentLang === "en" ? "FREE" : "مجاني";
        freeBadgeHtml = `<div class="free-item-badge"><i class="fas fa-gift"></i> ${badgeText}</div>`;

        // Change price to show "Free for X points"
        const freeText =
          currentLang === "en"
            ? `Free for ${freeItem.pointsRequired} points`
            : `مجاني مقابل ${freeItem.pointsRequired} نقطة`;
        priceHtml = `<span class="price free-price"><i class="fas fa-gift"></i> ${freeText}</span>`;
      } else {
        // Normal price display with currency
        const currencyText =
          typeof getCurrencyText === "function"
            ? getCurrencyText()
            : currentLang === "en"
            ? "EGP"
            : "جنيه";

        // Extract numeric value from price (in case it contains currency text)
        const numericPrice =
          typeof product.price === "string"
            ? parseFloat(product.price.toString().replace(/[^\d.]/g, ""))
            : parseFloat(product.price);
        const numericOriginalPrice =
          typeof product.originalPrice === "string"
            ? parseFloat(
                product.originalPrice.toString().replace(/[^\d.]/g, "")
              )
            : parseFloat(product.originalPrice);

        priceHtml = hasDiscount
          ? `<div class="price discounted-price">
              <span class="current-price">${numericPrice.toFixed(
                2
              )} ${currencyText}</span>
              <span class="original-price">${numericOriginalPrice.toFixed(
                2
              )} ${currencyText}</span>
            </div>`
          : `<span class="price">${numericPrice.toFixed(
              2
            )} ${currencyText}</span>`;
      }

      // Generate HTML for the product card
      productCard.innerHTML = `
        ${freeBadgeHtml}
        <div class="product-image">
          ${imageHtml}
          <div class="rating ${displayRating === 0 ? "rating-zero" : ""}">
              <i class="fas fa-star"></i>
            <span>${displayRating}</span>
            </div>
          </div>
        <div class="product-info">
          <h3 class="product-name">${displayName} ${discountLabel}</h3>
          <p class="product-description">${displayDescription}</p>
          <div class="product-footer">
            ${priceHtml}
            <button class="add-to-cart" data-product-id="${product.id}" 
                  data-product-name="${escapeJsString(displayName)}" 
                  data-product-price="${actualPrice}" 
                  data-product-image="${escapeJsString(imageUrl)}" 
                  data-product-description="${escapeJsString(
                    displayDescription
                  )}">
              <i class="fas fa-shopping-cart"></i>
          </button>
          </div>
        </div>
      `;

      // Add the product card to the grid
      productGrid.appendChild(productCard);
    });

    // Add event listeners to the add to cart buttons
    document.querySelectorAll(".add-to-cart").forEach((button) => {
      button.addEventListener("click", function () {
        const productId = this.getAttribute("data-product-id");
        const productName = this.getAttribute("data-product-name");
        const productPrice = parseFloat(
          this.getAttribute("data-product-price")
        );
        const productImage = this.getAttribute("data-product-image");
        const productDescription = this.getAttribute(
          "data-product-description"
        );

        checkProductAddons(
          productId,
          productName,
          productPrice,
          productImage,
          productDescription
        );
      });
    });

    // Initialize product functionality
    initProductRating();
    loadRatingsFromDatabase();
    initQuantityControls();
  }

  // Fast update products language without reloading from API
  function updateProductsLanguage(lang) {
    const productCards = document.querySelectorAll(".product-card");

    productCards.forEach((card) => {
      const nameAr = card.getAttribute("data-name-ar");
      const nameEn = card.getAttribute("data-name-en");
      const descAr = card.getAttribute("data-desc-ar");
      const descEn = card.getAttribute("data-desc-en");

      const nameElement = card.querySelector(".product-name");
      const descElement = card.querySelector(".product-description");
      const addToCartBtn = card.querySelector(".add-to-cart");

      if (nameElement && nameAr && nameEn) {
        const displayName = lang === "en" ? nameEn : nameAr;
        nameElement.textContent = displayName;

        // Update button data attributes
        if (addToCartBtn) {
          addToCartBtn.setAttribute("data-product-name", displayName);
        }
      }

      if (descElement && descAr && descEn) {
        const displayDesc = lang === "en" ? descEn : descAr;
        descElement.textContent = displayDesc;

        // Update button data attributes
        if (addToCartBtn) {
          addToCartBtn.setAttribute("data-product-description", displayDesc);
        }
      }
    });
  }

  // Function to check if product has add-ons and show modal if needed
  async function checkProductAddons(id, name, price, image, description) {
    try {
      console.log(`Checking add-ons for product: ${id}`);

      // Try to fetch product details from API
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);

        if (response.ok) {
          const result = await response.json();
          console.log("Product details API response:", result);

          if (result.success && result.data) {
            const product = result.data;

            // Store the product _id in sessionStorage for later matching with free items
            if (product._id && product.id) {
              try {
                const namesMap = JSON.parse(
                  sessionStorage.getItem("productNames") || "{}"
                );
                if (!namesMap[product.id]) {
                  namesMap[product.id] = {};
                }
                namesMap[product.id]._id = product._id;
                namesMap[product.id].name =
                  product.name || namesMap[product.id].name || "";
                namesMap[product.id].nameEn =
                  product.nameEn || namesMap[product.id].nameEn || "";
                sessionStorage.setItem(
                  "productNames",
                  JSON.stringify(namesMap)
                );
                console.log(
                  `Stored product _id for ${product.id}: ${product._id}`
                );
              } catch (e) {
                console.warn("Could not store product _id:", e);
              }
            }

            // Check if product has add-ons
            if (
              product.addOns &&
              product.addOns.length > 0 &&
              product.addOns.some(
                (section) => section.options && section.options.length > 0
              )
            ) {
              console.log(
                `Found ${product.addOns.length} add-on sections for ${id}`
              );
              // Show add-ons modal with the product data and corrected price
              showAddonsModal(product, image, price);
              return;
            } else {
              console.log(`No add-ons found for product ${id} from API`);
            }
          }
        } else {
          console.warn(`API returned ${response.status} for product ${id}`);
        }
      } catch (apiError) {
        console.warn("Error fetching product from API:", apiError);
      }

      // If we get here, product has no add-ons, add directly to cart
      console.log(`No add-ons for ${id}, adding directly to cart`);
      addToCart(id, name, price, image);
      showCartNotification();
    } catch (error) {
      console.error("Error in checkProductAddons:", error);
      // Fallback: add to cart directly without add-ons
      addToCart(id, name, price, image);
      showCartNotification();
    }
  }

  // Function to show add-ons modal
  function showAddonsModal(product, imageUrl, overridePrice) {
    console.log("Opening add-ons modal for:", product);
    console.log("Override price:", overridePrice);

    // Get modal elements
    const addonsOverlay = document.getElementById("addons-overlay");
    const addonsModal = document.getElementById("addons-modal");
    const closeBtn = document.getElementById("close-addons-modal");
    const productImage = document.getElementById("product-image-preview");
    const productName = document.getElementById("product-name-preview");
    const productDescription = document.getElementById(
      "product-description-preview"
    );
    const productPrice = document.getElementById("product-price-preview");
    const addonsContent = document.getElementById("addons-content");
    const decreaseBtn = document.getElementById("decrease-quantity");
    const increaseBtn = document.getElementById("increase-quantity");
    const quantityValue = document.getElementById("quantity-value");
    const totalPrice = document.getElementById("addon-total-price");
    const addToCartBtn = document.getElementById("add-to-cart-with-addons");
    const errorMessage = document.getElementById("addons-error-message");

    if (!addonsOverlay || !addonsModal) {
      console.error("Add-ons modal elements not found in the DOM");
      return;
    }

    // Reset the modal
    addonsContent.innerHTML = "";
    quantityValue.textContent = "1";
    errorMessage.classList.remove("show");

    // Handle data URLs properly - set as backgroundImage only if it's not a data URL
    if (isDataUrl(imageUrl)) {
      // For data URLs, we'll create an image element instead of using background-image
      productImage.style.backgroundImage = "";
      // Create an image element for the data URL
      const imgElement = document.createElement("img");
      imgElement.src = imageUrl;
      imgElement.alt = product.name;
      imgElement.style.width = "100%";
      imgElement.style.height = "100%";
      imgElement.style.objectFit = "cover";
      imgElement.style.borderRadius = "inherit";
      // Remove any existing elements
      while (productImage.firstChild) {
        productImage.removeChild(productImage.firstChild);
      }
      productImage.appendChild(imgElement);
    } else {
      // For regular URLs, use background-image
      productImage.style.backgroundImage = `url(${imageUrl})`;
      // Remove any existing elements
      while (productImage.firstChild) {
        productImage.removeChild(productImage.firstChild);
      }
    }

    // Add wave element
    const waveElement = document.createElement("div");
    waveElement.classList.add("product-image-wave");
    productImage.appendChild(waveElement);

    // Add product image badge
    const categoryBadge = document.createElement("div");
    categoryBadge.classList.add("product-image-badge");

    // Display category as the badge text
    if (product.category) {
      const lang = localStorage.getItem("public-language") || "ar";
      const categoryNames = {
        pizza: lang === "en" ? "Pizza" : "بيتزا",
        burger: lang === "en" ? "Burger" : "برجر",
        sandwich: lang === "en" ? "Sandwich" : "ساندويتش",
        drink: lang === "en" ? "Drinks" : "مشروبات",
        dessert: lang === "en" ? "Desserts" : "حلويات",
      };

      categoryBadge.textContent =
        categoryNames[product.category] || product.category;
      productImage.appendChild(categoryBadge);
    }

    const modalLang = localStorage.getItem("public-language") || "ar";
    const modalDisplayName =
      modalLang === "en" && product.nameEn ? product.nameEn : product.name;
    const modalDisplayDesc =
      modalLang === "en" && product.descriptionEn
        ? product.descriptionEn
        : product.description || "";
    productName.textContent = modalDisplayName;
    productDescription.textContent = modalDisplayDesc;

    // Use override price if provided, otherwise check if this is a free item
    let actualPrice;
    let freeItem = freeItemsData.find(
      (item) => item.productId === product.id || item.productId === product._id
    );

    if (overridePrice !== undefined) {
      actualPrice = parseFloat(overridePrice);
    } else {
      const isFreeItem =
        freeItem && userLoyaltyPoints >= freeItem.pointsRequired;
      actualPrice = isFreeItem ? 0 : product.price;
    }

    const isFreeItem = actualPrice === 0;

    if (isFreeItem && freeItem) {
      const freeText =
        modalLang === "en"
          ? `Free for ${freeItem.pointsRequired} points`
          : `مجاني مقابل ${freeItem.pointsRequired} نقطة`;
      productPrice.innerHTML = `<span class="free-price"><i class="fas fa-gift"></i> ${freeText}</span>`;
    } else if (isFreeItem) {
      // Free but no freeItem data (shouldn't happen, but handle it)
      const freeText = modalLang === "en" ? "FREE" : "مجاني";
      productPrice.innerHTML = `<span class="free-price"><i class="fas fa-gift"></i> ${freeText}</span>`;
    } else {
      const currencyText =
        typeof getCurrencyText === "function"
          ? getCurrencyText()
          : modalLang === "en"
          ? "EGP"
          : "جنية";
      productPrice.textContent = `${product.price.toFixed(2)} ${currencyText}`;
    }

    // Track current selections and total price
    let currentSelections = {};
    let currentQuantity = 1;

    // Store product information
    addonsModal.dataset.productId = product.id;
    addonsModal.dataset.productName = modalDisplayName;
    addonsModal.dataset.productPrice = actualPrice;
    addonsModal.dataset.productImage = imageUrl;
    addonsModal.dataset.isFreeItem = isFreeItem ? "true" : "false";

    console.log(
      `Modal data stored - Price: ${actualPrice}, IsFree: ${isFreeItem}`
    );

    // Calculate and update the total price
    function updateTotalPrice() {
      let total = actualPrice * currentQuantity;

      // Add price of selected add-ons
      for (const sectionId in currentSelections) {
        const section = product.addOns.find((s) => s.title === sectionId);
        if (section) {
          const selectedOptions = currentSelections[sectionId];
          if (section.singleChoice) {
            // Single selection (radio style)
            const option = section.options.find(
              (o) => o.name === selectedOptions
            );
            if (option) {
              total += option.price * currentQuantity;
            }
          } else {
            // Multiple selection (checkbox style)
            if (Array.isArray(selectedOptions)) {
              selectedOptions.forEach((optionName) => {
                const option = section.options.find(
                  (o) => o.name === optionName
                );
                if (option) {
                  total += option.price * currentQuantity;
                }
              });
            }
          }
        }
      }

      const currencyText =
        typeof getCurrencyText === "function"
          ? getCurrencyText()
          : modalLang === "en"
          ? "EGP"
          : "جنية";
      totalPrice.textContent = `${total.toFixed(2)} ${currencyText}`;
      return total;
    }

    // Create add-on sections with staggered animation
    if (product.addOns && product.addOns.length > 0) {
      product.addOns.forEach((section, sectionIndex) => {
        // Skip sections with no options
        if (!section.options || section.options.length === 0) {
          console.log(`Skipping section ${section.title} with no options`);
          return;
        }

        const sectionContainer = document.createElement("div");
        sectionContainer.classList.add("addon-section-container");
        sectionContainer.dataset.sectionId = section.title;

        // Set animation sequence index
        sectionContainer.style.setProperty("--index", sectionIndex);

        // Create section title
        const sectionTitle = document.createElement("div");
        sectionTitle.classList.add("addon-section-title");

        // Add section name and required badge if needed
        const lang = localStorage.getItem("public-language") || "ar";
        const sectionDisplayTitle =
          lang === "en" && section.titleEn ? section.titleEn : section.title;
        const requiredText = lang === "en" ? "Required" : "مطلوب";
        sectionTitle.innerHTML = `
          <div class="addon-section-name">${sectionDisplayTitle}</div>
          ${
            section.required
              ? `<span class="required-badge">${requiredText}</span>`
              : ""
          }
        `;

        sectionContainer.appendChild(sectionTitle);

        // Create options list
        const optionsList = document.createElement("div");
        optionsList.classList.add("addon-options-list");

        // Set up the selection structure for this section
        if (section.singleChoice) {
          // Initialize with empty selection for single-choice sections
          // Only pre-select first option if the section is required
          currentSelections[section.title] =
            section.required && section.options.length > 0
              ? section.options[0].name // Pre-select first option only if required
              : "";
        } else {
          // Initialize empty array for multi-select sections
          currentSelections[section.title] = [];
        }

        // Create options
        section.options.forEach((option, optionIndex) => {
          const optionItem = document.createElement("div");
          optionItem.classList.add("addon-option-item");
          // Stagger animations for option items
          optionItem.style.animationDelay = `${
            0.1 + sectionIndex * 0.08 + optionIndex * 0.04
          }s`;

          // Determine if this is a radio (single choice) or checkbox (multiple allowed)
          const inputType = section.singleChoice ? "radio" : "checkbox";
          const inputName = `addon-section-${sectionIndex}`;
          const inputId = `addon-option-${sectionIndex}-${optionIndex}`;

          // Pre-select the first option if the section is single-choice AND required
          const isChecked =
            section.singleChoice && section.required && optionIndex === 0;

          // Create the HTML content
          const optionDisplayName =
            lang === "en" && option.nameEn ? option.nameEn : option.name;
          optionItem.innerHTML = `
            <input type="${inputType}" id="${inputId}" 
              name="${inputName}" class="addon-option-radio" 
              value="${option.name}" ${isChecked ? "checked" : ""}>
            <label for="${inputId}" class="addon-option-label">
              <div class="addon-option-checkbox"></div>
              <div class="addon-option-name">${optionDisplayName}</div>
            </label>
            ${
              option.price > 0
                ? `<div class="addon-option-price">+${option.price.toFixed(
                    2
                  )}</div>`
                : ""
            }
          `;

          optionsList.appendChild(optionItem);

          // Get the input element
          const inputElement = optionItem.querySelector(`#${inputId}`);

          // For non-required single-choice sections, support deselection
          if (section.singleChoice && !section.required) {
            // Store the current selection state for reference
            optionItem.addEventListener(
              "click",
              (e) => {
                // Only handle deselection if our radio is already selected
                if (
                  inputElement.checked &&
                  currentSelections[section.title] === option.name
                ) {
                  e.preventDefault();
                  e.stopPropagation(); // Prevent other handlers

                  // Deselect the radio button
                  inputElement.checked = false;
                  currentSelections[section.title] = "";
                  sectionContainer.dataset.selected = "false";

                  // Visual feedback for deselection
                  optionItem.classList.add("option-removed");
                  setTimeout(() => {
                    optionItem.classList.remove("option-removed");
                  }, 300);

                  // Update price and validation
                  updateTotalPrice();
                  validateSelections();
                  return;
                }
              },
              true
            ); // Use capture phase to intercept before other handlers
          }

          // Regular change event for tracking selections
          inputElement.addEventListener("change", () => {
            // Add subtle visual feedback
            const allOptions =
              optionsList.querySelectorAll(".addon-option-item");
            allOptions.forEach((opt) => {
              opt.classList.remove("option-selecting");
            });

            // Add ripple effect to the clicked option
            optionItem.classList.add("option-selecting");
            setTimeout(() => {
              optionItem.classList.remove("option-selecting");
            }, 300);

            if (inputType === "radio") {
              // For radio buttons, simply store the selected value
              if (inputElement.checked) {
                currentSelections[section.title] = option.name;
                // Mark section as selected for validation styling
                sectionContainer.dataset.selected = "true";

                // Add visual feedback for section completion
                sectionContainer.classList.add("section-completed");
                setTimeout(() => {
                  sectionContainer.classList.remove("section-completed");
                }, 500);
              }
            } else {
              // For checkboxes, manage an array of selected values
              if (!Array.isArray(currentSelections[section.title])) {
                currentSelections[section.title] = [];
              }

              if (inputElement.checked) {
                // Add to selections
                currentSelections[section.title].push(option.name);
                // Add visual feedback
                optionItem.classList.add("option-added");
                setTimeout(() => {
                  optionItem.classList.remove("option-added");
                }, 300);
              } else {
                // Remove from selections
                currentSelections[section.title] = currentSelections[
                  section.title
                ].filter((name) => name !== option.name);
                // Add visual feedback
                optionItem.classList.add("option-removed");
                setTimeout(() => {
                  optionItem.classList.remove("option-removed");
                }, 300);
              }
            }

            // Update total price with animation
            const oldPrice = totalPrice.textContent;
            const newTotal = updateTotalPrice();
            if (parseFloat(oldPrice) !== newTotal) {
              totalPrice.classList.add("price-changing");
              setTimeout(() => {
                totalPrice.classList.remove("price-changing");
              }, 300);
            }

            // Check if all required fields are selected for enabling the Add to Cart button
            if (validateSelections()) {
              // If everything is valid, provide positive feedback
              addToCartBtn.classList.add("ready-pulse");
              setTimeout(() => {
                addToCartBtn.classList.remove("ready-pulse");
              }, 500);
            }
          });
        });

        sectionContainer.appendChild(optionsList);
        addonsContent.appendChild(sectionContainer);
      });
    } else {
      console.warn("No add-ons found for this product");
      const noAddonsMessage = document.createElement("div");
      noAddonsMessage.classList.add("no-addons-message");
      noAddonsMessage.innerHTML = `
        <i class="fas fa-info-circle"></i>
        <p>لا توجد إضافات متاحة لهذا المنتج</p>
      `;
      addonsContent.appendChild(noAddonsMessage);
    }

    // Function to validate if all required sections have selections
    function validateSelections() {
      const hasAllRequired = product.addOns
        .filter((section) => section.required)
        .every((section) => {
          const selection = currentSelections[section.title];
          if (section.singleChoice) {
            // For single-choice sections, we need a non-empty string
            return typeof selection === "string" && selection.trim() !== "";
          } else {
            // For multi-choice sections, we need a non-empty array
            return Array.isArray(selection) && selection.length > 0;
          }
        });

      // Enable/disable add to cart button
      addToCartBtn.disabled = !hasAllRequired;

      return hasAllRequired;
    }

    // Show the modal with animation
    // First make the overlay visible
    addonsOverlay.classList.add("active");

    // Make sure modal is initially at the bottom position
    addonsModal.style.transform = "translateY(100%)";
    addonsModal.style.opacity = "0";

    // Then animate it up
    setTimeout(() => {
      addonsModal.style.transform = "translateY(0)";
      addonsModal.style.opacity = "1";

      // Ensure modal is scrolled to top when opened
      addonsModal.scrollTop = 0;

      // Add a subtle entrance animation to the product image badge if present
      const badge = productImage.querySelector(".product-image-badge");
      if (badge) {
        badge.style.transform = "translateY(-10px)";
        setTimeout(() => {
          badge.style.transform = "translateY(0)";
        }, 300);
      }
    }, 50);

    // Update the initial total price
    updateTotalPrice();

    // Initial validation
    validateSelections();

    // Event listeners for modal controls

    // Close modal with smooth animation
    closeBtn.addEventListener("click", () => {
      // First animate the modal out
      addonsModal.style.transform = "translateY(100%)";
      addonsModal.style.opacity = "0";

      // Then hide the overlay
      setTimeout(() => {
        addonsOverlay.classList.remove("active");
        // Reset transform after animation completes
        setTimeout(() => {
          addonsModal.style.transform = "";
          addonsModal.style.opacity = "";
        }, 400);
      }, 300);
    });

    // Close when clicking overlay with smooth animation
    addonsOverlay.addEventListener("click", (e) => {
      if (e.target === addonsOverlay) {
        // First animate the modal out
        addonsModal.style.transform = "translateY(100%)";
        addonsModal.style.opacity = "0";

        // Then hide the overlay
        setTimeout(() => {
          addonsOverlay.classList.remove("active");
          // Reset transform after animation completes
          setTimeout(() => {
            addonsModal.style.transform = "";
            addonsModal.style.opacity = "";
          }, 400);
        }, 300);
      }
    });

    // Decrease quantity
    decreaseBtn.addEventListener("click", () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        quantityValue.textContent = currentQuantity;

        // Add a small animation effect
        quantityValue.style.transform = "scale(0.8)";
        setTimeout(() => {
          quantityValue.style.transform = "scale(1)";
        }, 100);

        updateTotalPrice();
      }
    });

    // Increase quantity
    increaseBtn.addEventListener("click", () => {
      currentQuantity++;
      quantityValue.textContent = currentQuantity;

      // Add a small animation effect
      quantityValue.style.transform = "scale(1.2)";
      setTimeout(() => {
        quantityValue.style.transform = "scale(1)";
      }, 100);

      updateTotalPrice();
    });

    // Add to cart with add-ons
    addToCartBtn.addEventListener("click", () => {
      // Validate required sections have selections
      if (!validateSelections()) {
        // Show error message
        errorMessage.classList.add("show");

        // Shake animation for error
        addToCartBtn.style.transform = "translateX(5px)";
        setTimeout(() => {
          addToCartBtn.style.transform = "translateX(-5px)";
          setTimeout(() => {
            addToCartBtn.style.transform = "translateX(0)";
          }, 100);
        }, 100);

        setTimeout(() => {
          errorMessage.classList.remove("show");
        }, 3000);
        return;
      }

      // Collect selected add-ons
      const selectedAddons = [];
      for (const sectionTitle in currentSelections) {
        const section = product.addOns.find((s) => s.title === sectionTitle);
        if (!section) continue;

        const selection = currentSelections[sectionTitle];
        // Skip sections with no selections
        if (
          !selection ||
          (typeof selection === "string" && selection.trim() === "") ||
          (Array.isArray(selection) && selection.length === 0)
        ) {
          continue;
        }

        const addonSection = {
          title: sectionTitle,
          titleEn: section.titleEn || "",
          required: section.required,
          singleChoice: section.singleChoice,
          options: [],
        };

        if (section.singleChoice) {
          // Single select (radio)
          const option = section.options.find((o) => o.name === selection);
          if (option) {
            addonSection.options.push({
              name: option.name,
              nameEn: option.nameEn || "",
              price: option.price,
            });
          }
        } else {
          // Multi-select (checkboxes)
          if (Array.isArray(selection)) {
            selection.forEach((optionName) => {
              const option = section.options.find((o) => o.name === optionName);
              if (option) {
                addonSection.options.push({
                  name: option.name,
                  nameEn: option.nameEn || "",
                  price: option.price,
                });
              }
            });
          }
        }

        if (addonSection.options.length > 0) {
          selectedAddons.push(addonSection);
        }
      }

      console.log("Selected add-ons:", selectedAddons);

      // Double-check if this is a free item before adding to cart
      const storedPrice = parseFloat(addonsModal.dataset.productPrice);
      const isFree = addonsModal.dataset.isFreeItem === "true";
      const finalBasePrice = isFree ? 0 : storedPrice;

      console.log(
        `Final verification - Stored: ${storedPrice}, IsFree: ${isFree}, Final: ${finalBasePrice}`
      );

      // Add to cart with the selected add-ons
      // Use finalBasePrice (0 for free items) instead of product.price
      addToCartWithAddons(
        product.id,
        product.name,
        finalBasePrice,
        imageUrl,
        currentQuantity,
        selectedAddons
      );

      console.log(`Added to cart with addons - basePrice: ${finalBasePrice}`);

      // Close the modal with smooth animation
      addonsModal.style.transform = "translateY(100%)";
      addonsModal.style.opacity = "0";

      // Then hide the overlay
      setTimeout(() => {
        addonsOverlay.classList.remove("active");
        // Reset transform after animation completes
        setTimeout(() => {
          addonsModal.style.transform = "";
          addonsModal.style.opacity = "";
        }, 400);
      }, 300);

      // Show notification
      showCartNotification();
    });
  }

  // Function to add item to cart with add-ons
  function addToCartWithAddons(id, name, basePrice, image, quantity, addons) {
    console.log("Adding to cart with addons:", {
      id,
      name,
      basePrice,
      image,
      quantity,
      addons,
    });

    try {
      // Get existing cart
      let cartItems = [];
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) {
        cartItems = JSON.parse(savedCart);
      }

      // Calculate total price with addons
      let totalAddonPrice = 0;
      let formattedAddons = [];

      // Format addons for storage and calculate additional price
      if (addons && addons.length > 0) {
        addons.forEach((section) => {
          // Process each section
          if (section.options && section.options.length > 0) {
            section.options.forEach((option) => {
              // Include all options in the section
              // The addons coming from the showAddonsModal function will only include selected options
              totalAddonPrice += parseFloat(option.price || 0);

              // Add to formatted addons list for display
              const formattedAddon = {
                name: section.title
                  ? `${section.title}: ${option.name}`
                  : option.name,
                nameEn:
                  section.titleEn || option.nameEn
                    ? `${section.titleEn ? section.titleEn + ": " : ""}${
                        option.nameEn || option.name
                      }`
                    : "",
                sectionTitle: section.title || "",
                sectionTitleEn: section.titleEn || "",
                optionName: option.name || "",
                optionNameEn: option.nameEn || "",
                price: parseFloat(option.price || 0),
              };

              formattedAddons.push(formattedAddon);
            });
          }
        });
      }

      // Calculate final item price
      const finalPrice = parseFloat(basePrice) + totalAddonPrice;
      console.log(
        `Final price with addons: basePrice=${basePrice}, addonPrice=${totalAddonPrice}, total=${finalPrice}`
      );

      // Generate a unique ID for the item with these specific addons
      const addonHash = generateAddonHash(addons);
      const uniqueId = id + "-" + addonHash;

      // Check if identical item already in cart
      const existingIndex = cartItems.findIndex((item) => item.id === uniqueId);

      if (existingIndex !== -1) {
        // Update existing item
        // Update price in case it changed (e.g., became free)
        if (cartItems[existingIndex].basePrice !== parseFloat(basePrice)) {
          cartItems[existingIndex].basePrice = parseFloat(basePrice);
          cartItems[existingIndex].price = finalPrice;
        }

        // Check if this is a free item and get required points
        let freeItem = freeItemsData.find(
          (item) =>
            item.productId === id ||
            item.productId.toLowerCase() === id.toLowerCase()
        );

        const isFreeItem = parseFloat(basePrice) === 0;
        const pointsRequired =
          isFreeItem && freeItem ? freeItem.pointsRequired : 0;

        // Update free item flag and points required
        cartItems[existingIndex].isFreeItem = isFreeItem;
        cartItems[existingIndex].pointsRequired = pointsRequired;

        cartItems[existingIndex].quantity += quantity;
      } else {
        // Get both language names from sessionStorage
        let nameAr = "";
        let nameEn = "";
        try {
          const namesMap = JSON.parse(
            sessionStorage.getItem("productNames") || "{}"
          );
          if (namesMap[id]) {
            // Always use the stored original names, not the passed display name
            nameAr = namesMap[id].name || "";
            nameEn = namesMap[id].nameEn || "";
          }
        } catch (e) {
          console.warn("Could not retrieve product names from sessionStorage");
        }

        // Fallback: if we couldn't get names from sessionStorage, use the passed name
        if (!nameAr && !nameEn) {
          const currentLang = localStorage.getItem("public-language") || "ar";
          if (currentLang === "en") {
            nameEn = name;
            nameAr = name; // Fallback to same name if we don't have Arabic
          } else {
            nameAr = name;
            nameEn = name; // Fallback to same name if we don't have English
          }
        } else if (!nameAr) {
          nameAr = nameEn || name; // Fallback
        } else if (!nameEn) {
          nameEn = nameAr || name; // Fallback
        }

        // Check if this is a free item and get required points
        let freeItem = freeItemsData.find(
          (item) =>
            item.productId === id ||
            item.productId.toLowerCase() === id.toLowerCase()
        );

        // If not found and this might be a shortId, try to find by the full _id
        if (!freeItem && parseFloat(basePrice) === 0) {
          console.log(
            `⚠️ [Addon Modal] No direct match for ID: ${id}, trying alternative matching...`
          );

          try {
            const namesMap = JSON.parse(
              sessionStorage.getItem("productNames") || "{}"
            );
            if (namesMap[id] && namesMap[id]._id) {
              const fullId = namesMap[id]._id;
              console.log(`  [Addon Modal] Trying with full _id: ${fullId}`);
              freeItem = freeItemsData.find(
                (item) => item.productId === fullId
              );
            }
          } catch (e) {
            console.warn(
              "  [Addon Modal] Could not retrieve full product ID from sessionStorage"
            );
          }
        }

        const isFreeItem = parseFloat(basePrice) === 0;
        const pointsRequired =
          isFreeItem && freeItem ? freeItem.pointsRequired : 0;

        console.log(
          `[Addon Modal] Product ID: ${id}, Is free: ${isFreeItem}, Found free item:`,
          freeItem,
          `Points required: ${pointsRequired}`
        );

        // Create new cart item
        const newItem = {
          id: uniqueId,
          baseId: id, // Store original ID for reference
          name: nameAr, // Always store Arabic as the primary name
          nameEn: nameEn, // Store English name for language switching
          nameAr: nameAr, // Store Arabic name for language switching
          basePrice: parseFloat(basePrice),
          price: finalPrice,
          quantity: quantity,
          image: image || "", // Ensure image URL is saved with the item
          addons: addons, // Store full addon structure
          addonsList: formattedAddons, // Store simplified list for display
          isFreeItem: isFreeItem, // Add free item flag
          pointsRequired: pointsRequired, // Add points required (0 if not a free item)
        };

        cartItems.push(newItem);
        console.log(
          `✅ [Addon Modal] Item added with isFreeItem: ${isFreeItem}, pointsRequired: ${pointsRequired}`
        );
      }

      // Save to localStorage
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
      console.log(`Cart items saved:`, cartItems);

      // Dispatch cart change event
      dispatchCartChangeEvent();

      // Return success
      return true;
    } catch (error) {
      console.error("Error adding item with addons to cart:", error);
      return false;
    }
  }

  // Helper function to generate a hash for addons that works with any characters
  function generateAddonHash(addons) {
    try {
      // Convert addons to a string representation
      const addonString = JSON.stringify(addons);

      // Simple hash function that works with any unicode characters
      let hash = 0;
      for (let i = 0; i < addonString.length; i++) {
        const char = addonString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }

      // Convert to a positive hex string and take first 10 chars
      return Math.abs(hash).toString(16).substring(0, 10);
    } catch (e) {
      console.error("Error generating addon hash:", e);
      return Math.random().toString(36).substring(2, 12);
    }
  }

  // Add touch effects for mobile
  document
    .querySelectorAll(".product-card, .filter, .add-to-cart")
    .forEach((element) => {
      element.addEventListener("touchstart", function () {
        this.style.opacity = "0.8";
      });

      element.addEventListener("touchend", function () {
        this.style.opacity = "1";
      });
    });

  // Initialize product rating functionality
  initProductRating();

  // Initialize category selection functionality
  initCategorySelection();

  // Initialize the notification badge functionality
  updateNotificationBadge();

  // Initialize product quantity controls
  initQuantityControls();

  // Update cart total when page loads
  updateCartTotal();

  // Initialize sample vouchers if running in development mode
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    // Load and execute the voucher initialization script
    const script = document.createElement("script");
    script.src = "../js/init-vouchers.js";
    document.body.appendChild(script);
  }

  // Function to check for table number in URL parameters
  function checkForTableNumber() {
    const urlParams = new URLSearchParams(window.location.search);
    const tableNumber = urlParams.get("table");
    const qid = urlParams.get("qid");
    const scanBtnInit = document.getElementById("scan-qr-btn");
    if (scanBtnInit) {
      const langInit = localStorage.getItem("public-language") || "ar";
      scanBtnInit.textContent = langInit === "en" ? "Scan QR" : "مسح QR";
      scanBtnInit.style.display = "block";
      scanBtnInit.onclick = () => openQrScanModal(tableNumber);
    }
    function hasValidSession(table) {
      try {
        const token = sessionStorage.getItem("orderSessionToken") || "";
        const expiresAt = sessionStorage.getItem("orderSessionExpiresAt") || "";
        const sessionTable = sessionStorage.getItem("orderSessionTable") || "";
        const expMs = expiresAt ? new Date(expiresAt).getTime() : 0;
        return (
          !!token &&
          expMs > Date.now() &&
          String(sessionTable || "") === String(table || "")
        );
      } catch (_) {
        return false;
      }
    }
    function requestSession(table, qidParam) {
      try {
        const baseUrl =
          window.API_BASE_URL ||
          (function () {
            const { hostname, origin } = window.location;
            const isLocal =
              hostname === "localhost" || hostname === "127.0.0.1";
            return isLocal ? "http://localhost:5000" : origin;
          })();
        const sessionUrl = qidParam
          ? `${baseUrl}/api/table/session?table=${table}&qid=${encodeURIComponent(
              qidParam
            )}`
          : `${baseUrl}/api/table/session?table=${table}`;
        fetch(sessionUrl)
          .then((r) => r.json())
          .then((d) => {
            if (d && d.success && d.token) {
              sessionStorage.setItem("orderSessionToken", d.token);
              sessionStorage.setItem("orderSessionExpiresAt", d.expiresAt);
              sessionStorage.setItem("orderSessionTable", table);
              const lang = localStorage.getItem("public-language") || "ar";
              const msg =
                lang === "en"
                  ? "Ordering enabled for 20 minutes"
                  : "تم تفعيل الطلب لمدة 20 دقيقة";
              if (typeof showToast === "function") {
                showToast(msg, "success", 3000);
              }
            } else if (!qidParam) {
              const lang = localStorage.getItem("public-language") || "ar";
              const warn =
                lang === "en"
                  ? "QR validation required. Please open via table QR"
                  : "يتطلب التحقق عبر رمز QR. يرجى فتح الصفحة عبر رمز الطاولة";
              if (typeof showToast === "function") {
                showToast(warn, "warning", 3000);
              }
            }
          })
          .catch(() => {});
      } catch (_) {}
    }

    if (tableNumber) {
      // Get the table number display element
      const tableNumberDisplay = document.getElementById(
        "table-number-display"
      );

      // Check if the table display is currently hidden by localStorage
      const tableDisplayHiddenUntil = localStorage.getItem(
        "tableDisplayHiddenUntil"
      );
      const currentTime = new Date().getTime();

      // If there's a valid hidden timestamp and it hasn't expired yet
      if (
        tableDisplayHiddenUntil &&
        currentTime < parseInt(tableDisplayHiddenUntil)
      ) {
        // Keep it hidden and don't show it
        tableNumberDisplay.style.display = "none";

        // Save table number in session storage for cart page (still need this)
        sessionStorage.setItem("tableNumber", tableNumber);
        localStorage.setItem("tableNumber", tableNumber);

        // Add table number to any anchor elements that point to the cart page
        const cartLinks = document.querySelectorAll('a[href$="cart.html"]');
        cartLinks.forEach((link) => {
          const base = "/pages/cart.html";
          link.href = `${base}?table=${tableNumber}`;
        });

        const firstScanKey = `firstScan:${tableNumber}`;
        if (!localStorage.getItem(firstScanKey)) {
          localStorage.setItem(firstScanKey, "1");
        }

        return;
      }

      // Update its content
      tableNumberDisplay.innerHTML = `
                <i class="fas fa-concierge-bell"></i>
                <span>طاولة ${tableNumber}</span>
            `;

      

      // Display with animation
      setTimeout(() => {
        tableNumberDisplay.classList.add("show");

        // Hide after 30 seconds
        setTimeout(() => {
          tableNumberDisplay.classList.remove("show");
          // Add fade out animation
          tableNumberDisplay.classList.add("hide");

          // Remove the element after animation completes
          setTimeout(() => {
            tableNumberDisplay.style.display = "none";
            tableNumberDisplay.classList.remove("hide");

            // Set the hidden until timestamp (1 hour from now)
            const hiddenUntil = currentTime + 3600000; // 1 hour = 3600000 milliseconds
            localStorage.setItem(
              "tableDisplayHiddenUntil",
              hiddenUntil.toString()
            );
          }, 500);
        }, 30000);
      }, 300);

      // Save table number in session storage for cart page
      sessionStorage.setItem("tableNumber", tableNumber);
      localStorage.setItem("tableNumber", tableNumber);

      // Add table number to any anchor elements that point to the cart page
      const cartLinks = document.querySelectorAll('a[href$="cart.html"]');
      cartLinks.forEach((link) => {
        const base = "/pages/cart.html";
        link.href = `${base}?table=${tableNumber}`;
      });

      const firstScanKey = `firstScan:${tableNumber}`;
      if (!localStorage.getItem(firstScanKey)) {
        localStorage.setItem(firstScanKey, "1");
      }
      // If a QR token is present in the URL, request a session immediately
      if (qid) {
        requestSession(tableNumber, qid);
      } else if (!hasValidSession(tableNumber)) {
        // If no QR token and no valid session, keep the scan button visible
      }
    }
  }

  async function openQrScanModal(currentTable) {
    const modal = document.getElementById("qr-scan-modal");
    const video = document.getElementById("qr-video");
    const closeBtn = document.getElementById("qr-close-btn");
    const hint = modal.querySelector(".qr-hint");
    const lang = localStorage.getItem("public-language") || "ar";
    hint.textContent =
      lang === "en"
        ? "Point camera at the table QR"
        : "وجّه الكاميرا نحو رمز الطاولة";
    let stream;
    async function stop() {
      try {
        const t = stream && stream.getTracks ? stream.getTracks() : [];
        t.forEach((x) => x.stop());
      } catch (_) {}
      modal.style.display = "none";
    }
    closeBtn.onclick = stop;
    if (!("BarcodeDetector" in window)) {
      const msg =
        lang === "en"
          ? "QR scanning not supported on this browser"
          : "مسح QR غير مدعوم في هذا المتصفح";
      if (typeof showToast === "function") showToast(msg, "warning", 3000);
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = stream;
      await video.play();
      modal.style.display = "flex";
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      let running = true;
      const tick = async () => {
        if (!running) return;
        try {
          const codes = await detector.detect(video);
          if (codes && codes.length) {
            running = false;
            const raw = codes[0].rawValue || "";
            let scannedTable = null;
            let scannedQid = null;
            try {
              const u = new URL(raw, window.location.origin);
              const p = new URLSearchParams(u.search);
              scannedTable = p.get("table");
              scannedQid = p.get("qid");
            } catch (_) {}
            if (
              scannedTable &&
              (!currentTable || String(scannedTable) === String(currentTable))
            ) {
              try {
                const targetTable = currentTable || scannedTable;
                const baseUrl =
                  window.API_BASE_URL ||
                  (function () {
                    const { hostname, origin } = window.location;
                    const isLocal =
                      hostname === "localhost" || hostname === "127.0.0.1";
                    return isLocal ? "http://localhost:5000" : origin;
                  })();
                const sessionUrl = scannedQid
                  ? `${baseUrl}/api/table/session?table=${targetTable}&qid=${encodeURIComponent(
                      scannedQid
                    )}`
                  : `${baseUrl}/api/table/session?table=${targetTable}`;
                const r = await fetch(sessionUrl);
                const d = await r.json();
                if (d && d.success && d.token) {
                  sessionStorage.setItem("orderSessionToken", d.token);
                  sessionStorage.setItem("orderSessionExpiresAt", d.expiresAt);
                  sessionStorage.setItem("orderSessionTable", targetTable);
                  sessionStorage.setItem("tableNumber", targetTable);
                  localStorage.setItem("tableNumber", targetTable);
                  const okMsg =
                    lang === "en"
                      ? "Ordering enabled for 20 minutes"
                      : "تم تفعيل الطلب لمدة 20 دقيقة";
                  if (typeof showToast === "function")
                    showToast(okMsg, "success", 3000);
                  stop();
                } else {
                  const errMsg =
                    lang === "en"
                      ? scannedQid
                        ? "Invalid or expired QR. Ask staff for a new QR"
                        : "QR validation required. Use the official table QR"
                      : scannedQid
                      ? "رمز QR غير صالح أو منتهي. اطلب رمزًا جديدًا من الموظف"
                      : "يتطلب التحقق عبر رمز QR الرسمي للطاولة";
                  hint.textContent = errMsg;
                  if (typeof showToast === "function")
                    showToast(errMsg, "error", 3000);
                  running = true;
                }
              } catch (_) {
                const errMsg =
                  lang === "en"
                    ? "Network error. Please try scanning again"
                    : "خطأ في الشبكة. يرجى المحاولة مرة أخرى";
                hint.textContent = errMsg;
                if (typeof showToast === "function")
                  showToast(errMsg, "error", 3000);
                running = true;
              }
            } else {
              const err =
                lang === "en"
                  ? currentTable
                    ? "Please scan the QR of the same table"
                    : "Invalid QR"
                  : currentTable
                  ? "يرجى مسح رمز نفس الطاولة"
                  : "رمز QR غير صالح";
              if (typeof showToast === "function")
                showToast(err, "error", 3000);
              running = true;
            }
          }
        } catch (_) {}
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch (_) {
      const msg =
        lang === "en" ? "Camera access denied" : "تم رفض الوصول للكاميرا";
      if (typeof showToast === "function") showToast(msg, "error", 3000);
    }
  }

  // Add CSS for the create default button
  const style = document.createElement("style");
  style.textContent = `
    .create-default-btn {
      margin-top: 15px;
      padding: 10px 20px;
      background-color: #42d158;
      color: white;
      border: none;
      border-radius: 30px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    
    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .rotating {
      animation: rotate 1s linear;
    }
  `;
  document.head.appendChild(style);

  // Initialize all components
  initThemeToggle();
  initCategoryFilter();
  initContentSectionToggle();
  initBottomNav();
  initCategorySelection();
  initOfferCategoryFilters();
  // Initialize the offers section
  loadOffers();
  checkForTableNumber();
  initReservationForm();

  // Restore active sidebar item
  restoreActiveSidebarItem();

  // Check active sidebar item based on current URL
  checkActiveSidebarItem();

  // Load products and offers
  loadProducts();

  // Initialize WebSocket connection for real-time notifications
  initWebSocketConnection();

  // Load cart from local storage
  loadCart();

  // Export functions globally for use by i18n.js and other modules
  window.loadProducts = loadProducts;

  // Listen for language change events to update products and categories display
  document.addEventListener("language_changed", function (event) {
    console.log("Language changed event received, updating display");
    const newLang = event.detail.language;

    // Update categories display without reloading from API
    updateCategoriesLanguage(newLang);

    // Update products display without reloading from API
    updateProductsLanguage(newLang);

    // Update Previous Orders display if currently visible
    const previousOrdersSection = document.getElementById(
      "previous-orders-section"
    );
    if (
      previousOrdersSection &&
      previousOrdersSection.classList.contains("active")
    ) {
      console.log("Updating Previous Orders display for language change");
      updatePreviousOrdersLanguage(newLang);
    }
  });
});

// Function to initialize reservation form
function initReservationForm() {
  const reservationForm = document.getElementById("reservation-form");
  if (!reservationForm) return;

  // Initialize datepicker for reservation
  const dateInput = document.getElementById("date");
  if (dateInput) {
    // Set min date to today
    const today = new Date().toISOString().split("T")[0];
    dateInput.min = today;
  }

  // Handle ID card photo upload
  const idCardInput = document.getElementById("idCardPhoto");
  const idCardPreview = document.getElementById("idCardPreview");
  let idCardPhotoData = null;

  if (idCardInput && idCardPreview) {
    idCardInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      // Check if the file is an image
      if (!file.type.match("image.*")) {
        showReservationMessage("يرجى تحميل صورة صالحة", "error");
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showReservationMessage(
          "حجم الصورة كبير جدًا. الحد الأقصى هو 5 ميجابايت",
          "error"
        );
        return;
      }

      // Read and preview the image
      const reader = new FileReader();
      reader.onload = function (e) {
        idCardPhotoData = e.target.result;

        // Create and display the preview image
        idCardPreview.innerHTML = "";
        const img = document.createElement("img");
        img.src = idCardPhotoData;
        idCardPreview.appendChild(img);
        idCardPreview.classList.add("has-image");
      };
      reader.readAsDataURL(file);
    });
  }

  reservationForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Get form data
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const guests = document.getElementById("guests").value;
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;
    const notes = document.getElementById("notes").value;

    // Validate form
    if (!name || !phone || !guests || !date || !time || !idCardPhotoData) {
      showReservationMessage("يرجى ملء جميع الحقول المطلوبة", "error");
      return;
    }

    // Show loading message
    showReservationMessage("جاري إرسال طلب الحجز...", "loading");

    try {
      // First upload the ID card photo
      const uploadResponse = await fetch(
        "http://localhost:5000/api/upload/idcard",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageData: idCardPhotoData,
          }),
        }
      );

      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error("فشل في تحميل صورة الهوية");
      }

      // Send reservation data to the server
      const response = await fetch("http://localhost:5000/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          guests,
          date,
          time,
          notes,
          idCardPhoto: uploadResult.imageUrl,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showReservationMessage(
          "تم استلام طلب الحجز الخاص بك. سنتصل بك قريبًا للتأكيد.",
          "success"
        );
        reservationForm.reset();
        idCardPreview.innerHTML = "<p>اضغط لتحميل صورة الهوية</p>";
        idCardPreview.classList.remove("has-image");
        idCardPhotoData = null;
      } else {
        // Check for specific error message about existing reservation
        if (result.error.includes("لديك حجز نشط بالفعل")) {
          showReservationMessage(result.error, "error");
        } else {
          showReservationMessage(
            "حدث خطأ أثناء إرسال طلب الحجز. يرجى المحاولة مرة أخرى.",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error submitting reservation:", error);
      showReservationMessage(
        "حدث خطأ أثناء إرسال طلب الحجز. يرجى المحاولة مرة أخرى.",
        "error"
      );
    }
  });
}

// Function to show reservation message
function showReservationMessage(message, type) {
  // Check if message element already exists
  let messageElement = document.querySelector(".reservation-message");

  // If not, create it
  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "reservation-message";
    const reservationForm = document.getElementById("reservation-form");
    reservationForm.parentNode.insertBefore(messageElement, reservationForm);
  }

  // Set message content and style
  messageElement.textContent = message;
  messageElement.className = `reservation-message ${type}`;

  // Show message
  messageElement.style.display = "block";

  // Hide message after 5 seconds
  setTimeout(() => {
    messageElement.style.opacity = "0";
    setTimeout(() => {
      messageElement.style.display = "none";
      messageElement.style.opacity = "1";
    }, 500);
  }, 5000);
}

// Function to check if offer is expired
function isOfferExpired(offer) {
  if (!offer.endDate) return false;
  const now = new Date();
  const endDate = new Date(offer.endDate);
  return now > endDate;
}

// Function to load offers from API
async function loadOffers() {
  const offersGrid = document.querySelector(".offers-grid");
  if (!offersGrid) return;

  // Get current language and currency
  const currentLang =
    typeof getCurrentLanguage === "function" ? getCurrentLanguage() : "ar";
  const currencyText =
    typeof getCurrencyText === "function"
      ? getCurrencyText()
      : currentLang === "en"
      ? "EGP"
      : "جنيه";
  const t =
    typeof getTranslation === "function" ? getTranslation : (key) => key;

  try {
    // Check if user is logged in
    const loggedIn = typeof isLoggedIn === "function" && isLoggedIn();

    // Always use the eligible offers endpoint (works for both logged-in and guest users)
    const apiUrl = `${API_BASE_URL}/api/offers/eligible?active=true`;
    const headers = {};

    // Add token if user is logged in
    if (loggedIn) {
      const token =
        typeof getToken === "function"
          ? getToken()
          : localStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Fetch offers from API
    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error("Failed to fetch offers");
    }

    const data = await response.json();
    const offers = data.data || [];

    // If user is logged in and we have customerSpending info, log it for debugging
    if (loggedIn && data.customerSpending !== undefined) {
      console.log(`Customer total spending: ${data.customerSpending} EGP`);
      console.log(`Showing ${data.count} eligible offers`);
    }

    // Filter only active and non-expired offers
    const activeOffers = offers.filter(
      (offer) => offer.isActive && !isOfferExpired(offer)
    );

    if (activeOffers.length === 0) {
      // Show empty state message when no offers in database
      showEmptyOffersState(offersGrid, currentLang);
      return;
    }

    // Load featured offer banner
    loadFeaturedOfferBanner(activeOffers, currentLang, currencyText);

    // Get customer spending for display purposes (if available)
    const customerSpending = data.customerSpending || 0;

    // Filter out featured offers from the grid (they only appear in the banner)
    const nonFeaturedOffers = activeOffers.filter((offer) => !offer.isFeatured);

    // Render offers (excluding featured offers)
    offersGrid.innerHTML = nonFeaturedOffers
      .map((offer) => {
        const title =
          currentLang === "en" && offer.titleEn ? offer.titleEn : offer.title;
        const description =
          currentLang === "en" && offer.descriptionEn
            ? offer.descriptionEn
            : offer.description;

        // Add featured badge if applicable
        const featuredBadge = offer.isFeatured
          ? `<span class="featured-badge"><i class="fas fa-star"></i> ${t(
              "featured"
            )}</span>`
          : "";

        // Determine tag based on category (only show if not featured)
        let categoryTag = "";
        if (!offer.isFeatured) {
          let tagClass = "offer-tag";
          let tagText = "";

          if (offer.category === "new") {
            tagClass += " new-tag";
            tagText = currentLang === "en" ? "New" : "جديد";
          } else if (offer.category === "special") {
            tagClass += " special-tag";
            tagText = `${offer.discountPercentage}% ${
              currentLang === "en" ? "OFF" : "خصم"
            }`;
          } else if (offer.category === "weekly") {
            tagClass += " weekly-tag";
            tagText = `${offer.discountPercentage}% ${
              currentLang === "en" ? "OFF" : "خصم"
            }`;
          } else {
            tagClass += " offer-tag";
            tagText = `${offer.discountPercentage}% ${
              currentLang === "en" ? "OFF" : "خصم"
            }`;
          }

          categoryTag = `<div class="${tagClass}">${tagText}</div>`;
        }

        return `
        <div class="offer-card" data-offer-category="${
          offer.category
        }" data-offer-id="${offer.id}">
          <div class="offer-image">
            <img src="${offer.image}" alt="${title}" />
            ${categoryTag}
            ${featuredBadge}
          </div>
          <div class="offer-info">
            <h3>${title}</h3>
            <p>${description}</p>
            <div class="offer-card-price">
              <span class="offer-card-original">${offer.originalPrice.toFixed(
                2
              )} ${currencyText}</span>
              <span class="offer-card-discounted">${offer.discountedPrice.toFixed(
                2
              )} ${currencyText}</span>
            </div>
            <button class="add-to-cart-offer" 
              data-name="${title}"
              data-name-ar="${offer.title}"
              data-name-en="${offer.titleEn || ""}"
              data-price="${offer.discountedPrice}"
              data-image="${offer.image}"
              data-offer-id="${offer.id}">
              <i class="fas fa-shopping-cart"></i>
              ${currentLang === "en" ? "Add to Cart" : "إضافة للسلة"}
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    // Fix the offer section event handlers
    fixOffersSection();
  } catch (error) {
    console.error("Error loading offers:", error);
    // Show empty state when there's an error
    showEmptyOffersState(offersGrid, currentLang);
  }
}

// Load featured offer banner
function loadFeaturedOfferBanner(offers, currentLang, currencyText) {
  const featuredOffer = offers.find(
    (offer) => offer.isFeatured && offer.isActive
  );
  const heroBannerSection = document.querySelector(".offers-hero-banner");
  const mainOfferBanner = document.querySelector(".main-offer-banner");

  // Hide the entire hero banner section if no featured offer exists
  if (!featuredOffer) {
    if (heroBannerSection) {
      heroBannerSection.style.display = "none";
    }
    return;
  }

  // Show the hero banner section if it was hidden
  if (heroBannerSection) {
    heroBannerSection.style.display = "block";
  }

  if (!mainOfferBanner) return;

  const title =
    currentLang === "en" && featuredOffer.titleEn
      ? featuredOffer.titleEn
      : featuredOffer.title;
  const description =
    currentLang === "en" && featuredOffer.descriptionEn
      ? featuredOffer.descriptionEn
      : featuredOffer.description;

  // Update banner content
  const bannerTitle = mainOfferBanner.querySelector("h2");
  const bannerDescription = mainOfferBanner.querySelector("p");
  const originalPriceEl = mainOfferBanner.querySelector(
    ".offer-original-price"
  );
  const discountedPriceEl = mainOfferBanner.querySelector(
    ".offer-discounted-price"
  );
  const discountPercentageEl = mainOfferBanner.querySelector(
    ".discount-percentage"
  );
  const bannerImage = mainOfferBanner.querySelector(".offer-banner-image");
  const offerTimer = mainOfferBanner.querySelector(".offer-timer");
  const offerButton = mainOfferBanner.querySelector(".offer-btn");

  if (bannerTitle) bannerTitle.textContent = title;
  if (bannerDescription) bannerDescription.textContent = description;
  if (originalPriceEl)
    originalPriceEl.textContent = `${featuredOffer.originalPrice.toFixed(
      2
    )} ${currencyText}`;
  if (discountedPriceEl)
    discountedPriceEl.textContent = `${featuredOffer.discountedPrice.toFixed(
      2
    )} ${currencyText}`;
  if (discountPercentageEl)
    discountPercentageEl.textContent = `${featuredOffer.discountPercentage}% ${
      currentLang === "en" ? "OFF" : "خصم"
    }`;
  if (bannerImage)
    bannerImage.style.backgroundImage = `url('${featuredOffer.image}')`;

  // Add bilingual data attributes to the offer button
  if (offerButton) {
    offerButton.setAttribute("data-name", title);
    offerButton.setAttribute("data-name-ar", featuredOffer.title);
    offerButton.setAttribute("data-name-en", featuredOffer.titleEn || "");
    offerButton.setAttribute("data-price", featuredOffer.discountedPrice);
    offerButton.setAttribute("data-image", featuredOffer.image);
    offerButton.setAttribute("data-offer-id", featuredOffer.id);
  }

  // Handle offer timer
  if (offerTimer) {
    // Clear any existing timer interval
    if (offerTimer.dataset.intervalId) {
      clearInterval(parseInt(offerTimer.dataset.intervalId));
      offerTimer.dataset.intervalId = "";
    }

    // Check if offer has an end date and if it's not expired
    if (featuredOffer.endDate && !isOfferExpired(featuredOffer)) {
      offerTimer.style.display = "flex";
      updateOfferTimer(featuredOffer.endDate, offerTimer, currentLang);
    } else {
      // Hide timer if no end date or offer has ended
      offerTimer.style.display = "none";
    }
  }
}

// Function to update and display the offer timer
function updateOfferTimer(endDate, timerElement, currentLang) {
  if (!timerElement || !endDate) return;

  const updateTimer = () => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;

    // If offer has ended, hide the timer
    if (diff <= 0) {
      timerElement.style.display = "none";
      return;
    }

    // Calculate total hours remaining
    const totalHours = Math.floor(diff / (1000 * 60 * 60));

    // Format the timer text (only hours)
    const timerText =
      currentLang === "en" ? `${totalHours}h` : `${totalHours} ساعة`;

    // Update the timer countdown span
    const timerSpan = timerElement.querySelector(".timer-countdown");
    if (timerSpan) {
      timerSpan.textContent = timerText;
    }
  };

  // Update immediately
  updateTimer();

  // Update every second
  const intervalId = setInterval(updateTimer, 1000);

  // Store interval ID to clear it later if needed
  timerElement.dataset.intervalId = intervalId;
}

// Show empty state when no offers available
function showEmptyOffersState(offersGrid, currentLang) {
  const emptyTitle =
    currentLang === "en" ? "No Offers Available" : "لا توجد عروض متاحة";
  const emptyMessage =
    currentLang === "en"
      ? "There are currently no active offers. Please check back later!"
      : "لا توجد عروض نشطة حالياً. يرجى التحقق لاحقاً!";
  const browseMenuText = currentLang === "en" ? "Browse Menu" : "تصفح القائمة";

  offersGrid.innerHTML = `
    <div class="empty-offers-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
      <i class="fas fa-tag" style="font-size: 80px; color: var(--primary-color); opacity: 0.3; margin-bottom: 20px;"></i>
      <h3 style="font-size: 24px; margin-bottom: 10px; color: var(--text-color);">${emptyTitle}</h3>
      <p style="color: var(--text-secondary); margin-bottom: 30px;">${emptyMessage}</p>
      <button class="browse-menu-btn" onclick="document.querySelector('.menu-section-link').click()" style="padding: 12px 30px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; transition: all 0.3s ease;">
        <i class="fas fa-utensils" style="margin-right: 8px;"></i>
        ${browseMenuText}
      </button>
    </div>
  `;
}

// Function stub to maintain compatibility with existing code
async function createDefaultOffers() {
  console.log("Static offers are already created");
  // No need to do anything as we're using static content
}

// Fix offers section event listeners and functionality
function fixOffersSection() {
  // Make sure we set the cart count element
  cartCountElement = document.querySelector(".cart-count");

  // Add event listeners to offer cards
  const addToCartOfferButtons = document.querySelectorAll(".add-to-cart-offer");
  addToCartOfferButtons.forEach((button) => {
    // Remove any existing event listeners
    button.replaceWith(button.cloneNode(true));
  });

  // Get the updated buttons (after cloning)
  const updatedButtons = document.querySelectorAll(".add-to-cart-offer");
  updatedButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      // Get offer data from button attributes (bilingual approach)
      const nameAr = this.getAttribute("data-name-ar");
      const nameEn = this.getAttribute("data-name-en");
      const price = this.getAttribute("data-price");
      const image = this.getAttribute("data-image");
      const offerId = this.getAttribute("data-offer-id");

      // Claim the offer first (if user is logged in)
      const loggedIn = typeof isLoggedIn === "function" && isLoggedIn();
      if (loggedIn && offerId) {
        try {
          const token =
            typeof getToken === "function"
              ? getToken()
              : localStorage.getItem("token");
          const headers = {
            "Content-Type": "application/json",
          };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }

          const response = await fetch(
            `${API_BASE_URL}/api/offers/${offerId}/claim`,
            {
              method: "POST",
              headers: headers,
            }
          );

          const data = await response.json();

          if (!data.success) {
            // Show error message if offer cannot be claimed
            const currentLang =
              typeof getCurrentLanguage === "function"
                ? getCurrentLanguage()
                : "ar";
            const errorMsg =
              currentLang === "en"
                ? data.message || "This offer is no longer available"
                : data.message || "هذا العرض لم يعد متاحاً";

            alert(errorMsg);

            // Reload offers to update the display
            loadOffers();
            return;
          }

          console.log("Offer claimed successfully:", data);
        } catch (error) {
          console.error("Error claiming offer:", error);
          // Continue to add to cart even if claim fails
        }
      }

      // Add to cart using bilingual offer function
      const cartId = "offer-" + offerId;
      addOfferToCart(cartId, nameAr, nameEn, price, image);

      // Store the offer ID in the cart item for tracking on checkout
      try {
        const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]");
        const addedItem = cartItems.find((item) => item.id === cartId);
        if (addedItem) {
          addedItem.offerId = offerId;
          localStorage.setItem("cartItems", JSON.stringify(cartItems));
          console.log(`Stored offerId ${offerId} in cart item`);
        }
      } catch (error) {
        console.error("Error storing offerId in cart:", error);
      }

      // Update cart count
      const savedCartItems = localStorage.getItem("cartItems");
      if (savedCartItems) {
        try {
          const cartItems = JSON.parse(savedCartItems);
          cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
          if (cartCountElement) {
            cartCountElement.textContent = cartCount;
            cartCountElement.style.display = cartCount > 0 ? "flex" : "none";
          }
        } catch (error) {
          console.error("Error updating cart count:", error);
        }
      }

      // Show notification
      showCartNotification();

      // Visual feedback
      button.classList.add("clicked");
      setTimeout(() => {
        button.classList.remove("clicked");
      }, 300);
    });
  });

  // Add to cart for main offer banner
  const mainOfferButton = document.querySelector(".offer-btn");
  if (mainOfferButton) {
    // Remove existing event listeners
    mainOfferButton.replaceWith(mainOfferButton.cloneNode(true));

    // Get the updated button
    const updatedMainButton = document.querySelector(".offer-btn");
    if (updatedMainButton) {
      updatedMainButton.addEventListener("click", function () {
        const offerBanner = this.closest(".main-offer-banner");
        const name = offerBanner.querySelector("h2").textContent;
        const price = offerBanner
          .querySelector(".offer-discounted-price")
          .textContent.split(" ")[0];

        // Add to cart
        addToCart(
          "offer-special-" + Math.random().toString(36).substr(2, 9),
          name,
          price,
          "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800"
        );

        // Update cart count
        const savedCartItems = localStorage.getItem("cartItems");
        if (savedCartItems) {
          try {
            const cartItems = JSON.parse(savedCartItems);
            cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
            if (cartCountElement) {
              cartCountElement.textContent = cartCount;
              cartCountElement.style.display = cartCount > 0 ? "flex" : "none";
            }
          } catch (error) {
            console.error("Error updating cart count:", error);
          }
        }

        // Show notification
        showCartNotification();
      });
    }
  }
}

// Function to handle previous orders
async function loadPreviousOrders() {
  console.log("Loading previous orders");
  const ordersGrid = document.querySelector(".orders-grid");
  const ordersSpinner = document.getElementById("orders-spinner");

  if (!ordersGrid) {
    console.error("Orders grid element not found");
    return;
  }

  // Ensure we have the spinner element
  if (!ordersSpinner) {
    console.log("Creating spinner element");
    const spinner = document.createElement("div");
    spinner.id = "orders-spinner";
    spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    ordersGrid.appendChild(spinner);
  } else {
    ordersSpinner.style.display = "flex";
  }

  // Fix missing CSS
  if (!document.getElementById("previous-orders-styles")) {
    console.log("Adding missing CSS for previous orders");
    const styleEl = document.createElement("style");
    styleEl.id = "previous-orders-styles";
    styleEl.textContent = `
      .orders-grid {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .empty-orders-message {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 300px;
      }
      
      /* Make single order card display properly */
      .orders-grid:only-child {
        flex: 1;
        min-height: 300px;
      }
      
      /* Loading spinner positioning */
      #orders-spinner {
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(styleEl);

    // Also fix the container height
    const previousOrdersSection = document.getElementById(
      "previous-orders-section"
    );
    if (previousOrdersSection) {
      previousOrdersSection.style.minHeight = "80vh";
      previousOrdersSection.style.display = "flex";
      previousOrdersSection.style.flexDirection = "column";
    }
  }

  try {
    // Check if user is logged in
    if (isLoggedIn()) {
      // Get the token - ensure we're using the correct function from auth.js
      const token = localStorage.getItem("token");

      if (!token) {
        console.log("No token found in localStorage");
        showLoginPrompt(
          getTranslation("loginRequired"),
          getTranslation("pleaseLoginToViewOrders")
        );
        return;
      }

      console.log("Token exists, attempting to fetch orders");

      try {
        // Make API call with token
        const response = await fetch(`${API_BASE_URL}/api/orders/my-orders`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include", // Include cookies in the request
        });

        console.log("API response status:", response.status);

        // Handle unauthorized status (401)
        if (response.status === 401) {
          console.log("Token invalid or expired, showing login prompt");
          // Token is invalid, clear it
          localStorage.removeItem("token");
          localStorage.removeItem("tokenExpiration");
          showLoginPrompt(
            getTranslation("sessionExpired"),
            getTranslation("pleaseLoginAgainToViewOrders")
          );
          return;
        }

        if (!response.ok) {
          // For other errors, show empty state
          console.log("API error:", response.status);
          showEmptyOrdersState();
          return;
        }

        const data = await response.json();

        // Always hide spinner before showing content
        ordersSpinner.style.display = "none";

        if (data.success && data.data && data.data.length > 0) {
          // Ensure products are loaded in sessionStorage for language support
          await ensureProductsLoaded();

          // We have orders, render them
          renderPreviousOrders(data.data);
          initOrderStatusFilters();
        } else {
          // No orders found
          showEmptyOrdersState();
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        ordersSpinner.style.display = "none";
        showEmptyOrdersState();
      }
    } else {
      // Not logged in
      ordersSpinner.style.display = "none";
      showLoginPrompt(
        getTranslation("loginRequired"),
        getTranslation("pleaseLoginToViewOrders")
      );
    }
  } catch (error) {
    console.error("Unexpected error in loadPreviousOrders:", error);
    ordersSpinner.style.display = "none";
    showEmptyOrdersState();
  }

  // Helper function to show login prompt
  function showLoginPrompt(title, message) {
    // Ensure spinner is hidden
    ordersSpinner.style.display = "none";

    ordersGrid.innerHTML = `
      <div class="login-prompt">
        <div class="login-message">
          <i class="fas fa-user-lock"></i>
          <p>${message}</p>
          <a href="register.html" class="login-btn">${getTranslation(
            "loginButton"
          )}</a>
        </div>
      </div>
    `;
  }
  // Helper function to show empty orders state
  function showEmptyOrdersState() {
    console.log("Showing empty orders state");

    // Ensure spinner is hidden
    ordersSpinner.style.display = "none";

    // Show empty state with nice styling
    ordersGrid.innerHTML = `
      <div class="login-prompt">
        <div class="login-message">
          <i class="fas fa-shopping-bag" style="color: #4caf50;"></i>
          <p>${getTranslation("noOrdersMessage")}</p>
          <a href="#" class="login-btn" id="browse-menu-btn">${getTranslation(
            "browseMenu"
          )}</a>
        </div>
      </div>
    `;

    // Add browse menu button functionality
    document
      .getElementById("browse-menu-btn")
      .addEventListener("click", (e) => {
        e.preventDefault();
        // Switch to menu section
        document.querySelector(".menu-section-link").click();
      });
  }
}

// Function to ensure products are loaded in sessionStorage
async function ensureProductsLoaded() {
  try {
    // Check if we already have products in sessionStorage
    const productNames = JSON.parse(
      sessionStorage.getItem("productNames") || "{}"
    );

    // If we have products, no need to reload
    if (Object.keys(productNames).length > 0) {
      console.log("Products already loaded in sessionStorage");
      return;
    }

    // Otherwise, fetch products from API
    console.log("Loading products for language support...");
    const response = await fetch(`${API_BASE_URL}/api/products`);

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const products = result.data;
        const newProductNames = {};

        products.forEach((product) => {
          if (product.id) {
            newProductNames[product.id] = {
              _id: product._id || "", // Store MongoDB _id for matching with free items
              name: product.name,
              nameEn: product.nameEn || "",
              description: product.description || "",
              descriptionEn: product.descriptionEn || "",
            };
          }
        });

        sessionStorage.setItem("productNames", JSON.stringify(newProductNames));
        console.log(
          `Loaded ${
            Object.keys(newProductNames).length
          } products for language support`
        );
      }
    }
  } catch (error) {
    console.warn("Could not load products for language support:", error);
    // Continue anyway - old orders will just show in their original language
  }
}

// Function to render previous orders
function renderPreviousOrders(orders) {
  try {
    const ordersGrid = document.querySelector(".orders-grid");
    const ordersSpinner = document.getElementById("orders-spinner");

    if (!ordersGrid) return;

    // Ensure spinner is hidden
    if (ordersSpinner) {
      ordersSpinner.style.display = "none";
    }

    // Clear previous content
    ordersGrid.innerHTML = "";

    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Store the orders in localStorage for offline access
    storeOrdersLocally(orders);

    // Render each order
    orders.forEach((order) => {
      // Format date
      const orderDate = new Date(order.date || order.createdAt || new Date());
      const formattedDate = formatDate(orderDate);

      // Get order status
      const status = order.status || "completed";
      let statusText = getTranslation("statusCompleted");
      let statusClass = "status-completed";

      if (status === "pending") {
        statusText = getTranslation("statusPending");
        statusClass = "status-pending";
      } else if (status === "in-progress" || status === "processing") {
        statusText = getTranslation("statusProcessing");
        statusClass = "status-processing";
      } else if (status === "cancelled") {
        statusText = getTranslation("statusCancelled");
        statusClass = "status-cancelled";
      }

      // Create order card
      const orderCard = document.createElement("div");
      orderCard.className = `order-card ${statusClass}`;
      orderCard.setAttribute("data-status", order.status);
      orderCard.setAttribute(
        "data-order-id",
        order.orderNumber || order.id || "N/A"
      );
      orderCard.setAttribute(
        "data-order-date",
        order.date || order.createdAt || new Date().toISOString()
      );

      // Make sure we properly check if the order is rated
      const isRated = order.isRated === true;
      orderCard.setAttribute("data-is-rated", isRated ? "true" : "false");

      // Get order ID (handle both database and local storage format)
      const orderId = order.orderNumber || order.id || "N/A";

      // Generate items list HTML
      let itemsHTML = "";
      const currentLang = localStorage.getItem("public-language") || "ar";
      const currencyText =
        typeof getCurrencyText === "function"
          ? getCurrencyText()
          : currentLang === "en"
          ? "EGP"
          : "جنيه";
      order.items.forEach((item) => {
        const itemPrice = parseFloat(item.price);
        const itemQuantity = parseInt(item.quantity);
        const totalItemPrice = itemPrice * itemQuantity;

        // Try to get both language names for the product
        let nameAr = item.name;
        let nameEn = item.nameEn || "";

        // For old orders without nameEn, try to get it from sessionStorage
        if (!nameEn) {
          try {
            const namesMap = JSON.parse(
              sessionStorage.getItem("productNames") || "{}"
            );
            // Extract base product ID (remove addon hash if present)
            const baseId = item.baseId || item.id.split("-")[0];
            if (namesMap[baseId]) {
              nameAr = namesMap[baseId].name || item.name;
              nameEn = namesMap[baseId].nameEn || "";
            }
          } catch (e) {
            // If we can't get it from sessionStorage, use the stored name for both languages
            nameEn = item.name;
          }
        }

        // Display product name based on current language
        const displayName = currentLang === "en" && nameEn ? nameEn : nameAr;

        // Handle missing image URLs with a placeholder
        const imageUrl =
          item.image && item.image.trim() !== ""
            ? item.image
            : "/images/placeholder-small.svg";

        itemsHTML += `
          <div class="order-item" 
               data-product-id="${item.id}" 
               data-product-name="${escapeHtml(displayName)}" 
               data-product-name-ar="${escapeHtml(nameAr)}"
               data-product-name-en="${escapeHtml(nameEn)}"
               data-product-price="${itemPrice}" 
               data-product-image="${imageUrl}">
            <div class="order-item-image">
              <img src="${imageUrl}" alt="${displayName}" onerror="this.src='/images/placeholder-small.svg'">
            </div>
            <div class="order-item-details">
              <span>${displayName} x ${itemQuantity}</span>
              <span>${totalItemPrice.toFixed(2)} ${currencyText}</span>
            </div>
          </div>
        `;
      });

      // Get total price (handle both database and local storage format)
      const totalPrice = order.total || 0;

      // Determine completion/rated state to control rating button
      const isCompletedOrder = order.status === "completed";
      const isOrderRated = order.isRated === true;

      // Single rating control: a button. If already rated or not completed, show disabled "تم التقييم".
      const ratingBtnDisabledAttr = !isCompletedOrder
        ? 'disabled aria-disabled="true"'
        : "";
      const ratingBtnClass = !isCompletedOrder
        ? "order-rating-btn disabled"
        : "order-rating-btn";
      const ratingBtnText =
        typeof getTranslation === "function"
          ? getTranslation("rateOrder")
          : "تقييم الطلب";

      const ratedChipText =
        typeof getTranslation === "function"
          ? getTranslation("orderRated")
          : "تم التقييم";
      const ratedChipTitle =
        typeof getTranslation === "function"
          ? getTranslation("orderRatedTooltip")
          : "تم التقييم";

      const ratingControlHTML = isOrderRated
        ? `<span class="order-rating-chip" title="${ratedChipTitle}"><i class="fas fa-star"></i>${ratedChipText}</span>`
        : `<button class="${ratingBtnClass}" data-order-id="${orderId}" ${ratingBtnDisabledAttr} title="${
            typeof getTranslation === "function"
              ? getTranslation("rateOrder")
              : "تقييم الطلب"
          }">
            <i class="fas fa-star"></i>
            ${ratingBtnText}
          </button>`;

      // Set the inner HTML of the order card
      orderCard.innerHTML = `
        <div class="order-header">
          <div class="order-id">${orderId}</div>
          <div class="order-status ${statusClass}">${statusText}</div>
        </div>
        <div class="order-date">
          <i class="fas fa-calendar-alt"></i>
          <span>${getTranslation("orderDate")}: ${formattedDate}</span>
        </div>
        <div class="order-items-list">
          ${itemsHTML}
        </div>
        <div class="order-footer">
          <div class="order-total">
            <span>${getTranslation("orderTotal")}</span>
            <span class="total-price">${parseFloat(totalPrice).toFixed(
              2
            )} ${currencyText}</span>
          </div>
          <div class="order-actions">
            ${ratingControlHTML}
            <button class="reorder-btn" data-order-id="${orderId}">
              <i class="fas fa-redo"></i>
              ${getTranslation("reorderButton")}
            </button>
            <button class="order-details-btn" data-order-id="${orderId}">
              <i class="fas fa-info-circle"></i>
              ${getTranslation("orderDetailsButton")}
            </button>
          </div>
        </div>
      `;

      // Add to orders grid
      ordersGrid.appendChild(orderCard);
    });

    // Add event listeners to order cards
    addOrderCardEventListeners();
  } catch (error) {
    console.error("Error rendering previous orders:", error);
    showToast("حدث خطأ أثناء عرض الطلبات السابقة", "error", 3000);
  }
}

// Function to update Previous Orders language without reloading from API
function updatePreviousOrdersLanguage(lang) {
  try {
    // Get all order cards
    const orderCards = document.querySelectorAll(".order-card");

    orderCards.forEach((orderCard) => {
      // Update order status
      const statusElement = orderCard.querySelector(".order-status");
      if (statusElement) {
        const status = orderCard.getAttribute("data-status") || "completed";
        let statusText = getTranslation("statusCompleted");

        if (status === "pending") {
          statusText = getTranslation("statusPending");
        } else if (status === "in-progress" || status === "processing") {
          statusText = getTranslation("statusProcessing");
        } else if (status === "cancelled") {
          statusText = getTranslation("statusCancelled");
        }

        statusElement.textContent = statusText;
      }

      // Update order date label and re-format date
      const orderDateSpan = orderCard.querySelector(".order-date span");
      if (orderDateSpan) {
        // Get the stored date from data attribute if available
        let dateToFormat = orderCard.getAttribute("data-order-date");

        if (dateToFormat) {
          // Re-format the date with the new language
          const orderDate = new Date(dateToFormat);
          const formattedDate = formatDate(orderDate);
          orderDateSpan.textContent = `${getTranslation(
            "orderDate"
          )}: ${formattedDate}`;
        } else {
          // Fallback: just update the label text
          const currentText = orderDateSpan.textContent;
          const dateMatch = currentText.match(/:\s*(.+)$/);
          if (dateMatch) {
            const dateValue = dateMatch[1];
            orderDateSpan.textContent = `${getTranslation(
              "orderDate"
            )}: ${dateValue}`;
          }
        }
      }

      // Update order total label
      const orderTotalSpan = orderCard.querySelector(
        ".order-total span:first-child"
      );
      if (orderTotalSpan) {
        orderTotalSpan.textContent = getTranslation("orderTotal");
      }

      // Update reorder button
      const reorderBtn = orderCard.querySelector(".reorder-btn");
      if (reorderBtn) {
        const icon = reorderBtn.querySelector("i");
        const iconHTML = icon ? icon.outerHTML : '<i class="fas fa-redo"></i>';
        reorderBtn.innerHTML = `${iconHTML} ${getTranslation("reorderButton")}`;
      }

      // Update order details button
      const detailsBtn = orderCard.querySelector(".order-details-btn");
      if (detailsBtn) {
        const icon = detailsBtn.querySelector("i");
        const iconHTML = icon
          ? icon.outerHTML
          : '<i class="fas fa-info-circle"></i>';
        detailsBtn.innerHTML = `${iconHTML} ${getTranslation(
          "orderDetailsButton"
        )}`;
      }

      // Update rating button or chip
      const ratingBtn = orderCard.querySelector(".order-rating-btn");
      const ratingChip = orderCard.querySelector(".order-rating-chip");

      if (ratingBtn) {
        const icon = ratingBtn.querySelector("i");
        const iconHTML = icon ? icon.outerHTML : '<i class="fas fa-star"></i>';
        ratingBtn.innerHTML = `${iconHTML} ${getTranslation("rateOrder")}`;
        ratingBtn.setAttribute("title", getTranslation("rateOrder"));
      }

      if (ratingChip) {
        const icon = ratingChip.querySelector("i");
        const iconHTML = icon ? icon.outerHTML : '<i class="fas fa-star"></i>';
        ratingChip.innerHTML = `${iconHTML}${getTranslation("orderRated")}`;
        ratingChip.setAttribute("title", getTranslation("orderRatedTooltip"));
      }
    });

    // Update product names in order items
    const orderItems = document.querySelectorAll(".order-item");

    orderItems.forEach((item) => {
      const nameAr = item.getAttribute("data-product-name-ar");
      const nameEn = item.getAttribute("data-product-name-en");

      if (nameAr && nameEn) {
        const displayName = lang === "en" ? nameEn : nameAr;

        // Update the product name in the details span
        const detailsSpan = item.querySelector(".order-item-details span");
        if (detailsSpan) {
          // Extract quantity from current text (e.g., "Product x 2")
          const currentText = detailsSpan.textContent;
          const quantityMatch = currentText.match(/x\s*(\d+)/);
          const quantity = quantityMatch ? quantityMatch[1] : "1";

          // Update with new language
          detailsSpan.textContent = `${displayName} x ${quantity}`;
        }

        // Update alt text of image
        const img = item.querySelector("img");
        if (img) {
          img.alt = displayName;
        }

        // Update data attribute
        item.setAttribute("data-product-name", displayName);
      }
    });

    console.log("Updated Previous Orders language display");
  } catch (error) {
    console.error("Error updating Previous Orders language:", error);
  }
}

// Function to store orders in localStorage for offline access
function storeOrdersLocally(orders) {
  try {
    if (!orders || !Array.isArray(orders) || orders.length === 0) return;

    // Store in localStorage with a reasonable limit
    const ordersToStore = orders.slice(0, 20); // Keep only the last 20 orders to save space
    localStorage.setItem("localOrders", JSON.stringify(ordersToStore));
    console.log(`Stored ${ordersToStore.length} orders in localStorage`);

    // Also store in sessionStorage for quick access during this session
    sessionStorage.setItem("recentOrders", JSON.stringify(ordersToStore));
  } catch (error) {
    console.error("Error storing orders locally:", error);
  }
}

// Function to initialize order status filters
function initOrderStatusFilters() {
  const statusFilters = document.querySelectorAll(".status-filter");
  const orderCards = document.querySelectorAll(".order-card");

  statusFilters.forEach((filter) => {
    filter.addEventListener("click", function () {
      // Remove active class from all filters
      statusFilters.forEach((f) => f.classList.remove("active"));

      // Add active class to this filter
      this.classList.add("active");

      // Get the selected status
      const selectedStatus = this.getAttribute("data-status");

      // Filter the orders
      orderCards.forEach((card) => {
        if (
          selectedStatus === "all" ||
          card.getAttribute("data-status") === selectedStatus
        ) {
          card.style.display = "block";
        } else {
          card.style.display = "none";
        }
      });
    });
  });
}

// Function to add event listeners to order card buttons
function addOrderCardEventListeners() {
  // Reorder buttons
  const reorderButtons = document.querySelectorAll(".reorder-btn");
  reorderButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-order-id");
      handleReorder(orderId);
    });
  });

  // Order details buttons
  const detailsButtons = document.querySelectorAll(".order-details-btn");
  detailsButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const orderId = this.getAttribute("data-order-id");
      showOrderDetails(orderId);
    });
  });

  // Rating buttons
  const ratingButtons = document.querySelectorAll(".order-rating-btn");
  ratingButtons.forEach((button) => {
    // Initialize disabled state and text from parent card state
    const initCard = button.closest(".order-card");
    if (initCard) {
      const initIsRated = initCard.getAttribute("data-is-rated") === "true";
      const initStatus = initCard.getAttribute("data-status");
      const initCompleted = initStatus === "completed";
      if (initIsRated || !initCompleted) {
        button.setAttribute("disabled", "true");
        button.setAttribute("aria-disabled", "true");
        button.classList.add("disabled");
        if (initIsRated) {
          // Ensure button text shows rated
          const icon = button.querySelector("i");
          button.innerHTML = "";
          const i = icon || document.createElement("i");
          if (!icon) i.className = "fas fa-star";
          const text = document.createTextNode("تم التقييم");
          button.appendChild(i);
          button.appendChild(text);
        }
      }
    }
    button.addEventListener("click", function () {
      // Ignore clicks on disabled buttons
      if (
        this.hasAttribute("disabled") ||
        this.classList.contains("disabled")
      ) {
        return;
      }
      const orderId = this.getAttribute("data-order-id");
      const orderCard = this.closest(".order-card");

      if (orderCard) {
        // Check if the order is already rated
        const isRated = orderCard.getAttribute("data-is-rated") === "true";

        if (isRated) {
          return; // Already rated; button should be disabled and inert
        }

        // Get the first product from the order
        const firstItem = orderCard.querySelector(".order-item");
        if (firstItem) {
          const productId = firstItem.getAttribute("data-product-id");
          const productName = firstItem.getAttribute("data-product-name");
          const productPrice = firstItem.getAttribute("data-product-price");
          const productImage = firstItem.getAttribute("data-product-image");

          // Open rating modal
          if (typeof window.openRatingFromPreviousOrders === "function") {
            window.openRatingFromPreviousOrders(
              orderId,
              productId,
              productName,
              productPrice,
              productImage
            );
          }
        }
      }
    });
  });
}

// Helper function to escape HTML in order items
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Function to handle reordering
async function handleReorder(orderId) {
  try {
    // Show loading indicator
    const loadingToast = showToast(
      getTranslation("reorderingOrder"),
      "info",
      0
    );

    // First, try to get order details from localStorage
    const localOrders = localStorage.getItem("localOrders");
    let order = null;

    if (localOrders) {
      try {
        const parsedOrders = JSON.parse(localOrders);
        order = parsedOrders.find(
          (order) => order.orderNumber === orderId || order.id === orderId
        );

        if (order) {
          console.log("Found order for reorder in localStorage:", order);
        }
      } catch (parseError) {
        console.error("Error parsing localStorage orders:", parseError);
      }
    }

    // If not found in localStorage, try sessionStorage
    if (!order) {
      const sessionOrders = sessionStorage.getItem("recentOrders");
      if (sessionOrders) {
        try {
          const parsedOrders = JSON.parse(sessionOrders);
          order = parsedOrders.find(
            (order) => order.orderNumber === orderId || order.id === orderId
          );

          if (order) {
            console.log("Found order for reorder in sessionStorage:", order);
          }
        } catch (parseError) {
          console.error("Error parsing sessionStorage orders:", parseError);
        }
      }
    }

    // If not found in localStorage or sessionStorage, try to extract from DOM
    if (!order) {
      const orderCard = getOrderCardById(orderId);
      if (orderCard) {
        order = extractOrderFromCard(orderCard);
        console.log("Extracted order from DOM:", order);
      }
    }

    // If not found anywhere, try API as last resort
    if (!order) {
      try {
        // Get token for authentication
        const token = getToken();
        if (!token) {
          hideToast(loadingToast);
          showLoginPrompt(
            getTranslation("loginRequired"),
            getTranslation("pleaseLoginToReorder")
          );
          return;
        }

        console.log(`Fetching order details for reorder from API: ${orderId}`);

        // Call the API with a timeout
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        }).catch((error) => {
          if (error.name === "AbortError") {
            console.log("API request timed out");
            throw new Error("API request timed out");
          }
          throw error;
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const responseData = await response.json();

        if (!responseData.success || !responseData.data) {
          throw new Error("Invalid API response format");
        }

        order = responseData.data;

        // Store for future use
        storeOrderInSession(order);
      } catch (apiError) {
        console.error("API error:", apiError);
        hideToast(loadingToast);
        showToast("عذراً، لم نتمكن من إيجاد تفاصيل الطلب", "error", 3000);
        return;
      }
    }

    // Make sure we have the order now
    if (!order || !order.items || order.items.length === 0) {
      hideToast(loadingToast);
      showToast("لا توجد عناصر في هذا الطلب", "error", 3000);
      return;
    }

    // Clear current cart
    localStorage.removeItem("cartItems");

    // Add all items from the order to cart
    let addedCount = 0;
    for (const item of order.items) {
      // Create a unique item ID if not available
      const itemId =
        item.id ||
        `item-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const itemName = item.name || getTranslation("product");
      const itemPrice = parseFloat(item.price || 0);
      const itemQuantity = parseInt(item.quantity || 1);

      // Check if the item has addons
      if (
        (item.addons && item.addons.length > 0) ||
        (item.addonsList && item.addonsList.length > 0)
      ) {
        // Get existing cart items
        try {
          // First add the item to the cart
          addToCart(
            itemId,
            itemName,
            itemPrice,
            item.image || "",
            itemQuantity
          );

          const savedCart = localStorage.getItem("cartItems");
          if (savedCart) {
            const cartItems = JSON.parse(savedCart);

            // Find the item we just added
            const cartIndex = cartItems.findIndex(
              (cartItem) => cartItem.id === itemId
            );

            if (cartIndex !== -1) {
              // Process addons - prefer addonsList if available as it's already formatted
              let addonsList = [];

              if (item.addonsList && item.addonsList.length > 0) {
                // Use the existing addonsList directly
                addonsList = item.addonsList;
              } else if (item.addons && item.addons.length > 0) {
                // Convert addons to addonsList format
                item.addons.forEach((addon) => {
                  if (addon.name || addon.title) {
                    addonsList.push({
                      name: addon.name || addon.title,
                      nameEn: addon.nameEn || addon.titleEn || "",
                      sectionTitle: addon.title || "",
                      sectionTitleEn: addon.titleEn || "",
                      optionName: addon.name || "",
                      optionNameEn: addon.nameEn || "",
                      price: parseFloat(addon.price || 0),
                    });
                  } else if (addon.options && addon.options.length) {
                    addon.options.forEach((option) => {
                      if (option.selected || option.isSelected) {
                        addonsList.push({
                          name:
                            (addon.title ? addon.title + ": " : "") +
                            (option.name || getTranslation("addonSection")),
                          nameEn:
                            (addon.titleEn ? addon.titleEn + ": " : "") +
                            (option.nameEn || option.name || ""),
                          sectionTitle: addon.title || "",
                          sectionTitleEn: addon.titleEn || "",
                          optionName: option.name || "",
                          optionNameEn: option.nameEn || "",
                          price: parseFloat(option.price || 0),
                        });
                      }
                    });
                  }
                });
              }

              // Store the addons list
              if (addonsList.length > 0) {
                cartItems[cartIndex].addonsList = addonsList;

                // Calculate the total price including addons
                let totalAddonPrice = 0;
                addonsList.forEach((addon) => {
                  totalAddonPrice += parseFloat(addon.price || 0);
                });

                // Update the item price to include addons
                cartItems[cartIndex].price = itemPrice;
                cartItems[cartIndex].basePrice = itemPrice - totalAddonPrice;
              }

              // Save updated cart
              localStorage.setItem("cartItems", JSON.stringify(cartItems));
            }
          }
        } catch (cartError) {
          console.error("Error updating cart with addons:", cartError);
          // Fallback: add without addons
          addToCart(
            itemId,
            itemName,
            itemPrice,
            item.image || "",
            itemQuantity
          );
        }
      } else {
        // No addons, add directly to cart
        addToCart(itemId, itemName, itemPrice, item.image || "", itemQuantity);
      }

      addedCount += itemQuantity;
    }

    // Hide loading toast and show success message
    hideToast(loadingToast);

    // Check if our custom showCartSuccessToast function exists
    if (typeof showCartSuccessToast === "function") {
      // Use our enhanced cart success toast if available
      const lang = localStorage.getItem("public-language") || "ar";
      const cartMessage =
        lang === "en"
          ? `Added ${addedCount} item${addedCount > 1 ? "s" : ""} to cart`
          : `تمت إضافة ${addedCount} عنصر إلى السلة`;
      showCartSuccessToast(cartMessage, addedCount);
    } else {
      // Fallback to regular toast
      const lang = localStorage.getItem("public-language") || "ar";
      const cartMessage =
        lang === "en"
          ? `Added ${addedCount} item${addedCount > 1 ? "s" : ""} to cart`
          : `تمت إضافة ${addedCount} عنصر إلى السلة`;
      showToast(cartMessage, "success", 3000);
    }

    // Update cart count
    updateCartCountFromStorage();

    // Try to redirect to cart section
    try {
      // First try the cart section link
      const cartSectionLink = document.querySelector(".cart-section-link");
      if (cartSectionLink) {
        cartSectionLink.click();
        return;
      }

      // If that doesn't exist, try the cart icon in the bottom nav
      const cartIcon = document.querySelector("#cart-icon");
      if (cartIcon) {
        cartIcon.click();
        return;
      }

      // If neither exists, try to find a cart link with href
      const cartLink = document.querySelector('a[href*="cart"]');
      if (cartLink) {
        cartLink.click();
        return;
      }

      // If all else fails, try to redirect to cart.html
      const currentUrl = window.location.href;
      const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
      window.location.href = "/pages/cart.html";
    } catch (navigationError) {
      console.error("Error navigating to cart:", navigationError);
      // Show a message to the user that items were added but navigation failed
      showToast(
        "تمت إضافة العناصر للسلة. يرجى الانتقال للسلة يدوياً.",
        "info",
        5000
      );
    }
  } catch (error) {
    console.error("Error reordering:", error);
    hideToast(loadingToast);
    showToast(getTranslation("reorderError"), "error", 3000);
  }
}

// Helper function to show toast notifications
function showToast(message, type = "info", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="${getToastIcon(type)}"></i>
      <div class="toast-message">${message}</div>
    </div>
    ${duration === 0 ? '<div class="toast-loader"></div>' : ""}
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto hide after duration (if not 0)
  if (duration > 0) {
    setTimeout(() => {
      hideToast(toast);
    }, duration);
  }

  return toast;
}

// Helper function to hide toast
function hideToast(toast) {
  if (!toast) return;

  toast.classList.remove("show");
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

// Helper function to get toast icon
function getToastIcon(type) {
  switch (type) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-exclamation-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    case "info":
    default:
      return "fas fa-info-circle";
  }
}

// Function to show order details
async function showOrderDetails(orderId) {
  try {
    // Show loading indicator
    const loadingToast = showToast(getTranslation("loadingDetails"), "info", 0);

    // First, try to get order details from localStorage
    const localOrders = localStorage.getItem("localOrders");
    let localOrder = null;

    if (localOrders) {
      try {
        const parsedOrders = JSON.parse(localOrders);
        localOrder = parsedOrders.find(
          (order) => order.orderNumber === orderId || order.id === orderId
        );

        if (localOrder) {
          console.log("Found order in localStorage:", localOrder);
        }
      } catch (parseError) {
        console.error("Error parsing localStorage orders:", parseError);
      }
    }

    // If we find the order in localStorage, use it
    if (localOrder) {
      hideToast(loadingToast);
      createOrderDetailsModal(localOrder);
      return;
    }

    // Otherwise try from sessionStorage
    const sessionOrders = sessionStorage.getItem("recentOrders");
    if (sessionOrders) {
      try {
        const parsedOrders = JSON.parse(sessionOrders);
        const sessionOrder = parsedOrders.find(
          (order) => order.orderNumber === orderId || order.id === orderId
        );

        if (sessionOrder) {
          console.log("Found order in sessionStorage:", sessionOrder);
          hideToast(loadingToast);
          createOrderDetailsModal(sessionOrder);
          return;
        }
      } catch (parseError) {
        console.error("Error parsing sessionStorage orders:", parseError);
      }
    }

    // If not found in localStorage or sessionStorage, try API
    try {
      // Get token for authentication
      const token = getToken();
      if (!token) {
        hideToast(loadingToast);
        showLoginPrompt(
          getTranslation("loginRequired"),
          getTranslation("pleaseLoginToViewOrderDetails")
        );
        return;
      }

      console.log(`Fetching order details from API for: ${orderId}`);

      // Call the API with a timeout to prevent long-running requests
      const controller = new AbortController();
      const signal = controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal,
      }).catch((error) => {
        if (error.name === "AbortError") {
          console.log("API request timed out");
          throw new Error("API request timed out");
        }
        throw error;
      });

      clearTimeout(timeoutId);

      if (response.status === 500) {
        // For server errors, let's try a backup approach
        throw new Error("Server error");
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log("API response:", responseData);

      if (!responseData.success || !responseData.data) {
        throw new Error("Invalid API response format");
      }

      // Store the order in sessionStorage for future quick access
      const order = responseData.data;
      storeOrderInSession(order);

      // Hide loading toast and show the modal
      hideToast(loadingToast);
      createOrderDetailsModal(order);
    } catch (apiError) {
      console.error("API error:", apiError);

      // If API fails, try using data from the orders grid if available
      const orderCards = document.querySelectorAll(".order-card");
      for (const card of orderCards) {
        const cardOrderId = card.querySelector(".order-id").textContent;
        if (cardOrderId === orderId) {
          console.log("Found order in DOM:", card);
          const order = extractOrderFromCard(card);

          if (order) {
            hideToast(loadingToast);
            createOrderDetailsModal(order);
            return;
          }
        }
      }

      // If all else fails, create a minimal order object
      const minimalOrder = {
        id: orderId,
        orderNumber: orderId,
        date: new Date().toISOString(),
        status: "unknown",
        items: [],
        subtotal: 0,
        total: 0,
      };

      // Try to get at least some data from the DOM
      const orderCard = getOrderCardById(orderId);
      if (orderCard) {
        const statusElement = orderCard.querySelector(".order-status");
        if (statusElement) {
          minimalOrder.status =
            statusElement.getAttribute("data-status") ||
            statusElement.textContent;
        }

        const dateText =
          orderCard.querySelector(".order-date span").textContent;
        // Extract just the date part, removing the label
        const dateMatch = dateText.match(/:\s*(.+)$/);
        const date = dateMatch ? dateMatch[1].trim() : dateText;

        const totalElement = orderCard.querySelector(".total-price");
        if (totalElement) {
          const totalText = totalElement.textContent;
          const totalMatch = totalText.match(/(\d+(\.\d+)?)/);
          if (totalMatch) {
            minimalOrder.total = parseFloat(totalMatch[1]);
            minimalOrder.subtotal = minimalOrder.total;
          }
        }

        // Extract items if possible
        const itemElements = orderCard.querySelectorAll(".order-item");
        if (itemElements.length > 0) {
          itemElements.forEach((itemElement) => {
            const nameAndQty =
              itemElement.querySelector("span:first-child").textContent;
            const priceText =
              itemElement.querySelector("span:last-child").textContent;

            // Extract quantity (e.g., "Item name x 2")
            const qtyMatch = nameAndQty.match(/(.*)\s+x\s+(\d+)/);
            const name = qtyMatch ? qtyMatch[1].trim() : nameAndQty.trim();
            const quantity = qtyMatch ? parseInt(qtyMatch[2]) : 1;

            // Extract price
            const priceMatch = priceText.match(/(\d+(\.\d+)?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

            minimalOrder.items.push({
              name,
              quantity,
              price: price / quantity,
            });
          });
        }
      }

      hideToast(loadingToast);
      createOrderDetailsModal(minimalOrder);
    }
  } catch (error) {
    console.error("Error showing order details:", error);
    showToast("عذراً، حدث خطأ أثناء تحميل تفاصيل الطلب", "error", 3000);
  }
}

// Function to extract order data from a card in the DOM
function extractOrderFromCard(orderCard) {
  try {
    const orderId = orderCard.querySelector(".order-id").textContent;
    const statusElement = orderCard.querySelector(".order-status");
    const status =
      statusElement.getAttribute("data-status") || statusElement.textContent;
    const dateText = orderCard.querySelector(".order-date span").textContent;

    // Extract items
    const items = [];
    const itemElements = orderCard.querySelectorAll(".order-item");
    itemElements.forEach((itemElement) => {
      const nameAndQty =
        itemElement.querySelector("span:first-child").textContent;
      const priceText =
        itemElement.querySelector("span:last-child").textContent;

      // Extract quantity (e.g., "Item name x 2")
      const qtyMatch = nameAndQty.match(/(.*)\s+x\s+(\d+)/);
      const name = qtyMatch ? qtyMatch[1].trim() : nameAndQty.trim();
      const quantity = qtyMatch ? parseInt(qtyMatch[2]) : 1;

      // Extract price
      const priceMatch = priceText.match(/(\d+(\.\d+)?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 0;

      items.push({
        name,
        quantity,
        price: price / quantity,
      });
    });

    // Extract total
    const totalText = orderCard.querySelector(".total-price").textContent;
    const totalMatch = totalText.match(/(\d+(\.\d+)?)/);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 0;

    return {
      id: orderId,
      orderNumber: orderId,
      date: new Date().toISOString(),
      formattedDate: dateText,
      status,
      items,
      subtotal: total,
      total,
    };
  } catch (error) {
    console.error("Error extracting order from card:", error);
    return null;
  }
}

// Helper function to get an order card by id
function getOrderCardById(orderId) {
  const orderCards = document.querySelectorAll(".order-card");
  for (const card of orderCards) {
    const cardOrderId = card.querySelector(".order-id").textContent;
    if (cardOrderId === orderId) {
      return card;
    }
  }
  return null;
}

// Function to store an order in session storage for quick retrieval
function storeOrderInSession(order) {
  try {
    // Get existing orders from session storage
    const existingOrders = sessionStorage.getItem("recentOrders");
    let orders = [];

    if (existingOrders) {
      orders = JSON.parse(existingOrders);
    }

    // Check if order already exists
    const existingIndex = orders.findIndex(
      (o) => o.orderNumber === order.orderNumber || o.id === order.id
    );

    if (existingIndex >= 0) {
      // Update existing order
      orders[existingIndex] = order;
    } else {
      // Add new order
      orders.push(order);

      // Limit to last 10 orders to prevent session storage from getting too large
      if (orders.length > 10) {
        orders = orders.slice(-10);
      }
    }

    // Save back to session storage
    sessionStorage.setItem("recentOrders", JSON.stringify(orders));
  } catch (error) {
    console.error("Error storing order in session:", error);
  }
}

// Function to create and show the order details modal
function createOrderDetailsModal(order) {
  try {
    // Validate required order data
    if (!order) {
      showToast("بيانات الطلب غير متوفرة", "error", 3000);
      return;
    }

    // Check if dark mode is active - use the same logic as the page
    const isDarkMode = !document.body.classList.contains("light-mode");

    // Get current language and currency
    const currentLang = localStorage.getItem("public-language") || "ar";
    const currencyText =
      typeof getCurrencyText === "function"
        ? getCurrencyText()
        : currentLang === "en"
        ? "EGP"
        : "جنيه";

    // Remove any existing modal
    const existingModal = document.getElementById("order-details-modal");
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // Format date with error handling
    let formattedDate = "";
    try {
      const orderDate = new Date(order.date || Date.now());
      // Get current language with fallback
      let currentLang = "ar"; // default to Arabic
      if (typeof getCurrentLanguage === "function") {
        currentLang = getCurrentLanguage();
      } else {
        currentLang = localStorage.getItem("public-language") || "ar";
      }

      const locale = currentLang === "ar" ? "ar-EG" : "en-US";

      formattedDate = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(orderDate);
    } catch (dateError) {
      console.error("Error formatting date:", dateError);
      formattedDate = currentLang === "ar" ? "غير متوفر" : "Not available";
    }

    // Create status badge class based on status
    let statusClass = "";
    let statusText = "";

    switch (order.status) {
      case "completed":
        statusClass = "status-completed";
        statusText = getTranslation("statusCompleted");
        break;
      case "processing":
        statusClass = "status-processing";
        statusText = getTranslation("statusProcessing");
        break;
      case "cancelled":
        statusClass = "status-cancelled";
        statusText = getTranslation("statusCancelled");
        break;
      case "pending":
        statusClass = "status-pending";
        statusText = getTranslation("statusPending");
        break;
      default:
        statusClass = "";
        statusText = order.status || getTranslation("statusUnknown");
    }

    // Generate items list HTML with addons
    let itemsHTML = "";

    // Check if items array exists
    if (Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach((item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1);
        const totalItemPrice = itemPrice * itemQuantity;

        // Generate addons HTML if available with more detailed formatting
        let addonsHTML = "";
        let addonsCount = 0;

        // Process structured addons (with sections and options)
        if (Array.isArray(item.addons) && item.addons.length > 0) {
          // First check if we have a complex addon structure with sections and options
          const hasComplexStructure = item.addons.some(
            (addon) =>
              addon.options ||
              addon.title ||
              (addon.name && Array.isArray(addon.options))
          );

          if (hasComplexStructure) {
            // Complex structure with sections and options
            addonsHTML += '<div class="item-addons">';

            // Group addons by section
            item.addons.forEach((section) => {
              // Check if it's a section with options
              if (section.title || section.name) {
                // Get section title based on language
                const sectionTitle =
                  currentLang === "en" && section.titleEn
                    ? section.titleEn
                    : section.title || section.name;

                // Add section header
                addonsHTML += `<div class="addon-section-title">${sectionTitle}</div>`;

                // Add options
                if (
                  Array.isArray(section.options) &&
                  section.options.length > 0
                ) {
                  section.options.forEach((option) => {
                    addonsCount++;
                    // Get option name based on language
                    const optionName =
                      currentLang === "en" && option.nameEn
                        ? option.nameEn
                        : option.name ||
                          option.title ||
                          getTranslation("addonSection");

                    addonsHTML += `
                      <div class="item-addon">
                        <span class="addon-name">• ${optionName}</span>
                        ${
                          option.price > 0
                            ? `<span class="addon-price">+${parseFloat(
                                option.price
                              ).toFixed(2)} ${currencyText}</span>`
                            : ""
                        }
                      </div>
                    `;
                  });
                }
              } else {
                // Simple addon (could be directly in the array)
                addonsCount++;
                // Get addon name based on language
                const addonName =
                  currentLang === "en" && section.nameEn
                    ? section.nameEn
                    : section.name || getTranslation("addonSection");

                addonsHTML += `
                  <div class="item-addon">
                    <span class="addon-name">• ${addonName}</span>
                    ${
                      section.price > 0
                        ? `<span class="addon-price">+${parseFloat(
                            section.price
                          ).toFixed(2)} ${currencyText}</span>`
                        : ""
                    }
                  </div>
                `;
              }
            });

            addonsHTML += "</div>";
          } else {
            // Simple array of addon objects
            addonsHTML += '<div class="item-addons">';

            item.addons.forEach((addon) => {
              addonsCount++;
              // Get addon name based on language
              const addonName =
                currentLang === "en" && addon.nameEn
                  ? addon.nameEn
                  : addon.name ||
                    addon.title ||
                    (currentLang === "en" ? "Add-on" : "إضافة");

              addonsHTML += `
                <div class="item-addon">
                  <span class="addon-name">• ${addonName}</span>
                  ${
                    addon.price > 0
                      ? `<span class="addon-price">+${parseFloat(
                          addon.price
                        ).toFixed(2)} ${currencyText}</span>`
                      : ""
                  }
                </div>
              `;
            });

            addonsHTML += "</div>";
          }
        }

        // Process addonsList (alternative flatter format)
        if (
          addonsCount === 0 &&
          Array.isArray(item.addonsList) &&
          item.addonsList.length > 0
        ) {
          addonsHTML += '<div class="item-addons">';

          // Sort addons by price, with higher prices first
          const sortedAddons = [...item.addonsList].sort(
            (a, b) => parseFloat(b.price || 0) - parseFloat(a.price || 0)
          );

          sortedAddons.forEach((addon) => {
            // Get addon name based on language
            const displayName =
              currentLang === "en" && addon.nameEn ? addon.nameEn : addon.name;

            // Check if the addon name has a format like "Section: Option"
            const nameParts =
              typeof displayName === "string" ? displayName.split(":") : [];

            const addonPrice = parseFloat(addon.price || 0);

            if (nameParts.length > 1) {
              // This is likely a "Section: Option" format
              const sectionName = nameParts[0].trim();
              const optionName = nameParts[1].trim();

              addonsHTML += `
                <div class="item-addon">
                  <span class="addon-name">
                    <span class="addon-section">${sectionName}:</span> 
                    <span class="addon-option">${optionName}</span>
                  </span>
                  ${
                    addonPrice > 0
                      ? `<span class="addon-price">+${addonPrice.toFixed(
                          2
                        )} ${currencyText}</span>`
                      : `<span class="addon-price free">${getTranslation(
                          "freeAddon"
                        )}</span>`
                  }
                </div>
              `;
            } else {
              // Standard addon format
              const addonName =
                displayName || (currentLang === "en" ? "Add-on" : "إضافة");
              addonsHTML += `
                <div class="item-addon">
                  <span class="addon-name">• ${addonName}</span>
                  ${
                    addonPrice > 0
                      ? `<span class="addon-price">+${addonPrice.toFixed(
                          2
                        )} ${currencyText}</span>`
                      : `<span class="addon-price free">${getTranslation(
                          "freeAddon"
                        )}</span>`
                  }
                </div>
              `;
            }
          });

          addonsHTML += "</div>";
        }

        // Add notes if available
        let notesHTML = "";
        if (item.notes && item.notes.trim() !== "") {
          notesHTML = `<div class="item-notes">${getTranslation("itemNotes")} ${
            item.notes
          }</div>`;
        }

        // Display product name based on current language
        const displayItemName =
          currentLang === "en" && item.nameEn
            ? item.nameEn
            : item.nameAr || item.name || getTranslation("product");

        itemsHTML += `
          <div class="order-detail-item">
            <div class="item-header">
              <div class="item-name-qty">
                <span class="item-name">${displayItemName}</span>
                <span class="item-quantity">×${itemQuantity}</span>
              </div>
              <span class="item-price">${totalItemPrice.toFixed(
                2
              )} ${currencyText}</span>
            </div>
            ${addonsHTML}
            ${notesHTML}
          </div>
        `;
      });
    } else {
      // If no items are available
      itemsHTML = `
        <div class="no-items-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>${getTranslation("noItemsAvailable")}</p>
        </div>
      `;
    }

    // Safely get order properties
    const orderId = order.orderNumber || order.id || "غير متوفر";
    const subtotal = parseFloat(order.subtotal || 0).toFixed(2);
    const total = parseFloat(order.total || 0).toFixed(2);

    // Create the modal HTML
    const modalHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-container">
        <div class="modal-header">
          <h3>${getTranslation(
            "orderDetailsTitle"
          )} <span class="order-id-badge">#${orderId}</span></h3>
          <button class="modal-close-btn">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="order-detail-section order-info">
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-calendar-alt"></i>
                ${getTranslation("orderDateLabel")}
              </div>
              <div class="detail-value">${formattedDate}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-info-circle"></i>
                ${getTranslation("orderStatusLabel")}
              </div>
              <div class="detail-value">
                <span class="status-badge modal-${statusClass}">${statusText}</span>
              </div>
            </div>
            
            ${
              order.tableNumber
                ? `
            <div class="detail-row">
              <div class="detail-label">
                <i class="fas fa-chair"></i>
                ${getTranslation("tableNumberLabel")}
              </div>
              <div class="detail-value">${order.tableNumber}</div>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="order-detail-section order-items">
            <h4>${getTranslation("orderItemsTitle")}</h4>
            <div class="order-items-list">
              ${itemsHTML}
            </div>
          </div>
          
          <div class="order-detail-section order-summary">
            <h4>${getTranslation("orderSummaryTitle")}</h4>
            
            <div class="summary-row">
              <div class="summary-label">${getTranslation(
                "subtotalLabel"
              )}</div>
              <div class="summary-value">${subtotal} ${currencyText}</div>
            </div>
            
            ${
              order.tax
                ? `
            <div class="summary-row">
              <div class="summary-label">${getTranslation("taxLabel")} (${
                    order.tax.rate || 0
                  }%):</div>
              <div class="summary-value">${parseFloat(
                order.tax.value || 0
              ).toFixed(2)} ${currencyText}</div>
            </div>
            `
                : ""
            }
            
            ${
              order.serviceTax
                ? `
            <div class="summary-row">
              <div class="summary-label">${getTranslation(
                "serviceTaxLabel"
              )} (${order.serviceTax.rate || 0}%):</div>
              <div class="summary-value">${parseFloat(
                order.serviceTax.value || 0
              ).toFixed(2)} ${currencyText}</div>
            </div>
            `
                : ""
            }
            
            ${
              order.discount && order.discount.value > 0
                ? `
            <div class="summary-row discount">
              <div class="summary-label">${getTranslation("discountLabel")}${
                    order.discount.code ? ` (${order.discount.code})` : ""
                  }:</div>
              <div class="summary-value">-${parseFloat(
                order.discount.value
              ).toFixed(2)} ${currencyText}</div>
            </div>
            `
                : ""
            }
            
            <div class="summary-row total">
              <div class="summary-label">${getTranslation("totalLabel")}</div>
              <div class="summary-value">${total} ${currencyText}</div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="reorder-btn-modal" data-order-id="${orderId}">
            <i class="fas fa-redo"></i>
            ${getTranslation("reorderButton")}
          </button>
          <button class="close-modal-btn">${getTranslation(
            "closeButton"
          )}</button>
        </div>
      </div>
    `;

    // Create modal element
    const modalElement = document.createElement("div");
    modalElement.id = "order-details-modal";
    // Apply theme class based on body class
    const currentTheme = document.body.classList.contains("light-mode")
      ? ""
      : "dark-theme";
    modalElement.className = `modal ${currentTheme}`;
    modalElement.innerHTML = modalHTML;

    // Add to body
    document.body.appendChild(modalElement);

    // Add event listeners
    const closeButtons = modalElement.querySelectorAll(
      ".modal-close-btn, .close-modal-btn, .modal-backdrop"
    );
    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeOrderDetailsModal();
      });
    });

    // Add reorder button event listener
    const reorderBtn = modalElement.querySelector(".reorder-btn-modal");
    if (reorderBtn) {
      reorderBtn.addEventListener("click", function () {
        const orderId = this.getAttribute("data-order-id");
        closeOrderDetailsModal();
        handleReorder(orderId);
      });
    }

    // Add modal styles if they don't exist
    if (!document.getElementById("order-details-modal-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "order-details-modal-styles";
      styleEl.textContent = `
        /* Namespace all modal styles to prevent leaking to the rest of the page */
        #order-details-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        #order-details-modal .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
        }
        
        #order-details-modal .modal-container {
          position: relative;
          width: 90%;
          max-width: 550px;
          max-height: 90vh;
          background-color: var(--card-bg, #131c32);
          color: var(--text-light, #ffffff);
          border-radius: var(--card-radius, 15px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalFadeIn 0.3s ease;
          direction: rtl;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        #order-details-modal .modal-container::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--primary-color, #42d158), #39b64d);
          z-index: 1;
        }
        
        /* Light theme styles */
        body.light-mode #order-details-modal .modal-container {
          background-color: var(--card-bg, #ffffff);
          color: var(--text-light, #343a40);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        /* Dark theme styles */
        #order-details-modal.dark-theme .modal-container {
          background-color: var(--card-bg, #131c32);
          color: var(--text-light, #ffffff);
        }
        
        #order-details-modal.dark-theme .modal-header {
          background-color: rgba(19, 28, 50, 0.8);
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }
        
        #order-details-modal.dark-theme .modal-footer {
          background-color: rgba(19, 28, 50, 0.8);
          border-top-color: rgba(255, 255, 255, 0.1);
        }
        
        body.light-mode #order-details-modal .modal-header {
          background-color: #f8f9fa;
          border-bottom-color: #e9ecef;
        }
        
        body.light-mode #order-details-modal .modal-footer {
          background-color: #f8f9fa;
          border-top-color: #e9ecef;
        }
        
        #order-details-modal.dark-theme .order-id-badge {
          background-color: rgba(66, 209, 88, 0.2);
          color: var(--primary-color, #42d158);
          border: 1px solid rgba(66, 209, 88, 0.3);
        }
        
        body.light-mode #order-details-modal .order-id-badge {
          background-color: rgba(66, 209, 88, 0.1);
          color: var(--primary-color, #42d158);
          border: 1px solid rgba(66, 209, 88, 0.2);
        }
        
        #order-details-modal.dark-theme .detail-label,
        #order-details-modal.dark-theme .summary-label,
        #order-details-modal.dark-theme .item-quantity,
        #order-details-modal.dark-theme .addon-name {
          color: var(--text-secondary, #a0a0a0);
        }
        
        body.light-mode #order-details-modal .detail-label,
        body.light-mode #order-details-modal .summary-label,
        body.light-mode #order-details-modal .item-quantity,
        body.light-mode #order-details-modal .addon-name {
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal.dark-theme .order-detail-section h4 {
          color: var(--text-light, #ffffff);
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }
        
        body.light-mode #order-details-modal .order-detail-section h4 {
          color: var(--text-light, #343a40);
          border-bottom-color: #e9ecef;
        }
        
        #order-details-modal.dark-theme .order-detail-item {
          background-color: rgba(19, 28, 50, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        body.light-mode #order-details-modal .order-detail-item {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
        }
        
        #order-details-modal.dark-theme .item-addons {
          background-color: rgba(19, 28, 50, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        body.light-mode #order-details-modal .item-addons {
          background-color: #ffffff;
          border: 1px solid #e9ecef;
        }
        
        #order-details-modal.dark-theme .summary-row:not(:last-child) {
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }
        
        body.light-mode #order-details-modal .summary-row:not(:last-child) {
          border-bottom-color: #e9ecef;
        }
        
        #order-details-modal.dark-theme .summary-row.total {
          border-top-color: var(--primary-color, #42d158);
        }
        
        body.light-mode #order-details-modal .summary-row.total {
          border-top-color: var(--primary-color, #42d158);
        }
        
        #order-details-modal.dark-theme .close-modal-btn {
          background-color: rgba(19, 28, 50, 0.5);
          color: var(--text-light, #ffffff);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        #order-details-modal.dark-theme .close-modal-btn:hover {
          background-color: rgba(19, 28, 50, 0.8);
          border-color: var(--primary-color, #42d158);
        }
        
        body.light-mode #order-details-modal .close-modal-btn {
          background-color: #e9ecef;
          color: #495057;
          border: 1px solid #dee2e6;
        }
        
        body.light-mode #order-details-modal .close-modal-btn:hover {
          background-color: #dee2e6;
          border-color: var(--primary-color, #42d158);
        }
        
        #order-details-modal.dark-theme .no-items-message {
          background-color: rgba(19, 28, 50, 0.5);
          color: var(--text-secondary, #a0a0a0);
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
        
        body.light-mode #order-details-modal .no-items-message {
          background-color: #f8f9fa;
          color: var(--text-secondary, #6c757d);
          border: 1px dashed #dee2e6;
        }
        
        #order-details-modal.dark-theme .no-items-message i {
          color: var(--text-secondary, #a0a0a0);
        }
        
        body.light-mode #order-details-modal .no-items-message i {
          color: #adb5bd;
        }
        
        /* Status badges in dark mode - with modal- prefix to avoid conflicts */
        #order-details-modal .modal-status-completed {
          background-color: #d1e7dd;
          color: #0f5132;
        }
        
        #order-details-modal .modal-status-processing {
          background-color: #cff4fc;
          color: #055160;
        }
        
        #order-details-modal .modal-status-cancelled {
          background-color: #f8d7da;
          color: #842029;
        }
        
        #order-details-modal .modal-status-pending {
          background-color: #fff3cd;
          color: #664d03;
        }
        
        /* Status badges in dark mode */
        #order-details-modal.dark-theme .modal-status-completed {
          background-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        
        #order-details-modal.dark-theme .modal-status-processing {
          background-color: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }
        
        #order-details-modal.dark-theme .modal-status-cancelled {
          background-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        
        #order-details-modal.dark-theme .modal-status-pending {
          background-color: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
        }
        
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        #order-details-modal .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background-color: rgba(19, 28, 50, 0.8);
          position: relative;
        }
        
        body.light-mode #order-details-modal .modal-header {
          border-bottom-color: #e9ecef;
          background-color: #f8f9fa;
        }
        
        #order-details-modal .modal-header h3 {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 600;
          color: var(--text-light, #ffffff);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        body.light-mode #order-details-modal .modal-header h3 {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .order-id-badge {
          background-color: rgba(66, 209, 88, 0.2);
          color: var(--primary-color, #42d158);
          padding: 4px 12px;
          border-radius: var(--button-radius, 8px);
          font-size: 0.85rem;
          font-weight: 600;
          border: 1px solid rgba(66, 209, 88, 0.3);
        }
        
        body.light-mode #order-details-modal .order-id-badge {
          background-color: rgba(66, 209, 88, 0.1);
          border-color: rgba(66, 209, 88, 0.2);
        }
        
        #order-details-modal .modal-close-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 1.1rem;
          cursor: pointer;
          color: var(--text-light, #ffffff);
          padding: 8px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        #order-details-modal .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: var(--primary-color, #42d158);
          transform: rotate(90deg);
        }
        
        body.light-mode #order-details-modal .modal-close-btn {
          background: #e9ecef;
          border-color: #dee2e6;
          color: #495057;
        }
        
        body.light-mode #order-details-modal .modal-close-btn:hover {
          background: #dee2e6;
          border-color: var(--primary-color, #42d158);
        }
        
        #order-details-modal .modal-body {
          padding: 24px;
          overflow-y: auto;
          max-height: calc(90vh - 180px);
          background-color: transparent;
        }
        
        #order-details-modal .order-detail-section {
          margin-bottom: 28px;
        }
        
        #order-details-modal .order-detail-section:last-child {
          margin-bottom: 0;
        }
        
        #order-details-modal .order-info {
          background: rgba(19, 28, 50, 0.5);
          padding: 20px;
          border-radius: var(--card-radius, 15px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 24px;
        }
        
        body.light-mode #order-details-modal .order-info {
          background: #f8f9fa;
          border-color: #e9ecef;
        }
        
        #order-details-modal .order-summary {
          background: rgba(19, 28, 50, 0.5);
          padding: 20px;
          border-radius: var(--card-radius, 15px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        body.light-mode #order-details-modal .order-summary {
          background: #f8f9fa;
          border-color: #e9ecef;
        }
        
        #order-details-modal .order-detail-section h4 {
          margin: 0 0 16px;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-light, #ffffff);
          padding-bottom: 12px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        body.light-mode #order-details-modal .order-detail-section h4 {
          color: var(--text-light, #343a40);
          border-bottom-color: #e9ecef;
        }
        
        #order-details-modal .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding: 10px 0;
        }
        
        #order-details-modal .detail-row:last-child {
          margin-bottom: 0;
        }
        
        #order-details-modal .detail-label {
          color: var(--text-secondary, #a0a0a0);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.95rem;
          font-weight: 500;
        }
        
        body.light-mode #order-details-modal .detail-label {
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal .detail-label i {
          color: var(--primary-color, #42d158);
          font-size: 1rem;
          width: 18px;
          text-align: center;
        }
        
        #order-details-modal .detail-value {
          font-weight: 600;
          color: var(--text-light, #ffffff);
          font-size: 0.95rem;
        }
        
        body.light-mode #order-details-modal .detail-value {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .status-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        
        #order-details-modal .order-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        #order-details-modal .order-detail-item {
          padding: 16px;
          border-radius: var(--card-radius, 15px);
          background-color: rgba(19, 28, 50, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s ease;
        }
        
        #order-details-modal .order-detail-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(66, 209, 88, 0.15);
          border-color: rgba(66, 209, 88, 0.3);
        }
        
        body.light-mode #order-details-modal .order-detail-item {
          background-color: #f8f9fa;
          border-color: #e9ecef;
        }
        
        body.light-mode #order-details-modal .order-detail-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          border-color: rgba(66, 209, 88, 0.3);
        }
        
        #order-details-modal .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        #order-details-modal .item-name-qty {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        #order-details-modal .item-name {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-light, #ffffff);
          margin-bottom: 0;
        }
        
        body.light-mode #order-details-modal .item-name {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .item-quantity {
          color: var(--text-secondary, #a0a0a0);
          font-size: 0.875rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 8px;
          border-radius: 6px;
          display: inline-block;
          width: fit-content;
          font-weight: 600;
        }
        
        body.light-mode #order-details-modal .item-quantity {
          color: var(--text-secondary, #6c757d);
          background: #e9ecef;
        }
        
        #order-details-modal .item-price {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--primary-color, #42d158);
        }
        
        #order-details-modal .item-addons {
          margin: 12px 0 0 0;
          padding: 12px;
          border-radius: var(--button-radius, 8px);
          background-color: rgba(19, 28, 50, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        body.light-mode #order-details-modal .item-addons {
          background-color: #ffffff;
          border-color: #e9ecef;
        }
        
        /* Add styling for addon section titles */
        #order-details-modal .addon-section-title {
          font-weight: 700;
          color: var(--text-secondary, #a0a0a0);
          margin-top: 8px;
          margin-bottom: 6px;
          font-size: 0.875rem;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
          padding-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        body.light-mode #order-details-modal .addon-section-title {
          color: var(--text-secondary, #6c757d);
          border-bottom-color: #e9ecef;
        }
        
        #order-details-modal .item-addon {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          padding: 6px 8px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }
        
        #order-details-modal .item-addon:hover {
          background-color: rgba(66, 209, 88, 0.05);
        }
        
        body.light-mode #order-details-modal .item-addon:hover {
          background-color: rgba(66, 209, 88, 0.08);
        }
        
        #order-details-modal .addon-name {
          color: var(--text-secondary, #a0a0a0);
          font-weight: 500;
        }
        
        body.light-mode #order-details-modal .addon-name {
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal .addon-section {
          font-weight: 600;
          color: var(--text-light, #ffffff);
        }
        
        body.light-mode #order-details-modal .addon-section {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .addon-option {
          font-weight: 500;
        }
        
        #order-details-modal .addon-price {
          font-weight: 600;
          color: var(--primary-color, #42d158);
          font-size: 0.875rem;
        }
        
        #order-details-modal .item-notes {
          margin-top: 10px;
          padding: 10px 12px;
          font-size: 0.875rem;
          color: var(--text-secondary, #a0a0a0);
          font-style: italic;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--button-radius, 8px);
          border-right: 3px solid var(--primary-color, #42d158);
          border-left: none;
        }
        
        html[dir="ltr"] #order-details-modal .item-notes {
          border-right: none;
          border-left: 3px solid var(--primary-color, #42d158);
        }
        
        body.light-mode #order-details-modal .item-notes {
          background: #f8f9fa;
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal .no-items-message {
          padding: 40px 20px;
          text-align: center;
          background-color: rgba(19, 28, 50, 0.5);
          border-radius: var(--card-radius, 15px);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          color: var(--text-secondary, #a0a0a0);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        
        body.light-mode #order-details-modal .no-items-message {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal .no-items-message i {
          font-size: 3rem;
          color: var(--text-secondary, #a0a0a0);
          opacity: 0.7;
        }
        
        body.light-mode #order-details-modal .no-items-message i {
          color: #adb5bd;
        }
        
        #order-details-modal .no-items-message p {
          font-size: 1rem;
          font-weight: 500;
          margin: 0;
        }
        
        #order-details-modal .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          transition: padding 0.2s;
        }
        
        #order-details-modal .summary-row:not(:last-child):not(.total) {
          border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
        }
        
        body.light-mode #order-details-modal .summary-row:not(:last-child):not(.total) {
          border-bottom-color: #e9ecef;
        }
        
        #order-details-modal .summary-label {
          color: var(--text-secondary, #a0a0a0);
          font-size: 0.95rem;
          font-weight: 500;
        }
        
        body.light-mode #order-details-modal .summary-label {
          color: var(--text-secondary, #6c757d);
        }
        
        #order-details-modal .summary-value {
          font-weight: 600;
          color: var(--text-light, #ffffff);
          font-size: 0.95rem;
        }
        
        body.light-mode #order-details-modal .summary-value {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .summary-row.discount .summary-value {
          color: #ef4444;
          font-weight: 700;
        }
        
        #order-details-modal .summary-row.total {
          margin-top: 12px;
          padding: 16px 0;
          border-top: 2px solid var(--primary-color, #42d158);
          background: rgba(66, 209, 88, 0.05);
          margin-left: -24px;
          margin-right: -24px;
          padding-left: 24px;
          padding-right: 24px;
          border-radius: 0;
        }
        
        body.light-mode #order-details-modal .summary-row.total {
          background: rgba(66, 209, 88, 0.08);
        }
        
        #order-details-modal .summary-row.total .summary-label,
        #order-details-modal .summary-row.total .summary-value {
          font-weight: 700;
          font-size: 1.15rem;
          color: var(--text-light, #ffffff);
        }
        
        body.light-mode #order-details-modal .summary-row.total .summary-label,
        body.light-mode #order-details-modal .summary-row.total .summary-value {
          color: var(--text-light, #343a40);
        }
        
        #order-details-modal .summary-row.total .summary-value {
          color: var(--primary-color, #42d158);
        }
        
        #order-details-modal .modal-footer {
          padding: 20px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background-color: rgba(19, 28, 50, 0.8);
        }
        
        body.light-mode #order-details-modal .modal-footer {
          border-top-color: #e9ecef;
          background-color: #f8f9fa;
        }
        
        #order-details-modal .reorder-btn-modal {
          background: linear-gradient(135deg, var(--primary-color, #42d158), #39b64d);
          color: white;
          border: none;
          border-radius: var(--button-radius, 8px);
          padding: 12px 24px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(66, 209, 88, 0.3);
        }
        
        #order-details-modal .reorder-btn-modal:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(66, 209, 88, 0.4);
        }
        
        #order-details-modal .reorder-btn-modal:active {
          transform: translateY(0);
        }
        
        #order-details-modal .close-modal-btn {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-light, #ffffff);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--button-radius, 8px);
          padding: 12px 24px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        #order-details-modal .close-modal-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
          border-color: var(--primary-color, #42d158);
          transform: translateY(-1px);
        }
        
        #order-details-modal .close-modal-btn:active {
          transform: translateY(0);
        }
        
        body.light-mode #order-details-modal .close-modal-btn {
          background-color: #e9ecef;
          color: #495057;
          border-color: #dee2e6;
        }
        
        body.light-mode #order-details-modal .close-modal-btn:hover {
          background-color: #dee2e6;
          border-color: var(--primary-color, #42d158);
        }
        
        @media (max-width: 576px) {
          #order-details-modal .modal-container {
            width: 95%;
            max-height: 95vh;
          }
          
          #order-details-modal .modal-body {
            padding: 15px;
          }
          
          #order-details-modal .modal-header h3 {
            font-size: 1.1rem;
          }
          
          #order-details-modal .summary-row.total .summary-label,
          #order-details-modal .summary-row.total .summary-value {
            font-size: 1rem;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Show modal with animation
    setTimeout(() => {
      modalElement.classList.add("show");
    }, 10);
  } catch (error) {
    console.error("Error creating order details modal:", error);
    showToast("حدث خطأ أثناء عرض تفاصيل الطلب", "error", 3000);
  }
}

// Function to close the order details modal
function closeOrderDetailsModal() {
  const modal = document.getElementById("order-details-modal");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

// Add toast styles if they don't exist
if (!document.getElementById("toast-notification-styles")) {
  const toastStyleEl = document.createElement("style");
  toastStyleEl.id = "toast-notification-styles";
  toastStyleEl.textContent = `
    /* Toast styles */
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background-color: #fff;
      color: #212529;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      min-width: 300px;
      max-width: 90%;
      z-index: 1100;
      transition: transform 0.3s ease;
      direction: rtl;
    }
    
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
    
    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }
    
    .toast i {
      font-size: 1.2rem;
    }
    
    .toast-success i {
      color: #10b981;
    }
    
    .toast-error i {
      color: #ef4444;
    }
    
    .toast-warning i {
      color: #f59e0b;
    }
    
    .toast-info i {
      color: #3b82f6;
      background-color: #ffffff;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    }
    
    .toast-message {
      flex: 1;
    }
    
    .toast-loader {
      height: 3px;
      background-color: #3b82f6;
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      animation: loading 2s infinite linear;
      transform-origin: left;
    }
    
    /* Login message styles */
    .login-prompt {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      width: 100%;
    }
    
    .login-message {
      background-color: #f8f9fa;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      animation: fadeIn 0.5s ease;
    }
    
    body.light-mode .login-message {
      background-color: #f8f9fa;
      color: #343a40;
    }
    
    body:not(.light-mode) .login-message {
      background-color: #2d3748;
      color: #e2e8f0;
    }
    
    .login-message i {
      font-size: 3rem;
      margin-bottom: 16px;
      color: #6366f1;
      display: block;
    }
    
    .login-message p {
      margin-bottom: 20px;
      font-size: 1.1rem;
      line-height: 1.5;
    }
    
    .login-btn {
      display: inline-block;
      background-color: #6366f1;
      color: white;
      padding: 10px 24px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
      border: none;
      cursor: pointer;
    }
    
    .login-btn:hover {
      background-color: #4f46e5;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes loading {
      0% {
        transform: scaleX(0);
      }
      50% {
        transform: scaleX(0.5);
      }
      100% {
        transform: scaleX(1);
      }
    }
  `;
  document.head.appendChild(toastStyleEl);
}

// Helper function to show toast notifications (add when running first time for each page load)
function initializeToastSystem() {
  if (typeof showToast !== "function") {
    window.showToast = function (message, type = "info", duration = 3000) {
      // Add toast styles if not already added
      if (!document.getElementById("toast-notification-styles")) {
        // Add styles first
        const toastStyleEl = document.createElement("style");
        toastStyleEl.id = "toast-notification-styles";
        toastStyleEl.textContent = `
          /* Toast styles */
          .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background-color: #fff;
            color: #212529;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            min-width: 300px;
            max-width: 90%;
            z-index: 1100;
            transition: transform 0.3s ease;
            direction: rtl;
          }
          
          .toast.show {
            transform: translateX(-50%) translateY(0);
          }
          
          .toast-content {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
          }
          
          .toast i {
            font-size: 1.2rem;
          }
          
          .toast-success i {
            color: #10b981;
          }
          
          .toast-error i {
            color: #ef4444;
          }
          
          .toast-warning i {
            color: #f59e0b;
          }
          
          .toast-info i {
            color: #3b82f6;
            background-color: #ffffff;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
          }
          
          .toast-message {
            flex: 1;
          }
          
          .toast-loader {
            height: 3px;
            background-color: #3b82f6;
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            animation: loading 2s infinite linear;
            transform-origin: left;
          }
          
          @keyframes loading {
            0% {
              transform: scaleX(0);
            }
            50% {
              transform: scaleX(0.5);
            }
            100% {
              transform: scaleX(1);
            }
          }
        `;
        document.head.appendChild(toastStyleEl);
      }

      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div class="toast-content">
          <i class="${getToastIcon(type)}"></i>
          <div class="toast-message">${message}</div>
        </div>
        ${duration === 0 ? '<div class="toast-loader"></div>' : ""}
      `;

      document.body.appendChild(toast);

      // Animate in
      setTimeout(() => {
        toast.classList.add("show");
      }, 10);

      // Auto hide after duration (if not 0)
      if (duration > 0) {
        setTimeout(() => {
          hideToast(toast);
        }, duration);
      }

      return toast;
    };

    window.hideToast = function (toast) {
      if (!toast) return;

      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    window.getToastIcon = function (type) {
      switch (type) {
        case "success":
          return "fas fa-check-circle";
        case "error":
          return "fas fa-exclamation-circle";
        case "warning":
          return "fas fa-exclamation-triangle";
        case "info":
        default:
          return "fas fa-info-circle";
      }
    };
  }
}

// Initialize toast system when document is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeToastSystem();
});

// Helper function to escape JavaScript strings for HTML attributes
function escapeJsString(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Initialize WebSocket connection for real-time notifications
function initWebSocketConnection() {
  try {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (!isLocal) {
      window.menuSocket = null;
      return;
    }
    console.log("Initializing WebSocket connection...");

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
    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("WebSocket message received:", message);

        // Handle different message types
        switch (message.type) {
          case "order_completed_for_rating":
            handleOrderCompletedForRating(message.data);
            break;

          case "order_rated":
            // Handle notification that an order was rated
            console.log("Order rated notification:", message.data);
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

      // Attempt to reconnect after a delay
      setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
        initWebSocketConnection();
      }, 5000);
    });

    // Connection error
    socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Store socket in window for potential later use
    window.menuSocket = socket;
  } catch (error) {
    console.error("Error initializing WebSocket:", error);
  }
}

// Handle order completed for rating notification
function handleOrderCompletedForRating(orderData) {
  console.log("Received order completed for rating:", orderData);

  if (!orderData || !orderData.orderId) {
    console.error("Invalid order data received");
    return;
  }

  // Save order items with images to sessionStorage for later use in rating modal
  if (orderData.items && Array.isArray(orderData.items)) {
    try {
      // Get existing product images
      const productImages = JSON.parse(
        sessionStorage.getItem("productImages") || "{}"
      );
      let updated = false;

      // Process each item to ensure it has complete data
      const processItemPromises = orderData.items.map((item) => {
        let itemId = item.id || item.productId || item._id;

        // Extract the base product ID by removing any suffix after a dash
        // This is needed because the API expects the base ID (e.g., "burger1" instead of "burger1-25827f4d")
        if (itemId && itemId.includes("-")) {
          itemId = itemId.split("-")[0];
          console.log(`Using base product ID for API request: ${itemId}`);
        }

        // If the item doesn't have an image or has a placeholder, fetch the complete product data
        if (
          !item.image ||
          item.image === "" ||
          (item.image && item.image.includes("placeholder"))
        ) {
          // Fetch complete product data without authentication
          return fetch(`http://localhost:5000/api/products/${itemId}`, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
            .then((response) => response.json())
            .then((productData) => {
              if (productData && productData.success && productData.data) {
                // Update item with product data
                item.image = productData.data.image || item.image;

                // Also update other properties if needed
                if (!item.name) item.name = productData.data.name;
                if (!item.price) item.price = productData.data.price;

                console.log(
                  `Updated item ${itemId} with product data from API`
                );

                // Store in sessionStorage
                if (item.image) {
                  productImages[itemId] = item.image;
                  updated = true;
                  console.log(
                    `Stored product image in sessionStorage for item: ${itemId}`
                  );
                }
              }
              return item;
            })
            .catch((error) => {
              console.error(
                `Error fetching product data for item ${itemId}:`,
                error
              );
              return item; // Return original item on error
            });
        } else if (item.image) {
          // If item already has an image, just store it
          productImages[itemId] = item.image;
          updated = true;
          console.log(
            `Stored existing product image in sessionStorage for item: ${itemId}`
          );
          return Promise.resolve(item);
        }

        return Promise.resolve(item);
      });

      // Wait for all product fetches to complete
      Promise.all(processItemPromises).then((completedItems) => {
        // Save back to sessionStorage if updated
        if (updated) {
          sessionStorage.setItem(
            "productImages",
            JSON.stringify(productImages)
          );
          console.log("Updated product images in sessionStorage for rating");
        }

        // Update the order data with completed items
        orderData.items = completedItems;

        // Save the whole order in sessionStorage
        try {
          sessionStorage.setItem(
            "lastCompletedOrder",
            JSON.stringify(orderData)
          );
          console.log("Saved complete order data to sessionStorage");
        } catch (err) {
          console.error("Error saving completed order to sessionStorage:", err);
        }

        // Handle showing the rating modal based on page context
        handleRatingModalDisplay(orderData);
      });
    } catch (error) {
      console.error("Error processing order items:", error);
      // Continue with showing rating modal even if there was an error
      handleRatingModalDisplay(orderData);
    }
  } else {
    // No items in order data, just handle the rating modal display
    handleRatingModalDisplay(orderData);
  }
}

// Helper function to determine if and where to show the rating modal
function handleRatingModalDisplay(orderData) {
  // Get current page info
  const isCashierPage = window.location.href.includes("cashier.html");
  const isMainIndexPage = isIndexPage();
  const currentTableNumber = getTableNumberFromCurrentPage();

  // Case 1: On cashier page - the person who completed the order should see the rating modal
  // to show to the customer who's physically present
  if (isCashierPage) {
    console.log(
      "This is the cashier page that completed the order, showing rating modal"
    );
    setTimeout(() => {
      if (typeof promptRatingForCompletedOrder === "function") {
        promptRatingForCompletedOrder(orderData.orderId);
      } else if (typeof showRatingModalForOrder === "function") {
        showRatingModalForOrder(orderData.orderId);
      }
    }, 1500);
    return;
  }

  // Case 2: On index page - only show if no table number is specified in URL
  // or if the table number matches the order's table number
  if (isMainIndexPage) {
    // Only show if this is a generic index page with no table parameter
    // or if the table parameter matches the order's table
    if (!currentTableNumber || currentTableNumber === orderData.tableNumber) {
      console.log(
        "This is the index page with matching table number, showing rating modal"
      );
      setTimeout(() => {
        if (typeof promptRatingForCompletedOrder === "function") {
          promptRatingForCompletedOrder(orderData.orderId);
        } else if (typeof showRatingModalForOrder === "function") {
          showRatingModalForOrder(orderData.orderId);
        }
      }, 1500);
    } else {
      console.log(
        "This is the index page but for a different table, not showing rating modal"
      );
    }
    return;
  }

  // Case 3: On a table-specific page - only show if the table number matches
  if (currentTableNumber && currentTableNumber === orderData.tableNumber) {
    console.log(
      "This is a table-specific page matching the order's table, showing rating modal"
    );
    setTimeout(() => {
      if (typeof promptRatingForCompletedOrder === "function") {
        promptRatingForCompletedOrder(orderData.orderId);
      } else if (typeof showRatingModalForOrder === "function") {
        showRatingModalForOrder(orderData.orderId);
      }
    }, 1500);
  }
}

// Function to load cart from local storage
function loadCart() {
  try {
    // Load cart items from localStorage
    const savedCart = localStorage.getItem("cartItems");
    if (savedCart) {
      // Update cart count and UI
      updateCartCountFromStorage();

      // Update cart total if the element exists
      updateCartTotal();
    }
  } catch (error) {
    console.error("Error loading cart:", error);
  }
}

// Helper function to format dates based on current language
function formatDate(date) {
  // Get current language with fallback
  let currentLang = "ar"; // default to Arabic
  if (typeof getCurrentLanguage === "function") {
    currentLang = getCurrentLanguage();
  } else {
    currentLang = localStorage.getItem("public-language") || "ar";
  }

  const locale = currentLang === "ar" ? "ar-EG" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
      hideCartToast(toast, toastContainer);
    });
  }

  // Show the toast with animation
  requestAnimationFrame(() => {
    toast.style.animation = `toast-in 0.5s forwards`;
    toast.classList.add("show");
  });

  // Remove the toast after 3 seconds
  const toastTimeout = setTimeout(() => {
    hideCartToast(toast, toastContainer);
  }, 3000);

  // Store the timeout ID
  toast.dataset.timeoutId = toastTimeout;

  return toast;
}

// Helper function to close a cart toast
function hideCartToast(toast, container) {
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

// Helper function to get current customer ID
function getCustomerId() {
  try {
    // First check if auth.js is loaded and has customer data
    if (typeof isLoggedIn === "function" && isLoggedIn()) {
      const customerData = localStorage.getItem("customerData");
      if (customerData) {
        const parsed = JSON.parse(customerData);
        return parsed._id || null;
      }
    }
    return null;
  } catch (error) {
    console.error("Error getting customer ID:", error);
    return null;
  }
}

// Export loadCategories globally for use by i18n.js and other modules
// (loadProducts is exported inside DOMContentLoaded block)
window.loadCategories = loadCategories;

// Listen for global settings changes (currency updates)
window.addEventListener("global-settings-changed", function (event) {
  console.log(
    "Global settings changed in menu page, refreshing product displays"
  );
  // Reload products to update currency display
  if (typeof loadProducts === "function") {
    loadProducts();
  }
  // Reload offers to update currency display
  if (typeof loadOffers === "function") {
    loadOffers();
  }
  // Reload previous orders to update currency display
  const previousOrdersSection = document.getElementById(
    "previous-orders-section"
  );
  if (
    previousOrdersSection &&
    previousOrdersSection.classList.contains("active")
  ) {
    if (typeof loadPreviousOrders === "function") {
      loadPreviousOrders();
    }
  }
});

// Listen for global settings loaded event
window.addEventListener("global-settings-loaded", function (event) {
  console.log("Global settings loaded in menu page");
  // Reload offers to update currency display with loaded settings
  if (typeof loadOffers === "function") {
    loadOffers();
  }
  // Products will be loaded by DOMContentLoaded, no action needed here
});

// Listen for language change event to update currency display
document.addEventListener("language_changed", function (event) {
  console.log(
    "Language changed, refreshing product displays for currency update"
  );
  // Reload products to update currency display (ريال → SAR or vice versa)
  if (typeof loadProducts === "function") {
    loadProducts();
  }
  // Reload offers to update currency display
  if (typeof loadOffers === "function") {
    loadOffers();
  }
  // Reload previous orders to update currency display
  const previousOrdersSection = document.getElementById(
    "previous-orders-section"
  );
  if (
    previousOrdersSection &&
    previousOrdersSection.classList.contains("active")
  ) {
    if (typeof loadPreviousOrders === "function") {
      loadPreviousOrders();
    }
  }
});
