// Global Settings Loader
// This script loads global settings from the API and makes them available across all pages
(function () {
  "use strict";

  const API_BASE_URL = "http://localhost:5000/api";

  // Global settings object that will be populated from the API
  window.globalSettings = {
    currency: "EGP",
    restaurantName: "Digital Menu",
    restaurantNameEn: "Digital Menu",
    restaurantAddress: "",
    restaurantAddressEn: "",
    workingHoursStart: "09:00",
    workingHoursEnd: "23:00",
    workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    contactPhone: "",
    contactWhatsapp: "",
    contactEmail: "",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    loaded: false,
  };

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
    YER: { en: "YER", ar: "ريال" }
  };

  // Helper function to get currency text based on current language
  window.getCurrencyText = function () {
    const currentLang =
      typeof getCurrentLanguage === "function"
        ? getCurrentLanguage()
        : localStorage.getItem("public-language") || "ar";
    
    // If global settings are loaded, use the currency translation
    if (window.globalSettings.loaded && window.globalSettings.currency) {
      const currencyCode = window.globalSettings.currency;
      const translation = currencyTranslations[currencyCode];
      
      if (translation) {
        return translation[currentLang] || translation.en;
      }
      
      // Fallback to currency code if no translation found
      return currencyCode;
    }
    
    // Fallback to default
    return currentLang === "en" ? "EGP" : "جنيه";
  };

  // Helper function to get restaurant name based on current language
  window.getRestaurantName = function () {
    const currentLang =
      typeof getCurrentLanguage === "function"
        ? getCurrentLanguage()
        : localStorage.getItem("public-language") || "ar";
    
    if (window.globalSettings.loaded) {
      return currentLang === "en"
        ? window.globalSettings.restaurantNameEn
        : window.globalSettings.restaurantName;
    }
    
    return "Digital Menu";
  };

  // Helper function to get restaurant address based on current language
  window.getRestaurantAddress = function () {
    const currentLang =
      typeof getCurrentLanguage === "function"
        ? getCurrentLanguage()
        : localStorage.getItem("public-language") || "ar";
    
    if (window.globalSettings.loaded) {
      return currentLang === "en"
        ? window.globalSettings.restaurantAddressEn
        : window.globalSettings.restaurantAddress;
    }
    
    return "";
  };

  // Function to load global settings from the API
  async function loadGlobalSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/global-settings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Update global settings with data from API
        Object.assign(window.globalSettings, result.data);
        // Ensure currency is available for both language modes
        if (result.data.currency) {
          window.globalSettings.currency = result.data.currency;
        }
        window.globalSettings.loaded = true;

        // Dispatch event to notify other scripts that settings are loaded
        window.dispatchEvent(
          new CustomEvent("global-settings-loaded", {
            detail: window.globalSettings,
          })
        );

        console.log("Global settings loaded successfully:", window.globalSettings);
        return window.globalSettings;
      } else {
        throw new Error(result.message || "Failed to load settings");
      }
    } catch (error) {
      console.warn("Error loading global settings, using defaults:", error);
      window.globalSettings.loaded = false;
      
      // Dispatch event even on error so other scripts know loading is complete
      window.dispatchEvent(
        new CustomEvent("global-settings-loaded", {
          detail: window.globalSettings,
        })
      );
      
      return window.globalSettings;
    }
  }

  // Function to reload global settings (useful after admin updates)
  window.reloadGlobalSettings = function () {
    return loadGlobalSettings();
  };

  // Listen for WebSocket updates if available
  if (typeof window.addEventListener === "function") {
    window.addEventListener("global-settings-updated", function (event) {
      console.log("Global settings updated via WebSocket:", event.detail);
      if (event.detail) {
        Object.assign(window.globalSettings, event.detail);
        // Ensure currency is available for both language modes
        if (event.detail.currency) {
          window.globalSettings.currency = event.detail.currency;
        }
        window.globalSettings.loaded = true;
        
        // Dispatch event to notify other scripts
        window.dispatchEvent(
          new CustomEvent("global-settings-changed", {
            detail: window.globalSettings,
          })
        );
        
        // Refresh all currency displays
        refreshAllCurrencyDisplays();
      }
    });
  }

  // Function to refresh all currency displays on the page
  function refreshAllCurrencyDisplays() {
    console.log("Refreshing all currency displays with new settings");
    
    // Trigger cart recalculation if on cart page
    if (typeof calculateTotals === "function") {
      calculateTotals();
    }
    
    // Trigger product display refresh if on menu page
    if (typeof displayProducts === "function") {
      displayProducts();
    }
    
    // Refresh cashier displays if on cashier page
    if (typeof updateOrderSummary === "function") {
      updateOrderSummary();
    }
    
    if (typeof updateCartDisplay === "function") {
      updateCartDisplay();
    }
    
    // Refresh any visible price elements
    refreshPriceElements();
  }

  // Function to refresh individual price elements
  function refreshPriceElements() {
    // Find all elements with price data and update them
    const priceElements = document.querySelectorAll('[data-price]');
    priceElements.forEach(element => {
      const price = parseFloat(element.getAttribute('data-price'));
      if (!isNaN(price)) {
        const currencyText = getCurrencyText();
        element.textContent = `${price.toFixed(2)} ${currencyText}`;
      }
    });
  }

  // Export refresh function
  window.refreshAllCurrencyDisplays = refreshAllCurrencyDisplays;

  // Listen for BroadcastChannel updates from admin panel
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('global-settings-channel');
    channel.onmessage = function(event) {
      if (event.data.type === 'settings-updated' && event.data.data) {
        console.log('Received settings update via BroadcastChannel');
        Object.assign(window.globalSettings, event.data.data);
        // Ensure currency is available for both language modes
        if (event.data.data.currency) {
          window.globalSettings.currency = event.data.data.currency;
        }
        window.globalSettings.loaded = true;
        
        // Dispatch event to notify other scripts
        window.dispatchEvent(
          new CustomEvent("global-settings-changed", {
            detail: window.globalSettings,
          })
        );
        
        // Refresh all currency displays
        refreshAllCurrencyDisplays();
      }
    };
  }

  // Listen for localStorage updates (cross-tab communication fallback)
  window.addEventListener('storage', function(event) {
    if (event.key === 'global-settings-update' && event.newValue) {
      try {
        const update = JSON.parse(event.newValue);
        if (update.settings) {
          console.log('Received settings update via localStorage');
          Object.assign(window.globalSettings, update.settings);
          // Ensure currency is available for both language modes
          if (update.settings.currency) {
            window.globalSettings.currency = update.settings.currency;
          }
          window.globalSettings.loaded = true;
          
          // Dispatch event to notify other scripts
          window.dispatchEvent(
            new CustomEvent("global-settings-changed", {
              detail: window.globalSettings,
            })
          );
          
          // Refresh all currency displays
          refreshAllCurrencyDisplays();
        }
      } catch (error) {
        console.error('Error parsing settings update:', error);
      }
    }
  });

  // Auto-load settings when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGlobalSettings);
  } else {
    // DOM is already ready, load immediately
    loadGlobalSettings();
  }

  // Export the load function for manual calls
  window.loadGlobalSettings = loadGlobalSettings;
})();
