// Profile Page JavaScript

// API Configuration
const USE_MOCK_API = true;
window.API_BASE_URL = window.API_BASE_URL || (function () {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? "http://localhost:5000" : origin;
})();

// Helper function to get the appropriate product name based on current language
function getLocalizedProductName(arabicName, currentLang) {
  // If language is Arabic or we don't have the Arabic name, return as is
  if (currentLang !== 'en' || !arabicName) {
    return arabicName;
  }
  
  try {
    // Try to find the English name from sessionStorage
    const productNames = JSON.parse(sessionStorage.getItem("productNames") || "{}");
    
    // Search through all products to find one with matching Arabic name
    for (const productId in productNames) {
      const product = productNames[productId];
      if (product.name === arabicName && product.nameEn) {
        return product.nameEn;
      }
    }
    
    // If not found, return the Arabic name
    return arabicName;
  } catch (e) {
    console.warn("Could not retrieve product names from sessionStorage:", e);
    return arabicName;
  }
}

// Fallback refreshToken implementation if auth.js version fails
// This will be overridden if auth.js properly loads
if (typeof refreshToken !== "function") {
  window.refreshToken = function () {
    console.warn("Using fallback refreshToken implementation");
    // Simple implementation to get a new token
    return new Promise((resolve, reject) => {
      const token = getToken();
      if (!token) {
        return reject(new Error("No token available"));
      }

      fetch(`${API_BASE_URL}/api/customer/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to refresh token");
          }
          return response.json();
        })
        .then((data) => {
          if (data.success && data.token) {
            // Save the new token
            localStorage.setItem("token", data.token);
            resolve(data.token);
          } else {
            reject(new Error(data.message || "Failed to refresh token"));
          }
        })
        .catch((error) => {
          console.error("Token refresh error:", error);
          reject(error);
        });
    });
  };
}

// Make sure we have access to the logout function
if (typeof logout !== "function") {
  window.logout = function () {
    console.warn("Using fallback logout implementation");
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("userData");
    localStorage.removeItem("userPermissions");
    // Redirect to login page
    window.location.href = "login.html";
  };
}

// Fetch wrapper for API calls
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  // If not using mock API, modify URLs to include the base URL for real API calls
  if (!USE_MOCK_API && typeof url === "string" && url.startsWith("/api/")) {
    // Replace relative API paths with the full URL
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log("Using real API:", fullUrl);
    return originalFetch(fullUrl, options);
  }

  // Only intercept API calls we want to mock
  if (
    USE_MOCK_API &&
    typeof url === "string" &&
    url.includes("/api/customer/")
  ) {
    console.log("Using mock API for:", url);

    // Get current language
    const currentLanguage = window.i18n
      ? window.i18n.getCurrentLanguage()
      : "ar";
    const isEnglish = currentLanguage === "en";

    // Get current user data from localStorage
    let userData = {};
    try {
      const stored = localStorage.getItem("userData");
      if (stored) userData = JSON.parse(stored);
    } catch (e) {
      console.error("Error reading userData from localStorage", e);
    }

    // Create default user data if none exists
    if (!userData || Object.keys(userData).length === 0) {
      userData = {
        name: isEnglish ? "User" : "المستخدم",
        email: "user@example.com",
        phone: "",
        points: 120,
        profilePhoto: "",
        pointsHistory: [],
      };
      localStorage.setItem("userData", JSON.stringify(userData));
    }

    // Mock GET profile endpoint
    if (
      url.includes("/api/customer/profile") &&
      (!options || options.method === "GET")
    ) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            user: userData,
          }),
      });
    }

    // Mock POST update-profile endpoint
    if (
      url.includes("/api/customer/update-profile") &&
      options &&
      options.method === "POST"
    ) {
      try {
        const body = JSON.parse(options.body);
        userData = { ...userData, ...body };
        localStorage.setItem("userData", JSON.stringify(userData));

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              message: "تم تحديث المعلومات بنجاح",
            }),
        });
      } catch (e) {
        console.error("Error in mock update-profile", e);
      }
    }

    // Mock POST change-password endpoint
    if (
      url.includes("/api/customer/change-password") &&
      options &&
      options.method === "POST"
    ) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            success: true,
            message: "تم تغيير كلمة المرور بنجاح",
          }),
      });
    }

    // Mock POST upload-photo endpoint
    if (
      url.includes("/api/customer/upload-photo") &&
      options &&
      options.method === "POST"
    ) {
      try {
        const body = JSON.parse(options.body);
        if (body && body.photo) {
          userData.profilePhoto = body.photo;
          localStorage.setItem("userData", JSON.stringify(userData));

          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                success: true,
                photoUrl: body.photo,
                message: "تم تحديث الصورة بنجاح",
              }),
          });
        }
      } catch (e) {
        console.error("Error in mock upload-photo", e);
      }
    }
  }

  // For all other calls or when mocking is disabled, use the original fetch
  return originalFetch.apply(this, arguments);
};

document.addEventListener("DOMContentLoaded", function () {
  const hasLocalUser = !!localStorage.getItem("userData");
  if (!isLoggedIn() && !hasLocalUser) {
    window.location.href = "register.html";
    return;
  }

  // Apply i18n translations if available
  if (window.i18n && typeof window.i18n.applyTranslations === "function") {
    window.i18n.applyTranslations();
  }

  // Load user data
  loadUserProfile();

  // Set up tab navigation
  setupTabs();

  // Set up form submissions
  setupForms();

  // Set up photo upload
  setupPhotoUpload();

  // Set up language switching
  setupLanguageSwitcher();

  // Set up toast notifications
  setupToast();

  // Set up notification toggles
  setupNotificationToggles();

  // Listen for language changes to update the UI
  document.addEventListener("language_changed", function (e) {
    // Update level name based on new language
    const currentLevel = document.getElementById("current-level");
    if (currentLevel) {
      const points =
        parseInt(document.getElementById("total-points").textContent) || 0;
      const level = calculateLevel(points);
      currentLevel.textContent = getLevelName(level);
    }

    // Update any dynamic content that isn't handled by i18n.applyTranslations
    updateDynamicTranslations();
  });
});

// Update dynamic content that needs translation but isn't handled by data-i18n attributes
function updateDynamicTranslations() {
  // Get current language
  const currentLanguage = window.i18n ? window.i18n.getCurrentLanguage() : "ar";
  const isEnglish = currentLanguage === "en";

  // Update any dynamic content that isn't handled by i18n.applyTranslations
  const emptyHistoryElement = document.querySelector(".points-history-empty");
  if (emptyHistoryElement && window.i18n) {
    emptyHistoryElement.textContent =
      window.i18n.getTranslation("noPointsHistory");
  }

  // Update points history titles
  const historyTitles = document.querySelectorAll(".points-history-title");
  historyTitles.forEach((titleElement) => {
    // Get the original description if stored
    const originalDesc = titleElement.getAttribute("data-original-desc");

    if (originalDesc && window.i18n) {
      // Map description to translation key
      let translationKey = "";

      if (originalDesc === "تعديل نقاط من الإدارة (إضافة)") {
        translationKey = "pointsAdminAddTitle";
      } else if (originalDesc === "تعديل نقاط من الإدارة (خصم)") {
        translationKey = "pointsAdminDeductTitle";
      } else if (originalDesc === "تسجيل حساب جديد") {
        translationKey = "pointsRegistrationTitle";
      } else if (originalDesc === "طلب أول مرة") {
        translationKey = "pointsFirstOrderTitle";
      } else if (originalDesc === "نقاط من طلب") {
        translationKey = "pointsOrderTitle";
      } else if (originalDesc === "مكافأة على طلب") {
        translationKey = "pointsRewardTitle";
        // Extract order number if present
        const match = originalDesc.match(/#(\d+)/);
        if (match && match[1]) {
          const orderNumber = match[1];
          // Find the corresponding subtitle element and update it
          const subtitleElement = titleElement.parentElement.querySelector(
            ".points-history-subtitle"
          );
          if (subtitleElement) {
            subtitleElement.setAttribute("data-order-number", orderNumber);
            if (window.i18n) {
              subtitleElement.textContent = window.i18n
                .getTranslation("orderNumber")
                .replace("%s", orderNumber);
            }
          }
        }
      } else if (originalDesc && originalDesc.startsWith("مكافأة على طلب")) {
        translationKey = "pointsRewardTitle";
        // Extract order number if present
        const match = originalDesc.match(/#(\d+)/);
        if (match && match[1]) {
          const orderNumber = match[1];
          // Find the corresponding subtitle element and update it
          const subtitleElement = titleElement.parentElement.querySelector(
            ".points-history-subtitle"
          );
          if (subtitleElement) {
            subtitleElement.setAttribute("data-order-number", orderNumber);
            if (window.i18n) {
              subtitleElement.textContent = window.i18n
                .getTranslation("orderNumber")
                .replace("%s", orderNumber);
            }
          }
        }
      } else if (originalDesc === "استخدام نقاط") {
        translationKey = "pointsRedeemTitle";
      } else if (originalDesc === "معاملة نقاط") {
        translationKey = "pointsTransactionTitle";
      } else if (originalDesc === "نقاط مكتسبة") {
        translationKey = "pointsEarnedTitle";
      } else if (
        originalDesc &&
        originalDesc.startsWith("استخدام نقاط للخصم على طلب")
      ) {
        translationKey = "pointsUsedForDiscountTitle";
      } else if (originalDesc === "Points added by admin") {
        translationKey = "pointsAddedByAdminTitle";
      } else if (originalDesc === "Points deducted by admin") {
        translationKey = "pointsDeductedByAdminTitle";
      } else if (originalDesc === "إعادة تعيين النقاط من الإدارة") {
        translationKey = "pointsResetByAdminTitle";
      } else if (originalDesc === "نقاط الترحيب عند التسجيل") {
        translationKey = "pointsWelcomeRegistrationTitle";
      } else if (
        originalDesc &&
        originalDesc.startsWith("استرجاع نقاط من طلب ملغى")
      ) {
        translationKey = "pointsRefundCancelledOrderTitle";
        // Extract order number if present
        const match = originalDesc.match(/#([\w-]+)/);
        if (match && match[1]) {
          const orderNumber = match[1];
          // Find the corresponding subtitle element and update it
          const subtitleElement = titleElement.parentElement.querySelector(
            ".points-history-subtitle"
          );
          if (subtitleElement) {
            subtitleElement.setAttribute("data-order-number", orderNumber);
            if (window.i18n) {
              subtitleElement.textContent = window.i18n
                .getTranslation("orderNumber")
                .replace("%s", orderNumber);
            }
          }
        }
      } else if (
        originalDesc &&
        originalDesc.startsWith("استبدال عنصر مجاني:")
      ) {
        translationKey = "pointsFreeItemRedemptionTitle";
        // Extract product name, quantity and order number
        const match = originalDesc.match(/استبدال عنصر مجاني: (.+?) \((\d+)x\) - طلب #([\w-]+)/);
        if (match) {
          const productName = match[1];
          const quantity = match[2];
          const orderNumber = match[3];
          // Find the corresponding subtitle element and update it
          const subtitleElement = titleElement.parentElement.querySelector(
            ".points-history-subtitle"
          );
          if (subtitleElement) {
            subtitleElement.setAttribute("data-product-name", productName);
            subtitleElement.setAttribute("data-quantity", quantity);
            subtitleElement.setAttribute("data-order-number", orderNumber);
            if (window.i18n) {
              const currentLang = window.i18n.getCurrentLanguage();
              const localizedProductName = getLocalizedProductName(productName, currentLang);
              const productText = window.i18n.getTranslation("productNameQuantity")
                .replace("%name%", localizedProductName)
                .replace("%qty%", quantity);
              const orderText = window.i18n.getTranslation("orderNumber")
                .replace("%s", orderNumber);
              subtitleElement.textContent = `${productText} - ${orderText}`;
            }
          }
        }
      } else if (
        originalDesc &&
        originalDesc.startsWith("استرجاع نقاط عنصر مجاني ملغى:")
      ) {
        translationKey = "pointsFreeItemRefundTitle";
        // Extract product name, quantity and order number
        const match = originalDesc.match(/استرجاع نقاط عنصر مجاني ملغى: (.+?) \((\d+)x\) - طلب #([\w-]+)/);
        if (match) {
          const productName = match[1];
          const quantity = match[2];
          const orderNumber = match[3];
          // Find the corresponding subtitle element and update it
          const subtitleElement = titleElement.parentElement.querySelector(
            ".points-history-subtitle"
          );
          if (subtitleElement) {
            subtitleElement.setAttribute("data-product-name", productName);
            subtitleElement.setAttribute("data-quantity", quantity);
            subtitleElement.setAttribute("data-order-number", orderNumber);
            if (window.i18n) {
              const currentLang = window.i18n.getCurrentLanguage();
              const localizedProductName = getLocalizedProductName(productName, currentLang);
              const productText = window.i18n.getTranslation("productNameQuantity")
                .replace("%name%", localizedProductName)
                .replace("%qty%", quantity);
              const orderText = window.i18n.getTranslation("orderNumber")
                .replace("%s", orderNumber);
              subtitleElement.textContent = `${productText} - ${orderText}`;
            }
          }
        }
      }

      // Set translated text if we found a matching key
      if (translationKey) {
        titleElement.textContent = window.i18n.getTranslation(translationKey);
      }
    }
  });

  // Update date formats in points history
  const dateElements = document.querySelectorAll(".points-history-date");
  dateElements.forEach((element) => {
    // Get the original date string from the data attribute, or store it if not already stored
    if (!element.getAttribute("data-original-date")) {
      element.setAttribute("data-original-date", element.textContent);
    }
    const originalDate = element.getAttribute("data-original-date");

    // If we can parse it as a date, reformat it according to current language
    try {
      const date = new Date(originalDate);
      if (!isNaN(date.getTime())) {
        // Update only the first text node to preserve the source label
        const formattedDate = formatDate(originalDate);
        
        // Check if there are child nodes (source label)
        if (element.childNodes.length > 0) {
          // Update only the first text node
          if (element.childNodes[0].nodeType === Node.TEXT_NODE) {
            element.childNodes[0].textContent = formattedDate;
          } else {
            // If first node is not text, create a text node at the beginning
            element.insertBefore(document.createTextNode(formattedDate), element.firstChild);
          }
        } else {
          // No child nodes, safe to replace entire content
          element.textContent = formattedDate;
        }
      }
    } catch (e) {
      console.warn("Could not parse date for reformatting:", originalDate);
    }
  });

  // Update order number subtitles
  const subtitles = document.querySelectorAll(".points-history-subtitle");
  subtitles.forEach((element) => {
    const orderNumber = element.getAttribute("data-order-number");
    if (orderNumber && window.i18n) {
      element.textContent = window.i18n
        .getTranslation("orderNumber")
        .replace("%s", orderNumber);
    }
  });

  // Update source labels
  const sourceLabels = document.querySelectorAll(".points-history-source");
  sourceLabels.forEach((element) => {
    const source = element.getAttribute("data-source");
    if (source && window.i18n) {
      let sourceKey = "";
      switch (source) {
        case "order":
          sourceKey = "sourceOrder";
          break;
        case "registration":
          sourceKey = "sourceRegistration";
          break;
        case "manual":
          sourceKey = "sourceManual";
          break;
        case "redeem":
          sourceKey = "sourceRedeem";
          break;
        case "refund":
          sourceKey = "sourceRefund";
          break;
        case "other":
          sourceKey = "sourceOther";
          break;
      }

      if (sourceKey) {
        element.textContent = window.i18n.getTranslation(sourceKey);
      }
    }
  });

  // Update points history total label
  const totalLabel = document.querySelector(".points-history-total-label");
  if (totalLabel && window.i18n) {
    totalLabel.textContent = window.i18n.getTranslation(
      "pointsHistoryTotalEarned"
    );
  }
}

// Load user profile data from API or localStorage
function loadUserProfile() {
  document.getElementById("profile-name").textContent = "جاري التحميل...";
  document.getElementById("points-value").textContent = "...";
  document.getElementById("total-points").textContent = "...";

  const userData = getProfileUserData();

  updateUIWithUserData(userData);

  loadPointsHistory(userData.pointsHistory || []);
}

// Load fallback points history when local data empty
function loadFallbackPointsHistory() {
  loadPointsHistory([]);
}

// Load points history
function loadPointsHistory(history) {
  const historyList = document.getElementById("points-history-list");
  historyList.innerHTML = "";

  // Get current language
  const currentLanguage = window.i18n ? window.i18n.getCurrentLanguage() : "ar";
  const isEnglish = currentLanguage === "en";

  if (!history || history.length === 0) {
    historyList.innerHTML = `<div class="points-history-empty">${
      window.i18n
        ? window.i18n.getTranslation("noPointsHistory")
        : "لا يوجد سجل للنقاط حتى الآن"
    }</div>`;
    return;
  }

  // Sort history by date (newest first)
  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Create a container for the history items
  const historyContainer = document.createElement("div");
  historyContainer.className = "points-history-container";

  // Calculate total points for determining style
  const totalPoints = history.reduce(
    (sum, item) => sum + (parseInt(item.points) || 0),
    0
  );
  const userLevel = calculateLevel(totalPoints);

  // Get level style class based on points value
  function getLevelClass(points) {
    if (points >= 1000) return "level-platinum";
    if (points >= 600) return "level-gold";
    if (points >= 300) return "level-silver";
    if (points >= 100) return "level-bronze";
    return "level-bronze";
  }

  history.forEach((item) => {
    const historyItem = document.createElement("div");
    historyItem.className = "points-history-item";

    const info = document.createElement("div");
    info.className = "points-history-info";

    const title = document.createElement("div");
    title.className = "points-history-title";

    // Store the original description for language switching
    if (item.description) {
      title.setAttribute("data-original-desc", item.description);
    }

    // Map description to translation key
    let translationKey = "";

    if (item.description === "تعديل نقاط من الإدارة (إضافة)") {
      translationKey = "pointsAdminAddTitle";
    } else if (item.description === "تعديل نقاط من الإدارة (خصم)") {
      translationKey = "pointsAdminDeductTitle";
    } else if (item.description === "تسجيل حساب جديد") {
      translationKey = "pointsRegistrationTitle";
    } else if (item.description === "طلب أول مرة") {
      translationKey = "pointsFirstOrderTitle";
    } else if (item.description === "نقاط من طلب") {
      translationKey = "pointsOrderTitle";
    } else if (item.description === "مكافأة على طلب") {
      translationKey = "pointsRewardTitle";
      // Extract order number if present
      const match = item.description.match(/#(\d+)/);
      if (match && match[1] && !item.orderNumber) {
        item.orderNumber = match[1];
      }
    } else if (
      item.description &&
      item.description.startsWith("مكافأة على طلب")
    ) {
      translationKey = "pointsRewardTitle";
      // Extract order number if present
      const match = item.description.match(/#(\d+)/);
      if (match && match[1] && !item.orderNumber) {
        item.orderNumber = match[1];
      }
    } else if (item.description === "استخدام نقاط") {
      translationKey = "pointsRedeemTitle";
    } else if (item.description === "معاملة نقاط") {
      translationKey = "pointsTransactionTitle";
    } else if (item.description === "نقاط مكتسبة") {
      translationKey = "pointsEarnedTitle";
    } else if (
      item.description &&
      item.description.startsWith("استخدام نقاط للخصم على طلب")
    ) {
      translationKey = "pointsUsedForDiscountTitle";
      // Extract order number if present
      const match = item.description.match(/#(\d+)/);
      if (match && match[1] && !item.orderNumber) {
        item.orderNumber = match[1];
      }
    } else if (item.description === "Points added by admin") {
      translationKey = "pointsAddedByAdminTitle";
    } else if (item.description === "Points deducted by admin") {
      translationKey = "pointsDeductedByAdminTitle";
    } else if (item.description === "إعادة تعيين النقاط من الإدارة") {
      translationKey = "pointsResetByAdminTitle";
    } else if (item.description === "نقاط الترحيب عند التسجيل") {
      translationKey = "pointsWelcomeRegistrationTitle";
    } else if (
      item.description &&
      item.description.startsWith("استرجاع نقاط من طلب ملغى")
    ) {
      translationKey = "pointsRefundCancelledOrderTitle";
      // Extract order number if present
      const match = item.description.match(/#([\w-]+)/);
      if (match && match[1] && !item.orderNumber) {
        item.orderNumber = match[1];
      }
    } else if (
      item.description &&
      item.description.startsWith("استبدال عنصر مجاني:")
    ) {
      translationKey = "pointsFreeItemRedemptionTitle";
      // Extract product name, quantity and order number
      const match = item.description.match(/استبدال عنصر مجاني: (.+?) \((\d+)x\) - طلب #([\w-]+)/);
      if (match) {
        item.productName = match[1];
        item.quantity = match[2];
        if (!item.orderNumber) {
          item.orderNumber = match[3];
        }
      }
    } else if (
      item.description &&
      item.description.startsWith("استرجاع نقاط عنصر مجاني ملغى:")
    ) {
      translationKey = "pointsFreeItemRefundTitle";
      // Extract product name, quantity and order number
      const match = item.description.match(/استرجاع نقاط عنصر مجاني ملغى: (.+?) \((\d+)x\) - طلب #([\w-]+)/);
      if (match) {
        item.productName = match[1];
        item.quantity = match[2];
        if (!item.orderNumber) {
          item.orderNumber = match[3];
        }
      }
    } else {
      // Default to the original description
      title.textContent =
        item.description || (isEnglish ? "Points transaction" : "معاملة نقاط");
    }

    // Set translated text if we found a matching key
    if (translationKey && window.i18n) {
      title.textContent = window.i18n.getTranslation(translationKey);
    }

    // Create a subtitle for product info (for free item entries) or order number
    if (item.productName && item.quantity) {
      const subtitle = document.createElement("div");
      subtitle.className = "points-history-subtitle";
      // Store product info for language switching
      subtitle.setAttribute("data-product-name", item.productName);
      subtitle.setAttribute("data-quantity", item.quantity);
      if (item.orderNumber) {
        subtitle.setAttribute("data-order-number", item.orderNumber);
      }

      // Display product name and quantity with order number
      // Get localized product name
      const localizedProductName = getLocalizedProductName(item.productName, currentLanguage);
      
      let subtitleText = "";
      if (window.i18n) {
        const productText = window.i18n.getTranslation("productNameQuantity")
          .replace("%name%", localizedProductName)
          .replace("%qty%", item.quantity);
        if (item.orderNumber) {
          const orderText = window.i18n.getTranslation("orderNumber")
            .replace("%s", item.orderNumber);
          subtitleText = `${productText} - ${orderText}`;
        } else {
          subtitleText = productText;
        }
      } else {
        const productText = isEnglish 
          ? `${localizedProductName} (${item.quantity}x)`
          : `${localizedProductName} (${item.quantity}x)`;
        if (item.orderNumber) {
          const orderText = isEnglish
            ? `Order Number: ${item.orderNumber}`
            : `رقم الطلب: ${item.orderNumber}`;
          subtitleText = `${productText} - ${orderText}`;
        } else {
          subtitleText = productText;
        }
      }
      subtitle.textContent = subtitleText;
      info.appendChild(subtitle);
    } else if (item.orderNumber) {
      const subtitle = document.createElement("div");
      subtitle.className = "points-history-subtitle";
      // Store the order number for language switching
      subtitle.setAttribute("data-order-number", item.orderNumber);

      if (window.i18n) {
        subtitle.textContent = window.i18n
          .getTranslation("orderNumber")
          .replace("%s", item.orderNumber);
      } else {
        subtitle.textContent = isEnglish
          ? `Order Number: ${item.orderNumber}`
          : `رقم الطلب: ${item.orderNumber}`;
      }
      info.appendChild(subtitle);
    }

    const date = document.createElement("div");
    date.className = "points-history-date";
    date.textContent = formatDate(item.date);
    // Store original date for language switching
    date.setAttribute("data-original-date", item.date);

    // Create a source label if available
    if (item.source) {
      const sourceLabel = document.createElement("span");
      sourceLabel.className = "points-history-source";
      // Store the source for language switching
      sourceLabel.setAttribute("data-source", item.source);

      // Get translation key for source
      let sourceKey = "";
      switch (item.source) {
        case "order":
          sourceKey = "sourceOrder";
          break;
        case "registration":
          sourceKey = "sourceRegistration";
          break;
        case "manual":
          sourceKey = "sourceManual";
          break;
        case "redeem":
          sourceKey = "sourceRedeem";
          break;
        case "refund":
          sourceKey = "sourceRefund";
          break;
        case "other":
          sourceKey = "sourceOther";
          break;
        default:
          sourceKey = "";
      }

      // Set source text based on translation or fallback
      if (sourceKey && window.i18n) {
        sourceLabel.textContent = window.i18n.getTranslation(sourceKey);
      } else {
        sourceLabel.textContent = isEnglish
          ? item.source.charAt(0).toUpperCase() + item.source.slice(1)
          : item.source;
      }

      date.appendChild(document.createTextNode(" • "));
      date.appendChild(sourceLabel);
    }

    info.appendChild(title);
    info.appendChild(date);

    const value = document.createElement("div");
    value.className = `points-history-value ${
      item.points >= 0 ? "positive" : "negative"
    }`;

    // Add level-based styling for historical items
    const points = parseInt(item.points) || 0;
    if (points > 0) {
      const levelClass = getLevelClass(points);
      value.classList.add(levelClass);
    }

    value.textContent = item.points >= 0 ? `+${item.points}` : item.points;

    historyItem.appendChild(info);
    historyItem.appendChild(value);

    historyContainer.appendChild(historyItem);
  });

  // Add a total section at the bottom
  // We already calculated totalPoints above, so we don't need to recalculate it

  const totalItem = document.createElement("div");
  totalItem.className = "points-history-total";

  const totalLabel = document.createElement("div");
  totalLabel.className = "points-history-total-label";
  if (window.i18n) {
    totalLabel.textContent = window.i18n.getTranslation(
      "pointsHistoryTotalEarned"
    );
  } else {
    totalLabel.textContent = isEnglish
      ? "Total Points Earned:"
      : "إجمالي النقاط المكتسبة:";
  }

  const totalValue = document.createElement("div");
  totalValue.className = "points-history-total-value";
  // Add level class to the total value
  totalValue.classList.add(getLevelClass(totalPoints));
  totalValue.textContent = totalPoints;

  totalItem.appendChild(totalLabel);
  totalItem.appendChild(totalValue);

  historyContainer.appendChild(totalItem);

  // Add the container to the list
  historyList.appendChild(historyContainer);
}

// Create fallback user data when API is unavailable
function createFallbackUserData() {
  // Get current language
  const currentLanguage = window.i18n ? window.i18n.getCurrentLanguage() : "ar";
  const isEnglish = currentLanguage === "en";

  // Generate a mock email if not available
  let email = "";
  const storedEmail = localStorage.getItem("userEmail");
  if (storedEmail) {
    email = storedEmail;
  } else {
    email = isEnglish ? "user@example.com" : "المستخدم@example.com";
  }

  // This fallback data mirrors the structure used throughout the app
  // The loadPointsHistory function will handle the translation
  return {
    name: isEnglish ? "User" : "المستخدم",
    email: email,
    phone: "",
    loyaltyPoints: 120,
    points: 120,
    profilePhoto: "",
    pointsHistory: [],
  };
}

function getStoredUserData() {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Error parsing stored userData:", error);
    return {};
  }
}

function persistUserDataToStorage(userData) {
  try {
    localStorage.setItem("userData", JSON.stringify(userData));
  } catch (error) {
    console.error("Error persisting userData:", error);
  }
}

function getOrderIdentifier(order) {
  return (
    order.orderNumber ||
    order.id ||
    order._id ||
    (order.createdAt ? `created-${order.createdAt}` : "unknown")
  );
}

function createHistoryEntry({
  key,
  date,
  points,
  description,
  source,
  orderNumber,
  productName,
  quantity,
}) {
  const entry = {
    date: date || new Date().toISOString(),
    points: Number(points) || 0,
    description,
    source: source || "order",
  };
  if (orderNumber) {
    entry.orderNumber = orderNumber;
  }
  if (productName) {
    entry.productName = productName;
  }
  if (quantity) {
    entry.quantity = quantity;
  }
  entry._key = key;
  return entry;
}

function buildPointsHistoryFromLocalSources() {
  const history = [];
  const uniqueKeys = new Set();

  function pushUnique(entry) {
    if (!entry) return;
    if (entry._key && uniqueKeys.has(entry._key)) {
      return;
    }
    if (entry._key) {
      uniqueKeys.add(entry._key);
    }
    history.push(entry);
  }

  try {
    const manualHistory = JSON.parse(
      localStorage.getItem("userPointsHistory") || "[]"
    );
    manualHistory.forEach((item, index) =>
      pushUnique(
        createHistoryEntry({
          key: item._key || `manual-${index}`,
          date: item.date,
          points: item.points,
          description: item.description,
          source: item.source || "manual",
          orderNumber: item.orderNumber,
          productName: item.productName,
          quantity: item.quantity,
        })
      )
    );
  } catch (error) {
    console.warn("Unable to load manual points history:", error);
  }

  try {
    const orders = JSON.parse(localStorage.getItem("orders") || "[]");
    orders.forEach((order) => {
      const orderId = getOrderIdentifier(order);
      const orderDate = order.completedDate || order.date || order.createdAt;

      if (order.pointsCredited && Number(order.pointsEarned) > 0) {
        pushUnique(
          createHistoryEntry({
            key: `order-earned-${orderId}`,
            date: orderDate,
            points: Math.abs(Number(order.pointsEarned) || 0),
            description: "نقاط مكتسبة",
            source: "order",
            orderNumber: orderId,
          })
        );
      }

      const redeemedPoints =
        order.loyaltyDiscount &&
        Number(
          order.loyaltyDiscount.pointsUsed ||
            order.loyaltyDiscount.pointsRefunded ||
            0
        );
      if (redeemedPoints > 0) {
        pushUnique(
          createHistoryEntry({
            key: `order-redeem-${orderId}`,
            date: orderDate,
            points: -Math.abs(redeemedPoints),
            description: `استخدام نقاط للخصم على طلب #${orderId}`,
            source: "redeem",
            orderNumber: orderId,
          })
        );
      }
    });
  } catch (error) {
    console.warn("Unable to build history from orders:", error);
  }

  try {
    const reservations = JSON.parse(
      localStorage.getItem("loyalty_points_reservations") || "[]"
    );
    reservations.forEach((record, index) => {
      const reservationDate = record.reservedAt || record.timestamp;
      const orderId = record.orderId || `reservation-${index}`;

      if (Number(record.pointsRefunded) > 0) {
        pushUnique(
          createHistoryEntry({
            key: `reservation-refund-${orderId}-${index}`,
            date: reservationDate,
            points: Math.abs(Number(record.pointsRefunded) || 0),
            description: `استرجاع نقاط من طلب ملغى #${orderId}`,
            source: "refund",
            orderNumber: orderId,
          })
        );
      }

      if (Number(record.pointsReclaimed) > 0) {
        pushUnique(
          createHistoryEntry({
            key: `reservation-reclaim-${orderId}-${index}`,
            date: reservationDate,
            points: -Math.abs(Number(record.pointsReclaimed) || 0),
            description: `خصم نقاط بسبب إلغاء طلب #${orderId}`,
            source: "manual",
            orderNumber: orderId,
          })
        );
      }
    });
  } catch (error) {
    console.warn("Unable to build history from reservations:", error);
  }

  history.sort((a, b) => new Date(b.date) - new Date(a.date));

  const limitedHistory = history.slice(0, 50).map((item) => {
    const { _key, ...rest } = item;
    return rest;
  });

  try {
    localStorage.setItem(
      "userPointsHistory",
      JSON.stringify(limitedHistory)
    );
  } catch (error) {
    console.warn("Unable to persist combined points history:", error);
  }

  return limitedHistory.length > 0 ? limitedHistory : null;
}

function getProfileUserData() {
  const defaults = createFallbackUserData();
  const stored = getStoredUserData();

  const merged = {
    ...defaults,
    ...stored,
  };

  const loyaltyPoints = Math.max(
    0,
    parseInt(merged.loyaltyPoints ?? merged.points ?? 0, 10) || 0
  );

  merged.loyaltyPoints = loyaltyPoints;
  merged.points = loyaltyPoints;

  const history = buildPointsHistoryFromLocalSources();
  if (history) {
    merged.pointsHistory = history;
  }

  persistUserDataToStorage(merged);
  return merged;
}

// Update UI with user data
function updateUIWithUserData(userData) {
  // Set name
  document.getElementById("profile-name").textContent =
    userData.name || "المستخدم";
  document.getElementById("full-name").value = userData.name || "";

  // Set email and phone
  document.getElementById("email").value = userData.email || "";
  document.getElementById("phone").value = userData.phone || "";

  // Set points
  const points = userData.points || 0;
  document.getElementById("points-value").textContent = points;
  document.getElementById("total-points").textContent = points;

  // Calculate level and progress
  const currentLevel = calculateLevel(points);
  const nextLevelPoints = calculatePointsForNextLevel(currentLevel);
  const progress = calculateLevelProgress(points, currentLevel);

  // Set level name
  const levelName = getLevelName(currentLevel);
  document.getElementById("current-level").textContent = levelName;

  // Apply level-specific styling classes
  const currentLevelElement = document.getElementById("current-level");
  currentLevelElement.className = "points-value"; // Reset classes

  // Apply level-specific class to points circle
  const pointsCircle = document.querySelector(".points-circle");
  pointsCircle.className = "points-circle"; // Reset classes

  // Add appropriate level class based on current level
  let levelClass = "";
  if (currentLevel === 1) {
    levelClass = "level-bronze";
  } else if (currentLevel === 2) {
    levelClass = "level-bronze";
  } else if (currentLevel === 3) {
    levelClass = "level-silver";
  } else if (currentLevel === 4) {
    levelClass = "level-gold";
  } else if (currentLevel === 5) {
    levelClass = "level-platinum";
  }

  // Apply the level class to all relevant elements
  currentLevelElement.classList.add(levelClass);
  pointsCircle.classList.add(levelClass);

  // Add some animation effect when the level is being applied
  pointsCircle.classList.add("animated");
  setTimeout(() => {
    pointsCircle.classList.remove("animated");
  }, 1000);

  // Style the next level points element too
  const nextLevelElement = document.getElementById("next-level-points");
  nextLevelElement.textContent = nextLevelPoints;
  nextLevelElement.className = "points-value"; // Reset classes

  // Add appropriate next level class
  if (currentLevel < 5) {
    if (currentLevel === 1) {
      nextLevelElement.classList.add("level-bronze");
    } else if (currentLevel === 2) {
      nextLevelElement.classList.add("level-silver");
    } else if (currentLevel === 3) {
      nextLevelElement.classList.add("level-gold");
    } else if (currentLevel === 4) {
      nextLevelElement.classList.add("level-platinum");
    }
  } else {
    // Max level reached
    nextLevelElement.classList.add("level-diamond");
  }

  document.getElementById("progress-percentage").textContent = `${progress}%`;
  document.getElementById("level-progress").style.width = `${progress}%`;

  // Set profile photo if available
  if (userData.profilePhoto) {
    setProfilePhoto(userData.profilePhoto);
  }

  // Load points history if available
  if (userData.pointsHistory && userData.pointsHistory.length > 0) {
    loadPointsHistory(userData.pointsHistory);
  }
}

// Set profile photo
function setProfilePhoto(photoUrl) {
  const profilePhoto = document.getElementById("profile-photo");
  profilePhoto.innerHTML = "";

  const img = document.createElement("img");
  img.src = photoUrl;
  img.alt = "صورة الملف الشخصي";

  profilePhoto.appendChild(img);
}

// Format date
function formatDate(dateString) {
  // Get current language
  const currentLanguage = window.i18n ? window.i18n.getCurrentLanguage() : "ar";

  // Parse the date
  const date = new Date(dateString);
  const now = new Date();

  // Check if date is today, yesterday, or within the last week
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() ===
    date.toDateString();

  // Reset now to current date (it was modified in the isYesterday check)
  now.setDate(now.getDate() + 1);

  // Calculate days difference
  const diffTime = Math.abs(now - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Use i18n translations if available
  if (window.i18n) {
    if (isToday) {
      return window.i18n.getTranslation("today");
    } else if (isYesterday) {
      return window.i18n.getTranslation("yesterday");
    } else if (diffDays < 7) {
      return window.i18n.getTranslation("daysAgo").replace("%d", diffDays);
    }
  }

  // For older dates, use locale-specific date format
  const options = { year: "numeric", month: "short", day: "numeric" };
  const locale = currentLanguage === "en" ? "en-US" : "ar-EG";

  return date.toLocaleDateString(locale, options);
}

// Calculate user level based on points
function calculateLevel(points) {
  // Simple level calculation: Level 1 = 0-99 points, Level 2 = 100-299 points, etc.
  if (points < 100) return 1;
  if (points < 300) return 2;
  if (points < 600) return 3;
  if (points < 1000) return 4;
  return 5;
}

// Get level name
function getLevelName(level) {
  const levelNames = {
    ar: ["مبتدئ", "برونزي", "فضي", "ذهبي", "بلاتيني", "ماسي"],
    en: ["Beginner", "Bronze", "Silver", "Gold", "Platinum", "Diamond"],
  };

  // Use current language or fallback to Arabic
  const currentLang = window.i18n
    ? window.i18n.getCurrentLanguage()
    : localStorage.getItem("language") || "ar";
  const names = levelNames[currentLang] || levelNames.ar;

  // Return level name (0-based index)
  return names[level] || names[0];
}

// Calculate points needed for next level
function calculatePointsForNextLevel(currentLevel) {
  const levelThresholds = [0, 100, 300, 600, 1000];
  if (currentLevel >= 5) return "الحد الأقصى";
  return levelThresholds[currentLevel];
}

// Calculate level progress percentage
function calculateLevelProgress(points, currentLevel) {
  const levelThresholds = [0, 100, 300, 600, 1000];

  if (currentLevel >= 5) return 100;

  const currentLevelPoints = levelThresholds[currentLevel - 1];
  const nextLevelPoints = levelThresholds[currentLevel];

  const pointsInLevel = points - currentLevelPoints;
  const pointsToNextLevel = nextLevelPoints - currentLevelPoints;

  const progress = Math.floor((pointsInLevel / pointsToNextLevel) * 100);
  return Math.min(progress, 100);
}

// Set up tab navigation
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to current button
      button.classList.add("active");

      // Show the corresponding content
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// Set up form submissions
function setupForms() {
  // Personal info form
  const personalInfoForm = document.getElementById("personal-info-form");
  personalInfoForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("full-name").value;
    const phone = document.getElementById("phone").value;

    updatePersonalInfo(name, phone);
  });

  // Password change form
  const passwordForm = document.getElementById("change-password-form");
  passwordForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      showToast("كلمة المرور الجديدة وتأكيدها غير متطابقين", "error");
      return;
    }

    updatePassword(currentPassword, newPassword);
  });
}

// Update personal information
function updatePersonalInfo(name, phone) {
  const token = getToken();
  
  const saveBtn = document.querySelector("#personal-info-form .save-btn");
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  saveBtn.disabled = true;
  try {
    const userData = getProfileUserData();
    userData.name = name;
    userData.phone = phone;
    persistUserDataToStorage(userData);
    const profileName = document.getElementById("profile-name");
    if (profileName) {
      profileName.textContent = name;
    }
    showToast("تم تحديث المعلومات الشخصية بنجاح", "success");
  } catch (error) {
    console.error("Error updating profile:", error);
    showToast("حدث خطأ أثناء تحديث المعلومات الشخصية", "error");
  } finally {
    saveBtn.innerHTML = originalBtnText;
    saveBtn.disabled = false;
  }
}

// Update password
function updatePassword(currentPassword, newPassword) {
  const token = getToken();
  
  const saveBtn = document.querySelector("#change-password-form .save-btn");
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
  saveBtn.disabled = true;
  try {
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
    document.getElementById("confirm-password").value = "";
    showToast("تم تغيير كلمة المرور بنجاح", "success");
  } catch (error) {
    console.error("Error updating password:", error);
    showToast("تعذر تحديث كلمة المرور محليًا", "error");
  } finally {
    saveBtn.innerHTML = originalBtnText;
    saveBtn.disabled = false;
  }
}

// Set up photo upload
function setupPhotoUpload() {
  const changePhotoBtn = document.getElementById("change-photo-btn");
  const photoUploadInput = document.getElementById("photo-upload");
  const photoModal = document.getElementById("photo-modal");
  const modalClose = document.getElementById("modal-close");
  const selectPhotoBtn = document.getElementById("select-photo-btn");
  const takePhotoBtn = document.getElementById("take-photo-btn");
  const savePhotoBtn = document.getElementById("save-photo-btn");
  const cancelPhotoBtn = document.getElementById("cancel-photo-btn");
  const photoPreview = document.getElementById("photo-preview");

  // Open modal when change photo button is clicked
  changePhotoBtn.addEventListener("click", function () {
    photoModal.style.display = "block";
  });

  // Close modal when close button is clicked
  modalClose.addEventListener("click", function () {
    photoModal.style.display = "none";
  });

  // Close modal when cancel button is clicked
  cancelPhotoBtn.addEventListener("click", function () {
    photoModal.style.display = "none";
  });

  // Select photo from device
  selectPhotoBtn.addEventListener("click", function () {
    photoUploadInput.click();
  });

  // Handle file selection
  photoUploadInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        photoPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle camera photo capture (if supported)
  takePhotoBtn.addEventListener("click", function () {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Request camera access
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(function (stream) {
          // Create video element to show camera feed
          const video = document.createElement("video");
          video.srcObject = stream;
          video.play();

          // Replace modal content temporarily
          const modalBody = document.querySelector(".modal-body");
          const originalContent = modalBody.innerHTML;

          modalBody.innerHTML = "";
          modalBody.appendChild(video);

          // Add capture button
          const captureBtn = document.createElement("button");
          captureBtn.className = "btn btn-primary";
          captureBtn.style.margin = "10px auto";
          captureBtn.style.display = "block";
          captureBtn.innerHTML = '<i class="fas fa-camera"></i> التقط الصورة';
          modalBody.appendChild(captureBtn);

          // Add cancel button
          const cancelCaptureBtn = document.createElement("button");
          cancelCaptureBtn.className = "btn btn-secondary";
          cancelCaptureBtn.style.margin = "10px auto";
          cancelCaptureBtn.style.display = "block";
          cancelCaptureBtn.innerHTML = '<i class="fas fa-times"></i> إلغاء';
          modalBody.appendChild(cancelCaptureBtn);

          // Handle capture
          captureBtn.addEventListener("click", function () {
            // Create canvas to capture image
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Get image data
            const imageData = canvas.toDataURL("image/png");

            // Stop video stream
            stream.getTracks().forEach((track) => track.stop());

            // Restore original modal content
            modalBody.innerHTML = originalContent;

            // Set preview image
            photoPreview.src = imageData;
          });

          // Handle cancel
          cancelCaptureBtn.addEventListener("click", function () {
            // Stop video stream
            stream.getTracks().forEach((track) => track.stop());

            // Restore original modal content
            modalBody.innerHTML = originalContent;
          });
        })
        .catch(function (error) {
          console.error("Error accessing camera:", error);
          showToast("لا يمكن الوصول إلى الكاميرا", "error");
        });
    } else {
      showToast("الكاميرا غير مدعومة في هذا المتصفح", "error");
    }
  });

  // Save photo
  savePhotoBtn.addEventListener("click", function () {
    const imageData = photoPreview.src;
    if (imageData && imageData !== "#") {
      uploadProfilePhoto(imageData);
      photoModal.style.display = "none";
    } else {
      showToast("الرجاء اختيار صورة أولاً", "error");
    }
  });

  // Close modal when clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === photoModal) {
      photoModal.style.display = "none";
    }
  });
}

// Upload profile photo
function uploadProfilePhoto(imageData) {
  document.querySelector(".profile-photo-container").classList.add("uploading");
  try {
    const userData = getProfileUserData();
    userData.profilePhoto = imageData;
    persistUserDataToStorage(userData);
    setProfilePhoto(imageData);
    showToast("تم تحديث صورة الملف الشخصي بنجاح", "success");
  } catch (error) {
    console.error("Error saving photo locally:", error);
    const profilePhoto = document.getElementById("profile-photo");
    profilePhoto.innerHTML = '<i class="fas fa-user"></i>';
    showToast("حدث خطأ أثناء تحديث الصورة", "error");
  } finally {
    document
      .querySelector(".profile-photo-container")
      .classList.remove("uploading");
  }
}

// Set up language switcher
function setupLanguageSwitcher() {
  const langButtons = document.querySelectorAll(".lang-btn");
  // Use the language from i18n if available, otherwise use localStorage
  const currentLang = window.i18n
    ? window.i18n.getCurrentLanguage()
    : localStorage.getItem("language") || "ar";

  // Set initial active state based on stored preference
  langButtons.forEach((button) => {
    const buttonLang = button.getAttribute("data-lang");
    if (buttonLang === currentLang) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }

    // Add ripple effect on click
    button.addEventListener("click", function (e) {
      // Create ripple element
      const ripple = document.createElement("span");
      ripple.classList.add("lang-btn-ripple");
      this.appendChild(ripple);

      // Position the ripple
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

      // Remove ripple after animation
      setTimeout(() => {
        ripple.remove();
      }, 600);

      // Get language from button data attribute
      const lang = this.getAttribute("data-lang");

      // Remove active class from all buttons
      langButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to current button with slight delay for animation
      setTimeout(() => {
        this.classList.add("active");
      }, 50);

      // Change language
      changeLanguage(lang);
    });
  });
}

// Change website language
function changeLanguage(lang) {
  // Store language preference
  localStorage.setItem("language", lang);
  localStorage.setItem("public-language", lang); // For i18n.js compatibility

  // If i18n system is available, use it
  if (window.i18n && typeof window.i18n.switchLanguage === "function") {
    // This will handle direction, document language, and translations
    window.i18n.switchLanguage(lang);
  } else {
    // Fallback if i18n is not available
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }

  // Update dynamic translations that aren't handled by i18n.applyTranslations
  updateDynamicTranslations();

  // Show toast notification
  if (lang === "ar") {
    showToast("تم تغيير اللغة إلى العربية", "success");
  } else {
    showToast("Language changed to English", "success");
  }

  // Update level name based on new language
  const currentLevel = document.getElementById("current-level");
  if (currentLevel) {
    const points =
      parseInt(document.getElementById("total-points").textContent) || 0;
    const level = calculateLevel(points);
    currentLevel.textContent = getLevelName(level);
  }
}

// Set up toast notifications
function setupToast() {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  const toastClose = document.getElementById("toast-close");

  toastClose.addEventListener("click", function () {
    toast.classList.remove("show");
  });
}

// Show toast notification
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  const toastIcon = document.querySelector(".toast-icon i");

  // Set message
  toastMessage.textContent = message;

  // Set icon based on type
  if (type === "success") {
    toastIcon.className = "fas fa-check-circle";
    toastIcon.style.color = "var(--success-color)";
  } else if (type === "error") {
    toastIcon.className = "fas fa-exclamation-circle";
    toastIcon.style.color = "var(--error-color)";
  } else if (type === "warning") {
    toastIcon.className = "fas fa-exclamation-triangle";
    toastIcon.style.color = "var(--warning-color)";
  }

  // Show toast
  toast.classList.add("show");

  // Hide toast after 5 seconds
  setTimeout(function () {
    toast.classList.remove("show");
  }, 5000);
}

// Set up notification toggles
function setupNotificationToggles() {
  const offersToggle = document.getElementById("offers-notifications");
  const orderToggle = document.getElementById("order-notifications");

  if (!offersToggle || !orderToggle) return;

  // Load saved preferences
  const notificationSettings = loadNotificationSettings();

  // Set initial state
  offersToggle.checked = notificationSettings.offersEnabled;
  orderToggle.checked = notificationSettings.orderUpdatesEnabled;

  // Set up change event listeners
  offersToggle.addEventListener("change", function () {
    saveNotificationSetting("offersEnabled", this.checked);
    showNotificationFeedback("offers", this.checked);
  });

  orderToggle.addEventListener("change", function () {
    saveNotificationSetting("orderUpdatesEnabled", this.checked);
    showNotificationFeedback("orders", this.checked);
  });

  // Add visual feedback on hover
  addHoverEffectToToggles();
}

// Load notification settings
function loadNotificationSettings() {
  // Default settings if not found
  const defaultSettings = {
    offersEnabled: true,
    orderUpdatesEnabled: true,
  };

  try {
    const savedSettings = localStorage.getItem("notificationSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  } catch (e) {
    console.error("Error loading notification settings:", e);
    return defaultSettings;
  }
}

// Save notification setting
function saveNotificationSetting(setting, value) {
  try {
    const currentSettings = loadNotificationSettings();
    currentSettings[setting] = value;
    localStorage.setItem(
      "notificationSettings",
      JSON.stringify(currentSettings)
    );

    // If using a real API, send the settings to the server
    if (!USE_MOCK_API) {
      updateNotificationSettingsOnServer(currentSettings);
    }
  } catch (e) {
    console.error("Error saving notification setting:", e);
  }
}

// Update notification settings on server (for real API)
function updateNotificationSettingsOnServer(settings) {
  try {
    localStorage.setItem("notificationSettings", JSON.stringify(settings));
    return Promise.resolve({ success: true });
  } catch (e) {
    console.error("Error saving notification settings:", e);
    return Promise.resolve({ success: false });
  }
}

// Show notification feedback
function showNotificationFeedback(type, enabled) {
  // Get current language
  const currentLang = window.i18n
    ? window.i18n.getCurrentLanguage()
    : localStorage.getItem("language") || "ar";

  let message;
  if (currentLang === "ar") {
    message =
      type === "offers"
        ? enabled
          ? "تم تفعيل إشعارات العروض"
          : "تم إلغاء تفعيل إشعارات العروض"
        : enabled
        ? "تم تفعيل إشعارات الطلبات"
        : "تم إلغاء تفعيل إشعارات الطلبات";
  } else {
    message =
      type === "offers"
        ? enabled
          ? "Offers notifications enabled"
          : "Offers notifications disabled"
        : enabled
        ? "Order notifications enabled"
        : "Order notifications disabled";
  }

  showToast(message, "success");
}

// Add hover effects to toggles
function addHoverEffectToToggles() {
  const toggleOptions = document.querySelectorAll(".toggle-option");

  toggleOptions.forEach((option) => {
    option.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)";
    });

    option.addEventListener("mouseleave", function () {
      this.style.transform = "";
    });
  });
}
