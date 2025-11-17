/**
 * Authentication utilities for the client side
 */

// Check if user is logged in
function isLoggedIn() {
  // First try to get a token
  const token = localStorage.getItem("token");

  // No token at all
  if (!token || token.trim() === "") {
    // Try to get from cookie as backup
    const cookieToken = getCookie("token");
    if (cookieToken) {
      // Validate the cookie token
      const validation = validateToken(cookieToken);
      if (validation.valid) {
        // If token is valid, restore it to localStorage for future use
        localStorage.setItem("token", cookieToken);

        // If we have expiry information in the payload, save that too
        if (validation.payload && validation.payload.exp) {
          const expiryTime = validation.payload.exp * 1000;
          localStorage.setItem("tokenExpiration", expiryTime.toString());
          setCookie("tokenExpiration", expiryTime.toString(), 30);
        }

        return true;
      }

      // Invalid token in cookie, remove it
      deleteCookie("token");
      deleteCookie("tokenExpiration");
      return false;
    }
    return false;
  }

  // Check admin tokens (admin_timestamp) - we ignore admin tokens for regular user auth
  if (token.startsWith("admin_")) {
    // Admin tokens should not affect regular user authentication
    return false;
  }

  // Validate the token
  const validation = validateToken(token);
  if (!validation.valid) {
    // Token is invalid, clear it
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("userData");
    deleteCookie("token");
    deleteCookie("tokenExpiration");
    return false;
  }

  return true;
}

// Validate a token
function validateToken(token) {
  if (!token || token.trim() === "") {
    return { valid: false, reason: "Token is empty" };
  }

  // Don't validate admin tokens
  if (token.startsWith("admin_")) {
    return { valid: true, isAdmin: true };
  }

  // Basic validation for JWT format (should have 3 parts separated by dots)
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return { valid: false, reason: "Invalid token format" };
  }

  // Try to decode the payload
  try {
    const payload = JSON.parse(atob(tokenParts[1]));

    // Check if token has expired
    if (payload.exp) {
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expiryTime) {
        return { valid: false, reason: "Token has expired", expired: true };
      }
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: "Invalid token content" };
  }
}

// Get the user token
function getToken() {
  const token = localStorage.getItem("token");

  // No token or empty token
  if (!token || token.trim() === "") {
    // Try to get from cookie as backup
    const cookieToken = getCookie("token");
    if (!cookieToken || cookieToken.trim() === "") {
      return null;
    }

    // Validate the cookie token
    const validation = validateToken(cookieToken);
    if (!validation.valid) {
      return null;
    }

    return cookieToken;
  }

  // Don't return admin tokens from regular user token getter
  if (token.startsWith("admin_")) {
    return null;
  }

  // Validate the token
  const validation = validateToken(token);
  if (!validation.valid) {
    console.warn(`Invalid token detected in getToken: ${validation.reason}`);
    return null;
  }

  return token;
}

// Get token expiration time
function getTokenExpiration() {
  const expiresAt = localStorage.getItem("tokenExpiration");
  if (!expiresAt) {
    // Try to get from cookie as backup
    const cookieExpiry = getCookie("tokenExpiration");
    return cookieExpiry ? parseInt(cookieExpiry, 10) : null;
  }
  return expiresAt ? parseInt(expiresAt, 10) : null;
}

// Set token with expiration
function setToken(token) {
  if (!token) {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("userPermissions"); // Also clear permissions
    deleteCookie("token");
    deleteCookie("tokenExpiration");
    return;
  }

  // Parse JWT to get expiration time
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds

    // Store in localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("tokenExpiration", expiresAt);

    // Also store in cookie for redundancy
    setCookie("token", token, 30); // 30 days expiry
    setCookie("tokenExpiration", expiresAt.toString(), 30);

    // Schedule token refresh
    scheduleTokenRefresh(expiresAt);
  } catch (e) {
    console.error("Error parsing token:", e);
    localStorage.setItem("token", token);
    setCookie("token", token, 30);
  }
}

// Store user permissions
function setUserPermissions(permissions) {
  if (permissions) {
    localStorage.setItem("userPermissions", JSON.stringify(permissions));
  } else {
    localStorage.removeItem("userPermissions");
  }
}

// Get user permissions
function getUserPermissions() {
  const permissionsJson = localStorage.getItem("userPermissions");
  if (!permissionsJson) {
    return null;
  }
  try {
    return JSON.parse(permissionsJson);
  } catch (e) {
    console.error("Error parsing permissions:", e);
    return null;
  }
}

// Check if user has specific permission
function hasPermission(permissionName) {
  const permissions = getUserPermissions();
  if (!permissions) {
    return false;
  }
  return permissions[permissionName] === true;
}

// Cookie utility functions
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + value + expires + "; path=/; SameSite=Strict";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

// Schedule token refresh
function scheduleTokenRefresh(expiresAt) {
  if (!expiresAt) return;

  // Clear any existing refresh timers
  if (window.tokenRefreshTimer) {
    clearTimeout(window.tokenRefreshTimer);
  }

  const currentTime = Date.now();
  const timeUntilExpiry = expiresAt - currentTime;

  // If token is already expired, don't schedule refresh
  if (timeUntilExpiry <= 0) {
    console.warn("Token has already expired");
    return;
  }

  // Refresh token when it reaches 85% of its lifetime
  const refreshTime = Math.max(timeUntilExpiry * 0.85, 10000); // At least 10 seconds before expiry

  console.log(
    `Token will refresh in ${Math.floor(refreshTime / 1000)} seconds`
  );

  window.tokenRefreshTimer = setTimeout(() => {
    refreshToken();
  }, refreshTime);
}

// Refresh the token
function refreshToken() {
  const token = getToken();
  if (!token) return Promise.reject(new Error("No token to refresh"));

  // For admin tokens, we don't need to refresh (they don't expire)
  if (token.startsWith("admin_")) {
    console.log("Admin token doesn't need refresh");
    return Promise.resolve(token);
  }

  // Validate the token before attempting to refresh
  const validation = validateToken(token);
  if (!validation.valid) {
    console.error(`Invalid token detected: ${validation.reason}`);
    // Clear the invalid token
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("userData");
    deleteCookie("token");
    deleteCookie("tokenExpiration");
    return Promise.reject(
      new Error(`Invalid authentication token: ${validation.reason}`)
    );
  }

  return fetch("http://localhost:5000/api/customer/refresh-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        // If unauthorized (401) or forbidden (403), token is invalid
        if (response.status === 401 || response.status === 403) {
          throw new Error("Unauthorized: Invalid authentication token");
        }
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && data.token) {
        // Save the new token
        setToken(data.token);
        dispatchAuthStateChanged();
        return data.token;
      } else {
        throw new Error(data.message || "Failed to refresh token");
      }
    })
    .catch((error) => {
      console.error("Token refresh error:", error);
      // If refresh fails, user might need to log in again
      if (
        error.message.includes("401") ||
        error.message.includes("403") ||
        error.message.includes("unauthorized") ||
        error.message.includes("Invalid authentication token")
      ) {
        // Clear tokens and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("tokenExpiration");
        localStorage.removeItem("userData");
        deleteCookie("token");
        deleteCookie("tokenExpiration");

        // Only call logout if we're not already in the process of logging out
        // This prevents potential infinite loops
        if (!window.isLoggingOut) {
          window.isLoggingOut = true;
          logout();
          window.isLoggingOut = false;
        }
      }
      throw error;
    });
}

// Dispatch auth state changed event
function dispatchAuthStateChanged() {
  const event = new CustomEvent("auth_state_changed");
  window.dispatchEvent(event);
}

// Logout user
function logout() {
  const token = getToken();

  // Check if we're on the index page - don't redirect if we are
  const isIndexPage =
    window.location.pathname.includes("/index.html") ||
    window.location.pathname.endsWith("/") ||
    window.location.pathname.endsWith("/public/pages/");

  // Clear user permissions (but keep admin session separate)
  localStorage.removeItem("userPermissions");

  // If no valid token, just clear storage and redirect if not on index page
  if (!token) {
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiration");
    localStorage.removeItem("userData");
    deleteCookie("token");
    deleteCookie("tokenExpiration");
    if (window.tokenRefreshTimer) {
      clearTimeout(window.tokenRefreshTimer);
    }
    dispatchAuthStateChanged();
    if (!isIndexPage) {
      window.location.href = "/public/pages/register.html";
    }
    return Promise.resolve();
  }

  // Send request to server to invalidate token
  return fetch("http://localhost:5000/api/auth/logout", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(() => {
      // Remove token from local storage and cookies
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      localStorage.removeItem("userData");
      deleteCookie("token");
      deleteCookie("tokenExpiration");
      if (window.tokenRefreshTimer) {
        clearTimeout(window.tokenRefreshTimer);
      }
      // Dispatch auth state changed event
      dispatchAuthStateChanged();
      // Redirect to login page only if not on index page
      if (!isIndexPage) {
        window.location.href = "/public/pages/register.html";
      }
    })
    .catch((error) => {
      console.error("Logout error:", error);
      // Still remove token from local storage and cookies
      localStorage.removeItem("token");
      localStorage.removeItem("tokenExpiration");
      localStorage.removeItem("userData");
      deleteCookie("token");
      deleteCookie("tokenExpiration");
      if (window.tokenRefreshTimer) {
        clearTimeout(window.tokenRefreshTimer);
      }
      // Dispatch auth state changed event
      dispatchAuthStateChanged();
      // Redirect to login page only if not on index page
      if (!isIndexPage) {
        window.location.href = "/public/pages/register.html";
      }
    });
}

// Get current user profile
function getCurrentUser() {
  // First check if we have a valid token
  const token = getToken();

  if (!token) {
    return Promise.reject(new Error("No authentication token found"));
  }

  // Admin tokens should never reach here with the updated getToken function

  // This is a customer token, get actual profile from API
  return fetch("http://localhost:5000/api/customer/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch user profile");
      }
      return response.json();
    })
    .then((data) => {
      if (data.success && data.data) {
        // Store user permissions in localStorage
        if (data.data.permissions) {
          setUserPermissions(data.data.permissions);
        }
        return data.data;
      } else {
        throw new Error(data.message || "Failed to fetch user profile");
      }
    })
    .catch((error) => {
      console.error("Get current user error:", error);
      // If 401 error, token might be invalid, so log out
      if (error.message.includes("401")) {
        logout();
      }
      throw error;
    });
}

// Function to update UI based on authentication state
function updateUIBasedOnAuth() {
  const isAuthenticated = isLoggedIn();
  const isAdminAuthenticated = isAdminLoggedIn();

  // Get all elements that should only be visible when authenticated
  const authDependentElements = document.querySelectorAll(".auth-dependent");
  // Get all elements that should only be visible when not authenticated
  const nonAuthDependentElements = document.querySelectorAll(
    ".non-auth-dependent"
  );

  // Update visibility based on authentication state
  if (isAuthenticated) {
    // Show auth dependent elements
    authDependentElements.forEach((el) => (el.style.display = "block"));
    // Hide non-auth dependent elements
    nonAuthDependentElements.forEach((el) => (el.style.display = "none"));

    // Check for specific permissions
    const userPermissions = getUserPermissions();

    // Admin panel access
    const adminOnlyElements = document.querySelectorAll(".admin-only-item");
    if (userPermissions && userPermissions.adminPanel === true) {
      adminOnlyElements.forEach((el) => (el.style.display = "block"));
    } else {
      adminOnlyElements.forEach((el) => (el.style.display = "none"));
    }

    // Cashier access
    const cashierOnlyElements = document.querySelectorAll(".cashier-only-item");
    if (userPermissions && userPermissions.cashier === true) {
      cashierOnlyElements.forEach((el) => (el.style.display = "block"));
    } else {
      cashierOnlyElements.forEach((el) => (el.style.display = "none"));
    }

    // Handle other permission-based elements
    document.querySelectorAll("[data-permission]").forEach((el) => {
      const requiredPermission = el.getAttribute("data-permission");
      if (userPermissions && userPermissions[requiredPermission] === true) {
        el.style.display = "block";
      } else {
        el.style.display = "none";
      }
    });
  } else {
    // Hide auth dependent elements
    authDependentElements.forEach((el) => (el.style.display = "none"));
    // Show non-auth dependent elements
    nonAuthDependentElements.forEach((el) => (el.style.display = "block"));

    // Hide all permission-based elements when user not logged in
    const cashierOnlyElements = document.querySelectorAll(".cashier-only-item");
    cashierOnlyElements.forEach((el) => (el.style.display = "none"));

    const adminOnlyElements = document.querySelectorAll(".admin-only-item");
    adminOnlyElements.forEach((el) => (el.style.display = "none"));

    document.querySelectorAll("[data-permission]").forEach((el) => {
      el.style.display = "none";
    });
  }

  // Show admin link if admin is logged in separately AND user is also logged in
  // This prevents admin links from showing on public pages when only admin session exists
  if (isAdminAuthenticated && isAuthenticated) {
    const adminOnlyElements = document.querySelectorAll(".admin-only-item");
    adminOnlyElements.forEach((el) => (el.style.display = "block"));
  }
}

// Check if admin is logged in (separate from regular user login)
function isAdminLoggedIn() {
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
    console.error("Error in admin authentication check:", error);
    return false;
  }
}

// Get user role from token or API
function getUserRole() {
  const token = getToken();

  if (!token) {
    return Promise.resolve("guest");
  }

  // Try to decode the token to get role
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role) {
      return Promise.resolve(payload.role);
    }
  } catch (e) {
    console.error("Error decoding token:", e);
  }

  // If we couldn't get the role from the token, try the API
  return getCurrentUser()
    .then((user) => user.role || "customer")
    .catch(() => "guest");
}

// Check session on page load
function checkSession() {
  if (isLoggedIn()) {
    // If token exists but might be close to expiry, refresh it
    const tokenExpiry = getTokenExpiration();
    if (tokenExpiry) {
      const now = Date.now();
      const timeUntilExpiry = tokenExpiry - now;

      // If token expires in less than 1 hour, refresh it
      if (timeUntilExpiry < 3600000) {
        refreshToken()
          .then(() => {
            console.log("Token refreshed during session check");
            updateUIBasedOnAuth();
          })
          .catch((err) => {
            console.error("Failed to refresh token during session check:", err);
          });
      }
    }
  }

  // Update UI based on current auth state
  updateUIBasedOnAuth();
}

// Listen for auth state changes
window.addEventListener("auth_state_changed", updateUIBasedOnAuth);

// Run session check when DOM is loaded
document.addEventListener("DOMContentLoaded", checkSession);

// Export functions for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isLoggedIn,
    getToken,
    setToken,
    logout,
    getCurrentUser,
    updateUIBasedOnAuth,
    getUserRole,
    checkSession,
    getUserPermissions,
    setUserPermissions,
    hasPermission,
  };
}
