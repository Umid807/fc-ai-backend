// utils/security.ts - Security utilities for FC25 Locker (React Native Compatible)

// ================================================================
// HTML ENTITY ESCAPING
// ================================================================

/**
 * Escape HTML entities to prevent XSS
 */
const escapeHTML = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Unescape HTML entities
 */
const unescapeHTML = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

// ================================================================
// NATIVE HTML SANITIZATION (Replaces DOMPurify)
// ================================================================

/**
 * Remove dangerous HTML tags and attributes
 */
const sanitizeHTMLNative = (input: string, options: {
  allowedTags?: string[];
  allowedAttributes?: string[];
} = {}): string => {
  if (!input || typeof input !== 'string') return '';
  
  const {
    allowedTags = ['strong', 'em', 'p', 'br', 'code'],
    allowedAttributes = []
  } = options;
  
  let sanitized = input;
  
  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove dangerous tags
  const dangerousTags = [
    'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 
    'button', 'link', 'meta', 'base', 'frame', 'frameset', 'applet'
  ];
  
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing versions
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });
  
  // Remove dangerous attributes
  const dangerousAttributes = [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'onreset', 'onkeydown', 'onkeyup', 'onkeypress',
    'style', 'href', 'src', 'action', 'formaction', 'data-'
  ];
  
  dangerousAttributes.forEach(attr => {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
    const regex2 = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]*`, 'gi');
    sanitized = sanitized.replace(regex2, '');
  });
  
  // Remove javascript: and data: protocols
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  
  // If allowedTags is specified, remove all other tags
  if (allowedTags.length > 0) {
    // Remove all tags except allowed ones
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
    sanitized = sanitized.replace(tagRegex, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }
  
  return sanitized;
};

// ================================================================
// URL VALIDATION
// ================================================================

/**
 * Validate URL format without external dependencies
 */
const isValidURL = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    
    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
    
    // Must have valid hostname
    if (!urlObj.hostname || urlObj.hostname.length < 3) return false;
    
    // Block localhost and private IPs for security
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.includes('169.254.')
    ) return false;
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate email format without external dependencies
 */
const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// ================================================================
// INPUT SANITIZATION
// ================================================================

/**
 * Sanitize HTML content while preserving safe markdown elements
 */
export const sanitizeHTML = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return sanitizeHTMLNative(input, {
    allowedTags: ['strong', 'em', 'p', 'br', 'code', 'pre', 'blockquote'],
    allowedAttributes: []
  });
};

/**
 * Sanitize comment text specifically for forum posts
 */
export const sanitizeCommentText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // First basic sanitization
  let sanitized = text
    .trim()
    .substring(0, 2000); // Limit length
  
  // Remove dangerous content
  sanitized = sanitizeHTMLNative(sanitized, {
    allowedTags: ['strong', 'em', 'code'],
    allowedAttributes: []
  });
  
  // Additional safety measures
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  return sanitized;
};

/**
 * Safely process @mentions in comments
 */
export const sanitizeMentions = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // Sanitize the base text first
  const sanitizedText = sanitizeCommentText(text);
  
  // Then safely process mentions with validation
  return sanitizedText.replace(/@(\w{3,20})/g, (match, username) => {
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return match; // Return original if invalid
    }
    
    // Escape the username to prevent injection
    const escapedUsername = escapeHTML(username);
    return `[@${escapedUsername}](mention://${escapedUsername})`;
  });
};

/**
 * Sanitize user profile data
 */
export const sanitizeUserData = (userData: any): any => {
  if (!userData || typeof userData !== 'object') return {};
  
  return {
    ...userData,
    username: sanitizeUsername(userData.username),
    displayName: sanitizeDisplayName(userData.displayName),
    bio: userData.bio ? sanitizeCommentText(userData.bio) : '',
    email: userData.email ? (isValidEmail(userData.email) ? userData.email : '') : '',
  };
};

/**
 * Sanitize username
 */
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') return 'Anonymous';
  
  // Remove any HTML/script content
  let sanitized = sanitizeHTMLNative(username, {
    allowedTags: [],
    allowedAttributes: []
  });
  
  // Validate format and length - only allow alphanumeric and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 20);
  
  // Ensure minimum length
  if (sanitized.length < 3) {
    return 'Anonymous';
  }
  
  return sanitized;
};

/**
 * Sanitize display name
 */
export const sanitizeDisplayName = (displayName: string): string => {
  if (!displayName || typeof displayName !== 'string') return 'Anonymous';
  
  let sanitized = sanitizeHTMLNative(displayName, {
    allowedTags: [],
    allowedAttributes: []
  });
  
  // Allow more characters for display names but still be safe
  sanitized = sanitized
    .replace(/[<>\"'&]/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 50);
  
  return sanitized || 'Anonymous';
};

// ================================================================
// URL AND LINK VALIDATION
// ================================================================

/**
 * Validate and sanitize URLs
 */
export const sanitizeURL = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Basic validation
    if (!isValidURL(url)) return null;
    
    const urlObj = new URL(url);
    
    // Only allow HTTPS for security
    if (urlObj.protocol !== 'https:') return null;
    
    // Block known malicious patterns
    const blockedPatterns = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:',
      'blob:',
    ];
    
    if (blockedPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      return null;
    }
    
    // Whitelist trusted domains for images
    const trustedDomains = [
      'firebasestorage.googleapis.com',
      'imgur.com',
      'i.imgur.com',
      'via.placeholder.com',
      'picsum.photos',
      'images.unsplash.com',
      'cdn.jsdelivr.net',
      'raw.githubusercontent.com',
    ];
    
    const hostname = urlObj.hostname.toLowerCase();
    const isTrustedDomain = trustedDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    // For non-trusted domains, be more restrictive
    if (!isTrustedDomain) {
      // Check for image extensions
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasValidExtension = validExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );
      
      if (!hasValidExtension) return null;
    }
    
    return url;
  } catch (error) {
    return null;
  }
};

// ================================================================
// CONTENT VALIDATION
// ================================================================

/**
 * Validate comment content before submission
 */
export const validateCommentContent = (content: string): {
  isValid: boolean;
  sanitizedContent: string;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!content || typeof content !== 'string') {
    errors.push('Comment content is required');
    return { isValid: false, sanitizedContent: '', errors };
  }
  
  // Sanitize first
  const sanitizedContent = sanitizeCommentText(content);
  
  // Validate length
  if (sanitizedContent.length < 1) {
    errors.push('Comment is too short');
  }
  
  if (sanitizedContent.length > 2000) {
    errors.push('Comment is too long (max 2000 characters)');
  }
  
  // Check for spam patterns
  if (hasSpamPatterns(sanitizedContent)) {
    errors.push('Comment appears to be spam');
  }
  
  // Check for excessive HTML/script attempts
  if (content.includes('<script') || content.includes('javascript:')) {
    errors.push('Invalid content detected');
  }
  
  return {
    isValid: errors.length === 0,
    sanitizedContent,
    errors,
  };
};

/**
 * Enhanced but reliable spam detection
 */
export const hasSpamPatterns = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  
  // 1. Check for excessive repetition (TESTED - WORKS)
  if (/(.)\1{5,}/.test(text)) {
    console.log('🚨 SPAM: Excessive repetition detected');
    return true;
  }
  
  // 2. Check for excessive caps (TESTED - WORKS)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.6 && text.length > 10) {
    console.log('🚨 SPAM: Excessive caps detected');
    return true;
  }
  
  // 3. Enhanced spam phrases with variants (NEW BUT SIMPLE)
  const spamPhrases = [
    // Original phrases
    'click here', 'free money', 'win now', 'buy now', 'limited time', 'act now',
    
    // Common variants
    'click here', 'cl1ck here', 'click h3re', 'clik here',
    'free money', 'fr33 money', 'free m0ney',
    'buy now', 'bu7 now', 'buy n0w',
    'win now', 'w1n now', 'win n0w',
    
    // Additional spam patterns
    'make money fast', 'work from home', 'amazing deal', 'limited offer',
    'call now', 'order now', 'dont miss', 'hurry up', 'special offer',
    'guaranteed', 'risk free', 'no experience', 'easy money'
  ];
  
  // Check each phrase
  let foundPhrases = 0;
  spamPhrases.forEach(phrase => {
    if (lowerText.includes(phrase)) {
      console.log('🚨 SPAM: Found phrase:', phrase);
      foundPhrases++;
    }
  });
  
  if (foundPhrases >= 1) {
    console.log('🚨 SPAM: Total spam phrases found:', foundPhrases);
    return true;
  }
  
  // 4. Check for excessive exclamation marks (NEW - SIMPLE)
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount > 5) {
    console.log('🚨 SPAM: Too many exclamations');
    return true;
  }
  
  // 5. Check for repeated words (NEW - SIMPLE)
  const words = lowerText.split(/\s+/);
  const wordCounts = new Map();
  
  words.forEach(word => {
    if (word.length > 2) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  });
  
  for (const [word, count] of wordCounts) {
    if (count > 3) {
      console.log('🚨 SPAM: Word repeated too many times:', word, count);
      return true;
    }
  }
  
  // 6. Check for all caps words (NEW - SIMPLE)
  const allCapsWords = text.match(/\b[A-Z]{3,}\b/g) || [];
  if (allCapsWords.length > 4) {
    console.log('🚨 SPAM: Too many caps words');
    return true;
  }
  
  console.log('✅ Not spam - text passed all checks');
  return false;
};

// Word frequency analysis
const hasAbnormalWordFrequency = (text: string): boolean => {
  const words = text.split(/\s+/).filter(word => word.length > 2);
  if (words.length < 5) return false;
  
  const wordCounts = new Map();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Check if any word appears too frequently
  for (const [word, count] of wordCounts) {
    if (count > Math.max(3, words.length * 0.3)) {
      return true;
    }
  }
  
  return false;
};

// Sentence structure analysis
const hasSpamStructure = (text: string): boolean => {
  // Too many exclamation marks
  const exclamations = (text.match(/!/g) || []).length;
  if (exclamations > Math.max(3, text.length / 20)) return true;
  
  // Too many CAPS words
  const capsWords = text.match(/\b[A-Z]{2,}\b/g) || [];
  if (capsWords.length > 4) return true;
  
  // Suspicious punctuation patterns
  if (/[!]{3,}/.test(text) || /[?]{3,}/.test(text)) return true;
  
  return false;
};

// ================================================================
// TRANSLATION SECURITY
// ================================================================

/**
 * Sanitize text before translation
 */
export const sanitizeForTranslation = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove potentially malicious content before sending to translation API
  let sanitized = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim()
    .substring(0, 5000); // Limit for translation API
  
  return sanitizeHTMLNative(sanitized, {
    allowedTags: [],
    allowedAttributes: []
  });
};

/**
 * Validate translation API response
 */
export const validateTranslationResponse = (response: string): string => {
  if (!response || typeof response !== 'string') return '';
  
  return sanitizeHTMLNative(response, {
    allowedTags: [],
    allowedAttributes: []
  });
};

// ================================================================
// RATE LIMITING HELPERS
// ================================================================

/**
 * Simple rate limiting check
 */
export const checkRateLimit = (
  key: string, 
  limit: number, 
  windowMs: number
): boolean => {
  const now = Date.now();
  const windowKey = `rateLimit_${key}_${Math.floor(now / windowMs)}`;
  
  // In a real app, you'd use Redis or a proper store
  // For now, use memory (will reset on app restart)
  if (typeof global !== 'undefined') {
    const storage = (global as any).rateLimitStore || {};
    (global as any).rateLimitStore = storage;
    
    const count = storage[windowKey] || 0;
    if (count >= limit) return false;
    
    storage[windowKey] = count + 1;
    return true;
  }
  
  return true; // Allow if no storage available
};

// ================================================================
// PASSWORD STRENGTH VALIDATION
// ================================================================

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, score: 0, feedback: ['Password is required'] };
  }
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password must be at least 8 characters');
  
  if (password.length >= 12) score += 1;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');
  
  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');
  
  if (/[^a-zA-Z\d]/.test(password)) score += 1;
  else feedback.push('Add special characters');
  
  // Common password check
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', '1234567890'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    score = 0;
    feedback.push('This password is too common');
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback,
  };
};

// ================================================================
// ERROR LOGGING (Secure)
// ================================================================

/**
 * Safely log errors without exposing sensitive data
 */
export const secureLog = (message: string, data?: any) => {
  // In production, this would go to a secure logging service
  const sanitizedData = data ? {
    ...data,
    // Remove sensitive fields
    password: undefined,
    token: undefined,
    apiKey: undefined,
    email: data.email ? data.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined,
    userId: data.userId ? data.userId.substring(0, 8) + '***' : undefined,
  } : undefined;
  
  console.error(`[SECURE_LOG] ${message}`, sanitizedData);
};

// ================================================================
// CONTENT MODERATION
// ================================================================

/**
 * Basic profanity filter
 */
export const filterProfanity = (text: string): {
  filtered: string;
  hasProfanity: boolean;
  flaggedWords: string[];
} => {
  if (!text || typeof text !== 'string') {
    return { filtered: '', hasProfanity: false, flaggedWords: [] };
  }
  
  // Basic profanity list (expand as needed)
  const profanityWords = [
    'spam', 'scam', 'hack', 'cheat', 'exploit',
    // Add more words as needed
  ];
  
  let filtered = text;
  const flaggedWords: string[] = [];
  
  profanityWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(filtered)) {
      flaggedWords.push(word);
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    }
  });
  
  return {
    filtered,
    hasProfanity: flaggedWords.length > 0,
    flaggedWords,
  };
};

// ================================================================
// POST-SPECIFIC FUNCTIONS (Wrappers for compatibility)
// ================================================================

/**
 * Validate post content (wrapper for validateCommentContent)
 */
export const validatePostContent = (content: string): {
  isValid: boolean;
  sanitizedContent: string;
  errors: string[];
} => {
  return validateCommentContent(content);
};

/**
 * Sanitize post content (wrapper for sanitizeCommentText) 
 */
export const sanitizePostContent = (content: string): string => {
  return sanitizeCommentText(content);
};

/**
 * Sanitize post data (wrapper for sanitizeUserData with post-specific logic)
 */
export const sanitizePostData = (postData: any): any => {
  if (!postData || typeof postData !== 'object') return {};
  
  return {
    ...postData,
    title: sanitizeCommentText(postData.title || ''),
    content: sanitizeCommentText(postData.content || ''),
    category: sanitizeCommentText(postData.category || ''),
    images: Array.isArray(postData.images) 
      ? postData.images.map(img => sanitizeURL(img)).filter(Boolean)
      : [],
    gif: postData.gif ? sanitizeURL(postData.gif) : null,
    userId: postData.userId || '',
    username: sanitizeUsername(postData.username || ''),
    userAvatar: postData.userAvatar ? sanitizeURL(postData.userAvatar) : null,
  };
};

/**
 * Validate poll content (wrapper for validateCommentContent)
 */
export const validatePollContent = (content: string): {
  isValid: boolean;
  errors: string[];
} => {
  const validation = validateCommentContent(content);
  return {
    isValid: validation.isValid,
    errors: validation.errors,
  };
};

/**
 * Sanitize poll data
 */
export const sanitizePollData = (pollData: any): any => {
  if (!pollData || typeof pollData !== 'object') return {};
  
  return {
    ...pollData,
    question: sanitizeCommentText(pollData.question || ''),
    options: Array.isArray(pollData.options) 
      ? pollData.options.map((option: any) => ({
          ...option,
          text: sanitizeCommentText(option.text || ''),
          emoji: option.emoji || '',
          color: option.color || '#00FFFF',
        }))
      : [],
  };
};

/**
 * Validate search query (wrapper for validateCommentContent)
 */
export const validateSearchQuery = (query: string): {
  isValid: boolean;
  sanitizedContent: string;
  errors: string[];
} => {
  if (!query || typeof query !== 'string') {
    return {
      isValid: false,
      sanitizedContent: '',
      errors: ['Search query is required'],
    };
  }
  
  // Basic length check
  if (query.trim().length > 100) {
    return {
      isValid: false,
      sanitizedContent: '',
      errors: ['Search query too long'],
    };
  }
  
  const validation = validateCommentContent(query);
  return validation;
};

/**
 * Validate image file (basic validation)
 */
export const validateImageFile = (fileInfo: any): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!fileInfo) {
    errors.push('File information is required');
    return { isValid: false, errors };
  }
  
  // Basic type check
  if (fileInfo.type && !fileInfo.type.startsWith('image/')) {
    errors.push('File must be an image');
  }
  
  // Size check (10MB limit)
  if (fileInfo.fileSize && fileInfo.fileSize > 10 * 1024 * 1024) {
    errors.push('File too large (max 10MB)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  // Core sanitization
  sanitizeHTML,
  sanitizeCommentText,
  sanitizeMentions,
  sanitizeUserData,
  sanitizeUsername,
  sanitizeDisplayName,
  sanitizeURL,
  
  // Post-specific functions
  validatePostContent,
  sanitizePostContent,
  sanitizePostData,
  validatePollContent,
  sanitizePollData,
  validateSearchQuery,
  validateImageFile,
  
  // Validation
  validateCommentContent,
  validatePasswordStrength,
  hasSpamPatterns,
  checkRateLimit,
  
  // Translation security
  sanitizeForTranslation,
  validateTranslationResponse,
  
  // Content moderation
  filterProfanity,
  
  // Utilities
  secureLog,
  escapeHTML,
  unescapeHTML,
  isValidURL,
  isValidEmail,
};