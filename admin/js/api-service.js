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
        console.warn(
          "Products request timed out, falling back to localStorage"
        );
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

      // Try to get orders first
      let orders = [];
      try {
        const ordersResponse = await this.request("orders", "GET");
        console.log("[DEBUG] Orders response:", ordersResponse);

        if (
          ordersResponse &&
          ordersResponse.success &&
          Array.isArray(ordersResponse.data)
        ) {
          orders = ordersResponse.data;
        } else {
          console.warn(
            "[DEBUG] Invalid orders response format:",
            ordersResponse
          );
        }
      } catch (ordersError) {
        console.error("[DEBUG] Error fetching orders:", ordersError);
      }

      // Calculate totals even if API fails
      const totalOrders = orders.length;
      let totalEarnings = 0;

      // Calculate total earnings
      orders.forEach((order) => {
        totalEarnings += order.total || 0;
      });

      // Get today's orders and earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayOrders = orders.filter((order) => {
        const orderDate = new Date(order.date);
        return orderDate >= today;
      });

      const todayEarnings = todayOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      // Get products count
      let totalProducts = 0;
      try {
        const productsResponse = await this.request("products", "GET");
        if (
          productsResponse &&
          productsResponse.success &&
          Array.isArray(productsResponse.data)
        ) {
          totalProducts = productsResponse.data.length;
        }
      } catch (productsError) {
        console.error("[DEBUG] Error fetching products:", productsError);
      }

      // Get vouchers count
      let totalVouchers = 0;
      try {
        const vouchersResponse = await this.request("vouchers", "GET");
        if (
          vouchersResponse &&
          vouchersResponse.success &&
          Array.isArray(vouchersResponse.data)
        ) {
          totalVouchers = vouchersResponse.data.length;
        }
      } catch (vouchersError) {
        console.error("[DEBUG] Error fetching vouchers:", vouchersError);
      }

      // Get recent orders for the dashboard
      const recentOrders = orders
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      const stats = {
        totalOrders,
        totalEarnings,
        todayOrders: todayOrders.length,
        todayEarnings,
        totalProducts,
        totalVouchers,
        recentOrders,
      };

      console.log("[DEBUG] Returning dashboard stats:", stats);
      return stats;
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
  async getCustomerAccounts(page = 1, limit = 10, search = "", filters = {}) {
    try {
      const raw = localStorage.getItem("customerAccounts");
      let accounts = [];

      if (raw) {
        accounts = JSON.parse(raw) || [];
        if (!Array.isArray(accounts)) {
          accounts = [];
        }
      }

      const normalizedFilters = filters && typeof filters === "object" ? filters : {};

      let filteredAccounts = accounts.map((account, index) => ({
        id: account.id || account._id || `local-${index + 1}`,
        name: account.name || account.fullName || account.displayName || account.username || account.email || "",
        email: account.email || "",
        phone: account.phone || account.contact || account.contactNumber || "",
        status: account.status || "active",
        role: account.role || account.roleId || "customer",
        roleId: account.roleId || null,
        createdAt: account.createdAt || account.registeredAt || new Date().toISOString(),
        lastLogin: account.lastLogin || null,
        permissions: account.permissions || [],
        points: Number.isFinite(account.points) ? Number(account.points) : 0,
        loyaltyPoints: Number.isFinite(account.loyaltyPoints)
          ? Number(account.loyaltyPoints)
          : Number.isFinite(account.points)
          ? Number(account.points)
          : 0,
        ordersCount: Number.isFinite(account.ordersCount) ? Number(account.ordersCount) : 0,
        totalSpent: Number.isFinite(account.totalSpent) ? Number(account.totalSpent) : 0,
      }));

      if (search && search.trim()) {
        const lowerSearch = search.trim().toLowerCase();
        filteredAccounts = filteredAccounts.filter((account) => {
          return [
            account.name,
            account.email,
            account.phone,
            account.role,
            account.id,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(lowerSearch));
        });
      }

      if (normalizedFilters.status && normalizedFilters.status !== "all") {
        filteredAccounts = filteredAccounts.filter(
          (account) => account.status === normalizedFilters.status
        );
      }

      if (
        normalizedFilters.roleId &&
        String(normalizedFilters.roleId).trim() !== ""
      ) {
        filteredAccounts = filteredAccounts.filter((account) => {
          if (account.roleId) {
            return String(account.roleId) === String(normalizedFilters.roleId);
          }
          return String(account.role) === String(normalizedFilters.roleId);
        });
      } else if (normalizedFilters.role && normalizedFilters.role.trim() !== "") {
        const targetRole = normalizedFilters.role.trim().toLowerCase();
        filteredAccounts = filteredAccounts.filter((account) =>
          String(account.role).trim().toLowerCase().includes(targetRole)
        );
      }

      if (normalizedFilters.dateFrom || normalizedFilters.dateTo) {
        const fromTime = normalizedFilters.dateFrom
          ? new Date(normalizedFilters.dateFrom).getTime()
          : null;
        const toTime = normalizedFilters.dateTo
          ? new Date(normalizedFilters.dateTo).getTime()
          : null;

        filteredAccounts = filteredAccounts.filter((account) => {
          const createdTime = account.createdAt
            ? new Date(account.createdAt).getTime()
            : null;
          if (!createdTime || Number.isNaN(createdTime)) {
            return false;
          }

          if (fromTime && createdTime < fromTime) {
            return false;
          }
          if (toTime && createdTime > toTime) {
            return false;
          }
          return true;
        });
      }

      filteredAccounts.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      const totalItems = filteredAccounts.length;
      const totalPages = Math.max(1, Math.ceil(totalItems / limit));
      const currentPageSafe = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPageSafe - 1) * limit;
      const paginatedItems = filteredAccounts.slice(startIndex, startIndex + limit);

      return {
        success: true,
        data: paginatedItems,
        pagination: {
          currentPage: currentPageSafe,
          totalPages,
          totalItems,
          pageSize: limit,
        },
      };
    } catch (error) {
      console.error("Error loading customer accounts from localStorage:", error);
      return {
        success: false,
        message:
          error && error.message
            ? error.message
            : "Failed to load customer accounts from localStorage",
        error: error && error.name ? error.name : "local_storage_error",
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

  updateLocalCustomerStatus(customerId, status) {
    try {
      const normalizedCustomerId =
        customerId && customerId.toString
          ? customerId.toString()
          : String(customerId || "");
      const newStatus = status || "active";
      const timestamp = new Date().toISOString();

      let accounts = [];
      try {
        const rawAccounts = localStorage.getItem("customerAccounts");
        accounts = rawAccounts ? JSON.parse(rawAccounts) : [];
        if (!Array.isArray(accounts)) {
          accounts = [];
        }
      } catch (parseError) {
        console.warn(
          "Failed to parse customerAccounts from localStorage:",
          parseError
        );
        accounts = [];
      }

      const findAccountIndex = (list) =>
        list.findIndex((account) => {
          if (!account) return false;
          const accountId =
            account.id && account.id.toString
              ? account.id.toString()
              : account.id;
          const accountObjectId =
            account._id && account._id.toString
              ? account._id.toString()
              : account._id;
          const accountEmail =
            account.email && typeof account.email === "string"
              ? account.email.toLowerCase()
              : null;

          return (
            (accountId && accountId === normalizedCustomerId) ||
            (accountObjectId && accountObjectId === normalizedCustomerId) ||
            (accountEmail && accountEmail === normalizedCustomerId.toLowerCase())
          );
        });

      let accountIndex = findAccountIndex(accounts);

      if (accountIndex === -1) {
        const newAccount = {
          id: normalizedCustomerId,
          _id: normalizedCustomerId,
          status: newStatus,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        accounts.push(newAccount);
        accountIndex = accounts.length - 1;
      }

      const existingAccount = accounts[accountIndex] || {};
      const updatedAccount = {
        ...existingAccount,
        status: newStatus,
        updatedAt: timestamp,
      };
      accounts[accountIndex] = updatedAccount;

      try {
        localStorage.setItem("customerAccounts", JSON.stringify(accounts));
      } catch (saveError) {
        console.error(
          "Failed to persist updated customerAccounts to localStorage:",
          saveError
        );
      }

      try {
        const rawLocalAccounts = localStorage.getItem("localAccounts");
        let localAccounts = rawLocalAccounts ? JSON.parse(rawLocalAccounts) : [];
        if (!Array.isArray(localAccounts)) {
          localAccounts = [];
        }

        const normalizedEmail =
          updatedAccount.email && typeof updatedAccount.email === "string"
            ? updatedAccount.email.toLowerCase()
            : null;

        const localIndex = findAccountIndex(localAccounts);

        if (localIndex !== -1) {
          localAccounts[localIndex] = {
            ...localAccounts[localIndex],
            status: newStatus,
            updatedAt: timestamp,
          };

          localStorage.setItem("localAccounts", JSON.stringify(localAccounts));
        } else if (normalizedEmail || normalizedCustomerId) {
          localAccounts.push({
            id: normalizedCustomerId,
            _id: normalizedCustomerId,
            email: normalizedEmail || updatedAccount.email || "",
            status: newStatus,
            createdAt: timestamp,
            updatedAt: timestamp,
          });

          localStorage.setItem("localAccounts", JSON.stringify(localAccounts));
        }
      } catch (localError) {
        console.warn("Failed to update localAccounts cache:", localError);
      }

      return {
        success: true,
        account: updatedAccount,
      };
    } catch (error) {
      console.error("Failed to update local customer status:", error);
      return {
        success: false,
        message: error?.message || "Unable to update local customer status",
      };
    }
  }

  async suspendCustomerAccount(customerId) {
    const normalizedCustomerId =
      customerId && customerId.toString
        ? customerId.toString()
        : String(customerId || "");
    const isMongoObjectId = /^[a-f\d]{24}$/i.test(normalizedCustomerId);

    if (isMongoObjectId) {
      const response = await this.request(
        `customer/accounts/${normalizedCustomerId}/suspend`,
        "PUT"
      );

      if (response && response.success) {
        this.updateLocalCustomerStatus(normalizedCustomerId, "suspended");
        return response;
      }

      console.warn(
        "MongoDB suspend failed or unavailable, falling back to localStorage",
        response
      );
    } else {
      console.log(
        `Skipping MongoDB suspend for ${normalizedCustomerId} (not an ObjectId), using localStorage`
      );
    }

    const result = this.updateLocalCustomerStatus(
      normalizedCustomerId,
      "suspended"
    );

    if (result.success) {
      return {
        success: true,
        message: "Customer suspended locally",
        data: result.account,
      };
    }

    return {
      success: false,
      message: result.message || "Failed to suspend customer locally",
    };
  }

  async activateCustomerAccount(customerId) {
    const normalizedCustomerId =
      customerId && customerId.toString
        ? customerId.toString()
        : String(customerId || "");
    const isMongoObjectId = /^[a-f\d]{24}$/i.test(normalizedCustomerId);

    if (isMongoObjectId) {
      const response = await this.request(
        `customer/accounts/${normalizedCustomerId}/activate`,
        "PUT"
      );

      if (response && response.success) {
        this.updateLocalCustomerStatus(normalizedCustomerId, "active");
        return response;
      }

      console.warn(
        "MongoDB activate failed or unavailable, falling back to localStorage",
        response
      );
    } else {
      console.log(
        `Skipping MongoDB activate for ${normalizedCustomerId} (not an ObjectId), using localStorage`
      );
    }

    const result = this.updateLocalCustomerStatus(
      normalizedCustomerId,
      "active"
    );

    if (result.success) {
      return {
        success: true,
        message: "Customer activated locally",
        data: result.account,
      };
    }

    return {
      success: false,
      message: result.message || "Failed to activate customer locally",
    };
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

  // Role management helpers
  getLocalRolesFromStorage() {
    try {
      const raw = localStorage.getItem("roles");
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Failed to parse roles from localStorage:", error);
      return [];
    }
  }

  saveLocalRolesToStorage(roles = []) {
    try {
      localStorage.setItem("roles", JSON.stringify(Array.isArray(roles) ? roles : []));
    } catch (error) {
      console.error("Failed to save roles to localStorage:", error);
    }
  }

  ensureLocalRolesSeeded() {
    const seedTimestamp = "2025-10-22T08:15:42.657Z";
    const roles = [
      {
        _id: "68f892ae44b61e6b4a3c9c8f",
        id: "68f892ae44b61e6b4a3c9c8f",
        name: "مستخدم",
        nameEn: "User",
        color: "#42d158",
        icon: "fas fa-user",
        permissions: {
          adminPanel: false,
          cashier: false,
          stats: false,
          productsView: false,
          productsEdit: false,
          vouchersView: false,
          vouchersEdit: false,
          reservations: false,
          tax: false,
          points: false,
          accounts: false,
          qr: false,
        },
        createdAt: seedTimestamp,
        updatedAt: "2025-10-22T08:42:22.154Z",
        __v: 0,
      },
      {
        _id: "68f892ae44b61e6b4a3c9c8d",
        id: "68f892ae44b61e6b4a3c9c8d",
        name: "مدير",
        nameEn: "Administrator",
        color: "#ff3b30",
        icon: "fas fa-crown",
        permissions: {
          adminPanel: true,
          cashier: true,
          stats: true,
          productsView: true,
          productsEdit: true,
          vouchersView: true,
          vouchersEdit: true,
          reservations: true,
          tax: true,
          points: true,
          accounts: true,
          qr: true,
        },
        createdAt: seedTimestamp,
        updatedAt: "2025-10-22T08:29:16.296Z",
        __v: 0,
      },
      {
        _id: "68f892ae44b61e6b4a3c9c8e",
        id: "68f892ae44b61e6b4a3c9c8e",
        name: "كاشير",
        nameEn: "Cashier",
        color: "#8e44ad",
        icon: "fas fa-cash-register",
        permissions: {
          adminPanel: false,
          cashier: true,
          stats: false,
          productsView: true,
          productsEdit: false,
          vouchersView: true,
          vouchersEdit: false,
          reservations: false,
          tax: false,
          points: false,
          accounts: false,
          qr: false,
        },
        createdAt: seedTimestamp,
        updatedAt: "2025-10-22T08:42:11.597Z",
        __v: 0,
      },
    ];

    this.saveLocalRolesToStorage(roles);
    return roles;
  }

  // Role management methods
  async getRoles() {
    try {
      const roles = this.ensureLocalRolesSeeded();
      return { success: true, data: roles };
    } catch (error) {
      console.error("Error in getRoles:", error);
      return { success: false, message: "Failed to get roles" };
    }
  }

  async createRole(roleData) {
    try {
      const roles = this.ensureLocalRolesSeeded();
      const roleId =
        roleData.id || roleData._id || `role_${Math.random().toString(36).slice(2, 10)}`;
      const now = new Date().toISOString();

      const newRole = {
        ...roleData,
        id: roleId,
        _id: roleId,
        createdAt: roleData.createdAt || now,
        updatedAt: now,
      };

      roles.push(newRole);
      this.saveLocalRolesToStorage(roles);

      return { success: true, data: newRole };
    } catch (error) {
      console.error("Error in createRole:", error);
      return { success: false, message: "Failed to create role" };
    }
  }

  async updateRole(roleId, roleData) {
    try {
      const roles = this.ensureLocalRolesSeeded();
      const targetIndex = roles.findIndex((role) => {
        if (!role) return false;
        const idMatches =
          (role.id && role.id.toString() === roleId.toString()) ||
          (role._id && role._id.toString() === roleId.toString());
        return idMatches;
      });

      if (targetIndex === -1) {
        return { success: false, message: "Role not found" };
      }

      const now = new Date().toISOString();
      const existingRole = roles[targetIndex];
      const updatedRole = {
        ...existingRole,
        ...roleData,
        id: existingRole.id || existingRole._id || roleId,
        _id: existingRole._id || existingRole.id || roleId,
        createdAt: existingRole.createdAt || now,
        updatedAt: now,
      };

      roles[targetIndex] = updatedRole;
      this.saveLocalRolesToStorage(roles);

      return { success: true, data: updatedRole };
    } catch (error) {
      console.error("Error in updateRole:", error);
      return { success: false, message: "Failed to update role" };
    }
  }

  async deleteRole(roleId) {
    try {
      const roles = this.ensureLocalRolesSeeded();
      const filteredRoles = roles.filter((role) => {
        if (!role) return false;
        const idMatches =
          (role.id && role.id.toString() === roleId.toString()) ||
          (role._id && role._id.toString() === roleId.toString());
        return !idMatches;
      });

      if (filteredRoles.length === roles.length) {
        return { success: false, message: "Role not found" };
      }

      this.saveLocalRolesToStorage(filteredRoles);
      return { success: true, message: "Role deleted successfully" };
    } catch (error) {
      console.error("Error in deleteRole:", error);
      return { success: false, message: "Failed to delete role" };
    }
  }

  async assignRoleToUser(userId, roleId) {
    try {
      const roles = this.ensureLocalRolesSeeded();
      const role = roles.find((item) => {
        if (!item) return false;
        return (
          (item.id && item.id.toString() === roleId.toString()) ||
          (item._id && item._id.toString() === roleId.toString())
        );
      });

      if (!role) {
        return { success: false, message: "Role not found" };
      }

      // Update customer accounts
      let customerAccounts = [];
      try {
        const rawAccounts = localStorage.getItem("customerAccounts");
        customerAccounts = rawAccounts ? JSON.parse(rawAccounts) : [];
        if (!Array.isArray(customerAccounts)) {
          customerAccounts = [];
        }
      } catch (error) {
        console.warn("Failed to parse customer accounts:", error);
        customerAccounts = [];
      }

      const normalizedUserId = userId && userId.toString ? userId.toString() : String(userId || "");
      let targetIndex = customerAccounts.findIndex((account) => {
        if (!account) return false;
        const accountId = account.id && account.id.toString();
        const accountObjectId = account._id && account._id.toString();
        const accountEmail =
          account.email && typeof account.email === "string"
            ? account.email.toLowerCase()
            : "";
        return (
          accountId === normalizedUserId ||
          accountObjectId === normalizedUserId ||
          accountEmail === normalizedUserId.toLowerCase()
        );
      });

      if (targetIndex === -1) {
        const newAccount = {
          id: normalizedUserId,
          _id: normalizedUserId,
          roleId: role.id || role._id,
          roleName: role.name,
          role: { name: role.name, id: role.id || role._id },
          permissions: role.permissions,
          status: "active",
          createdAt: new Date().toISOString(),
        };

        customerAccounts.push(newAccount);
        targetIndex = customerAccounts.length - 1;
      } else {
        const existing = customerAccounts[targetIndex];
        customerAccounts[targetIndex] = {
          ...existing,
          roleId: role.id || role._id,
          roleName: role.name,
          role: { name: role.name, id: role.id || role._id },
          permissions: role.permissions,
          updatedAt: new Date().toISOString(),
        };
      }

      try {
        localStorage.setItem(
          "customerAccounts",
          JSON.stringify(customerAccounts)
        );
      } catch (error) {
        console.error("Failed to save customer accounts:", error);
      }

      // Update localAccounts entry if present
      try {
        const rawLocal = localStorage.getItem("localAccounts");
        let localAccounts = rawLocal ? JSON.parse(rawLocal) : [];
        if (!Array.isArray(localAccounts)) {
          localAccounts = [];
        }

        const normalizedEmail = normalizedUserId.includes("@")
          ? normalizedUserId.toLowerCase()
          : null;

        let localIndex = localAccounts.findIndex((entry) => {
          if (!entry) return false;
          const entryId = entry.id && entry.id.toString();
          const entryEmail =
            entry.email && typeof entry.email === "string"
              ? entry.email.toLowerCase()
              : "";
          return (
            entryId === normalizedUserId ||
            (normalizedEmail && entryEmail === normalizedEmail)
          );
        });

        const permissionsCopy = role.permissions
          ? { ...role.permissions }
          : {};

        if (localIndex === -1) {
          localAccounts.push({
            id: normalizedUserId,
            email: normalizedEmail || "",
            password: "",
            role: role.name,
            permissions: permissionsCopy,
            name: customerAccounts[targetIndex]?.name || "",
            username: customerAccounts[targetIndex]?.username || "",
            status: customerAccounts[targetIndex]?.status || "active",
            createdAt:
              customerAccounts[targetIndex]?.createdAt ||
              new Date().toISOString(),
          });
        } else {
          localAccounts[localIndex] = {
            ...localAccounts[localIndex],
            role: role.name,
            permissions: permissionsCopy,
            updatedAt: new Date().toISOString(),
          };
        }

        localStorage.setItem("localAccounts", JSON.stringify(localAccounts));
      } catch (error) {
        console.warn("Failed to update localAccounts with role info:", error);
      }

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
      const normalizedUserId =
        userId && userId.toString ? userId.toString() : String(userId || "");
      const isMongoObjectId = /^[a-f\d]{24}$/i.test(normalizedUserId);

      if (isMongoObjectId) {
        try {
          console.log(
            `Attempting to get role for user ${normalizedUserId} from MongoDB...`
          );
          const response = await this.request(
            `customer/accounts/${normalizedUserId}/role`,
            "GET"
          );

          // If successful, return the response
          if (response && response.success) {
            console.log("Got user role successfully from MongoDB");

            // Also update localStorage to keep it in sync
            if (response.data && response.data.roleId) {
              this.syncUserRoleToLocalStorage(
                normalizedUserId,
                response.data.roleId
              );
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
      } else {
        console.log(
          `Skipping MongoDB role fetch for ${normalizedUserId} (not an ObjectId), using localStorage`
        );
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
      const account = accounts.find((a) => {
        if (!a) return false;
        const accountId = a.id && a.id.toString ? a.id.toString() : a.id;
        const accountObjectId =
          a._id && a._id.toString ? a._id.toString() : a._id;
        return (
          (accountId && accountId === normalizedUserId) ||
          (accountObjectId && accountObjectId === normalizedUserId)
        );
      });

      if (!account) {
        return { success: false, message: "User not found" };
      }

      const accountRole =
        account.role && typeof account.role === "object" ? account.role : null;
      const accountPermissions =
        account.permissions && typeof account.permissions === "object"
          ? account.permissions
          : {};

      const resolvedRoleId =
        account.roleId ||
        (accountRole && (accountRole.id || accountRole._id)) ||
        account.roleIdString ||
        null;

      let roleName =
        account.roleName ||
        (accountRole && (accountRole.name || accountRole.nameEn)) ||
        null;

      let roleDetails = null;

      if (accountRole) {
        roleDetails = {
          id: accountRole.id || accountRole._id || resolvedRoleId,
          name: accountRole.name || null,
          nameEn: accountRole.nameEn || null,
          color: accountRole.color || null,
          icon: accountRole.icon || null,
          permissions:
            accountRole.permissions &&
            typeof accountRole.permissions === "object"
              ? accountRole.permissions
              : null,
        };
      }

      const localRoles = this.ensureLocalRolesSeeded();
      let matchedRole = null;

      if (resolvedRoleId) {
        matchedRole = localRoles.find((role) => {
          if (!role) return false;
          const roleId = role.id || role._id;
          return roleId && roleId.toString() === resolvedRoleId.toString();
        });
      }

      if (matchedRole) {
        roleDetails = {
          id: matchedRole.id || matchedRole._id || resolvedRoleId,
          name: matchedRole.name || roleDetails?.name || null,
          nameEn: matchedRole.nameEn || roleDetails?.nameEn || null,
          color: matchedRole.color || roleDetails?.color || null,
          icon: matchedRole.icon || roleDetails?.icon || null,
          permissions: matchedRole.permissions || roleDetails?.permissions || null,
        };
      }

      let permissionsToUse =
        (roleDetails && roleDetails.permissions) || accountPermissions || null;

      if (permissionsToUse && matchedRole && matchedRole.permissions) {
        permissionsToUse = {
          ...matchedRole.permissions,
          ...permissionsToUse,
        };
      }

      if (!permissionsToUse && matchedRole && matchedRole.permissions) {
        permissionsToUse = { ...matchedRole.permissions };
      }

      if (!permissionsToUse && accountRole && accountRole.permissions) {
        permissionsToUse = { ...accountRole.permissions };
      }

      if (!permissionsToUse && accountPermissions) {
        permissionsToUse = { ...accountPermissions };
      }

      if (roleDetails) {
        roleDetails = {
          ...roleDetails,
          permissions: permissionsToUse || {},
        };
      } else if (resolvedRoleId || roleName || permissionsToUse) {
        roleDetails = {
          id: resolvedRoleId,
          name: roleName,
          permissions: permissionsToUse || {},
        };
      }

      if (!roleName) {
        roleName =
          roleDetails?.name ||
          roleDetails?.nameEn ||
          (matchedRole && (matchedRole.name || matchedRole.nameEn)) ||
          null;
      }

      return {
        success: true,
        data: {
          roleId: resolvedRoleId,
          roleName,
          role: roleDetails,
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
        if (fetchError.name === "AbortError") {
          console.log(`MongoDB API check timed out for endpoint: ${endpoint}`);
        } else {
          console.log(
            `MongoDB API check failed for endpoint: ${endpoint}`,
            fetchError.message
          );
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
