/**
 * API Service for handling communication with the backend
 */
class ApiService {
  constructor() {
    // Use localhost explicitly since the server is running locally
    this.apiUrl = "http://localhost:5000/api";

    // Fallback to relative URL if in production
    if (
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      this.apiUrl = "/api";
    }

    this.token = localStorage.getItem("adminToken");

    // Track online/offline status
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener("online", () => {
      console.log("Application is now online");
      this.isOnline = true;

      // Try to sync pending changes with MongoDB when coming back online
      this.syncPendingChanges();
    });

    window.addEventListener("offline", () => {
      console.log("Application is now offline");
      this.isOnline = false;
    });

    // Try to sync pending changes on initialization
    if (this.isOnline) {
      setTimeout(() => this.syncPendingChanges(), 5000); // Wait 5 seconds after initialization
    }

    // Base URL for API requests
    this.baseUrl = "/api";
    // CSRF token storage
    this.csrfToken = null;
  }

  /**
   * Set the auth token for API requests
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("adminToken", token);
    } else {
      localStorage.removeItem("adminToken");
    }
  }

  /**
   * Refresh the admin token if it's expired or missing
   * @returns {string|null} The new token or null if unable to refresh
   */
  refreshToken() {
    try {
      console.log("Attempting to refresh authentication token...");

      // Check if we have an admin session
      const sessionData = localStorage.getItem("adminSession");
      if (!sessionData) {
        console.warn("No admin session found for token refresh");
        return null;
      }

      let session;
      try {
        session = JSON.parse(sessionData);
      } catch (parseError) {
        console.error("Failed to parse admin session:", parseError);
        return null;
      }

      if (!session || !session.isLoggedIn) {
        console.warn("Invalid admin session for token refresh");
        return null;
      }

      // Generate a new token
      const newToken = `admin_${Date.now()}`;

      // Update the session
      session.token = newToken;
      session.loginTime = Date.now();
      session.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      try {
        // Save updated session
        localStorage.setItem("adminSession", JSON.stringify(session));

        // Save token directly
        localStorage.setItem("adminToken", newToken);
        this.token = newToken;

        console.log("Token successfully refreshed:", newToken);
        return newToken;
      } catch (storageError) {
        console.error("Failed to save refreshed token:", storageError);
        return null;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      return null;
    }
  }

  /**
   * Get authentication headers
   * @returns {Object} Headers with Authorization token
   */
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "X-Source": "admin-panel",
    };

    try {
      // First try to get token directly, but also check if it might be expired
      let token = this.token || localStorage.getItem("adminToken");

      // If we have a token, validate it's not too old (simple client-side check)
      if (token) {
        // Check if token has expired
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          try {
            // This is a JWT token, decode it to check expiration
            const payload = JSON.parse(
              atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/"))
            );
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              console.log("Token has expired, attempting refresh");
              token = this.refreshToken();
            }
          } catch (e) {
            console.warn("Error checking token expiration:", e);
          }
        } else if (token.startsWith("admin_")) {
          // This is our custom admin token, check if it's old
          const tokenTimestamp = parseInt(token.split("_")[1]);
          const tokenAge = Date.now() - tokenTimestamp;
          // If token is older than 12 hours, refresh it
          if (tokenAge > 12 * 60 * 60 * 1000) {
            console.log("Admin token is old, refreshing");
            token = this.refreshToken();
          }
        }
      }

      // If no direct token, try to get from adminSession
      if (!token) {
        console.log("No valid token found, checking admin session...");
        const sessionData = localStorage.getItem("adminSession");

        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            if (session && session.isLoggedIn) {
              // Create a token format that the backend will accept
              token =
                session.token || `admin_${session.loginTime || Date.now()}`;

              // Store this token for future use
              localStorage.setItem("adminToken", token);
              this.token = token;
              console.log("Generated token from admin session:", token);
            } else {
              console.warn("Admin session exists but is not logged in");
            }
          } catch (err) {
            console.error("Error parsing admin session:", err);
          }
        } else {
          console.warn("No admin session found");
        }
      }

      // Add token to headers if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        console.warn("No authentication token available");

        // Try one last time to generate a new token
        const newToken = this.refreshToken();
        if (newToken) {
          headers["Authorization"] = `Bearer ${newToken}`;
          console.log("Using freshly generated token");
        } else {
          console.error("Could not generate a valid token");
        }
      }
    } catch (error) {
      console.error("Error generating headers:", error);
    }

    return headers;
  }

  /**
   * Check if user is authenticated and has a valid token
   * @returns {boolean} True if authenticated, false otherwise
   */
  checkAuth() {
    try {
      // Get session from localStorage
      const sessionData = localStorage.getItem("adminSession");
      if (!sessionData) {
        console.warn("No admin session found");
        return false;
      }

      const session = JSON.parse(sessionData);

      // Check session properties
      if (!session || !session.isLoggedIn) {
        console.warn("Session exists but user is not logged in");
        return false;
      }

      // Check if session is expired
      if (session.expiresAt <= Date.now()) {
        console.warn("Session has expired");
        return false;
      }

      // Check if token exists
      if (!session.token && !localStorage.getItem("adminToken")) {
        console.warn("No token found in session or localStorage");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  /**
   * Check if current page is an admin page
   * @returns {boolean} True if on admin page
   */
  isAdminPage() {
    const currentPath = window.location.pathname.toLowerCase();
    return (
      currentPath.includes("/admin/") ||
      currentPath.includes("admin-") ||
      currentPath.includes("admin.html")
    );
  }

  /**
   * Make API request with proper error handling
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request data
   * @param {Object} options - Additional options like signal for AbortController
   * @returns {Promise<Object>} Response data
   */
  async request(endpoint, method = "GET", data = null, options = {}) {
    try {
      // Check if we're online
      if (!navigator.onLine) {
        console.warn("Offline: Cannot make API request");
        return {
          success: false,
          message: "لا يوجد اتصال بالإنترنت",
          offline: true,
        };
      }

      const headers = this.getHeaders();
      const url = `${this.apiUrl}/${endpoint}`;

      const fetchOptions = {
        method,
        headers,
        credentials: "include",
      };

      // Add signal for AbortController if provided
      if (options.signal) {
        fetchOptions.signal = options.signal;
      }

      if (
        data &&
        (method === "POST" || method === "PUT" || method === "PATCH")
      ) {
        fetchOptions.body = JSON.stringify(data);
      }

      console.log(`API Request: ${method} ${url}`);
      const response = await fetch(url, fetchOptions);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        if (response.ok) {
          return { success: true, message: "Operation successful" };
        } else {
          return {
            success: false,
            message: `Server error: ${response.status} ${response.statusText}`,
          };
        }
      }

      let result;
      try {
        result = await response.json();
      } catch (error) {
        console.error("Error parsing JSON response:", error);
        return {
          success: false,
          message: "Invalid response format from server",
        };
      }

      // Check for unauthorized access
      if (response.status === 401 || response.status === 403) {
        console.warn("Unauthorized API access:", result);
        return {
          success: false,
          message: result.message || "Unauthorized access",
          unauthorized: true,
        };
      }

      // Return success based on HTTP status
      if (response.ok) {
        return { ...result, success: true };
      } else {
        console.warn("API error response:", result);
        return {
          ...result,
          success: false,
          message: result.message || `Error: ${response.status}`,
        };
      }
    } catch (error) {
      console.error("API request error:", error);

      // Handle abort errors (timeouts)
      if (error.name === "AbortError") {
        return {
          success: false,
          message: "Request timed out. Please try again.",
          error: "timeout",
        };
      }

      // Handle network errors
      if (error.message && error.message.includes("Failed to fetch")) {
        return {
          success: false,
          message: "Network error. Please check your connection.",
          error: "network",
        };
      }

      return {
        success: false,
        message: error.message || "Unknown error occurred",
        error: error.name || "unknown",
      };
    }
  }

  /**
   * Get CSRF token from cookies
   * @returns {string|null} CSRF token if found, null otherwise
   */
  getCsrfToken() {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "XSRF-TOKEN" || name === "csrf-token" || name === "_csrf") {
        return value;
      }
    }
    return null;
  }

  // Authentication API calls

  /**
   * Login with username and password
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise} Authentication result
   */
  async login(username, password) {
    const result = await this.request("auth/login", "POST", {
      username,
      password,
    });

    if (result.success && result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} Registration result
   */
  async register(userData) {
    const result = await this.request("auth/register", "POST", userData);

    if (result.success && result.token) {
      this.setToken(result.token);
    }

    return result;
  }

  /**
   * Logout current user
   * @returns {Promise} Logout result
   */
  async logout() {
    const result = await this.request("auth/logout");
    this.setToken(null);
    return result;
  }

  /**
   * Get current user information
   * @returns {Promise} User info
   */
  async getCurrentUser() {
    return await this.request("auth/me");
  }

  /**
   * Update user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} Update result
   */
  async updatePassword(currentPassword, newPassword) {
    return await this.request("auth/updatepassword", "PUT", {
      currentPassword,
      newPassword,
    });
  }

  // Product API calls

  /**
   * Get all products
   * @returns {Promise} Products list
   */
  async getProducts() {
    try {
      // Add timeout to prevent hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased)

      const response = await this.request("products", "GET", null, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      // If request was aborted, return timeout error
      if (!response || response.error === "timeout") {
        console.warn("Products request timed out, falling back to localStorage");
        return {
          success: false,
          message: "Request timed out. Using cached data.",
          error: "timeout",
        };
      }
      
      return response;
    } catch (error) {
      console.error("Error in getProducts:", error);
      
      // Handle abort errors (timeouts)
      if (error.name === "AbortError") {
        console.warn("Products request aborted, falling back to localStorage");
        return {
          success: false,
          message: "Request timed out. Using cached data.",
          error: "timeout",
        };
      }
      
      return {
        success: false,
        message: error.message || "Failed to fetch products",
        error: error.name || "unknown",
      };
    }
  }

  /**
   * Get a specific product by ID
   * @param {string} productId - Product ID
   * @returns {Promise} Product details
   */
  async getProduct(productId) {
    return await this.request(`products/${productId}`);
  }

  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @returns {Promise} Created product
   */
  async createProduct(productData) {
    return await this.request("products", "POST", productData);
  }

  /**
   * Update an existing product
   * @param {string} productId - Product ID
   * @param {Object} productData - Updated product data
   * @returns {Promise} Updated product
   */
  async updateProduct(productId, productData) {
    try {
      // Make sure we're using the correct ID format for the API endpoint
      // The API expects the product's custom ID in the URL, not MongoDB's _id
      console.log(`Updating product with ID: ${productId}`, productData);

      // Ensure the ID is included in the product data
      const dataToSend = {
        ...productData,
        id: productId, // Ensure ID is included and matches the URL parameter
      };

      // Make sure all required fields are present
      if (!dataToSend.name || !dataToSend.price || !dataToSend.category) {
        return {
          success: false,
          message: "Missing required fields: name, price, or category",
        };
      }

      // Ensure price is a number
      dataToSend.price = parseFloat(dataToSend.price);

      // Ensure addOns is an array if present
      if (dataToSend.addOns && !Array.isArray(dataToSend.addOns)) {
        dataToSend.addOns = [];
      }

      const response = await this.request(
        `products/${productId}`,
        "PUT",
        dataToSend
      );
      console.log("Update product response:", response);

      if (!response.success) {
        throw new Error(response.message || "Failed to update product");
      }

      return response;
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  }

  /**
   * Delete a product
   * @param {string} productId - Product ID
   * @returns {Promise} Delete result
   */
  async deleteProduct(productId) {
    return await this.request(`products/${productId}`, "DELETE");
  }

  /**
   * Create default products
   * @returns {Promise} Default products creation result
   */
  async createDefaultProducts() {
    return await this.request("products/default/create", "POST");
  }

  /**
   * Apply a global discount to all products
   * @param {number} discountPercentage - The discount percentage to apply
   * @param {Object} originalPrices - Original prices before discount
   * @returns {Promise} Apply discount result
   */
  async applyGlobalDiscount(discountPercentage, originalPrices) {
    return await this.request("products/discount", "POST", {
      discountPercentage,
      originalPrices,
    });
  }

  /**
   * Reset the global discount on all products
   * @returns {Promise} Reset discount result
   */
  async resetGlobalDiscount() {
    return await this.request("products/discount/reset", "POST", {});
  }

  /**
   * Get global discount status
   * @returns {Promise} Global discount status
   */
  async getGlobalDiscountStatus() {
    return await this.request("products/discount/status");
  }

  /**
   * Get all vouchers
   * @param {Object} params - Query parameters
   * @returns {Promise} Vouchers list
   */
  async getVouchers(params = {}) {
    return await this.request("vouchers", "GET", null, params);
  }

  /**
   * Get a single voucher
   * @param {string} voucherId - Voucher ID
   * @returns {Promise} Voucher details
   */
  async getVoucher(voucherId) {
    return await this.request(`vouchers/${voucherId}`);
  }

  /**
   * Create a new voucher
   * @param {Object} voucherData - Voucher data
   * @returns {Promise} Creation result
   */
  async createVoucher(voucherData) {
    // Transform the data to match the backend model requirements
    const transformedData = {
      code: voucherData.code,
      type: voucherData.type || "percentage",
      value: parseFloat(voucherData.discount),
      minOrderValue: parseFloat(voucherData.minOrder || 0),
      endDate: voucherData.expiry,
      applicableCategories:
        voucherData.category !== "all" ? [voucherData.category] : [],
      isActive: true,
    };

    return await this.request("vouchers", "POST", transformedData);
  }

  /**
   * Update a voucher
   * @param {string} voucherId - Voucher ID
   * @param {Object} voucherData - Updated voucher data
   * @returns {Promise} Update result
   */
  async updateVoucher(voucherId, voucherData) {
    // Transform the data to match the backend model requirements
    const transformedData = {
      code: voucherData.code,
      type: voucherData.type || "percentage",
      value: parseFloat(voucherData.discount),
      minOrderValue: parseFloat(voucherData.minOrder || 0),
      endDate: voucherData.expiry,
      applicableCategories:
        voucherData.category !== "all" ? [voucherData.category] : [],
      isActive: true,
    };

    return await this.request(`vouchers/${voucherId}`, "PUT", transformedData);
  }

  /**
   * Delete a voucher
   * @param {string} voucherId - Voucher ID
   * @returns {Promise} Deletion result
   */
  async deleteVoucher(voucherId) {
    if (!voucherId) {
      console.error("No voucher ID provided to deleteVoucher");
      return { success: false, message: "No voucher ID provided" };
    }

    try {
      console.log(`Deleting voucher with ID: ${voucherId}`);
      return await this.request(`vouchers/${voucherId}`, "DELETE");
    } catch (error) {
      console.error(`Error deleting voucher ${voucherId}:`, error);
      return {
        success: false,
        message: error.message || "Error deleting voucher",
        error: error.toString(),
      };
    }
  }

  /**
   * Validate a voucher code
   * @param {string} code - Voucher code
   * @param {number} orderValue - Order value for validation
   * @returns {Promise} Validation result
   */
  async validateVoucher(code, orderValue) {
    return await this.request("vouchers/validate", "POST", {
      code,
      orderValue,
    });
  }

  async getDashboardStats() {
    try {
      console.log("[DEBUG] API Service: Fetching dashboard stats");
      // Try fast dashboard endpoint first
      try {
        const fast = await this.request("admin/dashboard-fast", "GET");
        if (fast && fast.success && fast.data) {
          const data = fast.data;
          const stats = {
            totalOrders: data.totalOrders || 0,
            totalEarnings: data.totalEarnings || 0,
            todayOrders: data.todayOrders || 0,
            todayEarnings: data.todayEarnings || 0,
            totalProducts: data.totalProducts || 0,
            totalVouchers: data.totalVouchers || 0,
            recentOrders: Array.isArray(data.recentOrders)
              ? data.recentOrders
              : [],
          };
          console.log("[DEBUG] Returning fast dashboard stats:", stats);
          return stats;
        }
      } catch (fastErr) {
        console.warn("[DEBUG] Fast dashboard endpoint failed:", fastErr);
      }

      // Fallback: minimal stats if fast endpoint isn't available
      return {
        totalOrders: 0,
        totalEarnings: 0,
        todayOrders: 0,
        todayEarnings: 0,
        totalProducts: 0,
        totalVouchers: 0,
        recentOrders: [],
      };
    } catch (error) {
      console.error("[DEBUG] Fatal error in getDashboardStats:", error);
      // Return minimal stats to avoid UI breakage
      return {
        totalOrders: 0,
        totalEarnings: 0,
        todayOrders: 0,
        todayEarnings: 0,
        totalProducts: 0,
        totalVouchers: 0,
        recentOrders: [],
      };
    }
  }

  /**
   * Get the most ordered products
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Array of most ordered products
   */
  async getMostOrderedProducts(limit = 5) {
    try {
      console.log(
        `[DEBUG] Requesting most ordered products with limit=${limit}`
      );

      // First try the normal endpoint
      let response;
      try {
        response = await this.request(
          `orders/most-ordered-products?limit=${limit}`,
          "GET"
        );
        console.log("[DEBUG] Most ordered products response:", response);
      } catch (primaryError) {
        console.error("[DEBUG] Primary request failed:", primaryError);

        // If the first request fails, try a direct fetch as a fallback
        console.log("[DEBUG] Trying direct fetch as fallback");
        try {
          const directResponse = await fetch(
            `${this.apiUrl}/orders/most-ordered-products?limit=${limit}`
          );

          if (directResponse.ok) {
            response = await directResponse.json();
            console.log("[DEBUG] Direct fetch successful:", response);
          } else {
            console.error(
              "[DEBUG] Direct fetch failed with status:",
              directResponse.status
            );
            throw new Error(
              `Direct fetch failed with status ${directResponse.status}`
            );
          }
        } catch (directError) {
          console.error("[DEBUG] Direct fetch error:", directError);
          throw directError;
        }
      }

      if (!response || !response.success) {
        const errorMessage =
          response?.message || response?.error || "Unknown error";
        console.error("[DEBUG] API error:", errorMessage);
        throw new Error(errorMessage);
      }

      return response.data || [];
    } catch (error) {
      console.error("[DEBUG] Error getting most ordered products:", error);
      // Return empty array as fallback
      return [];
    }
  }

  // Get weekly sales data from database
  async getWeeklySalesData(period = "week") {
    try {
      // Valid periods: 'week', 'month', 'quarter', 'year'
      const endpoint = `orders/sales/${period}`;
      const response = await this.request(endpoint, "GET");

      return response;
    } catch (error) {
      console.error("Error fetching sales data:", error);
      return { success: false, message: error.message };
    }
  }

  // Get daily sales data for a specific date range
  async getSalesDataByDateRange(startDate, endDate) {
    try {
      const endpoint = `orders/sales/range?start=${startDate}&end=${endDate}`;
      const response = await this.request(endpoint, "GET");

      return response;
    } catch (error) {
      console.error("Error fetching sales data by date range:", error);
      return { success: false, message: error.message };
    }
  }

  // Reset all stats by deleting all orders
  async resetStats() {
    return this.request("orders/stats/reset", "DELETE");
  }

  // Customer accounts methods
  async getCustomerAccounts(page = 1, limit = 10, search = "") {
    let endpoint = `customer/accounts?page=${page}&limit=${limit}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }

    try {
      // Add timeout to prevent hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased)

      console.log(`API Request: GET ${this.apiUrl}/${endpoint}`);
      const response = await this.request(endpoint, "GET", null, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("Raw customer accounts response:", response);

      // If response has customers property but no data property, move it
      if (
        response &&
        response.success &&
        response.customers &&
        !response.data
      ) {
        console.log(
          "Found customers in response but no data property, restructuring response"
        );
        response.data = response.customers;
      }

      return response;
    } catch (error) {
      console.error("Error fetching customer accounts:", error);

      // Provide more specific error messages
      if (error.name === "AbortError") {
        return {
          success: false,
          message: "تجاوز وقت الاتصال بالخادم. يرجى المحاولة مرة أخرى.",
          error: "timeout",
        };
      }

      if (!navigator.onLine) {
        return {
          success: false,
          message:
            "لا يوجد اتصال بالإنترنت. يرجى التحقق من اتصالك والمحاولة مرة أخرى.",
          error: "offline",
        };
      }

      return {
        success: false,
        message: error.message || "حدث خطأ أثناء جلب بيانات العملاء",
        error: error.name || "unknown",
      };
    }
  }

  async getCustomerAccount(customerId) {
    return this.request(`customer/accounts/${customerId}`, "GET");
  }

  async updateCustomerPermissions(customerId, permissions) {
    console.log(
      `Updating permissions for customer ${customerId}:`,
      permissions
    );
    return this.request(`customer/accounts/${customerId}/permissions`, "PUT", {
      permissions,
    });
  }

  async suspendCustomerAccount(customerId) {
    return this.request(`customer/accounts/${customerId}/suspend`, "PUT");
  }

  async activateCustomerAccount(customerId) {
    return this.request(`customer/accounts/${customerId}/activate`, "PUT");
  }

  async deleteCustomerAccount(customerId) {
    return this.request(`customer/accounts/${customerId}`, "DELETE");
  }

  // Reservations methods
  async getReservations(params = {}) {
    let endpoint = "reservations";

    // Add query params if provided
    const queryParams = [];
    if (params.date) queryParams.push(`date=${params.date}`);
    if (params.status) queryParams.push(`status=${params.status}`);
    if (params.page) queryParams.push(`page=${params.page}`);
    if (params.limit) queryParams.push(`limit=${params.limit}`);

    if (queryParams.length > 0) {
      endpoint += `?${queryParams.join("&")}`;
    }

    return this.request(endpoint, "GET");
  }

  async getReservation(reservationId) {
    return this.request(`reservations/${reservationId}`, "GET");
  }

  async createReservation(reservationData) {
    return this.request("reservations", "POST", reservationData);
  }

  async updateReservation(reservationId, reservationData) {
    return this.request(
      `reservations/${reservationId}`,
      "PUT",
      reservationData
    );
  }

  async updateReservationStatus(reservationId, status) {
    return this.request(`reservations/${reservationId}/status`, "PUT", {
      status,
    });
  }

  async deleteReservation(reservationId) {
    return this.request(`reservations/${reservationId}`, "DELETE");
  }

  // Reset loyalty points for all customers
  async resetAllLoyaltyPoints() {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/reset-all`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in resetAllLoyaltyPoints:", error);
      return { success: false, message: error.message };
    }
  }

  // Reset loyalty points for a specific customer
  async resetCustomerLoyaltyPoints(customerId) {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/reset/${customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in resetCustomerLoyaltyPoints:", error);
      return { success: false, message: error.message };
    }
  }

  // Adjust loyalty points for a customer
  async adjustCustomerLoyaltyPoints(customerId, points) {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/adjust/${customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ points }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in adjustCustomerLoyaltyPoints:", error);
      return { success: false, message: error.message };
    }
  }

  // Get loyalty points settings
  async getLoyaltyPointsSettings() {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/points-settings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in getLoyaltyPointsSettings:", error);
      return { success: false, message: error.message };
    }
  }

  // Update loyalty points settings
  async updateLoyaltyPointsSettings(settings) {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/points-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in updateLoyaltyPointsSettings:", error);
      return { success: false, message: error.message };
    }
  }

  // Get loyalty discount settings
  async getLoyaltyDiscountSettings() {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/discount-settings`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in getLoyaltyDiscountSettings:", error);
      return { success: false, message: error.message };
    }
  }

  // Update loyalty discount settings
  async updateLoyaltyDiscountSettings(settings) {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/discount-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in updateLoyaltyDiscountSettings:", error);
      return { success: false, message: error.message };
    }
  }

  // Get free items
  async getFreeItems() {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/free-items`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in getFreeItems:", error);
      return { success: false, message: error.message };
    }
  }

  // Update free items
  async updateFreeItems(freeItems) {
    try {
      const response = await fetch(
        `${this.apiUrl}/customer/loyalty/free-items`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Source": "admin-panel",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(freeItems),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error in updateFreeItems:", error);
      return { success: false, message: error.message };
    }
  }

  // Role management methods
  async getRoles() {
    try {
      // Make the API request
      const response = await this.request("roles", "GET");

      // If successful, return the response
      if (response.success) {
        return response;
      }

      // Fallback to localStorage if API fails
      console.log("API call failed, falling back to localStorage for roles");

      // Get roles from localStorage or initialize with defaults
      let roles = [];
      const savedRoles = localStorage.getItem("roles");

      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }

      // Return success response with roles data
      return { success: true, data: roles };
    } catch (error) {
      console.error("Error in getRoles:", error);

      // Fallback to localStorage in case of any error
      try {
        const savedRoles = localStorage.getItem("roles");
        const roles = savedRoles ? JSON.parse(savedRoles) : [];
        return { success: true, data: roles };
      } catch (localStorageError) {
        console.error("Error reading from localStorage:", localStorageError);
        return { success: false, message: "Failed to get roles" };
      }
    }
  }

  async createRole(roleData) {
    try {
      // Make the API request
      const response = await this.request("roles", "POST", roleData);

      // If successful, return the response
      if (response.success) {
        return response;
      }

      // Fallback to localStorage if API fails
      console.log(
        "API call failed, falling back to localStorage for creating role"
      );

      // Get current roles
      let roles = [];
      const savedRoles = localStorage.getItem("roles");

      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }

      // Generate ID if not provided
      const newRole = {
        ...roleData,
        id: roleData.id || "role_" + Math.random().toString(36).substr(2, 9),
      };

      // Add new role
      roles.push(newRole);

      // Save to localStorage
      localStorage.setItem("roles", JSON.stringify(roles));

      // Return success response
      return { success: true, data: newRole };
    } catch (error) {
      console.error("Error in createRole:", error);
      return { success: false, message: "Failed to create role" };
    }
  }

  async updateRole(roleId, roleData) {
    try {
      // Make the API request
      const response = await this.request(`roles/${roleId}`, "PUT", roleData);

      // If successful, return the response
      if (response.success) {
        return response;
      }

      // Fallback to localStorage if API fails
      console.log(
        "API call failed, falling back to localStorage for updating role"
      );

      // Get current roles
      let roles = [];
      const savedRoles = localStorage.getItem("roles");

      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }

      // Find role index with safer comparison
      const roleIndex = roles.findIndex(
        (r) =>
          (r.id && r.id.toString() === roleId.toString()) ||
          (r._id && r._id.toString() === roleId.toString())
      );

      if (roleIndex === -1) {
        console.error(
          `Role with ID ${roleId} not found in roles array:`,
          roles
        );
        return { success: false, message: "Role not found" };
      }

      // Update role
      roles[roleIndex] = {
        ...roles[roleIndex],
        ...roleData,
        // Preserve IDs - keep both for compatibility
        id: roles[roleIndex].id || roleId,
        _id: roles[roleIndex]._id || roleId,
      };

      // Save to localStorage
      localStorage.setItem("roles", JSON.stringify(roles));

      // Return success response
      return { success: true, data: roles[roleIndex] };
    } catch (error) {
      console.error("Error in updateRole:", error);
      return { success: false, message: "Failed to update role" };
    }
  }

  async deleteRole(roleId) {
    try {
      // Make the API request
      const response = await this.request(`roles/${roleId}`, "DELETE");

      // If successful, return the response
      if (response.success) {
        return response;
      }

      // Fallback to localStorage if API fails
      console.log(
        "API call failed, falling back to localStorage for deleting role"
      );

      // Get current roles
      let roles = [];
      const savedRoles = localStorage.getItem("roles");

      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }

      // Check if the role exists before trying to delete
      const roleExists = roles.some(
        (r) =>
          (r.id && r.id.toString() === roleId.toString()) ||
          (r._id && r._id.toString() === roleId.toString())
      );

      if (!roleExists) {
        console.error(
          `Role with ID ${roleId} not found in roles array:`,
          roles
        );
        return { success: false, message: "Role not found" };
      }

      // Filter out the role to delete with safer comparison
      const filteredRoles = roles.filter(
        (r) =>
          !(
            (r.id && r.id.toString() === roleId.toString()) ||
            (r._id && r._id.toString() === roleId.toString())
          )
      );

      // Save to localStorage
      localStorage.setItem("roles", JSON.stringify(filteredRoles));

      // Return success response
      return { success: true, message: "Role deleted successfully" };
    } catch (error) {
      console.error("Error in deleteRole:", error);
      return { success: false, message: "Failed to delete role" };
    }
  }

  async assignRoleToUser(userId, roleId) {
    try {
      // First try to make the API request to MongoDB
      // We'll keep this active (not commented out) to attempt MongoDB updates first
      try {
        console.log(
          `Attempting to assign role ${roleId} to user ${userId} in MongoDB...`
        );
        const response = await this.request(
          `customer/accounts/${userId}/role`,
          "PUT",
          { roleId }
        );

        // If successful, return the response
        if (response && response.success) {
          console.log("Role assigned successfully in MongoDB");

          // Also update localStorage to keep it in sync
          this.syncUserRoleToLocalStorage(userId, roleId);

          return response;
        } else {
          console.warn(
            "MongoDB role assignment failed, falling back to localStorage"
          );
        }
      } catch (apiError) {
        console.warn("API error when assigning role:", apiError);
        // Continue to localStorage fallback
      }

      console.log(
        "Using localStorage for assigning role (MongoDB update failed or API not available)"
      );

      // Get customer accounts
      let accounts = [];
      const savedAccounts = localStorage.getItem("customerAccounts");

      if (savedAccounts) {
        accounts = JSON.parse(savedAccounts);
      }

      // Get roles
      let roles = [];
      const savedRoles = localStorage.getItem("roles");

      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }

      // Find role
      const role = roles.find((r) => r.id === roleId || r._id === roleId);

      if (!role) {
        return { success: false, message: "Role not found" };
      }

      // Find account index
      const accountIndex = accounts.findIndex(
        (a) => a.id === userId || a._id === userId
      );

      if (accountIndex === -1) {
        // If account not in localStorage, create a minimal entry for it
        const newAccount = {
          id: userId,
          _id: userId, // Store both formats for compatibility
          roleId: role.id || role._id,
          roleName: role.name,
          role: { name: role.name, id: role.id || role._id },
          permissions: role.permissions,
        };

        accounts.push(newAccount);
        localStorage.setItem("customerAccounts", JSON.stringify(accounts));

        return {
          success: true,
          message: "Role assigned successfully to new account in localStorage",
        };
      }

      // Update account with role info
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        roleId: role.id || role._id,
        roleName: role.name,
        role: { name: role.name, id: role.id || role._id },
        permissions: role.permissions,
      };

      // Save to localStorage
      localStorage.setItem("customerAccounts", JSON.stringify(accounts));

      // Flag this change for future sync with MongoDB when API becomes available
      this.markForSync(userId, "role_update", { roleId });

      // Return success response
      return {
        success: true,
        message: "Role assigned successfully in localStorage",
      };
    } catch (error) {
      console.error("Error in assignRoleToUser:", error);
      return { success: false, message: "Failed to assign role to user" };
    }
  }

  /**
   * Sync a user's role assignment from MongoDB to localStorage
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   */
  syncUserRoleToLocalStorage(userId, roleId) {
    try {
      // Get roles
      const savedRoles = localStorage.getItem("roles");
      if (!savedRoles) return;

      const roles = JSON.parse(savedRoles);
      const role = roles.find((r) => r.id === roleId || r._id === roleId);

      if (!role) return;

      // Get customer accounts
      const savedAccounts = localStorage.getItem("customerAccounts");
      let accounts = [];

      if (savedAccounts) {
        accounts = JSON.parse(savedAccounts);
      }

      // Find account index
      const accountIndex = accounts.findIndex(
        (a) => a.id === userId || a._id === userId
      );

      if (accountIndex === -1) {
        // Account not in localStorage, no need to update
        return;
      }

      // Update account with role info
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        roleId: role.id || role._id,
        roleName: role.name,
        role: { name: role.name, id: role.id || role._id },
        permissions: role.permissions,
      };

      // Save to localStorage
      localStorage.setItem("customerAccounts", JSON.stringify(accounts));
      console.log(`Synced user ${userId} role to localStorage`);
    } catch (error) {
      console.error("Error syncing role to localStorage:", error);
    }
  }

  /**
   * Mark a change for future sync with MongoDB
   * @param {string} entityId - ID of the entity (user, role, etc.)
   * @param {string} changeType - Type of change (role_update, etc.)
   * @param {Object} changeData - Data related to the change
   */
  markForSync(entityId, changeType, changeData) {
    try {
      // Get pending changes
      const pendingChangesStr = localStorage.getItem("pendingMongoDbChanges");
      let pendingChanges = [];

      if (pendingChangesStr) {
        pendingChanges = JSON.parse(pendingChangesStr);
      }

      // Add new change
      pendingChanges.push({
        entityId,
        changeType,
        changeData,
        timestamp: Date.now(),
      });

      // Save pending changes
      localStorage.setItem(
        "pendingMongoDbChanges",
        JSON.stringify(pendingChanges)
      );
    } catch (error) {
      console.error("Error marking change for sync:", error);
    }
  }

  async getUserRole(userId) {
    try {
      // First try to get the role from MongoDB
      try {
        console.log(
          `Attempting to get role for user ${userId} from MongoDB...`
        );
        const response = await this.request(
          `customer/accounts/${userId}/role`,
          "GET"
        );

        // If successful, return the response
        if (response && response.success) {
          console.log("Got user role successfully from MongoDB");

          // Also update localStorage to keep it in sync
          if (response.data && response.data.roleId) {
            this.syncUserRoleToLocalStorage(userId, response.data.roleId);
          }

          return response;
        } else {
          console.warn(
            "MongoDB role fetch failed, falling back to localStorage"
          );
        }
      } catch (apiError) {
        console.warn("API error when getting user role:", apiError);
        // Continue to localStorage fallback
      }

      console.log(
        "Using localStorage for getting user role (MongoDB fetch failed or API not available)"
      );

      // Get customer accounts
      let accounts = [];
      const savedAccounts = localStorage.getItem("customerAccounts");

      if (savedAccounts) {
        accounts = JSON.parse(savedAccounts);
      }

      // Find account
      const account = accounts.find((a) => a.id === userId || a._id === userId);

      if (!account) {
        return { success: false, message: "User not found" };
      }

      // Return role info
      return {
        success: true,
        data: {
          roleId: account.roleId || (account.role && account.role.id) || null,
          roleName:
            account.roleName || (account.role && account.role.name) || null,
        },
      };
    } catch (error) {
      console.error("Error in getUserRole:", error);
      return { success: false, message: "Failed to get user role" };
    }
  }

  /**
   * Sync pending changes with MongoDB when the API becomes available
   */
  async syncPendingChanges() {
    if (!this.isOnline) {
      console.log("Cannot sync changes while offline");
      return;
    }

    try {
      // Get pending changes
      const pendingChangesStr = localStorage.getItem("pendingMongoDbChanges");
      if (!pendingChangesStr) return;

      const pendingChanges = JSON.parse(pendingChangesStr);
      if (!pendingChanges || pendingChanges.length === 0) return;

      console.log(
        `Found ${pendingChanges.length} pending changes to sync with MongoDB`
      );

      // Process each change
      const successfulChanges = [];

      for (const change of pendingChanges) {
        try {
          switch (change.changeType) {
            case "role_update":
              // Try to update user role in MongoDB
              const roleResponse = await this.request(
                `customer/accounts/${change.entityId}/role`,
                "PUT",
                { roleId: change.changeData.roleId }
              );

              if (roleResponse && roleResponse.success) {
                console.log(
                  `Successfully synced role update for user ${change.entityId}`
                );
                successfulChanges.push(change);
              } else {
                console.warn(
                  `Failed to sync role update for user ${change.entityId}`
                );
              }
              break;

            // Add more change types here as needed

            default:
              console.warn(`Unknown change type: ${change.changeType}`);
          }
        } catch (changeError) {
          console.error(
            `Error processing change for ${change.entityId}:`,
            changeError
          );
        }
      }

      // Remove successful changes from pending list
      if (successfulChanges.length > 0) {
        const remainingChanges = pendingChanges.filter(
          (change) =>
            !successfulChanges.some(
              (sc) =>
                sc.entityId === change.entityId &&
                sc.changeType === change.changeType &&
                sc.timestamp === change.timestamp
            )
        );

        localStorage.setItem(
          "pendingMongoDbChanges",
          JSON.stringify(remainingChanges)
        );
        console.log(
          `Synced ${successfulChanges.length} changes with MongoDB, ${remainingChanges.length} remaining`
        );
      }
    } catch (error) {
      console.error("Error syncing pending changes:", error);
    }
  }

  /**
   * Check if MongoDB API is available
   * @param {string} endpoint - API endpoint to check
   * @returns {Promise<boolean>} True if API is available
   */
  async isMongoDbApiAvailable(endpoint = "health") {
    try {
      if (!this.isOnline) {
        return false;
      }

      // Use AbortController for better browser compatibility
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (increased)

      try {
        const response = await fetch(`${this.apiUrl}/${endpoint}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Don't log timeout errors as warnings since they're expected when server is offline
        if (fetchError.name === 'AbortError') {
          console.log(`MongoDB API check timed out for endpoint: ${endpoint}`);
        } else {
          console.log(`MongoDB API check failed for endpoint: ${endpoint}`, fetchError.message);
        }
        return false;
      }
    } catch (error) {
      console.log("MongoDB API availability check error:", error.message);
      return false;
    }
  }

  /**
   * Log an audit action with current user information
   * @param {string} action - Action type (create, update, delete, view)
   * @param {string} resourceType - Type of resource (product, voucher, etc.)
   * @param {string} resourceId - ID of the resource
   * @param {Object} previousState - Previous state (for update/delete)
   * @param {Object} newState - New state (for create/update)
   * @param {string} details - Additional details
   * @returns {Promise} Audit log result
   */
  async logAuditAction(
    action,
    resourceType,
    resourceId,
    previousState = null,
    newState = null,
    details = null
  ) {
    try {
      // Get current user information from session
      const sessionData = localStorage.getItem("adminSession");
      if (!sessionData) {
        console.error("No admin session found for audit logging");
        return null;
      }

      const session = JSON.parse(sessionData);
      const userId = session.userId || "unknown";
      const username = session.username || session.displayName || "unknown";

      // Safely stringify and parse objects to remove circular references and functions
      const safeStringify = (obj) => {
        if (!obj) return null;

        try {
          // Create a sanitized copy with only essential data
          const sanitized = {};

          // Only include basic properties and avoid potential circular references
          const safeKeys = [
            "id",
            "_id",
            "name",
            "description",
            "price",
            "category",
            "status",
            "date",
            "createdAt",
            "updatedAt",
            "image",
          ];

          // For each safe key, copy it if it exists
          safeKeys.forEach((key) => {
            if (obj[key] !== undefined) {
              sanitized[key] = obj[key];
            }
          });

          // Handle specific object types differently
          if (obj.addOns && Array.isArray(obj.addOns)) {
            // Include a count of add-ons rather than the full structure
            sanitized.addOnsCount = obj.addOns.length;
          }

          return sanitized;
        } catch (err) {
          console.warn("Error sanitizing object for audit log:", err);
          return { error: "Could not sanitize object for logging" };
        }
      };

      // Prepare audit log data with sanitized state objects
      const auditData = {
        action,
        resourceType,
        resourceId,
        userId,
        username,
        previousState: safeStringify(previousState),
        newState: safeStringify(newState),
        details: details || `${action} operation on ${resourceType}`,
      };

      // Send to audit log endpoint
      return await this.request("audit-logs/manual", "POST", auditData);
    } catch (error) {
      console.error("Error logging audit action:", error);
      return null;
    }
  }

  /**
   * Get tax settings from database
   * @returns {Promise<Object>} The tax settings
   */
  async getTaxSettings() {
    try {
      const url = `${this.apiUrl}/tax-settings`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get tax settings: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching tax settings:", error);
      throw error;
    }
  }
}

// Create a singleton instance
const apiService = new ApiService();

// Export the singleton
window.apiService = apiService;

/* 
// API Service Mock
// This file mocks the API calls for testing without a real backend

(function () {
  // Define the API service object
  window.apiService = {
    baseUrl: "http://localhost:5000/api",

    // Login method
    login: async function (username, password) {
      console.log(`Mock login for: ${username}`);
      // Always return success in this mock version
      return {
        success: true,
        token: "mock-token-" + Math.random().toString(36).substr(2),
        user: {
          _id: "admin-id",
          displayName: "Admin User",
          username: username,
          role: "admin",
          permissions: {
            stats: true,
            productsView: true,
            productsEdit: true,
            vouchersView: true,
            vouchersEdit: true,
            tax: true,
            qr: true,
            users: true,
          },
        },
      };
    },

    // All other mock methods...
    
    // Mock implementation for adjustCustomerLoyaltyPoints
    adjustCustomerLoyaltyPoints: async function (customerId, points) {
      console.log("Mock adjustCustomerLoyaltyPoints", customerId, points);
      return { success: true, message: "تم تعديل النقاط بنجاح" };
    },

    // Rest of the mock methods...
  };
})();
*/
