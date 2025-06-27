// config/FeatureConfig.ts - Remote configurable features
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ================================================================
// FEATURE FLAGS - REMOTELY CONFIGURABLE
// ================================================================

interface FeatureFlags {
  // Analytics & Monitoring
  enableAnalytics: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorLogging: boolean;
  enableNetworkMonitoring: boolean;
  enableCrashReporting: boolean;
  
  // Performance Features
  enableResponseCaching: boolean;
  enableRequestDeduplication: boolean;
  enableCircuitBreaker: boolean;
  enableRetryLogic: boolean;
  enableOfflineQueue: boolean;
  
  // UI Enhancements
  enableAdvancedAnimations: boolean;
  enableImageOptimization: boolean;
  enablePrefetching: boolean;
  enableVirtualization: boolean;
  
  // Social Features
  enableRealTimeComments: boolean;
  enableNotifications: boolean;
  enableSocialSharing: boolean;
  
  // Developer Tools
  enableDebugMode: boolean;
  enablePerformancePanel: boolean;
  enableNetworkLogger: boolean;
}

interface ServiceEndpoints {
  // Analytics
  analyticsEndpoint?: string;
  performanceEndpoint?: string;
  errorLoggingEndpoint?: string;
  
  // Monitoring
  healthCheckEndpoint?: string;
  metricsEndpoint?: string;
  
  // CDN & Assets
  imagesCDN?: string;
  assetsCDN?: string;
  
  // Real-time
  websocketEndpoint?: string;
  
  // Notifications
  notificationsEndpoint?: string;
}

interface PerformanceSettings {
  // Network
  maxRetries: number;
  retryDelay: number;
  requestTimeout: number;
  
  // Caching
  cacheTimeout: number;
  maxCacheSize: number;
  
  // Monitoring
  metricsFlushInterval: number;
  errorBatchSize: number;
  performanceSampleRate: number;
  
  // UI
  animationDuration: number;
  imageQuality: 'low' | 'medium' | 'high';
  prefetchDistance: number;
}

// ================================================================
// DEFAULT CONFIGURATIONS - SAFE FOR LAUNCH
// ================================================================

const PRODUCTION_SAFE_CONFIG: FeatureFlags = {
  // Analytics & Monitoring - DISABLED until endpoints ready
  enableAnalytics: false,
  enablePerformanceMonitoring: false,
  enableErrorLogging: false,
  enableNetworkMonitoring: false,
  enableCrashReporting: false,
  
  // Performance Features - ENABLED (no network dependency)
  enableResponseCaching: true,
  enableRequestDeduplication: true,
  enableCircuitBreaker: true,
  enableRetryLogic: true,
  enableOfflineQueue: true,
  
  // UI Enhancements - ENABLED
  enableAdvancedAnimations: true,
  enableImageOptimization: true,
  enablePrefetching: false, // Disabled to save bandwidth
  enableVirtualization: true,
  
  // Social Features - BASIC ENABLED
  enableRealTimeComments: false, // Disabled until websocket ready
  enableNotifications: false,
  enableSocialSharing: true, // Native sharing, no network
  
  // Developer Tools - DISABLED in production
  enableDebugMode: __DEV__,
  enablePerformancePanel: __DEV__,
  enableNetworkLogger: __DEV__
};

const DEVELOPMENT_CONFIG: FeatureFlags = {
  // Everything enabled in development
  enableAnalytics: true,
  enablePerformanceMonitoring: true,
  enableErrorLogging: true,
  enableNetworkMonitoring: true,
  enableCrashReporting: true,
  enableResponseCaching: true,
  enableRequestDeduplication: true,
  enableCircuitBreaker: true,
  enableRetryLogic: true,
  enableOfflineQueue: true,
  enableAdvancedAnimations: true,
  enableImageOptimization: true,
  enablePrefetching: true,
  enableVirtualization: true,
  enableRealTimeComments: true,
  enableNotifications: true,
  enableSocialSharing: true,
  enableDebugMode: true,
  enablePerformancePanel: true,
  enableNetworkLogger: true
};

const DEFAULT_ENDPOINTS: ServiceEndpoints = {
  // These will be set when services are ready
  analyticsEndpoint: undefined,
  performanceEndpoint: undefined,
  errorLoggingEndpoint: undefined,
  healthCheckEndpoint: undefined,
  metricsEndpoint: undefined,
  imagesCDN: undefined,
  assetsCDN: undefined,
  websocketEndpoint: undefined,
  notificationsEndpoint: undefined
};

const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  maxRetries: 3,
  retryDelay: 1000,
  requestTimeout: 10000,
  cacheTimeout: 300000, // 5 minutes
  maxCacheSize: 100,
  metricsFlushInterval: 30000, // 30 seconds (longer for production)
  errorBatchSize: 50,
  performanceSampleRate: 0.1, // 10% sampling
  animationDuration: 300,
  imageQuality: 'medium',
  prefetchDistance: 3
};

// ================================================================
// REMOTE CONFIG MANAGER
// ================================================================

class RemoteConfigManager {
  private static instance: RemoteConfigManager;
  private featureFlags: FeatureFlags;
  private endpoints: ServiceEndpoints;
  private performanceSettings: PerformanceSettings;
  private lastFetchTime = 0;
  private configUrl?: string;

  static getInstance(): RemoteConfigManager {
    if (!RemoteConfigManager.instance) {
      RemoteConfigManager.instance = new RemoteConfigManager();
    }
    return RemoteConfigManager.instance;
  }

  private constructor() {
    // Start with safe production config
    this.featureFlags = __DEV__ ? DEVELOPMENT_CONFIG : PRODUCTION_SAFE_CONFIG;
    this.endpoints = { ...DEFAULT_ENDPOINTS };
    this.performanceSettings = { ...DEFAULT_PERFORMANCE_SETTINGS };
    
    this.initializeConfig();
  }

  private async initializeConfig(): Promise<void> {
    try {
      // Load cached config first
      await this.loadCachedConfig();
      
      // Then try to fetch remote config (non-blocking)
      this.fetchRemoteConfig().catch(() => {
        // Silently fail if remote config isn't available yet
      });
    } catch (error) {
      console.warn('Config initialization failed, using defaults');
    }
  }

  async setConfigUrl(url: string): Promise<void> {
    this.configUrl = url;
    await this.fetchRemoteConfig();
  }

  async fetchRemoteConfig(): Promise<boolean> {
    if (!this.configUrl) return false;

    // Don't fetch too frequently
    if (Date.now() - this.lastFetchTime < 300000) { // 5 minutes
      return false;
    }

    try {
      const response = await fetch(this.configUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `FC25Locker/${Platform.OS}`
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`Config fetch failed: ${response.status}`);
      }

      const remoteConfig = await response.json();
      
      // Validate and merge config
      if (this.validateRemoteConfig(remoteConfig)) {
        this.mergeRemoteConfig(remoteConfig);
        await this.cacheConfig();
        this.lastFetchTime = Date.now();
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Remote config fetch failed:', error);
      return false;
    }
  }

  private validateRemoteConfig(config: any): boolean {
    // Basic validation to ensure config structure
    return (
      config &&
      typeof config === 'object' &&
      (config.featureFlags || config.endpoints || config.performanceSettings)
    );
  }

  private mergeRemoteConfig(remoteConfig: any): void {
    if (remoteConfig.featureFlags) {
      this.featureFlags = { ...this.featureFlags, ...remoteConfig.featureFlags };
    }
    
    if (remoteConfig.endpoints) {
      this.endpoints = { ...this.endpoints, ...remoteConfig.endpoints };
    }
    
    if (remoteConfig.performanceSettings) {
      this.performanceSettings = { ...this.performanceSettings, ...remoteConfig.performanceSettings };
    }
  }

  private async loadCachedConfig(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem('app_remote_config');
      if (cached) {
        const config = JSON.parse(cached);
        this.mergeRemoteConfig(config);
      }
    } catch (error) {
      // Ignore cache errors
    }
  }

  private async cacheConfig(): Promise<void> {
    try {
      const config = {
        featureFlags: this.featureFlags,
        endpoints: this.endpoints,
        performanceSettings: this.performanceSettings,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('app_remote_config', JSON.stringify(config));
    } catch (error) {
      // Ignore cache errors
    }
  }

  // ================================================================
  // PUBLIC API
  // ================================================================

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.featureFlags[feature];
  }

  getEndpoint(endpoint: keyof ServiceEndpoints): string | undefined {
    return this.endpoints[endpoint];
  }

  getPerformanceSetting<K extends keyof PerformanceSettings>(
    setting: K
  ): PerformanceSettings[K] {
    return this.performanceSettings[setting];
  }

  getAllFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags };
  }

  getAllEndpoints(): ServiceEndpoints {
    return { ...this.endpoints };
  }

  getAllPerformanceSettings(): PerformanceSettings {
    return { ...this.performanceSettings };
  }

  // Manual overrides (for testing/debugging)
  setFeatureFlag(feature: keyof FeatureFlags, enabled: boolean): void {
    this.featureFlags[feature] = enabled;
    this.cacheConfig();
  }

  setEndpoint(endpoint: keyof ServiceEndpoints, url: string): void {
    this.endpoints[endpoint] = url;
    this.cacheConfig();
  }

  // Force refresh config
  async refreshConfig(): Promise<boolean> {
    this.lastFetchTime = 0;
    return this.fetchRemoteConfig();
  }

  // Reset to defaults
  resetToDefaults(): void {
    this.featureFlags = __DEV__ ? DEVELOPMENT_CONFIG : PRODUCTION_SAFE_CONFIG;
    this.endpoints = { ...DEFAULT_ENDPOINTS };
    this.performanceSettings = { ...DEFAULT_PERFORMANCE_SETTINGS };
    this.cacheConfig();
  }
}

// ================================================================
// SINGLETON INSTANCE & HOOKS
// ================================================================

export const remoteConfig = RemoteConfigManager.getInstance();

// React hooks for easy usage
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return remoteConfig.isFeatureEnabled(feature);
}

export function useEndpoint(endpoint: keyof ServiceEndpoints): string | undefined {
  return remoteConfig.getEndpoint(endpoint);
}

export function usePerformanceSetting<K extends keyof PerformanceSettings>(
  setting: K
): PerformanceSettings[K] {
  return remoteConfig.getPerformanceSetting(setting);
}

// ================================================================
// EXPORTS
// ================================================================

export { RemoteConfigManager };
export type { FeatureFlags, ServiceEndpoints, PerformanceSettings };

// ================================================================
// INITIALIZATION HELPER
// ================================================================

export async function initializeRemoteConfig(configUrl?: string): Promise<void> {
  if (configUrl) {
    await remoteConfig.setConfigUrl(configUrl);
  }
  
  console.log('🚀 Remote config initialized:', {
    analyticsEnabled: remoteConfig.isFeatureEnabled('enableAnalytics'),
    monitoringEnabled: remoteConfig.isFeatureEnabled('enablePerformanceMonitoring'),
    debugMode: remoteConfig.isFeatureEnabled('enableDebugMode'),
    platform: Platform.OS
  });
}