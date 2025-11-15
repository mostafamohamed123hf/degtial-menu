// Global Settings Management
(function () {
  "use strict";

  const API_BASE_URL = (function () {
    const { hostname, origin } = window.location;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    return isLocal ? "http://localhost:5000/api" : `${origin}/api`;
  })();
  let currentSettings = {};

  // Initialize global settings when DOM is loaded
  document.addEventListener("DOMContentLoaded", function () {
    initializeGlobalSettings();
  });

  function initializeGlobalSettings() {
    const globalSettingsForm = document.getElementById("global-settings-form");
    const resetButton = document.getElementById("reset-global-settings");

    if (!globalSettingsForm) {
      console.log("Global settings form not found");
      return;
    }

    // Load settings when the section is opened
    const globalSettingsTab = document.getElementById("global-settings-tab");
    if (globalSettingsTab) {
      globalSettingsTab.addEventListener("click", function (e) {
        loadGlobalSettings();
        
        // Toggle submenu
        const submenu = document.getElementById("global-settings-submenu");
        if (submenu) {
          submenu.classList.toggle("show");
        }
      });
    }

    // Handle submenu clicks
    const subtabs = document.querySelectorAll("#global-settings-submenu .admin-subtab");
    subtabs.forEach(subtab => {
      subtab.addEventListener("click", function (e) {
        e.preventDefault();
        const targetTab = this.getAttribute("data-target");
        
        // Remove active class from all global settings subtabs
        subtabs.forEach(st => st.classList.remove("active"));
        
        // Add active class to clicked subtab
        this.classList.add("active");
        
        // Hide all sections
        const sections = document.querySelectorAll(".admin-section");
        sections.forEach(section => {
          section.style.display = "none";
        });
        
        // Switch to target tab (for settings-tab elements within global-settings-section)
        document.querySelectorAll(".settings-tab").forEach(tab => tab.classList.remove("active"));
        const targetElement = document.getElementById(targetTab);
        if (targetElement) {
          // If it's a settings-tab, use classList
          if (targetElement.classList.contains("settings-tab")) {
            targetElement.classList.add("active");
            // Show the parent global-settings-section
            const globalSettingsSection = document.getElementById("global-settings-section");
            if (globalSettingsSection) {
              globalSettingsSection.style.display = "block";
            }
          } else {
            // If it's an admin-section, use display style
            targetElement.style.display = "block";
          }
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

    // Form submission
    globalSettingsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveGlobalSettings();
    });

    // Reset button
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        if (confirm(getTranslation("confirmResetSettings", "Are you sure you want to reset to default settings?"))) {
          resetToDefaultSettings();
        }
      });
    }

    // Working days checkboxes - add visual feedback
    const dayCheckboxes = document.querySelectorAll('.day-checkbox input[type="checkbox"]');
    dayCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", function () {
        const parent = this.closest(".day-checkbox");
        if (this.checked) {
          parent.classList.add("checked");
        } else {
          parent.classList.remove("checked");
        }
      });
    });

    // Currency is now automatically translated based on language
    // No need for separate currency symbol field

    // Load settings on page load if on global settings section
    const currentSection = window.location.hash;
    if (currentSection === "#global-settings-section") {
      loadGlobalSettings();
    }
  }

  async function loadGlobalSettings() {
    try {
      showLoadingState(true);

      const response = await fetch(`${API_BASE_URL}/global-settings`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        currentSettings = result.data;
        populateForm(result.data);
        showNotification(getTranslation("settingsLoaded", "Settings loaded successfully"), "success");
      } else {
        throw new Error(result.message || "Failed to load settings");
      }
    } catch (error) {
      console.error("Error loading global settings:", error);
      showNotification(getTranslation("errorLoadingSettings", "Error loading settings"), "error");
      
      // Initialize with default values if loading fails
      initializeDefaultSettings();
    } finally {
      showLoadingState(false);
    }
  }

  function populateForm(settings) {
    // Working Hours
    document.getElementById("working-hours-start").value = settings.workingHoursStart || "09:00";
    document.getElementById("working-hours-end").value = settings.workingHoursEnd || "23:00";

    // Working Days
    const workingDays = settings.workingDays || [];
    const dayCheckboxes = document.querySelectorAll('.day-checkbox input[type="checkbox"]');
    dayCheckboxes.forEach((checkbox) => {
      checkbox.checked = workingDays.includes(checkbox.value);
      const parent = checkbox.closest(".day-checkbox");
      if (checkbox.checked) {
        parent.classList.add("checked");
      } else {
        parent.classList.remove("checked");
      }
    });

    // Contact Information
    document.getElementById("contact-phone").value = settings.contactPhone || "";
    document.getElementById("contact-whatsapp").value = settings.contactWhatsapp || "";
    document.getElementById("contact-email").value = settings.contactEmail || "";

    // Currency Settings
    document.getElementById("currency-code").value = settings.currency || "EGP";

    // Restaurant Information
    document.getElementById("restaurant-name").value = settings.restaurantName || "Digital Menu";
    document.getElementById("restaurant-name-en").value = settings.restaurantNameEn || "Digital Menu";
    document.getElementById("restaurant-address").value = settings.restaurantAddress || "";
    document.getElementById("restaurant-address-en").value = settings.restaurantAddressEn || "";

    // Social Media
    document.getElementById("social-facebook").value = settings.socialFacebook || "";
    document.getElementById("social-instagram").value = settings.socialInstagram || "";
    document.getElementById("social-twitter").value = settings.socialTwitter || "";

    // Hero Banner Settings
    document.getElementById("hero-banner-enabled").checked = settings.heroBannerEnabled !== false;
    document.getElementById("hero-banner-title").value = settings.heroBannerTitle || "Delicious Burger";
    document.getElementById("hero-banner-title-en").value = settings.heroBannerTitleEn || "Delicious Burger";
    document.getElementById("hero-banner-description").value = settings.heroBannerDescription || "مكونات طازجة، طعم رائع";
    document.getElementById("hero-banner-description-en").value = settings.heroBannerDescriptionEn || "Fresh ingredients, amazing taste";
    document.getElementById("hero-banner-original-price").value = settings.heroBannerOriginalPrice || 75;
    document.getElementById("hero-banner-discounted-price").value = settings.heroBannerDiscountedPrice || 55;
    document.getElementById("hero-banner-category").value = settings.heroBannerCategory || "burger";
    document.getElementById("hero-banner-image").value = settings.heroBannerImage || "";

    // Update preview
    updateHeroBannerPreview();
  }

  async function saveGlobalSettings() {
    try {
      showLoadingState(true);

      // Collect form data
      const formData = {
        workingHoursStart: document.getElementById("working-hours-start").value,
        workingHoursEnd: document.getElementById("working-hours-end").value,
        workingDays: Array.from(
          document.querySelectorAll('.day-checkbox input[type="checkbox"]:checked')
        ).map((cb) => cb.value),
        contactPhone: document.getElementById("contact-phone").value,
        contactWhatsapp: document.getElementById("contact-whatsapp").value,
        contactEmail: document.getElementById("contact-email").value,
        currency: document.getElementById("currency-code").value,
        restaurantName: document.getElementById("restaurant-name").value,
        restaurantNameEn: document.getElementById("restaurant-name-en").value,
        restaurantAddress: document.getElementById("restaurant-address").value,
        restaurantAddressEn: document.getElementById("restaurant-address-en").value,
        socialFacebook: document.getElementById("social-facebook").value,
        socialInstagram: document.getElementById("social-instagram").value,
        socialTwitter: document.getElementById("social-twitter").value,
        heroBannerEnabled: document.getElementById("hero-banner-enabled").checked,
        heroBannerTitle: document.getElementById("hero-banner-title").value,
        heroBannerTitleEn: document.getElementById("hero-banner-title-en").value,
        heroBannerDescription: document.getElementById("hero-banner-description").value,
        heroBannerDescriptionEn: document.getElementById("hero-banner-description-en").value,
        heroBannerOriginalPrice: parseFloat(document.getElementById("hero-banner-original-price").value) || 0,
        heroBannerDiscountedPrice: parseFloat(document.getElementById("hero-banner-discounted-price").value) || 0,
        heroBannerCategory: document.getElementById("hero-banner-category").value,
        heroBannerImage: document.getElementById("hero-banner-image").value,
      };

      // Get auth token
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Get CSRF token
      const csrfToken = await getCSRFToken();

      const response = await fetch(`${API_BASE_URL}/global-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        currentSettings = result.data;
        
        // Update window.globalSettings with new currency value
        if (window.globalSettings) {
          window.globalSettings.currency = result.data.currency;
          window.globalSettings.currencyCode = result.data.currency;
        }
        
        showNotification(getTranslation("settingsSaved", "Settings saved successfully!"), "success");
        
        // Broadcast settings update to all connected clients
        broadcastSettingsUpdate(result.data);
      } else {
        throw new Error(result.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving global settings:", error);
      showNotification(
        getTranslation("errorSavingSettings", "Error saving settings: ") + error.message,
        "error"
      );
    } finally {
      showLoadingState(false);
    }
  }

  async function resetToDefaultSettings() {
    try {
      showLoadingState(true);

      // Get auth token
      const token = localStorage.getItem("adminToken");
      if (!token) {
        throw new Error("Authentication required");
      }

      // Get CSRF token
      const csrfToken = await getCSRFToken();

      const response = await fetch(`${API_BASE_URL}/global-settings/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
      });

      const result = await response.json();

      if (result.success) {
        showNotification(getTranslation("settingsReset", "Settings reset to default!"), "success");
        // Reload settings
        await loadGlobalSettings();
      } else {
        throw new Error(result.message || "Failed to reset settings");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      showNotification(
        getTranslation("errorResettingSettings", "Error resetting settings: ") + error.message,
        "error"
      );
    } finally {
      showLoadingState(false);
    }
  }

  function initializeDefaultSettings() {
    // Set default values if API fails
    const defaultSettings = {
      workingHoursStart: "09:00",
      workingHoursEnd: "23:00",
      workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      contactPhone: "",
      contactWhatsapp: "",
      contactEmail: "",
      currency: "EGP",
      restaurantName: "Digital Menu",
      restaurantNameEn: "Digital Menu",
      restaurantAddress: "",
      restaurantAddressEn: "",
      socialFacebook: "",
      socialInstagram: "",
      socialTwitter: "",
    };

    populateForm(defaultSettings);
  }

  function showLoadingState(isLoading) {
    const form = document.getElementById("global-settings-form");
    const saveButton = document.querySelector(".settings-save-btn");
    const resetButton = document.querySelector(".settings-reset-btn");

    if (isLoading) {
      form.classList.add("loading");
      if (saveButton) saveButton.classList.add("loading");
      if (resetButton) resetButton.classList.add("loading");
    } else {
      form.classList.remove("loading");
      if (saveButton) saveButton.classList.remove("loading");
      if (resetButton) resetButton.classList.remove("loading");
    }
  }

  async function getCSRFToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
        credentials: "include",
      });
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error("Error getting CSRF token:", error);
      return "";
    }
  }

  function showNotification(message, type = "info") {
    // Check if there's a global notification function
    if (typeof window.showNotification === "function") {
      window.showNotification(message, type);
      return;
    }

    // Fallback notification
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: ${type === "success" ? "#42d158" : type === "error" ? "#dc3545" : "#17a2b8"};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  function getTranslation(key, defaultValue) {
    // Check if there's a global translation function
    if (typeof window.getTranslation === "function") {
      return window.getTranslation(key, defaultValue);
    }
    return defaultValue;
  }

  // Function to broadcast settings update to all connected clients
  function broadcastSettingsUpdate(settings) {
    try {
      // Use BroadcastChannel API if available
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('global-settings-channel');
        channel.postMessage({
          type: 'settings-updated',
          data: settings
        });
        channel.close();
        console.log('Settings update broadcasted via BroadcastChannel');
      }
      
      // Also use localStorage event as fallback
      localStorage.setItem('global-settings-update', JSON.stringify({
        timestamp: Date.now(),
        settings: settings
      }));
      
      // Dispatch custom event for same-page updates
      window.dispatchEvent(new CustomEvent('global-settings-updated', {
        detail: settings
      }));
      
      console.log('Settings update broadcasted');
    } catch (error) {
      console.error('Error broadcasting settings update:', error);
    }
  }

  // Hero Banner Preview Update Function
  function updateHeroBannerPreview() {
    const language = localStorage.getItem('admin-language') || 'ar';
    const title = language === 'en' 
      ? document.getElementById("hero-banner-title-en").value 
      : document.getElementById("hero-banner-title").value;
    const description = language === 'en'
      ? document.getElementById("hero-banner-description-en").value
      : document.getElementById("hero-banner-description").value;
    const originalPrice = document.getElementById("hero-banner-original-price").value;
    const discountedPrice = document.getElementById("hero-banner-discounted-price").value;
    const imageUrl = document.getElementById("hero-banner-image").value;
    const currency = document.getElementById("currency-code")?.value || "EGP";

    // Update preview elements
    const previewTitle = document.getElementById("preview-title");
    const previewDescription = document.getElementById("preview-description");
    const previewOriginal = document.getElementById("preview-original");
    const previewDiscounted = document.getElementById("preview-discounted");
    const previewImage = document.querySelector(".preview-banner-image");

    if (previewTitle) previewTitle.textContent = title || "Delicious Burger";
    if (previewDescription) previewDescription.textContent = description || "Fresh ingredients, amazing taste";
    if (previewOriginal) previewOriginal.textContent = `${originalPrice || 75} ${currency}`;
    if (previewDiscounted) previewDiscounted.textContent = `${discountedPrice || 55} ${currency}`;
    
    if (previewImage && imageUrl) {
      previewImage.style.backgroundImage = `url('${imageUrl}')`;
      previewImage.style.backgroundSize = 'cover';
      previewImage.style.backgroundPosition = 'center';
    } else if (previewImage) {
      previewImage.style.backgroundImage = '';
    }
  }

  // Add event listeners for live preview updates
  function setupHeroBannerPreviewListeners() {
    const previewFields = [
      'hero-banner-title',
      'hero-banner-title-en',
      'hero-banner-description',
      'hero-banner-description-en',
      'hero-banner-original-price',
      'hero-banner-discounted-price',
      'hero-banner-image',
      'currency-code'
    ];

    previewFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', updateHeroBannerPreview);
        field.addEventListener('change', updateHeroBannerPreview);
      }
    });
  }

  // Initialize preview listeners when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHeroBannerPreviewListeners);
  } else {
    setupHeroBannerPreviewListeners();
  }

  // Sub-navigation tab switching
  function setupSubNavigation() {
    const subnavButtons = document.querySelectorAll('.subnav-btn');
    
    subnavButtons.forEach(button => {
      button.addEventListener('click', function() {
        const targetTab = this.getAttribute('data-target');
        
        // Remove active class from all buttons and tabs
        subnavButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked button and target tab
        this.classList.add('active');
        const targetElement = document.getElementById(targetTab);
        if (targetElement) {
          targetElement.classList.add('active');
        }
      });
    });
  }

  // Initialize sub-navigation when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSubNavigation);
  } else {
    setupSubNavigation();
  }

  // Export functions for external use
  window.globalSettingsManager = {
    loadSettings: loadGlobalSettings,
    saveSettings: saveGlobalSettings,
    resetSettings: resetToDefaultSettings,
    updateHeroBannerPreview: updateHeroBannerPreview,
  };
})();
