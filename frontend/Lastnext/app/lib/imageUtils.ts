// app/lib/imageUtils.ts

export interface MaintenanceImage {
    id: string;
    url: string;
    type: 'before' | 'after';
    caption?: string;
    timestamp?: string | null;
    taskId?: string;
    dataUrl?: string; // Processed data URL for PDF
  }
  
  export interface ImageProcessingResult {
    success: boolean;
    dataUrl?: string;
    error?: string;
    originalUrl: string;
    size?: number;
  }
  
  export interface BatchProcessingResult {
    successful: ImageProcessingResult[];
    failed: ImageProcessingResult[];
    totalProcessed: number;
    processingTime: number;
  }
  
  /**
   * Fetch image from URL and convert to base64 data URL
   * This works for both API images and proxy images
   */
  export const fetchImageAsDataURL = async (
    imageUrl: string,
    options: {
      timeout?: number;
      retries?: number;
      useProxy?: boolean;
      maxSize?: number;
      quality?: number;
    } = {}
  ): Promise<string> => {
    const {
      timeout = 15000,
      retries = 3,
      useProxy = true,
      maxSize = 1024,
      quality = 0.8
    } = options;
  
    // Check if it's already a data URL
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }
  
    // Use proxy for external URLs to avoid CORS issues
    const finalUrl = useProxy && imageUrl.startsWith('http') 
      ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
      : imageUrl;
  
    let lastError: Error;
  
    for (let attempt = 0; attempt < retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
  
      try {
        const response = await fetch(finalUrl, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        const blob = await response.blob();
        
        // Validate image type
        if (!blob.type.startsWith('image/')) {
          throw new Error(`Invalid content type: ${blob.type}`);
        }
  
        // Convert to data URL
        let dataUrl = await blobToDataURL(blob);
  
        // Optimize if needed
        if (blob.size > 512 * 1024) { // > 512KB
          dataUrl = await optimizeImageDataURL(dataUrl, maxSize, quality);
        }
  
        return dataUrl;
  
      } catch (error) {
        lastError = error as Error;
        clearTimeout(timeoutId);
        
        if (attempt < retries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
  
    throw lastError!;
  };
  
  /**
   * Convert blob to data URL
   */
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  /**
   * Optimize image data URL by resizing and compressing
   */
  const optimizeImageDataURL = (
    dataUrl: string, 
    maxSize: number = 1024, 
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
  
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
  
        canvas.width = width;
        canvas.height = height;
  
        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
  
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
  
        // Convert to optimized data URL
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedDataUrl);
      };
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
    });
  };
  
  /**
   * Process multiple API images with batch processing
   */
  export const processApiImagesInBatches = async (
    imageUrls: string[],
    options: {
      batchSize?: number;
      onProgress?: (progress: number) => void;
      useProxy?: boolean;
    } = {}
  ): Promise<BatchProcessingResult> => {
    const { batchSize = 3, onProgress, useProxy = true } = options;
    const startTime = Date.now();
    
    const successful: ImageProcessingResult[] = [];
    const failed: ImageProcessingResult[] = [];
  
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url): Promise<ImageProcessingResult> => {
        try {
          const dataUrl = await fetchImageAsDataURL(url, { useProxy });
          return {
            success: true,
            dataUrl,
            originalUrl: url,
            size: dataUrl.length
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            originalUrl: url
          };
        }
      });
  
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successful.push(result.value);
          } else {
            failed.push(result.value);
          }
        } else {
          failed.push({
            success: false,
            error: result.reason?.message || 'Promise rejected',
            originalUrl: 'unknown'
          });
        }
      });
  
      // Report progress
      if (onProgress) {
        const progress = Math.round(((i + batch.length) / imageUrls.length) * 100);
        onProgress(progress);
      }
  
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < imageUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  
    return {
      successful,
      failed,
      totalProcessed: imageUrls.length,
      processingTime: Date.now() - startTime
    };
  };
  
  /**
   * Convert File to data URL for PDF
   */
  export const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && result.startsWith('data:')) {
          resolve(result);
        } else {
          reject(new Error('Invalid data URL generated'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };
  
  /**
   * Process image file for PDF embedding
   */
  export const processImageForPDF = async (file: File): Promise<string> => {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      throw new Error(`Invalid file type: ${file.type}. Please upload JPEG, PNG, or WebP images.`);
    }
    
    if (file.size > maxSize) {
      throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`);
    }
    
    try {
      // For small images, use direct conversion
      if (file.size < 1024 * 1024) { // Less than 1MB
        return await fileToDataURL(file);
      }
      
      // For larger images, optimize first
      const dataUrl = await fileToDataURL(file);
      return await optimizeImageDataURL(dataUrl, 800, 0.8);
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Failed to process image: ${file.name}`);
    }
  };
  
  /**
   * Generate fallback placeholder image
   */
  export const generatePlaceholderImage = (
    width: number = 400, 
    height: number = 300, 
    text: string = 'No Image Available'
  ): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = width;
    canvas.height = height;
    
    // Background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, width, height);
    
    // Border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
    
    // Icon (simple camera icon)
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(width/2 - 30, height/2 - 20, 60, 40);
    ctx.fillRect(width/2 - 10, height/2 - 30, 20, 15);
    
    // Text
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height/2 + 30);
    
    return canvas.toDataURL('image/png');
  };
  
  /**
   * Validate image data URL format
   */
  export const validateImageDataURL = (dataUrl: string): boolean => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return false;
    }
    
    if (!dataUrl.startsWith('data:image/')) {
      return false;
    }
    
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
      return false;
    }
    
    try {
      atob(parts[1]);
      return true;
    } catch {
      return false;
    }
  };