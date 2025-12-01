// Global Settings Loader
// This script loads global settings from the API and makes them available across all pages
(function () {
  "use strict";

  const API_BASE_URL = (function () {
    const { hostname, origin } = window.location;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    return isLocal ? "http://localhost:5000/api" : `${origin}/api`;
  })();
  const DEFAULT_HERO_BANNER_IMAGE =
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800";

  // Global settings object that will be populated from the API
  window.globalSettings = {
    currency: "EGP",
    defaultLanguage: "ar",
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
    heroBannerImage: DEFAULT_HERO_BANNER_IMAGE,
    loaded: false,
  };

  function applyDefaultLanguageToLocalStorage(settings) {
    if (!settings) {
      return false;
    }

    const defaultLang = settings.defaultLanguage || "ar";

    try {
      const storedLang = localStorage.getItem("public-language");
      const languageSource = localStorage.getItem("public-language-source");

      if (languageSource === "user") {
        return false;
      }

      const needsUpdate =
        !storedLang ||
        storedLang !== defaultLang ||
        languageSource !== "default";

      if (needsUpdate) {
        localStorage.setItem("public-language", defaultLang);
        localStorage.setItem("public-language-source", "default");
        window.dispatchEvent(
          new CustomEvent("public-language-updated", {
            detail: { language: defaultLang, source: "default" },
          })
        );
        return true;
      }
    } catch (error) {
      console.warn("Failed to persist default language:", error);
    }

    return false;
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

  async function loadGlobalSettings() {
    try {
      const saved = localStorage.getItem("globalSettings");
      if (saved) {
        let data = {};
        try {
          data = JSON.parse(saved) || {};
        } catch (_) {
          data = {};
        }

        Object.assign(window.globalSettings, data);

        if (!window.globalSettings.heroBannerImage) {
          window.globalSettings.heroBannerImage = DEFAULT_HERO_BANNER_IMAGE;
          try {
            localStorage.setItem(
              "globalSettings",
              JSON.stringify(window.globalSettings)
            );
          } catch (error) {
            console.warn("Failed to persist hero banner image default:", error);
          }
        }

        if (data.currency) {
          window.globalSettings.currency = data.currency;
        }

        applyDefaultLanguageToLocalStorage(window.globalSettings);

        window.globalSettings.loaded = true;

        window.dispatchEvent(
          new CustomEvent("global-settings-loaded", {
            detail: window.globalSettings,
          })
        );

        if (typeof refreshAllCurrencyDisplays === "function") {
          refreshAllCurrencyDisplays();
        }
        return window.globalSettings;
      }
    } catch (error) {
      console.warn("Failed to load saved global settings:", error);
    }

    window.globalSettings.heroBannerImage = DEFAULT_HERO_BANNER_IMAGE;
    window.globalSettings.loaded = true;
    try {
      localStorage.setItem(
        "globalSettings",
        JSON.stringify(window.globalSettings)
      );
    } catch (persistError) {
      console.warn("Failed to persist default global settings:", persistError);
    }

    applyDefaultLanguageToLocalStorage(window.globalSettings);

    window.dispatchEvent(
      new CustomEvent("global-settings-loaded", {
        detail: window.globalSettings,
      })
    );

    if (typeof refreshAllCurrencyDisplays === "function") {
      refreshAllCurrencyDisplays();
    }
    return window.globalSettings;
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
        
        applyDefaultLanguageToLocalStorage(window.globalSettings);

        // Dispatch event to notify other scripts
        window.dispatchEvent(
          new CustomEvent("global-settings-changed", {
            detail: window.globalSettings,
          })
        );
        
        // Refresh all currency displays
        if (typeof refreshAllCurrencyDisplays === "function") {
          refreshAllCurrencyDisplays();
        }
      }
    });
  }

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

        applyDefaultLanguageToLocalStorage(window.globalSettings);

        // Dispatch event to notify other scripts
        window.dispatchEvent(
          new CustomEvent("global-settings-changed", {
            detail: window.globalSettings,
          })
        );
        
        // Refresh all currency displays
        if (typeof refreshAllCurrencyDisplays === "function") {
          refreshAllCurrencyDisplays();
        }
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

          applyDefaultLanguageToLocalStorage(window.globalSettings);

          // Dispatch event to notify other scripts
          window.dispatchEvent(
            new CustomEvent("global-settings-changed", {
              detail: window.globalSettings,
            })
          );
          
          // Refresh all currency displays
          if (typeof refreshAllCurrencyDisplays === "function") {
            refreshAllCurrencyDisplays();
          }
        }
      } catch (error) {
        console.error('Error parsing settings update:', error);
      }
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadGlobalSettings);
  } else {
    loadGlobalSettings();
  }

  // Export the load function for manual calls
  window.loadGlobalSettings = loadGlobalSettings;
})();
