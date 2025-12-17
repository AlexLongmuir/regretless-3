/**
 * Error Sanitization Utility
 * 
 * Sanitizes error messages for production builds to prevent exposing
 * technical details, stack traces, or development-specific information.
 * 
 * In development mode (__DEV__ === true), returns detailed error messages.
 * In production mode, returns user-friendly, generic messages.
 */

/**
 * Sanitizes an error message for display to users
 * @param error - The error object or error message string
 * @param context - Optional context-specific fallback message
 * @returns Sanitized error message safe for production
 */
export function sanitizeErrorMessage(
  error: unknown,
  context?: string
): string {
  // In development, show detailed error messages for debugging
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (error instanceof Error) {
      return error.message || 'An error occurred';
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }

  // In production, return user-friendly messages
  if (error instanceof Error) {
    const message = error.message || '';
    
    // Check for common error patterns and provide user-friendly messages
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return 'Authentication error. Please sign in again.';
    }
    
    if (message.includes('permission') || message.includes('access denied')) {
      return 'Permission denied. Please check your settings.';
    }
    
    // For other errors, use context-specific message or generic fallback
    return context || 'Something went wrong. Please try again.';
  }
  
  if (typeof error === 'string') {
    // Even if it's a string, sanitize it in production
    return context || 'Something went wrong. Please try again.';
  }
  
  return context || 'Something went wrong. Please try again.';
}

/**
 * Sanitizes a purchase error message, removing development/testing references
 * @param error - The error object
 * @param isNoAccountError - Whether this is a "no account" error
 * @returns Sanitized error message
 */
export function sanitizePurchaseErrorMessage(
  error: unknown,
  isNoAccountError: boolean = false
): string {
  if (isNoAccountError) {
    // In development, include testing reference
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      return 'Please sign in to your Apple ID in Settings to make purchases. For testing, you can use a sandbox account.';
    }
    // In production, remove testing reference
    return 'Please sign in to your Apple ID in Settings to make purchases.';
  }
  
  return sanitizeErrorMessage(error, 'Something went wrong with your purchase. Please try again.');
}
