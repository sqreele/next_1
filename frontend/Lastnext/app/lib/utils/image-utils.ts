import { MEDIA_CONFIG } from '../config';

/**
 * Converts internal Docker URLs to external URLs for browser access
 * This is needed because the browser can't resolve internal Docker hostnames
 */
export function fixImageUrl(imageUrl: string | null | undefined): string | null {
  // Handle null, undefined, or non-string values
  if (!imageUrl || typeof imageUrl !== 'string') {
    return null;
  }
  
  // If it's already an external URL, return as is
  if (imageUrl.startsWith('http://django-backend:8000') || imageUrl.startsWith('https://pmcs.site')) {
    return imageUrl.replace('http://django-backend:8000', MEDIA_CONFIG.baseUrl);
  }
  
  // If it's a relative URL, prepend the media base URL
  if (imageUrl.startsWith('/media/')) {
    return `${MEDIA_CONFIG.baseUrl}${imageUrl}`;
  }
  
  // If it's already a full external URL, return as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Default case: prepend media base URL
  return `${MEDIA_CONFIG.baseUrl}/media/${imageUrl}`;
}

/**
 * Fixes image URLs in a job object
 */
export function fixJobImageUrls(job: any): any {
  if (!job || typeof job !== 'object') return job;
  
  // Create a copy to avoid mutating the original object
  const fixedJob = { ...job };
  
  // Debug: Log the job structure to understand the data
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Processing job:', {
      id: fixedJob.id,
      job_id: fixedJob.job_id,
      hasImageUrls: !!fixedJob.image_urls,
      hasImages: !!fixedJob.images,
      hasProfileImage: !!fixedJob.profile_image,
      imageUrlsType: typeof fixedJob.image_urls,
      imagesType: typeof fixedJob.images
    });
  }
  
  // Fix main image_urls array
  if (fixedJob.image_urls && Array.isArray(fixedJob.image_urls)) {
    fixedJob.image_urls = fixedJob.image_urls
      .filter((url: any) => url !== null && url !== undefined)
      .map((url: any) => fixImageUrl(url))
      .filter((url: string | null) => url !== null);
  }
  
  // Fix images array
  if (fixedJob.images && Array.isArray(fixedJob.images)) {
    fixedJob.images = fixedJob.images
      .filter((image: any) => image && typeof image === 'object')
      .map((image: any) => ({
        ...image,
        image_url: fixImageUrl(image.image_url)
      }))
      .filter((image: any) => image.image_url !== null);
  }
  
  // Fix profile_image
  if (fixedJob.profile_image) {
    fixedJob.profile_image = fixImageUrl(fixedJob.profile_image);
  }
  
  return fixedJob;
}

/**
 * Fixes image URLs in an array of jobs
 */
export function fixJobsImageUrls(jobs: any[]): any[] {
  if (!Array.isArray(jobs)) return [];
  
  return jobs
    .filter(job => job && typeof job === 'object')
    .map(job => fixJobImageUrls(job))
    .filter(job => job !== null);
}

/**
 * Sanitizes job data to ensure all string fields are actually strings
 * This prevents issues with non-string values being passed to string methods
 */
export function sanitizeJobData(job: any): any {
  if (!job || typeof job !== 'object') return job;
  
  const sanitized = { ...job };
  
  // Ensure all string fields are actually strings
  const stringFields = [
    'description', 'status', 'priority', 'remarks', 'job_id',
    'user', 'updated_by', 'created_at', 'updated_at', 'completed_at'
  ];
  
  stringFields.forEach(field => {
    if (sanitized[field] !== null && sanitized[field] !== undefined) {
      sanitized[field] = String(sanitized[field]);
    }
  });
  
  // Ensure user and updated_by are strings
  if (sanitized.user !== null && sanitized.user !== undefined) {
    sanitized.user = String(sanitized.user);
  }
  if (sanitized.updated_by !== null && sanitized.updated_by !== undefined) {
    sanitized.updated_by = String(sanitized.updated_by);
  }
  
  return sanitized;
}

/**
 * Sanitizes an array of jobs
 */
export function sanitizeJobsData(jobs: any[]): any[] {
  if (!Array.isArray(jobs)) return [];
  
  return jobs
    .filter(job => job && typeof job === 'object')
    .map(job => sanitizeJobData(job))
    .filter(job => job !== null);
} 