/**
 * Check if user is authenticated
 */
const API_BASE_URL = (function () {
  const { hostname, origin } = window.location;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  return isLocal ? "http://localhost:5000" : origin;
})();

function isAuthenticated() {
  try {
    // Get session from localStorage
    const sessionData = localStorage.getItem("adminSession");

    if (!sessionData) {
      return false;
    }

    const adminSession = JSON.parse(sessionData);

    // Check session properties
    if (!adminSession || !adminSession.isLoggedIn) {
      return false;
    }

    // Check if session is expired
    if (adminSession.expiresAt <= Date.now()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error in authentication check:", error);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // If we're on the admin login page, set up the login form
  if (window.location.pathname.includes("admin-login.html")) {
    setupLoginPage();
  }
  // If we're on an admin page but not the login page, verify authentication
  else if (
    window.location.pathname.includes("/admin/") &&
    !window.location.pathname.includes("admin-login.html")
  ) {
    // The admin.js file already handles redirect logic, but we'll add it here too
    // for extra security and to prevent the page from briefly showing
    if (!isAuthenticated()) {
      // Immediately hide the page content to prevent flashing
      document.body.style.display = "none";
      window.location.href = "admin-login.html";
      return;
    }
    // If authenticated, make sure the page is visible
    document.body.style.display = "block";

    setupLogoutButton();
    setupSettingsForm();
    setupPasswordToggles();
  }

  /**
   * Set up the login page functionality
   */
  function setupLoginPage() {
    // Clear welcome notification flag when login page loads
    sessionStorage.removeItem("welcomeNotificationShown");

    // Toggle password visibility
    const togglePasswordBtn = document.getElementById("toggle-password");
    if (togglePasswordBtn) {
      togglePasswordBtn.addEventListener("click", function () {
        const passwordInput = document.getElementById("password");
        const icon = this.querySelector("i");

        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          // Replace the icon without changing its position
          icon.className = "fas fa-eye-slash";
        } else {
          passwordInput.type = "password";
          // Replace the icon without changing its position
          icon.className = "fas fa-eye";
        }
      });
    }

    // Handle login form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        const messageAlert = document.getElementById("message-alert");
        const serverStatus = document.getElementById("server-status");

        // Clear previous messages
        hideMessage();

        try {
          // First try local authentication (for offline mode)
          const localAuthSuccess = authenticateUserLocal(username, password);

          if (localAuthSuccess) {
            // Create a session for local authentication
            createLocalSession(username);

            // Show success message
            if (window.i18n) {
              showMessage(window.i18n.getTranslation("loginSuccessRedirect"), "success", "check-circle");
            } else {
              showMessage("تم تسجيل الدخول بنجاح. جاري التحويل...", "success", "check-circle");
            }

            // Add success effects to the page
            document
              .querySelector(".login-container")
              .classList.add("login-success");

            // Play a success sound if available
            try {
              const successSound = new Audio("../public/sounds/success.mp3");
              successSound.volume = 0.5;
              successSound
                .play()
                .catch((e) => console.log("Sound play prevented:", e));
            } catch (e) {
              console.log("Sound not available");
            }

            // Redirect to admin dashboard with slightly longer delay for effects
            setTimeout(function () {
              window.location.href = "admin.html";
            }, 1500);
            return;
          }

          // If local auth failed, try server-side authentication for customer accounts with admin access
          // Check if the server is online first
          if (serverStatus && serverStatus.classList.contains("offline")) {
            if (window.i18n) {
              showMessage(window.i18n.getTranslation("serverConnectionError"), "warning", "wifi");
            } else {
              showMessage("يرجى التحقق من اتصالك بالخادم", "warning", "wifi");
            }
            return;
          }

          // Show loading state
          const submitButton = loginForm.querySelector("button[type='submit']");
          const originalButtonText = submitButton.innerHTML;
          submitButton.disabled = true;

          // Get current language direction
          const currentDir = document.documentElement.getAttribute('dir') || 'rtl';
          const currentLang = document.documentElement.getAttribute('lang') || 'ar';
          
          // Set proper direction and text for loading state
          submitButton.style.direction = currentDir;
          submitButton.style.textAlign = 'center';
          
          // Use i18n translation for loading text if available
          if (window.i18n) {
            const loadingTextWithHTML = window.i18n.getTranslation("loggingIn");
            // Extract text content from HTML if present
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = loadingTextWithHTML;
            const loadingText = tempDiv.textContent || tempDiv.innerText || loadingTextWithHTML;
            
            if (currentDir === 'rtl') {
              submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText.trim();
            } else {
              submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + loadingText.trim();
            }
          } else {
            if (currentDir === 'rtl') {
              submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري تسجيل الدخول...';
            } else {
              submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            }
          }

          // Try API authentication
          const apiAuthSuccess = await authenticateUserAPI(username, password);

          // Restore button
          submitButton.disabled = false;
          submitButton.innerHTML = originalButtonText;
          // Reset button direction styles
          submitButton.style.direction = '';
          submitButton.style.textAlign = '';

          if (apiAuthSuccess) {
            // Check if user logged in via role permissions
            const sessionData = localStorage.getItem("adminSession");
            if (sessionData) {
              const session = JSON.parse(sessionData);
              // If the user has loginViaRole flag, show a different message
              if (session.loginViaRole) {
                if (window.i18n) {
                  showMessage(window.i18n.getTranslation("loginSuccessViaRole") + session.roleName, "success", "check-circle");
                } else {
                  showMessage(`تم تسجيل الدخول بنجاح عبر صلاحيات الدور: ${session.roleName}`, "success", "check-circle");
                }
              } else {
                if (window.i18n) {
                  showMessage(window.i18n.getTranslation("loginSuccessRedirect"), "success", "check-circle");
                } else {
                  showMessage("تم تسجيل الدخول بنجاح. جاري التحويل...", "success", "check-circle");
                }
              }
            } else {
              if (window.i18n) {
                showMessage(window.i18n.getTranslation("loginSuccessRedirect"), "success", "check-circle");
              } else {
                showMessage("تم تسجيل الدخول بنجاح. جاري التحويل...", "success", "check-circle");
              }
            }

            // Redirect to admin dashboard
            setTimeout(function () {
              window.location.href = "admin.html";
            }, 1000);
            return;
          }

          // If both authentication methods failed, show error
          if (window.i18n) {
            showMessage(window.i18n.getTranslation("invalidCredentials"), "error", "exclamation-circle");
          } else {
            showMessage("اسم المستخدم أو كلمة المرور غير صحيحة", "error", "exclamation-circle");
          }

          // Shake the form for additional feedback
          loginForm.classList.add("shake");
          setTimeout(function () {
            loginForm.classList.remove("shake");
          }, 500);
        } catch (error) {
          console.error("Login error:", error);
          if (window.i18n) {
            showMessage(window.i18n.getTranslation("loginError"), "error", "exclamation-triangle");
          } else {
            showMessage("حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.", "error", "exclamation-triangle");
          }
        }
      });
    }

    // Check if server is online
    checkServerStatus();

    // Add language change event listener to update messages
    document.addEventListener('languageChanged', function() {
      const messageAlert = document.getElementById("message-alert");
      const messageText = messageAlert?.querySelector('.message-text');
      
      if (messageAlert && messageAlert.classList.contains('show') && messageText) {
        // Update message text based on data-i18n attribute
        const i18nKey = messageText.getAttribute('data-i18n');
        if (i18nKey && window.i18n) {
          messageText.textContent = window.i18n.getTranslation(i18nKey);
        }
        
        // Update text direction based on new language
        const currentDir = document.documentElement.getAttribute('dir') || 'rtl';
        messageText.style.direction = currentDir;
        messageText.style.textAlign = currentDir === 'rtl' ? 'right' : 'left';
      }
    });
  }

  /**
   * Show message with modern alert system
   */
  function showMessage(text, type = 'error', icon = 'exclamation-circle') {
    const messageAlert = document.getElementById('message-alert');
    const messageIcon = messageAlert?.querySelector('.message-icon i');
    const messageText = messageAlert?.querySelector('.message-text');
    
    if (!messageAlert || !messageIcon || !messageText) {
      console.error('Message elements not found:', { messageAlert, messageIcon, messageText });
      return;
    }
    
    // Hide any existing message first
    hideMessage();
    
    // Small delay to ensure clean state
    setTimeout(() => {
      // Set the message content - ensure text is properly set
      messageText.textContent = text;
      
      // Set the icon
      messageIcon.className = `fas fa-${icon}`;
      
      // Remove all type classes and add the new one
      messageAlert.classList.remove('error', 'success', 'warning');
      messageAlert.classList.add(type, 'show');
      
      // Ensure proper text direction based on current language
      const currentLang = document.documentElement.getAttribute('lang') || 'ar';
      const currentDir = document.documentElement.getAttribute('dir') || 'rtl';
      
      // Apply direction to message text
      messageText.style.direction = currentDir;
      messageText.style.textAlign = currentDir === 'rtl' ? 'right' : 'left';
      
      // Set appropriate data-i18n for language switching
      if (text.includes('اسم المستخدم') || text.includes('Invalid username')) {
        messageText.setAttribute('data-i18n', 'invalidCredentials');
      } else if (text.includes('اتصالك بالخادم') || text.includes('server connection')) {
        messageText.setAttribute('data-i18n', 'serverConnectionError');
      } else if (text.includes('خطأ أثناء تسجيل') || text.includes('error occurred during login')) {
        messageText.setAttribute('data-i18n', 'loginError');
      } else if (text.includes('تم تسجيل الدخول') || text.includes('Login successful')) {
        messageText.setAttribute('data-i18n', 'loginSuccessRedirect');
      }
      
      // Debug log to ensure message is being set correctly
      console.log('Message displayed:', { text, type, icon, direction: currentDir, element: messageAlert });
    }, 50);
  }
  
  /**
   * Hide message alert
   */
  function hideMessage() {
    const messageAlert = document.getElementById('message-alert');
    if (messageAlert) {
      messageAlert.classList.remove('show', 'error', 'success', 'warning');
      // Clear the text content to prevent any display issues
      const messageText = messageAlert.querySelector('.message-text');
      if (messageText) {
        messageText.textContent = '';
        messageText.removeAttribute('data-i18n');
      }
    }
  }

  /**
   * Authenticate the user with local credentials
   */
  function authenticateUserLocal(username, password) {
    // Get stored admin credentials from localStorage
    const storedCredentials = localStorage.getItem("adminCredentials");

    if (storedCredentials) {
      // Parse stored credentials
      const credentials = JSON.parse(storedCredentials);

      // Check if credentials match
      if (
        credentials.username === username &&
        credentials.password === password
      ) {
        return true;
      }
    } else {
      // No credentials exist in localStorage
      // Instead of accepting any credentials, return false
      console.log("No local admin credentials found");
      return false;
    }

    return false;
  }

  /**
   * Authenticate the user with API (for customer accounts with admin access)
   */
  async function authenticateUserAPI(username, password) {
    try {
      console.log("Attempting API authentication with:", { username });

      // Try both email and username formats for maximum compatibility
      const response = await fetch(
        `${API_BASE_URL}/api/auth/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            // Add a cache control header to prevent caching issues
            "Cache-Control": "no-cache",
          },
          // Include cookies and credentials
          credentials: "include",
          // Set mode to cors explicitly
          mode: "cors",
          // Send both username and email as the same value to handle both cases
          body: JSON.stringify({
            username: username,
            email: username,
            password: password,
            include_full_user_data: true, // Request full user data including username
          }),
        }
      );

      console.log("API auth response status:", response.status);

      // Try to parse response even if not OK to get error details
      let data;
      try {
        data = await response.json();
        console.log("API auth response:", data);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        data = { success: false, message: "Failed to parse server response" };
      }

      if (!response.ok) {
        console.error(
          "Authentication failed:",
          data.message || "Unknown error"
        );
        return false;
      }

      if (data.success && data.token) {
        console.log("API authentication successful");

        // Create session with the API response - store the login username
        createAPISession(data.token, data.user, username);
        return true;
      }

      return false;
    } catch (error) {
      console.error("API authentication error:", error);
      return false;
    }
  }

  /**
   * Create a session for a locally authenticated user
   */
  function createLocalSession(username) {
    try {
      // Get stored admin credentials
      const storedCredentials = localStorage.getItem("adminCredentials");

      // Get display name from stored credentials
      let displayName = "المدير";
      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);
        if (credentials.displayName) {
          displayName = credentials.displayName;
        }
      }

      // Set up expiration (24 hours)
      const expiryTime = Date.now() + 24 * 60 * 60 * 1000;

      // Generate admin token
      const token = `admin_${Date.now()}`;

      // Create session object
      const adminSession = {
        isLoggedIn: true,
        token: token,
        loginTime: Date.now(),
        expiresAt: expiryTime,
        displayName: displayName,
        username: username,
        role: "admin",
        permissions: {
          // Full admin permissions
          adminPanel: true,
          stats: true,
          productsView: true,
          productsEdit: true,
          vouchersView: true,
          vouchersEdit: true,
          tax: true,
          qr: true,
          reservations: true,
          loyaltyPoints: true,
          users: true,
          kitchen: true,
        },
      };

      // Store in localStorage
      localStorage.setItem("adminSession", JSON.stringify(adminSession));
      localStorage.setItem("adminToken", token);

      console.log("Local Admin Session created:", adminSession);
      return true;
    } catch (error) {
      console.error("Error creating local session:", error);
      return false;
    }
  }

  /**
   * Create a session for an API authenticated user
   */
  function createAPISession(token, userData, loginUsername) {
    try {
      console.log("Creating API session with", userData);

      // Set up expiration (24 hours)
      const expiryTime = Date.now() + 24 * 60 * 60 * 1000;

      // Create session object
      const adminSession = {
        isLoggedIn: true,
        token: token,
        loginTime: Date.now(),
        expiresAt: expiryTime,
        isCustomerAdmin: true,
        displayName: userData.name || loginUsername,
        email: userData.email,
        userId: userData._id,
        username: userData.username,
        role: userData.role || "customer_admin",
        permissions: userData.permissions || {
          adminPanel: true, // Default permission if structure is undefined
        },
      };

      // Store in localStorage
      localStorage.setItem("adminSession", JSON.stringify(adminSession));
      localStorage.setItem("adminToken", token);

      console.log("API Session created:", adminSession);
      return true;
    } catch (error) {
      console.error("Error creating API session:", error);
      return false;
    }
  }

  /**
   * Set up the logout button functionality
   */
  function setupLogoutButton() {
    const logoutBtn = document.getElementById("admin-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        // Get session data to check login type
        const sessionData = localStorage.getItem("adminSession");
        if (sessionData) {
          const session = JSON.parse(sessionData);

          // If API login, call server-side logout
          if (session.loginType === "api") {
            fetch(`${API_BASE_URL}/api/auth/admin/logout`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
              },
            }).finally(() => {
              clearSessionAndRedirect();
            });
          } else {
            // For local login, just clear session
            clearSessionAndRedirect();
          }
        } else {
          clearSessionAndRedirect();
        }
      });
    }

    // Update admin name in the UI
    updateAdminName();
  }

  /**
   * Clear session data and redirect to login
   */
  function clearSessionAndRedirect() {
    // Clear admin session data
    localStorage.removeItem("adminSession");
    localStorage.removeItem("adminToken");

    // Clear cookies if any
    document.cookie =
      "adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Clear welcome notification flag
    sessionStorage.removeItem("welcomeNotificationShown");

    // Redirect to login page
    window.location.href = "admin-login.html";
  }

  /**
   * Update the admin name in the UI
   */
  function updateAdminName() {
    const adminNameElement = document.getElementById("admin-name");
    if (!adminNameElement) return;

    // Get session data
    const sessionData = localStorage.getItem("adminSession");
    if (sessionData) {
      const session = JSON.parse(sessionData);

      // Get the display name from session
      if (session.displayName) {
        adminNameElement.textContent = session.displayName;
      } else if (session.isApiSession && session.userData) {
        // If no displayName in session but we have userData, extract name with same priority
        const userData = session.userData;
        let displayName = "المدير";

        if (userData.name) {
          displayName = userData.name;
        } else if (userData.displayName) {
          displayName = userData.displayName;
        } else if (userData.firstName && userData.lastName) {
          displayName = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.firstName) {
          displayName = userData.firstName;
        } else if (userData.username) {
          displayName = userData.username;
        } else if (userData.email) {
          displayName = userData.email;
        }

        adminNameElement.textContent = displayName;

        // Update session with the better display name
        session.displayName = displayName;
        localStorage.setItem("adminSession", JSON.stringify(session));
      }
    }
  }

  /**
   * Set up the admin settings form
   */
  function setupSettingsForm() {
    const settingsForm = document.getElementById("admin-settings-form");
    if (!settingsForm) return;

    // Load current settings
    loadAdminSettings();

    // Handle form submission
    settingsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveAdminSettings();
    });
  }

  /**
   * Load admin settings into the form
   */
  function loadAdminSettings() {
    const displayNameInput = document.getElementById("admin-display-name");
    const usernameInput = document.getElementById("admin-username");
    const currentPasswordInput = document.getElementById(
      "admin-current-password"
    );

    if (!displayNameInput || !usernameInput) return;

    // Get session data first (for the currently logged-in admin)
    const sessionData = localStorage.getItem("adminSession");

    if (sessionData) {
      const session = JSON.parse(sessionData);

      // If we have user data in the session, prioritize name over email
      if (session.isApiSession && session.userData) {
        const userData = session.userData;

        // Priority: name > displayName > firstName+lastName > username > email > default
        let displayName = "المدير";

        if (userData.name) {
          displayName = userData.name;
        } else if (userData.displayName) {
          displayName = userData.displayName;
        } else if (userData.firstName && userData.lastName) {
          displayName = `${userData.firstName} ${userData.lastName}`;
        } else if (userData.firstName) {
          displayName = userData.firstName;
        } else if (userData.username) {
          displayName = userData.username;
        } else if (userData.email) {
          displayName = userData.email;
        }

        displayNameInput.value = displayName;

        // Display the original login username that was used during login
        if (session.loginUsername) {
          usernameInput.value = session.loginUsername;
        } else if (userData.username) {
          usernameInput.value = userData.username;
        } else if (session.username) {
          usernameInput.value = session.username;
        } else {
          usernameInput.value = "admin";
        }

        // Update session with better display name
        session.displayName = displayName;
        localStorage.setItem("adminSession", JSON.stringify(session));

        // Disable username field for API sessions as it should not be changed
        usernameInput.setAttribute("readonly", true);
        usernameInput.classList.add("readonly-field");
      }
      // For non-API sessions or if no userData is available
      else if (session.displayName) {
        displayNameInput.value = session.displayName;

        // Display the original login username for local sessions too
        if (session.loginUsername) {
          usernameInput.value = session.loginUsername;
        } else if (session.username) {
          usernameInput.value = session.username;
        }

        // For non-API sessions, username can be edited
        usernameInput.removeAttribute("readonly");
        usernameInput.classList.remove("readonly-field");
      }

      // For API sessions with user data
      if (session.isApiSession && session.userData) {
        // Already handled above
      } else if (!session.isApiSession && currentPasswordInput) {
        // For local sessions, get the password from stored credentials
        const storedCredentials = localStorage.getItem("adminCredentials");
        if (storedCredentials) {
          const credentials = JSON.parse(storedCredentials);
          currentPasswordInput.value = credentials.password || "";
        }
      }

      // Update admin name in UI immediately after loading
      updateAdminName();
      return;
    }

    // Fallback to stored credentials if no active session
    const storedCredentials = localStorage.getItem("adminCredentials");

    if (storedCredentials) {
      const credentials = JSON.parse(storedCredentials);

      displayNameInput.value = credentials.displayName || "المدير";
      usernameInput.value = credentials.username || "admin";

      // Pre-fill the current password field
      if (currentPasswordInput) {
        currentPasswordInput.value = credentials.password || "";
      }
    }
  }

  /**
   * Save admin settings from the form
   */
  function saveAdminSettings() {
    const displayNameInput = document.getElementById("admin-display-name");
    const usernameInput = document.getElementById("admin-username");
    const currentPasswordInput = document.getElementById(
      "admin-current-password"
    );
    const newPasswordInput = document.getElementById("admin-new-password");
    const confirmPasswordInput = document.getElementById(
      "admin-confirm-password"
    );

    if (!displayNameInput || !usernameInput || !currentPasswordInput) {
      showNotification(getTranslation("formFieldsNotFound"), "error");
      return;
    }

    // Get values
    const displayName = displayNameInput.value;
    const username = usernameInput.value;
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput ? newPasswordInput.value : "";
    const confirmPassword = confirmPasswordInput
      ? confirmPasswordInput.value
      : "";

    // Validate input
    if (!displayName || !username || !currentPassword) {
      showNotification(getTranslation("fillAllRequiredFields"), "error");
      return;
    }

    // Check if we're dealing with an API session
    const sessionData = localStorage.getItem("adminSession");

    if (sessionData) {
      const session = JSON.parse(sessionData);

      if (session.isApiSession) {
        // For API sessions, we should handle differently
        // Ideally call an API endpoint to update the display name

        // For now, just update the session data
        session.displayName = displayName;
        // Don't update username for API sessions, preserve the login username
        localStorage.setItem("adminSession", JSON.stringify(session));

        // Update admin name in the UI
        updateAdminName();

        // Show success notification
        showNotification(getTranslation("adminDataSavedSuccessfully"), "success");

        // Clear password field
        currentPasswordInput.value = "";
        return;
      }
    }

    // For local sessions, continue with existing logic
    // Get stored admin credentials
    const storedCredentials = localStorage.getItem("adminCredentials");

    if (!storedCredentials) {
      showNotification(
        getTranslation("adminDataNotFound"),
        "error"
      );
      return;
    }

    const credentials = JSON.parse(storedCredentials);

    // Skip password verification if it's the same as stored (pre-filled)
    // Or verify current password if changed
    if (currentPassword !== credentials.password) {
      showNotification(getTranslation("currentPasswordIncorrect"), "error");
      return;
    }

    // Check if new password should be updated
    let password = credentials.password;

    if (newPassword) {
      // Validate new password
      if (newPassword.length < 4) {
        showNotification(
          getTranslation("newPasswordMinLength"),
          "error"
        );
        return;
      }

      // Validate confirm password
      if (newPassword !== confirmPassword) {
        showNotification(getTranslation("passwordsDoNotMatch"), "error");
        return;
      }

      // Update password
      password = newPassword;
    }

    // Update credentials
    const updatedCredentials = {
      displayName,
      username,
      password,
    };

    // Save updated credentials
    localStorage.setItem(
      "adminCredentials",
      JSON.stringify(updatedCredentials)
    );

    // Update session display name
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.displayName = displayName;

      // For local sessions, you can update the username
      if (!session.isApiSession) {
        session.username = username;
        // But preserve the original login username
        if (!session.loginUsername) {
          session.loginUsername = username;
        }
      }

      localStorage.setItem("adminSession", JSON.stringify(session));
    }

    // Update admin name in the UI
    updateAdminName();

    // Keep the current password field filled with the current/new password
    currentPasswordInput.value = password;

    // Clear new password fields
    if (newPasswordInput) newPasswordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";

    // Show success notification
    showNotification(getTranslation("adminDataSavedSuccessfully"), "success");
  }

  /**
   * Show notification message
   */
  function showNotification(message, type = "info") {
    // Check if notification container exists
    let notificationContainer = document.querySelector(
      ".notification-container"
    );

    // Create container if it doesn't exist
    if (!notificationContainer) {
      notificationContainer = document.createElement("div");
      notificationContainer.className = "notification-container";
      document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = "notification";

    // Add type class
    if (type) {
      notification.classList.add(type);
    }

    // Set icon based on type
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-circle";
    if (type === "warning") icon = "exclamation-triangle";

    // Set notification content
    notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

    // Add to container
    notificationContainer.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Set up password toggle buttons on all password fields
   */
  function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll(".toggle-password");

    toggleButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const passwordInput = this.parentElement.querySelector(
          'input[type="password"], input[type="text"]'
        );
        const icon = this.querySelector("i");

        // Toggle the input type
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          // Replace the icon without changing its position
          icon.className = "fas fa-eye-slash";
        } else {
          passwordInput.type = "password";
          // Replace the icon without changing its position
          icon.className = "fas fa-eye";
        }
      });
    });
  }

  /**
   * Check server status by pinging the API
   */
  function checkServerStatus() {
    const serverStatus = document.getElementById("server-status");
    if (!serverStatus) return;

    if (typeof window.getTranslation === "function") {
      serverStatus.textContent = window.getTranslation("checkingServer");
    } else {
      serverStatus.textContent = "جاري التحقق من اتصال الخادم...";
    }
    serverStatus.classList.remove("online");
    serverStatus.classList.add("offline");

    // Try to reach the server using health check endpoint
    fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Set a timeout to avoid hanging if server is down
      signal: AbortSignal.timeout(2000),
    })
      .then((response) => {
        if (response.ok) {
          return response.json().then((data) => {
            console.log("Server health check successful:", data);
            if (typeof window.getTranslation === "function") {
              serverStatus.textContent = window.getTranslation("serverOnline");
            } else {
              serverStatus.textContent = "الخادم متصل ويعمل بشكل طبيعي";
            }
            serverStatus.classList.remove("offline");
            serverStatus.classList.add("online");
          });
        } else {
          console.warn("Server returned error status:", response.status);
          if (typeof window.getTranslation === "function") {
            serverStatus.textContent = window.getTranslation("serverError");
          } else {
            serverStatus.textContent = "تم الاتصال بالخادم ولكن هناك مشكلة";
          }
          serverStatus.classList.remove("online");
          serverStatus.classList.add("offline");
          return Promise.reject(new Error(`Status: ${response.status}`));
        }
      })
      .catch((error) => {
        console.error("Server connection error:", error);
        if (typeof window.getTranslation === "function") {
          serverStatus.textContent = window.getTranslation("serverOffline");
        } else {
          serverStatus.textContent = "لا يمكن الاتصال بالخادم";
        }
        serverStatus.classList.remove("online");
        serverStatus.classList.add("offline");
      });
  }
});
