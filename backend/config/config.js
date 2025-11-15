/**
 * Application configuration
 * Contains environment specific settings and feature flags
 */

// Get environment from NODE_ENV or default to development
const env = process.env.NODE_ENV || "development";

// Base configuration object
const config = {
  // Common configuration for all environments
  common: {
    // Audit logging settings
    auditLog: {
      disabled: false, // Set to true to disable all audit logging
      retentionDays: 90, // Number of days to keep audit logs
      sensitiveFields: ["password", "passwordHash", "ssn", "creditCard"],
      highPriorityResources: ["user", "security", "permission"],
    },
  },

  // Environment specific configurations
  development: {
    auditLog: {
      // Override settings for development environment
      // Example: disable certain types of audit logs in dev
      viewLogging: false, // Don't log view operations in dev
    },
  },

  test: {
    auditLog: {
      // For testing, we might want to disable audit logging
      disabled: true,
    },
  },

  production: {
    auditLog: {
      // Production specific audit log settings
      // Example: longer retention in production
      retentionDays: 365,
    },
  },
};

// Create the final configuration object by merging common config with environment specific config
const finalConfig = {
  ...config.common,
  ...(config[env] || {}),
};

// Add a helper method to check if a resource type should be considered high priority
finalConfig.isHighPriorityResource = function (resourceType) {
  return this.auditLog.highPriorityResources.includes(resourceType);
};

module.exports = finalConfig;
