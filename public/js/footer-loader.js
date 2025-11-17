// Footer Loader
// This script loads global settings and populates the footer
(function () {
  "use strict";

  // Wait for global settings to be loaded
  function initializeFooter() {
    if (!window.globalSettings || !window.globalSettings.loaded) {
      // Wait for global settings to load
      window.addEventListener("global-settings-loaded", function () {
        populateFooter();
      });
    } else {
      // Settings already loaded, populate immediately
      populateFooter();
    }

    // Also listen for settings changes (real-time updates)
    window.addEventListener("global-settings-changed", function () {
      populateFooter();
    });
  }

  // Function to populate footer with global settings
  function populateFooter() {
    const settings = window.globalSettings;
    const currentLang =
      typeof getCurrentLanguage === "function"
        ? getCurrentLanguage()
        : localStorage.getItem("public-language") || "ar";

    // Update restaurant name
    const restaurantName =
      currentLang === "en"
        ? settings.restaurantNameEn || settings.restaurantName || "Digital Menu"
        : settings.restaurantName || "ديجيتال منيو";

    const footerNameElement = document.getElementById("footer-restaurant-name");
    if (footerNameElement) {
      footerNameElement.textContent = restaurantName;
    }

    const footerCopyrightName = document.getElementById("footer-copyright-name");
    if (footerCopyrightName) {
      footerCopyrightName.textContent = restaurantName;
    }

    // Update restaurant address
    const restaurantAddress =
      currentLang === "en"
        ? settings.restaurantAddressEn || settings.restaurantAddress || ""
        : settings.restaurantAddress || "";

    const footerAddressElement = document.getElementById("footer-address");
    if (footerAddressElement) {
      if (restaurantAddress) {
        footerAddressElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${restaurantAddress}`;
        footerAddressElement.style.display = "block";
      } else {
        footerAddressElement.style.display = "none";
      }
    }

    // Update contact information
    updateContactInfo(settings);

    // Update social media links
    updateSocialLinks(settings);

    // Update working hours
    updateWorkingHours(settings, currentLang);

    // Update copyright year
    const yearElement = document.getElementById("footer-year");
    if (yearElement) {
      yearElement.textContent = new Date().getFullYear();
    }
  }

  // Function to update contact information
  function updateContactInfo(settings) {
    // Phone
    const phoneWrapper = document.getElementById("footer-phone-wrapper");
    const phoneLink = document.getElementById("footer-phone");
    if (settings.contactPhone && phoneLink) {
      phoneLink.href = `tel:${settings.contactPhone}`;
      phoneLink.querySelector("span").textContent = settings.contactPhone;
      if (phoneWrapper) phoneWrapper.style.display = "block";
    } else {
      if (phoneWrapper) phoneWrapper.style.display = "none";
    }

    // WhatsApp
    const whatsappWrapper = document.getElementById("footer-whatsapp-wrapper");
    const whatsappLink = document.getElementById("footer-whatsapp");
    if (settings.contactWhatsapp && whatsappLink) {
      whatsappLink.href = `https://wa.me/${settings.contactWhatsapp.replace(/\D/g, "")}`;
      whatsappLink.querySelector("span").textContent = settings.contactWhatsapp;
      if (whatsappWrapper) whatsappWrapper.style.display = "block";
    } else {
      if (whatsappWrapper) whatsappWrapper.style.display = "none";
    }

    // Email
    const emailWrapper = document.getElementById("footer-email-wrapper");
    const emailLink = document.getElementById("footer-email");
    if (settings.contactEmail && emailLink) {
      emailLink.href = `mailto:${settings.contactEmail}`;
      emailLink.querySelector("span").textContent = settings.contactEmail;
      if (emailWrapper) emailWrapper.style.display = "block";
    } else {
      if (emailWrapper) emailWrapper.style.display = "none";
    }
  }

  // Function to update social media links
  function updateSocialLinks(settings) {
    const socialContainer = document.getElementById("footer-social");
    if (!socialContainer) return;

    let socialHTML = "";

    if (settings.socialFacebook) {
      socialHTML += `
        <a href="${settings.socialFacebook}" target="_blank" rel="noopener noreferrer" class="social-link facebook" aria-label="Facebook">
          <i class="fab fa-facebook-f"></i>
        </a>
      `;
    }

    if (settings.socialInstagram) {
      socialHTML += `
        <a href="${settings.socialInstagram}" target="_blank" rel="noopener noreferrer" class="social-link instagram" aria-label="Instagram">
          <i class="fab fa-instagram"></i>
        </a>
      `;
    }

    if (settings.socialTwitter) {
      socialHTML += `
        <a href="${settings.socialTwitter}" target="_blank" rel="noopener noreferrer" class="social-link x-twitter" aria-label="X">
          <i class="fab fa-x-twitter"></i>
        </a>
      `;
    }

    if (socialHTML) {
      socialContainer.innerHTML = socialHTML;
      socialContainer.style.display = "flex";
    } else {
      socialContainer.style.display = "none";
    }
  }

  // Function to update working hours
  function updateWorkingHours(settings, currentLang) {
    const hoursContainer = document.getElementById("footer-working-hours");
    if (!hoursContainer) return;

    // If custom working hours are set, use them
    if (settings.workingHoursStart && settings.workingHoursEnd) {
      const daysText = currentLang === "en" ? "All Days" : "جميع الأيام";
      const openText = currentLang === "en" ? "Open" : "نفتح";
      const closeText = currentLang === "en" ? "Close" : "نغلق";

      hoursContainer.innerHTML = `
        <p>
          <i class="fas fa-clock"></i> 
          <span>${daysText}: ${openText} ${settings.workingHoursStart} - ${closeText} ${settings.workingHoursEnd}</span>
        </p>
      `;
    }
    // Otherwise, use default translated text
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFooter);
  } else {
    initializeFooter();
  }

  // Re-populate footer when language changes
  window.addEventListener("language-changed", function () {
    populateFooter();
  });

  // Export function for manual updates
  window.updateFooter = populateFooter;
})();
