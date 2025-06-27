// services/DeepLTranslationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranslationCache } from '../types/translation';
import { secureLog } from '../utils/security';

// ================================================================
// SECURE CONFIGURATION - UPDATED FOR BACKEND
// ================================================================

interface DeepLConfig {
  apiKey?: string; // Optional since backend handles it
  maxRequestsPerHour?: number;
  enableLogging?: boolean;
  backendUrl?: string;
}

interface RateLimitTracker {
  requests: number;
  windowStart: number;
}

export class DeepLTranslationService {
  private static instance: DeepLTranslationService;
  private backendUrl: string; // CHANGED: Use backend instead of direct API
  private cache: TranslationCache = {};
  private readonly CACHE_KEY = 'deepl_translation_cache';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Security enhancements
  private readonly MAX_REQUESTS_PER_HOUR: number;
  private readonly RATE_LIMIT_KEY = 'deepl_rate_limit';
  private readonly enableLogging: boolean;
  private readonly MAX_TEXT_LENGTH = 5000; // DeepL limit
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  // ================================================================
  // NEW: REQUEST DEDUPLICATION TO PREVENT RACE CONDITIONS
  // ================================================================
  private pendingRequests: Map<string, Promise<string>> = new Map();

  constructor(config: DeepLConfig = {}) {
    // FIXED: Use backend URL instead of API key
    this.backendUrl = config.backendUrl || 'https://fc-ai-backend.onrender.com/api/translate';
    this.MAX_REQUESTS_PER_HOUR = config.maxRequestsPerHour || 100;
    this.enableLogging = config.enableLogging || false;
    this.loadCache();
  }

  public static getInstance(config?: DeepLConfig): DeepLTranslationService {
    if (!DeepLTranslationService.instance) {
      // FIXED: Default config for backend usage
      const defaultConfig: DeepLConfig = { 
        backendUrl: 'https://fc-ai-backend.onrender.com/api/translate',
        maxRequestsPerHour: 100,
        enableLogging: false 
      };
      DeepLTranslationService.instance = new DeepLTranslationService(config || defaultConfig);
    }
    return DeepLTranslationService.instance;
  }

  // ================================================================
  // RATE LIMITING & VALIDATION (UNCHANGED)
  // ================================================================

  private async checkRateLimit(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.RATE_LIMIT_KEY);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      let tracker: RateLimitTracker = stored ? 
        JSON.parse(stored) : 
        { requests: 0, windowStart: now };

      // Reset if window expired
      if (now - tracker.windowStart > oneHour) {
        tracker = { requests: 0, windowStart: now };
      }

      // Check if limit exceeded
      if (tracker.requests >= this.MAX_REQUESTS_PER_HOUR) {
        const timeLeft = oneHour - (now - tracker.windowStart);
        secureLog('DeepL rate limit exceeded', { 
          requests: tracker.requests, 
          timeLeftMs: timeLeft 
        });
        return false;
      }

      // Increment and save
      tracker.requests++;
      await AsyncStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify(tracker));
      
      return true;
    } catch (error) {
      // If rate limiting fails, allow the request but log it
      secureLog('Rate limit check failed', { error: error.message });
      return true;
    }
  }

  private validateTranslationInput(text: string, targetLanguage: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Text is required and must be a string' };
    }

    if (text.length > this.MAX_TEXT_LENGTH) {
      return { isValid: false, error: `Text too long (max ${this.MAX_TEXT_LENGTH} characters)` };
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return { isValid: false, error: 'Target language is required' };
    }

    // Validate language code format
    if (!targetLanguage.match(/^[A-Z]{2}(-[A-Z]{2})?$/)) {
      return { isValid: false, error: 'Invalid language code format' };
    }

    return { isValid: true };
  }

  // ================================================================
  // CACHE METHODS (UNCHANGED)
  // ================================================================

  private async loadCache(): Promise<void> {
    try {
      const cachedData = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cachedData) {
        this.cache = JSON.parse(cachedData);
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  private getCacheKey(text: string, targetLang: string): string {
    // Create a hash-like key for the text
    return `${text.substring(0, 50)}_${targetLang}_${text.length}`;
  }

  private isValidCachedTranslation(cached: any): boolean {
    return cached && 
           cached.timestamp && 
           (Date.now() - cached.timestamp) < this.CACHE_EXPIRY;
  }

  // ================================================================
  // NEW: RACE-CONDITION-FREE TRANSLATION IMPLEMENTATION
  // ================================================================

  private async performTranslation(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    cacheKey: string
  ): Promise<string> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      // FIXED: Call your secure backend instead of DeepL directly
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FC25Locker/1.0',
        },
        body: JSON.stringify({
          text: text,
          targetLanguage: targetLanguage,
          sourceLanguage: sourceLanguage,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        secureLog('Backend translation error', { 
          status: response.status, 
          statusText: response.statusText,
          textLength: text.length,
          errorText: errorText.substring(0, 200) // Log first 200 chars of error
        });
        
        if (response.status === 403) {
          throw new Error('Translation service authentication failed');
        } else if (response.status === 429) {
          throw new Error('Translation service rate limit exceeded');
        } else if (response.status === 456) {
          throw new Error('Translation quota exceeded');
        } else {
          throw new Error(`Translation service error (${response.status})`);
        }
      }

      const data = await response.json();
      
      // FIXED: Handle your backend response format
      if (!data || !data.translatedText) {
        console.error('Invalid backend response:', data);
        throw new Error('Invalid translation response format');
      }

      const translatedText = data.translatedText;

      // Cache the result
      this.cache[cacheKey] = {
        original: text,
        translated: translatedText,
        timestamp: Date.now()
      };
      
      await this.saveCache();

      if (this.enableLogging) {
        secureLog('Translation completed successfully', { 
          textLength: text.length, 
          targetLang: targetLanguage,
          translatedLength: translatedText.length,
          usedBackend: true
        });
      }

      return translatedText;

    } catch (error) {
      if (error.name === 'AbortError') {
        secureLog('Translation request timeout', { textLength: text.length });
        throw new Error('Translation request timed out');
      }
      
      secureLog('Translation failed', { 
        error: error.message, 
        textLength: text.length,
        backendUrl: this.backendUrl
      });
      
      throw error;
    }
  }

  public async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage: string = 'EN'
  ): Promise<string> {
    // Input validation
    const validation = this.validateTranslationInput(text, targetLanguage);
    if (!validation.isValid) {
      secureLog('Translation input validation failed', { error: validation.error });
      throw new Error(validation.error);
    }

    // Rate limiting check
    const canProceed = await this.checkRateLimit();
    if (!canProceed) {
      throw new Error('Translation rate limit exceeded. Please try again later.');
    }

    const cacheKey = this.getCacheKey(text, targetLanguage);
    
    // Check cache first
    if (this.cache[cacheKey] && this.isValidCachedTranslation(this.cache[cacheKey])) {
      if (this.enableLogging) {
        secureLog('Translation served from cache', { 
          textLength: text.length, 
          targetLang: targetLanguage 
        });
      }
      return this.cache[cacheKey].translated;
    }

    // ================================================================
    // CRITICAL FIX: REQUEST DEDUPLICATION TO PREVENT RACE CONDITIONS
    // ================================================================

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      if (this.enableLogging) {
        secureLog('Translation request deduplicated', { 
          textLength: text.length, 
          targetLang: targetLanguage 
        });
      }
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create and cache the promise to prevent duplicate requests
    const translationPromise = this.performTranslation(text, targetLanguage, sourceLanguage, cacheKey);
    this.pendingRequests.set(cacheKey, translationPromise);

    try {
      const result = await translationPromise;
      return result;
    } finally {
      // Always cleanup pending requests when complete (success or failure)
      this.pendingRequests.delete(cacheKey);
      
      // Optional: Cleanup old pending requests to prevent memory leaks
      if (this.pendingRequests.size > 50) {
        secureLog('Cleaning up excessive pending requests', { 
          pendingCount: this.pendingRequests.size 
        });
        // Clear all pending requests if too many accumulate (shouldn't happen in normal usage)
        this.pendingRequests.clear();
      }
    }
  }

  public async translateMultiple(
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'EN'
  ): Promise<string[]> {
    // Validate batch size
    if (texts.length > 10) {
      secureLog('Large batch translation request', { count: texts.length });
    }

    // NOTE: translateText already handles deduplication, so this is safe
    const promises = texts.map(text => 
      this.translateText(text, targetLanguage, sourceLanguage)
    );
    return Promise.all(promises);
  }

  public async getSupportedLanguages(): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      // FIXED: Try to get languages from your backend
      const response = await fetch(`${this.backendUrl.replace('/translate', '/languages')}`, {
        headers: {
          'User-Agent': 'FC25Locker/1.0',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      secureLog('Failed to fetch supported languages', { error: error.message });
    }
    
    // Return fallback languages
    return [
      { language: 'EN', name: 'English' },
      { language: 'ES', name: 'Spanish' },
      { language: 'FR', name: 'French' },
      { language: 'DE', name: 'German' },
      { language: 'IT', name: 'Italian' },
      { language: 'PT', name: 'Portuguese' },
      { language: 'RU', name: 'Russian' },
      { language: 'JA', name: 'Japanese' },
      { language: 'ZH', name: 'Chinese' }
    ];
  }

  public clearCache(): void {
    this.cache = {};
    this.pendingRequests.clear(); // NEW: Clear pending requests too
    AsyncStorage.removeItem(this.CACHE_KEY);
    AsyncStorage.removeItem(this.RATE_LIMIT_KEY);
    
    if (this.enableLogging) {
      secureLog('Translation cache and pending requests cleared');
    }
  }

  // ================================================================
  // UTILITY METHODS - UPDATED FOR BACKEND + DEDUPLICATION STATS
  // ================================================================

  public getApiKeyStatus(): { configured: boolean; format: string } {
    return {
      configured: true, // Always true since backend handles it
      format: 'Backend secured'
    };
  }

  public async getUsageStats(): Promise<{
    cacheSize: number;
    requestsThisHour: number;
    rateLimitRemaining: number;
    pendingRequests: number; // NEW: Track pending requests
  }> {
    const cacheSize = Object.keys(this.cache).length;
    const pendingRequests = this.pendingRequests.size;
    
    try {
      const stored = await AsyncStorage.getItem(this.RATE_LIMIT_KEY);
      const tracker: RateLimitTracker = stored ? 
        JSON.parse(stored) : 
        { requests: 0, windowStart: Date.now() };

      return {
        cacheSize,
        requestsThisHour: tracker.requests,
        rateLimitRemaining: Math.max(0, this.MAX_REQUESTS_PER_HOUR - tracker.requests),
        pendingRequests // NEW: Include pending request count
      };
    } catch {
      return { 
        cacheSize, 
        requestsThisHour: 0, 
        rateLimitRemaining: this.MAX_REQUESTS_PER_HOUR,
        pendingRequests
      };
    }
  }
}