// Profile Page JavaScript

// API Configuration
const USE_MOCK_API = false; // Set to false to use the real backend
<<<<<<< HEAD
const API_BASE_URL = "http://localhost:5000"; // Set your real API base URL here
=======
window.API_BASE_URL = window.API_BASE_URL || (function () {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? "http://localhost:5000" : origin;
})();
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654

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
        pointsHistory: [
          {
            date: new Date().toISOString(),
            points: 50,
            description: isEnglish
              ? "New account registration"
              : "تسجيل حساب جديد",
            source: "registration",
          },
          {
            date: new Date(Date.now() - 86400000).toISOString(), // yesterday
            points: 70,
            description: isEnglish ? "First order" : "طلب أول مرة",
            source: "order",
          },
        ],
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
  // Check if user is logged in
  if (!isLoggedIn()) {
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
  // Show loading state
  document.getElementById("profile-name").textContent = "جاري التحميل...";
  document.getElementById("points-value").textContent = "...";
  document.getElementById("total-points").textContent = "...";

  // Get user data - use the token to get it from the server
  let token = getToken();

  // If no token is available, redirect to login
  if (!token) {
    console.error("No authentication token available");
    showToast("يرجى تسجيل الدخول مرة أخرى", "error");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);
    return;
  }

  // Try to get cached user data first for quick display
  const cachedUserData = localStorage.getItem("userData");
  let userData = null;

  if (cachedUserData) {
    try {
      userData = JSON.parse(cachedUserData);
      // Update UI with cached data immediately for quick feedback
      updateUIWithUserData(userData);
    } catch (e) {
      console.error("Error parsing cached user data:", e);
    }
  }

  // Try to refresh the token first to ensure it's valid
  refreshToken()
    .then((newToken) => {
      // Use the refreshed token
      token = newToken || token;

      // Now fetch fresh data from server with the refreshed token
      return fetch(`${API_BASE_URL}/api/customer/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    })
    .catch((error) => {
      console.warn("Token refresh failed:", error);

      // If there's an authentication error, redirect to login
      if (
        error.message.includes("Invalid authentication token") ||
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("unauthorized")
      ) {
        showToast("انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى", "error");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
        throw new Error("Authentication failed, redirecting to login");
      }

      // For other errors, continue with existing token
      return fetch(`${API_BASE_URL}/api/customer/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    })
    .then((response) => {
      if (!response.ok) {
        // If unauthorized, need to re-login
        if (response.status === 401 || response.status === 403) {
          logout(); // Clear the invalid token
          window.location.href = "login.html"; // Redirect to login
          throw new Error("Session expired. Please login again.");
        }
        throw new Error(`Failed to fetch profile data: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Convert the data structure from API to match our expected format
        const apiUserData = {
          name: data.data.name || "المستخدم",
          email: data.data.email || "",
          phone: data.data.phone || "",
          points: data.data.loyaltyPoints || 0,
          profilePhoto: data.data.profilePhoto || "",
          address: data.data.address || "",
        };

        // Save user data to localStorage for caching
        localStorage.setItem("userData", JSON.stringify(apiUserData));

        // Update UI with user data
        updateUIWithUserData(apiUserData);

        // Load points history for this user
        loadPointsHistoryFromAPI(token);

        console.log("Real API data loaded successfully");
      } else {
        console.warn("API returned unsuccessful response:", data.message);
        showToast("حدث خطأ أثناء تحميل البيانات", "error");
      }
    })
    .catch((error) => {
      console.error("Error fetching profile data:", error);

      // Don't show error toast if we're already redirecting due to auth issues
      if (!error.message.includes("redirecting to login")) {
        // If we don't have cached data yet, create fallback data
        if (!userData) {
          userData = createFallbackUserData();
          updateUIWithUserData(userData);
        }

        showToast(
          "تعذر الاتصال بالخادم، يتم استخدام البيانات المخزنة محليًا",
          "warning"
        );
      }
    });
}

// Load points history from API
function loadPointsHistoryFromAPI(token) {
  // Show loading indicator in the history list
  const historyList = document.getElementById("points-history-list");
  historyList.innerHTML =
    '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> جاري تحميل سجل النقاط...</div>';

  // Make sure we have a valid token
  if (!token) {
    console.warn("No token available for loading points history");
    loadFallbackPointsHistory();
    return;
  }

  fetch(`${API_BASE_URL}/api/customer/loyalty-points/history`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        // If unauthorized, need to re-login
        if (response.status === 401) {
          console.warn("Authentication token invalid or expired");
          // Don't redirect here since this is a secondary request
          // Just load fallback data
          return { success: false, history: [] };
        }

        // If 404, the endpoint doesn't exist yet
        if (response.status === 404) {
          return { success: false, history: [] };
        }
        throw new Error(
          `Failed to fetch points history: ${response.statusText}`
        );
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && data.data && data.data.length > 0) {
        console.log("Received points history:", data.data);
        // Load the points history into the UI
        loadPointsHistory(data.data);
      } else {
        console.log("No points history found or empty response");
        // If no history or endpoint doesn't exist, use sample data
        loadFallbackPointsHistory();
      }
    })
    .catch((error) => {
      console.error("Error fetching points history:", error);
      // Load sample history as fallback
      loadFallbackPointsHistory();
    });
}

// Load fallback points history when API fails
function loadFallbackPointsHistory() {
  // Create sample history with Arabic descriptions as keys
  // The loadPointsHistory function will handle the translation based on these keys
  const sampleHistory = [
    {
      date: new Date().toISOString(),
      points: 50,
      description: "تسجيل حساب جديد", // Will be mapped to pointsRegistrationTitle
      source: "registration",
    },
    {
      date: new Date(Date.now() - 86400000).toISOString(), // yesterday
      points: 70,
      description: "طلب أول مرة", // Will be mapped to pointsFirstOrderTitle
      source: "order",
    },
    {
      date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      points: 30,
      description: "تعديل نقاط من الإدارة (إضافة)", // Will be mapped to pointsAdminAddTitle
      source: "manual",
    },
  ];
  loadPointsHistory(sampleHistory);
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

  // Get user email from auth if available
  let email = "";
  try {
    const token = getToken();
    if (token) {
      // Try to decode JWT to get email
      const payload = JSON.parse(atob(token.split(".")[1]));
      email = payload.email || "";
    }
  } catch (e) {
    console.warn("Could not decode token for email", e);
  }

  // Create sample user data with Arabic descriptions as keys
  // The loadPointsHistory function will handle the translation
  return {
    name: isEnglish ? "User" : "المستخدم",
    email: email,
    phone: "",
    points: 120,
    profilePhoto: "",
    pointsHistory: [
      {
        date: new Date().toISOString(),
        points: 50,
        description: "تسجيل حساب جديد", // Will be mapped to pointsRegistrationTitle
        source: "registration",
      },
      {
        date: new Date(Date.now() - 86400000).toISOString(), // yesterday
        points: 70,
        description: "طلب أول مرة", // Will be mapped to pointsFirstOrderTitle
        source: "order",
      },
      {
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        points: 30,
        description: "تعديل نقاط من الإدارة (إضافة)", // Will be mapped to pointsAdminAddTitle
        source: "manual",
      },
    ],
  };
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

  // Show loading state
  const saveBtn = document.querySelector("#personal-info-form .save-btn");
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
  saveBtn.disabled = true;

  fetch(`${API_BASE_URL}/api/customer/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      phone,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Update cached user data
        try {
          const userData = JSON.parse(localStorage.getItem("userData")) || {};
          userData.name = name;
          userData.phone = phone;
          localStorage.setItem("userData", JSON.stringify(userData));

          // Update display name in UI
          const profileName = document.getElementById("profile-name");
          if (profileName) {
            profileName.textContent = name;
          }
        } catch (e) {
          console.error("Error updating cached user data:", e);
        }

        showToast("تم تحديث المعلومات الشخصية بنجاح", "success");
      } else {
        console.warn("Failed to update profile:", data.message);
        showToast("فشل تحديث المعلومات الشخصية", "error");
      }
    })
    .catch((error) => {
      console.error("Error updating profile:", error);
      showToast("حدث خطأ أثناء تحديث المعلومات الشخصية", "error");
    })
    .finally(() => {
      // Restore button state
      saveBtn.innerHTML = originalBtnText;
      saveBtn.disabled = false;
    });
}

// Update password
function updatePassword(currentPassword, newPassword) {
  const token = getToken();

  // Show loading state
  const saveBtn = document.querySelector("#change-password-form .save-btn");
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحديث...';
  saveBtn.disabled = true;

  if (USE_MOCK_API) {
    console.log("Notice: Using mock API for password update");
  }

  fetch(`${API_BASE_URL}/api/customer/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          // Simulate success if endpoint doesn't exist (for demo)
          return { success: true };
        }
        throw new Error("Failed to update password");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Clear password fields
        document.getElementById("current-password").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-password").value = "";

        showToast("تم تغيير كلمة المرور بنجاح", "success");

        if (USE_MOCK_API) {
          console.log("Mock API: Password updated successfully");
        }
      } else {
        showToast(data.message || "فشل تغيير كلمة المرور", "error");
      }
    })
    .catch((error) => {
      console.error("Error updating password:", error);
      showToast("تعذر الاتصال بالخادم. حاول مرة أخرى لاحقًا", "error");
    })
    .finally(() => {
      // Restore button state
      saveBtn.innerHTML = originalBtnText;
      saveBtn.disabled = false;
    });
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
  const token = getToken();

  // Show loading state in the photo area
  document.querySelector(".profile-photo-container").classList.add("uploading");

  if (USE_MOCK_API) {
    console.log("Notice: Using mock API for photo upload");
  }

  fetch(`${API_BASE_URL}/api/customer/upload-photo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      photo: imageData,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 404) {
          // If endpoint doesn't exist, just use the provided image
          return {
            success: true,
            photoUrl: imageData,
          };
        }
        throw new Error("Failed to upload photo");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success) {
        // Update cached user data
        const cachedUserData = localStorage.getItem("userData");
        if (cachedUserData) {
          try {
            const userData = JSON.parse(cachedUserData);
            userData.profilePhoto = data.photoUrl || imageData;
            localStorage.setItem("userData", JSON.stringify(userData));
          } catch (e) {
            console.error("Error updating cached user data:", e);
          }
        }

        // Update profile photo
        setProfilePhoto(data.photoUrl || imageData);

        showToast("تم تحديث صورة الملف الشخصي بنجاح", "success");

        if (USE_MOCK_API) {
          console.log("Mock API: Photo uploaded successfully");
        }
      } else {
        // Show error message
        const profilePhoto = document.getElementById("profile-photo");
        profilePhoto.innerHTML = '<i class="fas fa-user"></i>';
        showToast(data.message || "فشل تحديث الصورة", "error");
      }
    })
    .catch((error) => {
      console.error("Error uploading photo:", error);

      // Store the image locally anyway
      const cachedUserData = localStorage.getItem("userData");
      if (cachedUserData) {
        try {
          const userData = JSON.parse(cachedUserData);
          userData.profilePhoto = imageData;
          localStorage.setItem("userData", JSON.stringify(userData));
          // Display the image
          setProfilePhoto(imageData);
          showToast("تم حفظ الصورة محليًا فقط", "warning");
          return;
        } catch (e) {
          console.error("Error updating cached user data:", e);
        }
      }

      // Show error message
      const profilePhoto = document.getElementById("profile-photo");
      profilePhoto.innerHTML = '<i class="fas fa-user"></i>';
      showToast("حدث خطأ أثناء تحديث الصورة", "error");
    })
    .finally(() => {
      // Restore original state
      document
        .querySelector(".profile-photo-container")
        .classList.remove("uploading");
    });
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
  const token = getToken();

  // This would normally send the settings to the server
  // For now we just use localStorage
  if (USE_MOCK_API) {
    localStorage.setItem("notificationSettings", JSON.stringify(settings));
    return Promise.resolve({ success: true });
  }

  return fetch(`${API_BASE_URL}/api/customer/update-notification-settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(settings),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to update notification settings on server");
      }
      return response.json();
    })
    .then((data) => {
      console.log("Notification settings updated on server:", data);
    })
    .catch((error) => {
      console.error("Error updating notification settings on server:", error);
    });
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
