import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo,
  forwardRef,
  useImperativeHandle 
} from 'react';
import {
  View,
  Image,
  ImageStyle,
  ViewStyle,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  ImageSourcePropType,
  ImageResizeMode,
  AccessibilityRole,
  LayoutChangeEvent,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

// Enhanced imports
import { validateImageUrl, sanitizeImageUrl } from '../../utils/security';
import { errorLogger, analytics, performanceLogger } from '../../services/monitoring';
import { debounce, throttle } from '../../utils/performance';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

// ================================================================
// INTERFACES - COMPREHENSIVE IMAGE CONFIGURATION
// ================================================================

interface ImageWithFallbackProps {
  /**
   * Primary image source
   */
  source: ImageSourcePropType | { uri: string };
  
  /**
   * Fallback image source when primary fails
   */
  fallbackSource?: ImageSourcePropType;
  
  /**
   * Loading placeholder image
   */
  loadingIndicatorSource?: ImageSourcePropType;
  
  /**
   * Image style
   */
  style?: ImageStyle;
  
  /**
   * Container style
   */
  containerStyle?: ViewStyle;
  
  /**
   * Image resize mode
   */
  resizeMode?: ImageResizeMode | ImageContentFit;
  
  /**
   * Whether to show loading indicator
   */
  showLoadingIndicator?: boolean;
  
  /**
   * Loading indicator color
   */
  loadingIndicatorColor?: string;
  
  /**
   * Loading indicator size
   */
  loadingIndicatorSize?: 'small' | 'large' | number;
  
  /**
   * Whether to show retry button on error
   */
  showRetryButton?: boolean;
  
  /**
   * Maximum retry attempts
   */
  maxRetryAttempts?: number;
  
  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to use progressive loading
   */
  progressiveLoading?: boolean;
  
  /**
   * Low quality image for progressive loading
   */
  lowQualitySource?: ImageSourcePropType | { uri: string };
  
  /**
   * Whether image is touchable
   */
  touchable?: boolean;
  
  /**
   * Touch handler
   */
  onPress?: () => void;
  
  /**
   * Long press handler
   */
  onLongPress?: () => void;
  
  /**
   * Load success callback
   */
  onLoad?: (success: boolean) => void;
  
  /**
   * Load end callback (success or failure)
   */
  onLoadEnd?: (success: boolean) => void;
  
  /**
   * Load start callback
   */
  onLoadStart?: () => void;
  
  /**
   * Progress callback
   */
  onProgress?: (loaded: number, total: number) => void;
  
  /**
   * Error callback
   */
  onError?: (error: Error) => void;
  
  /**
   * Layout change callback
   */
  onLayout?: (event: LayoutChangeEvent) => void;
  
  /**
   * Whether to cache the image
   */
  cache?: boolean;
  
  /**
   * Cache policy
   */
  cachePolicy?: 'memory' | 'disk' | 'memory-disk' | 'none';
  
  /**
   * Image priority for loading
   */
  priority?: 'low' | 'normal' | 'high';
  
  /**
   * Whether to use blur effect while loading
   */
  blurRadius?: number;
  
  /**
   * Fade animation duration
   */
  fadeDuration?: number;
  
  /**
   * Whether to use Expo Image instead of RN Image
   */
  useExpoImage?: boolean;
  
  /**
   * Placeholder background color
   */
  placeholderColor?: string;
  
  /**
   * Border radius
   */
  borderRadius?: number;
  
  /**
   * Whether to show image info overlay
   */
  showImageInfo?: boolean;
  
  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
  
  /**
   * Accessibility hint
   */
  accessibilityHint?: string;
  
  /**
   * Accessibility role
   */
  accessibilityRole?: AccessibilityRole;
  
  /**
   * Test ID for testing
   */
  testID?: string;
  
  /**
   * Whether to enable zoom on press
   */
  enableZoom?: boolean;
  
  /**
   * Custom loading component
   */
  customLoadingComponent?: React.ReactNode;
  
  /**
   * Custom error component
   */
  customErrorComponent?: React.ReactNode;
  
  /**
   * Whether to use reduced motion
   */
  reducedMotion?: boolean;
  
  /**
   * Image quality (0-1, only for some sources)
   */
  quality?: number;
  
  /**
   * Whether to allow fullscreen view
   */
  allowFullscreen?: boolean;
  
  /**
   * Headers for network requests
   */
  headers?: Record<string, string>;
  
  /**
   * Timeout for image loading
   */
  timeout?: number;
}

interface ImageWithFallbackRef {
  /**
   * Retry loading the image
   */
  retry: () => void;
  
  /**
   * Preload the image
   */
  preload: () => Promise<boolean>;
  
  /**
   * Get current load state
   */
  getLoadState: () => ImageLoadState;
  
  /**
   * Clear image cache
   */
  clearCache: () => void;
  
  /**
   * Get image dimensions
   */
  getImageSize: () => Promise<{ width: number; height: number }>;
}

type ImageLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'retrying';

interface ImageMetrics {
  loadStartTime: number;
  loadEndTime: number;
  loadDuration: number;
  retryCount: number;
  imageSize: { width: number; height: number } | null;
  networkType: string;
  cacheHit: boolean;
  errorType: string | null;
}

// ================================================================
// CONSTANTS - OPTIMIZATION SETTINGS
// ================================================================

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_FADE_DURATION = 300;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_LOADING_INDICATOR_COLOR = '#007AFF';
const DEFAULT_PLACEHOLDER_COLOR = '#F0F0F0';

const FALLBACK_IMAGES = {
  user: require('../../assets/images/bk.png'),
  post: require('../../assets/images/bk.png'),
  generic: require('../../assets/images/bk.png'),
  error: require('../../assets/images/bk.png'),
  loading: require('../../assets/images/bk.png'),
};

// ================================================================
// IMAGE CACHE MANAGER - INTELLIGENT CACHING SYSTEM
// ================================================================

class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache: Map<string, { data: string; timestamp: number; size: number }> = new Map();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  async cacheImage(url: string, data: string, size: number): Promise<void> {
    try {
      // Check if we need to clear old cache
      if (this.currentCacheSize + size > this.maxCacheSize) {
        this.clearOldCache();
      }

      this.cache.set(url, {
        data,
        timestamp: Date.now(),
        size
      });

      this.currentCacheSize += size;

      analytics.track('image_cached', {
        url: url.substring(0, 100), // Truncate for privacy
        size,
        total_cache_size: this.currentCacheSize
      });

    } catch (error) {
      errorLogger.logError('Image_Cache_Error', { error, url });
    }
  }

  getCachedImage(url: string): string | null {
    const cached = this.cache.get(url);
    if (cached) {
      // Update access time
      cached.timestamp = Date.now();
      return cached.data;
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }

  private clearOldCache(): void {
    // Remove oldest 25% of cache
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [url, data] = entries[i];
      this.cache.delete(url);
      this.currentCacheSize -= data.size;
    }
  }

  getCacheStats(): { size: number; count: number; maxSize: number } {
    return {
      size: this.currentCacheSize,
      count: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// ================================================================
// IMAGE VALIDATOR - SECURITY AND PERFORMANCE
// ================================================================

class ImageValidator {
  private static blockedDomains = [
    'malicious-site.com',
    'spam-images.net',
    // Add more blocked domains as needed
  ];

  private static allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'
  ];

  static validateImageSource(source: any): { isValid: boolean; sanitizedUrl?: string; error?: string } {
    try {
      // Handle local images
      if (typeof source === 'number' || (source && !source.uri)) {
        return { isValid: true };
      }

      // Handle URI-based images
      if (source && source.uri) {
        const url = source.uri;

        // Basic URL validation
        if (!validateImageUrl(url)) {
          return { isValid: false, error: 'Invalid URL format' };
        }

        // Check blocked domains
        const domain = new URL(url).hostname.toLowerCase();
        if (this.blockedDomains.some(blocked => domain.includes(blocked))) {
          return { isValid: false, error: 'Blocked domain' };
        }

        // Check file extension
        const urlPath = new URL(url).pathname.toLowerCase();
        const hasValidExtension = this.allowedExtensions.some(ext => 
          urlPath.endsWith(ext) || urlPath.includes(ext)
        );

        // Allow URLs without extensions (might be API endpoints)
        if (!hasValidExtension && urlPath.includes('.')) {
          return { isValid: false, error: 'Invalid file type' };
        }

        // Sanitize URL
        const sanitizedUrl = sanitizeImageUrl(url);

        return { isValid: true, sanitizedUrl };
      }

      return { isValid: false, error: 'Invalid source format' };

    } catch (error) {
      return { isValid: false, error: 'URL parsing failed' };
    }
  }

  static getImageType(url: string): 'avatar' | 'post' | 'generic' {
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('avatar') || lowerUrl.includes('profile')) {
      return 'avatar';
    }
    
    if (lowerUrl.includes('post') || lowerUrl.includes('content')) {
      return 'post';
    }
    
    return 'generic';
  }
}

// ================================================================
// MAIN COMPONENT - BULLETPROOF IMAGE WITH FALLBACK
// ================================================================

const ImageWithFallback = forwardRef<ImageWithFallbackRef, ImageWithFallbackProps>(({
  source,
  fallbackSource,
  loadingIndicatorSource = FALLBACK_IMAGES.loading,
  style,
  containerStyle,
  resizeMode = 'cover',
  showLoadingIndicator = true,
  loadingIndicatorColor = DEFAULT_LOADING_INDICATOR_COLOR,
  loadingIndicatorSize = 'small',
  showRetryButton = true,
  maxRetryAttempts = DEFAULT_RETRY_ATTEMPTS,
  retryDelay = DEFAULT_RETRY_DELAY,
  progressiveLoading = true,
  lowQualitySource,
  touchable = false,
  onPress,
  onLongPress,
  onLoad,
  onLoadEnd,
  onLoadStart,
  onProgress,
  onError,
  onLayout,
  cache = true,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  blurRadius,
  fadeDuration = DEFAULT_FADE_DURATION,
  useExpoImage = true,
  placeholderColor = DEFAULT_PLACEHOLDER_COLOR,
  borderRadius = 0,
  showImageInfo = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'image',
  testID = 'image-with-fallback',
  enableZoom = false,
  customLoadingComponent,
  customErrorComponent,
  reducedMotion = false,
  quality = 0.8,
  allowFullscreen = false,
  headers,
  timeout = DEFAULT_TIMEOUT
}, ref) => {
  
  // ================================================================
  // STATE MANAGEMENT - COMPREHENSIVE LOADING STATE
  // ================================================================
  
  const [loadState, setLoadState] = useState<ImageLoadState>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [currentSource, setCurrentSource] = useState(source);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [showLowQuality, setShowLowQuality] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  
  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lowQualityFadeAnim = useRef(new Animated.Value(0)).current;
  const retryButtonScale = useRef(new Animated.Value(1)).current;
  
  // Refs
  const loadStartTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const imageRef = useRef<any>(null);
  
  // Hooks
  const { isConnected, connectionType } = useNetworkStatus();
  const cacheManager = useMemo(() => ImageCacheManager.getInstance(), []);
  
  // ================================================================
  // VALIDATION AND PREPROCESSING
  // ================================================================
  
  const validatedSource = useMemo(() => {
    const validation = ImageValidator.validateImageSource(source);
    if (!validation.isValid) {
      errorLogger.logError('Image_Source_Validation_Failed', {
        error: validation.error,
        source: typeof source === 'object' ? source.uri : source
      });
      return null;
    }
    
    return validation.sanitizedUrl ? 
      { ...source, uri: validation.sanitizedUrl } : 
      source;
  }, [source]);

  const imageType = useMemo(() => {
    if (validatedSource && typeof validatedSource === 'object' && validatedSource.uri) {
      return ImageValidator.getImageType(validatedSource.uri);
    }
    return 'generic';
  }, [validatedSource]);

  const effectiveFallbackSource = useMemo(() => {
    if (fallbackSource) return fallbackSource;
    
    switch (imageType) {
      case 'avatar':
        return FALLBACK_IMAGES.user;
      case 'post':
        return FALLBACK_IMAGES.post;
      default:
        return FALLBACK_IMAGES.generic;
    }
  }, [fallbackSource, imageType]);

  // ================================================================
  // PERFORMANCE METRICS TRACKING
  // ================================================================
  
  const metrics = useRef<ImageMetrics>({
    loadStartTime: 0,
    loadEndTime: 0,
    loadDuration: 0,
    retryCount: 0,
    imageSize: null,
    networkType: connectionType,
    cacheHit: false,
    errorType: null
  });

  const trackLoadComplete = useCallback((success: boolean, error?: string) => {
    metrics.current.loadEndTime = Date.now();
    metrics.current.loadDuration = metrics.current.loadEndTime - metrics.current.loadStartTime;
    metrics.current.retryCount = retryCount;
    metrics.current.networkType = connectionType;
    metrics.current.cacheHit = cacheHit;
    metrics.current.errorType = error || null;

    // Log performance metrics
    performanceLogger.logMetric('image_load_duration', metrics.current.loadDuration, {
      success,
      retry_count: retryCount,
      cache_hit: cacheHit,
      network_type: connectionType,
      image_type: imageType,
      error_type: error
    });

    // Analytics tracking
    analytics.track('image_load_completed', {
      success,
      load_duration: metrics.current.loadDuration,
      retry_count: retryCount,
      cache_hit: cacheHit,
      network_type: connectionType,
      image_type: imageType,
      error_type: error
    });
  }, [retryCount, connectionType, cacheHit, imageType]);

  // ================================================================
  // LOADING HANDLERS - BULLETPROOF ERROR HANDLING
  // ================================================================
  
  const handleLoadStart = useCallback(() => {
    if (!mountedRef.current) return;
    
    metrics.current.loadStartTime = Date.now();
    loadStartTimeRef.current = Date.now();
    
    setLoadState('loading');
    
    // Setup timeout
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        if (loadState === 'loading') {
          handleLoadError(new Error('Image load timeout'));
        }
      }, timeout);
    }
    
    onLoadStart?.();
    
    // Show progressive loading if enabled
    if (progressiveLoading && lowQualitySource) {
      setShowLowQuality(true);
      Animated.timing(lowQualityFadeAnim, {
        toValue: 1,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: true,
      }).start();
    }
  }, [loadState, timeout, onLoadStart, progressiveLoading, lowQualitySource, reducedMotion, lowQualityFadeAnim]);

  const handleLoadSuccess = useCallback((event?: any) => {
    if (!mountedRef.current) return;
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setLoadState('loaded');
    setRetryCount(0);
    
    // Get image dimensions
    if (event?.nativeEvent) {
      const { width, height } = event.nativeEvent.source || {};
      if (width && height) {
        setImageSize({ width, height });
        metrics.current.imageSize = { width, height };
      }
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: reducedMotion ? 0 : fadeDuration,
      useNativeDriver: true,
    }).start();
    
    // Hide progressive loading
    if (showLowQuality) {
      Animated.timing(lowQualityFadeAnim, {
        toValue: 0,
        duration: reducedMotion ? 0 : 200,
        useNativeDriver: true,
      }).start(() => {
        if (mountedRef.current) {
          setShowLowQuality(false);
        }
      });
    }
    
    trackLoadComplete(true);
    onLoad?.(true);
    onLoadEnd?.(true);
  }, [fadeAnim, fadeDuration, reducedMotion, showLowQuality, lowQualityFadeAnim, trackLoadComplete, onLoad, onLoadEnd]);

  const handleLoadError = useCallback((error: Error) => {
    if (!mountedRef.current) return;
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    errorLogger.logError('Image_Load_Error', {
      error: error.message,
      source: typeof currentSource === 'object' ? currentSource.uri : currentSource,
      retry_count: retryCount,
      network_connected: isConnected,
      image_type: imageType
    });
    
    // Try fallback or retry logic
    if (retryCount < maxRetryAttempts && isConnected) {
      // Retry with delay
      setLoadState('retrying');
      setTimeout(() => {
        if (mountedRef.current) {
          setRetryCount(prev => prev + 1);
          setLoadState('loading');
          // Force re-render by updating source
          setCurrentSource({ ...currentSource });
        }
      }, retryDelay * (retryCount + 1)); // Exponential backoff
      
    } else if (currentSource !== effectiveFallbackSource) {
      // Switch to fallback
      setCurrentSource(effectiveFallbackSource);
      setRetryCount(0);
      setLoadState('loading');
      
    } else {
      // Final failure
      setLoadState('error');
      trackLoadComplete(false, error.message);
    }
    
    onError?.(error);
    onLoadEnd?.(false);
  }, [
    currentSource, 
    retryCount, 
    maxRetryAttempts, 
    isConnected, 
    effectiveFallbackSource, 
    retryDelay, 
    imageType,
    trackLoadComplete,
    onError,
    onLoadEnd
  ]);

  const handleProgress = useCallback((event: any) => {
    const { loaded, total } = event.nativeEvent || {};
    if (loaded && total) {
      onProgress?.(loaded, total);
    }
  }, [onProgress]);

  // ================================================================
  // RETRY FUNCTIONALITY
  // ================================================================
  
  const retryLoad = useCallback(() => {
    if (loadState === 'error' || loadState === 'retrying') {
      setRetryCount(0);
      setLoadState('idle');
      setCurrentSource(validatedSource);
      
      // Animate retry button
      Animated.sequence([
        Animated.timing(retryButtonScale, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(retryButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      analytics.track('image_retry_manual', {
        source: typeof validatedSource === 'object' ? validatedSource?.uri : validatedSource,
        previous_retry_count: retryCount
      });
    }
  }, [loadState, validatedSource, retryCount, retryButtonScale]);

  // ================================================================
  // PRELOADING FUNCTIONALITY
  // ================================================================
  
  const preloadImage = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!validatedSource || typeof validatedSource !== 'object' || !validatedSource.uri) {
        resolve(false);
        return;
      }

      // Check cache first
      const cached = cacheManager.getCachedImage(validatedSource.uri);
      if (cached) {
        resolve(true);
        return;
      }

      // Preload using Image.prefetch (React Native) or Image.getSize
      if (Platform.OS !== 'web') {
        Image.prefetch(validatedSource.uri)
          .then(() => resolve(true))
          .catch(() => resolve(false));
      } else {
        // Web fallback
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = validatedSource.uri;
      }
    });
  }, [validatedSource, cacheManager]);

  // ================================================================
  // IMPERATIVE HANDLE - PUBLIC API
  // ================================================================
  
  useImperativeHandle(ref, () => ({
    retry: retryLoad,
    preload: preloadImage,
    getLoadState: () => loadState,
    clearCache: () => cacheManager.clearCache(),
    getImageSize: async () => {
      if (imageSize) return imageSize;
      
      return new Promise((resolve, reject) => {
        if (!validatedSource || typeof validatedSource !== 'object' || !validatedSource.uri) {
          reject(new Error('Invalid source'));
          return;
        }

        Image.getSize(
          validatedSource.uri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });
    }
  }), [retryLoad, preloadImage, loadState, cacheManager, imageSize, validatedSource]);

  // ================================================================
  // EFFECTS - LIFECYCLE MANAGEMENT
  // ================================================================
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset state when source changes
  useEffect(() => {
    if (validatedSource !== currentSource) {
      setLoadState('idle');
      setRetryCount(0);
      setCurrentSource(validatedSource);
      fadeAnim.setValue(0);
    }
  }, [validatedSource, currentSource, fadeAnim]);

  // ================================================================
  // RENDER HELPERS - MODULAR COMPONENTS
  // ================================================================
  
  const renderLoadingIndicator = useCallback(() => {
    if (customLoadingComponent) {
      return customLoadingComponent;
    }

    if (!showLoadingIndicator) {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size={loadingIndicatorSize}
          color={loadingIndicatorColor}
          testID={`${testID}-loading`}
        />
        {showImageInfo && (
          <Text style={styles.loadingText}>
            {loadState === 'retrying' ? `Retrying... (${retryCount}/${maxRetryAttempts})` : 'Loading...'}
          </Text>
        )}
      </View>
    );
  }, [
    customLoadingComponent,
    showLoadingIndicator,
    loadingIndicatorSize,
    loadingIndicatorColor,
    testID,
    showImageInfo,
    loadState,
    retryCount,
    maxRetryAttempts
  ]);

  const renderErrorState = useCallback(() => {
    if (customErrorComponent) {
      return customErrorComponent;
    }

    return (
      <View style={styles.errorContainer}>
        <Ionicons 
          name="image-outline" 
          size={40} 
          color="#999" 
          style={styles.errorIcon}
        />
        {showImageInfo && (
          <Text style={styles.errorText}>Failed to load image</Text>
        )}
        {showRetryButton && (
          <Animated.View style={{ transform: [{ scale: retryButtonScale }] }}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryLoad}
              accessibilityLabel="Retry loading image"
              accessibilityRole="button"
              testID={`${testID}-retry`}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
              {showImageInfo && (
                <Text style={styles.retryText}>Retry</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    );
  }, [
    customErrorComponent,
    showImageInfo,
    showRetryButton,
    retryButtonScale,
    retryLoad,
    testID
  ]);

  const renderProgressiveImage = useCallback(() => {
    if (!progressiveLoading || !lowQualitySource || !showLowQuality) {
      return null;
    }

    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { opacity: lowQualityFadeAnim, zIndex: 1 }
        ]}
      >
        {useExpoImage ? (
          <ExpoImage
            source={lowQualitySource}
            style={[style, { borderRadius }]}
            contentFit={resizeMode as ImageContentFit}
            blurRadius={20}
            accessible={false}
          />
        ) : (
          <Image
            source={lowQualitySource}
            style={[style, { borderRadius }]}
            resizeMode={resizeMode as ImageResizeMode}
            blurRadius={20}
            accessible={false}
          />
        )}
      </Animated.View>
    );
  }, [
    progressiveLoading,
    lowQualitySource,
    showLowQuality,
    lowQualityFadeAnim,
    useExpoImage,
    style,
    borderRadius,
    resizeMode
  ]);

  const renderMainImage = useCallback(() => {
    if (!currentSource || loadState === 'error') {
      return null;
    }

    const imageProps = {
      source: currentSource,
      style: [
        style,
        { 
          borderRadius,
          opacity: loadState === 'loaded' ? 1 : 0
        }
      ],
      onLoadStart: handleLoadStart,
      onLoad: handleLoadSuccess,
      onError: handleLoadError,
      onProgress: handleProgress,
      onLayout,
      accessible: true,
      accessibilityLabel: accessibilityLabel || 'Image',
      accessibilityHint,
      accessibilityRole,
      testID: `${testID}-image`,
      ...(headers && { headers }),
      ...(quality && { quality })
    };

    if (useExpoImage) {
      return (
        <Animated.View style={{ opacity: fadeAnim, zIndex: 2 }}>
          <ExpoImage
            {...imageProps}
            contentFit={resizeMode as ImageContentFit}
            priority={priority}
            cachePolicy={cachePolicy}
            blurRadius={blurRadius}
            ref={imageRef}
          />
        </Animated.View>
      );
    } else {
      return (
        <Animated.View style={{ opacity: fadeAnim, zIndex: 2 }}>
          <Image
            {...imageProps}
            resizeMode={resizeMode as ImageResizeMode}
            blurRadius={blurRadius}
            ref={imageRef}
          />
        </Animated.View>
      );
    }
  }, [
    currentSource,
    loadState,
    style,
    borderRadius,
    fadeAnim,
    handleLoadStart,
    handleLoadSuccess,
    handleLoadError,
    handleProgress,
    onLayout,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    testID,
    headers,
    quality,
    useExpoImage,
    resizeMode,
    priority,
    cachePolicy,
    blurRadius
  ]);

  const renderImageInfo = useCallback(() => {
    if (!showImageInfo || !__DEV__) {
      return null;
    }

    return (
      <View style={styles.infoOverlay}>
        <Text style={styles.infoText}>
          {`${loadState} | ${retryCount}/${maxRetryAttempts} | ${connectionType}`}
        </Text>
        {imageSize && (
          <Text style={styles.infoText}>
            {`${imageSize.width}x${imageSize.height}`}
          </Text>
        )}
      </View>
    );
  }, [showImageInfo, loadState, retryCount, maxRetryAttempts, connectionType, imageSize]);

  // ================================================================
  // MAIN RENDER - COMPREHENSIVE LAYOUT
  // ================================================================
  
  const renderContent = () => (
    <View
      style={[
        styles.container,
        {
          backgroundColor: placeholderColor,
          borderRadius
        },
        containerStyle
      ]}
      testID={testID}
    >
      {/* Progressive/Low Quality Image */}
      {renderProgressiveImage()}
      
      {/* Main Image */}
      {renderMainImage()}
      
      {/* Loading State */}
      {(loadState === 'loading' || loadState === 'retrying') && renderLoadingIndicator()}
      
      {/* Error State */}
      {loadState === 'error' && renderErrorState()}
      
      {/* Debug Info Overlay */}
      {renderImageInfo()}
    </View>
  );

  // Wrap in touchable if needed
  if (touchable && (onPress || onLongPress)) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        disabled={loadState === 'loading'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        testID={`${testID}-touchable`}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return renderContent();
});

// ================================================================
// STYLES - COMPREHENSIVE STYLING SYSTEM
// ================================================================

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 3,
  },
  
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    zIndex: 3,
  },
  
  errorIcon: {
    marginBottom: 8,
  },
  
  errorText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  
  retryText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  infoOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 4,
  },
  
  infoText: {
    fontSize: 10,
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Monaco' : 'monospace',
  },
});

// ================================================================
// DISPLAY NAME AND PERFORMANCE OPTIMIZATION
// ================================================================

ImageWithFallback.displayName = 'ImageWithFallback';

export default React.memo(ImageWithFallback);

// ================================================================
// ADDITIONAL EXPORTS
// ================================================================

export { ImageCacheManager, ImageValidator };
export type { ImageWithFallbackProps, ImageWithFallbackRef, ImageLoadState };