// API Client for handling common API operations
class ApiClient {
  constructor(baseUrl) {
    if (!baseUrl) {
      const { hostname, origin } = window.location;
      const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
      this.baseUrl = isLocal ? "http://localhost:5000/api" : `${origin}/api`;
    } else {
      this.baseUrl = baseUrl;
    }
  }

  // Generic request method
  async request(endpoint, method = "GET", data = null) {
    // Check for direct use of data URLs in the endpoint
    if (endpoint.startsWith("data:image")) {
      console.error(
        "ERROR: Cannot use data URLs directly in API requests. Use uploadImage() method instead."
      );
      throw new Error(
        "Cannot use data URLs directly. Use uploadImage() method instead."
      );
    }

    const url = `${this.baseUrl}/${endpoint}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("API request error:", error);
      throw error;
    }
  }

  // Upload image
  async uploadImage(imageData) {
    return this.request("upload/image", "POST", { imageData });
  }

  // Get image (sample method - don't use for base64 data)
  async getImage(imageId) {
    return this.request(`images/${imageId}`);
  }
}

// Create a global instance of the API client
const apiClient = new ApiClient();

// Add a global error handler for direct data URL requests
window.addEventListener("error", function (event) {
  const errorMsg = event.message || "";
  if (
    errorMsg.includes("431") &&
    (errorMsg.includes("Request Header Fields Too Large") ||
      errorMsg.includes("data:image"))
  ) {
    console.error(
      "ERROR: You are trying to send an image in the URL. Use apiClient.uploadImage() instead."
    );
    alert(
      "Error: Cannot send images in the URL. Please use the upload feature instead."
    );
    event.preventDefault();
  }
});
