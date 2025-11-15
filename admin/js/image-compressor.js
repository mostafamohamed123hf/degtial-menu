/**
 * Image Compression Utility
 * Compresses images to reduce file size and base64 string length
 */

class ImageCompressor {
  /**
   * Compress an image file or data URL
   * @param {File|string} input - File object or data URL string
   * @param {Object} options - Compression options
   * @param {number} options.maxWidth - Maximum width (default: 800)
   * @param {number} options.maxHeight - Maximum height (default: 800)
   * @param {number} options.quality - JPEG quality 0-1 (default: 0.8)
   * @param {string} options.outputFormat - Output format: 'jpeg' or 'webp' (default: 'jpeg')
   * @returns {Promise<string>} Compressed image as data URL
   */
  static async compress(input, options = {}) {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.8,
      outputFormat = 'jpeg'
    } = options;

    try {
      // Convert input to image element
      const img = await this.loadImage(input);
      
      // Calculate new dimensions
      const { width, height } = this.calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed data URL
      const mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);

      console.log(`Image compressed: Original size ~${this.estimateSize(input)}, Compressed size ~${this.estimateSize(compressedDataUrl)}`);

      return compressedDataUrl;
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  }

  /**
   * Load image from File or data URL
   * @param {File|string} input - File object or data URL
   * @returns {Promise<HTMLImageElement>}
   */
  static loadImage(input) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));

      if (input instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(input);
      } else if (typeof input === 'string') {
        img.src = input;
      } else {
        reject(new Error('Invalid input type'));
      }
    });
  }

  /**
   * Calculate new dimensions maintaining aspect ratio
   * @param {number} width - Original width
   * @param {number} height - Original height
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @returns {Object} New dimensions {width, height}
   */
  static calculateDimensions(width, height, maxWidth, maxHeight) {
    let newWidth = width;
    let newHeight = height;

    // Scale down if image is larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;

      if (width > height) {
        newWidth = maxWidth;
        newHeight = maxWidth / aspectRatio;
      } else {
        newHeight = maxHeight;
        newWidth = maxHeight * aspectRatio;
      }

      // Ensure we don't exceed max dimensions
      if (newWidth > maxWidth) {
        newWidth = maxWidth;
        newHeight = maxWidth / aspectRatio;
      }
      if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = maxHeight * aspectRatio;
      }
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Estimate size of image in KB
   * @param {File|string} input - File object or data URL
   * @returns {string} Size estimate
   */
  static estimateSize(input) {
    if (input instanceof File) {
      return `${(input.size / 1024).toFixed(2)} KB`;
    } else if (typeof input === 'string') {
      // Estimate base64 size (base64 is ~33% larger than binary)
      const base64Length = input.length - (input.indexOf(',') + 1);
      const sizeInBytes = (base64Length * 3) / 4;
      return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    }
    return 'Unknown';
  }

  /**
   * Check if browser supports WebP
   * @returns {Promise<boolean>}
   */
  static async supportsWebP() {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 1);
      img.onerror = () => resolve(false);
      img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageCompressor;
}
