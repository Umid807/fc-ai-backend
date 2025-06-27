// config/LoggingConfig.ts - Control console spam in production
import { Platform } from 'react-native';

// ================================================================
// LOGGING LEVELS & CONFIGURATION
// ================================================================

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  VERBOSE = 5
}

interface LoggingConfig {
  // Global log level
  globalLevel: LogLevel;
  
  // Per-category levels
  analytics: LogLevel;
  performance: LogLevel;
  network: LogLevel;
  ui: LogLevel;
  errors: LogLevel;
  
  // Sampling rates (0.0 to 1.0)
  performanceSampleRate: number;
  analyticsSampleRate: number;
  networkSampleRate: number;
  
  // Rate limiting
  enableRateLimit: boolean;
  maxLogsPerSecond: number;
  
  // Console formatting
  enableColors: boolean;
  enableTimestamps: boolean;
  enableCategoryIcons: boolean;
}

// Production-optimized config (minimal logging)
const PRODUCTION_CONFIG: LoggingConfig = {
  globalLevel: LogLevel.ERROR, // Only errors in production
  analytics: LogLevel.NONE,    // No analytics logs
  performance: LogLevel.NONE,  // No performance logs
  network: LogLevel.ERROR,     // Only network errors
  ui: LogLevel.NONE,          // No UI logs
  errors: LogLevel.ERROR,      // All errors
  performanceSampleRate: 0.01, // 1% sampling
  analyticsSampleRate: 0.01,   // 1% sampling
  networkSampleRate: 0.1,      // 10% sampling
  enableRateLimit: true,
  maxLogsPerSecond: 5,         // Max 5 logs per second
  enableColors: false,
  enableTimestamps: false,
  enableCategoryIcons: false
};

// Development config (verbose logging)
const DEVELOPMENT_CONFIG: LoggingConfig = {
  globalLevel: LogLevel.DEBUG,
  analytics: LogLevel.INFO,
  performance: LogLevel.INFO,
  network: LogLevel.DEBUG,
  ui: LogLevel.INFO,
  errors: LogLevel.ERROR,
  performanceSampleRate: 1.0,  // 100% in dev
  analyticsSampleRate: 1.0,    // 100% in dev
  networkSampleRate: 1.0,      // 100% in dev
  enableRateLimit: false,      // No rate limiting in dev
  maxLogsPerSecond: 1000,
  enableColors: true,
  enableTimestamps: true,
  enableCategoryIcons: true
};

// ================================================================
// SMART LOGGER CLASS
// ================================================================

class SmartLogger {
  private config: LoggingConfig;
  private logCounts: Map<string, number> = new Map();
  private lastResetTime = Date.now();
  private rateLimitWindow = 1000; // 1 second

  constructor() {
    this.config = __DEV__ ? DEVELOPMENT_CONFIG : PRODUCTION_CONFIG;
    this.setupPeriodicReset();
  }

  private setupPeriodicReset(): void {
    setInterval(() => {
      this.logCounts.clear();
      this.lastResetTime = Date.now();
    }, this.rateLimitWindow);
  }

  private shouldLog(category: keyof LoggingConfig, level: LogLevel, sampleRate?: number): boolean {
    // Check global level
    if (level > this.config.globalLevel) return false;
    
    // Check category level
    const categoryLevel = this.config[category] as LogLevel;
    if (level > categoryLevel) return false;
    
    // Apply sampling
    const rate = sampleRate || 1.0;
    if (Math.random() > rate) return false;
    
    // Rate limiting
    if (this.config.enableRateLimit) {
      const key = `${category}_${level}`;
      const count = this.logCounts.get(key) || 0;
      
      if (count >= this.config.maxLogsPerSecond) {
        return false;
      }
      
      this.logCounts.set(key, count + 1);
    }
    
    return true;
  }

  private formatMessage(category: string, message: string, data?: any): string {
    let formatted = message;
    
    if (this.config.enableCategoryIcons) {
      const icons: Record<string, string> = {
        analytics: '📊',
        performance: '⚡',
        network: '🌐',
        ui: '🎨',
        errors: '🚨'
      };
      formatted = `${icons[category] || '📝'} ${formatted}`;
    }
    
    if (this.config.enableTimestamps) {
      formatted = `[${new Date().toISOString()}] ${formatted}`;
    }
    
    return formatted;
  }

  // ================================================================
  // PUBLIC API
  // ================================================================

  analytics(message: string, data?: any): void {
    if (!this.shouldLog('analytics', LogLevel.INFO, this.config.analyticsSampleRate)) return;
    
    const formatted = this.formatMessage('analytics', message, data);
    console.log(formatted, data || '');
  }

  performance(message: string, data?: any): void {
    if (!this.shouldLog('performance', LogLevel.INFO, this.config.performanceSampleRate)) return;
    
    const formatted = this.formatMessage('performance', message, data);
    console.log(formatted, data || '');
  }

  network(message: string, data?: any, level: LogLevel = LogLevel.INFO): void {
    if (!this.shouldLog('network', level, this.config.networkSampleRate)) return;
    
    const formatted = this.formatMessage('network', message, data);
    const logFn = level === LogLevel.ERROR ? console.error : 
                  level === LogLevel.WARN ? console.warn : console.log;
    logFn(formatted, data || '');
  }

  ui(message: string, data?: any): void {
    if (!this.shouldLog('ui', LogLevel.INFO)) return;
    
    const formatted = this.formatMessage('ui', message, data);
    console.log(formatted, data || '');
  }

  error(message: string, data?: any): void {
    if (!this.shouldLog('errors', LogLevel.ERROR)) return;
    
    const formatted = this.formatMessage('errors', message, data);
    console.error(formatted, data || '');
  }

  warn(message: string, data?: any): void {
    if (!this.shouldLog('errors', LogLevel.WARN)) return;
    
    const formatted = this.formatMessage('errors', message, data);
    console.warn(formatted, data || '');
  }

  info(message: string, data?: any): void {
    if (!this.shouldLog('errors', LogLevel.INFO)) return;
    
    const formatted = this.formatMessage('errors', message, data);
    console.info(formatted, data || '');
  }

  debug(message: string, data?: any): void {
    if (!this.shouldLog('errors', LogLevel.DEBUG)) return;
    
    const formatted = this.formatMessage('errors', message, data);
    console.log(formatted, data || '');
  }

  // ================================================================
  // CONFIGURATION METHODS
  // ================================================================

  setGlobalLogLevel(level: LogLevel): void {
    this.config.globalLevel = level;
  }

  setCategoryLevel(category: keyof LoggingConfig, level: LogLevel): void {
    (this.config[category] as LogLevel) = level;
  }

  enableProductionMode(): void {
    this.config = { ...PRODUCTION_CONFIG };
    console.log('🔇 Production logging mode enabled - minimal console output');
  }

  enableDevelopmentMode(): void {
    this.config = { ...DEVELOPMENT_CONFIG };
    console.log('🔊 Development logging mode enabled - verbose console output');
  }

  getStats(): {
    totalLogs: number;
    logsByCategory: Record<string, number>;
    config: LoggingConfig;
  } {
    const logsByCategory: Record<string, number> = {};
    let totalLogs = 0;
    
    for (const [key, count] of this.logCounts.entries()) {
      logsByCategory[key] = count;
      totalLogs += count;
    }
    
    return {
      totalLogs,
      logsByCategory,
      config: { ...this.config }
    };
  }
}

// ================================================================
// SINGLETON INSTANCE
// ================================================================

export const smartLogger = new SmartLogger();

// ================================================================
// CONVENIENCE FUNCTIONS
// ================================================================

export const log = {
  analytics: (message: string, data?: any) => smartLogger.analytics(message, data),
  performance: (message: string, data?: any) => smartLogger.performance(message, data),
  network: (message: string, data?: any, level?: LogLevel) => smartLogger.network(message, data, level),
  ui: (message: string, data?: any) => smartLogger.ui(message, data),
  error: (message: string, data?: any) => smartLogger.error(message, data),
  warn: (message: string, data?: any) => smartLogger.warn(message, data),
  info: (message: string, data?: any) => smartLogger.info(message, data),
  debug: (message: string, data?: any) => smartLogger.debug(message, data)
};

// ================================================================
// MONITORING INTEGRATION
// ================================================================

export function updateMonitoringLogging() {
  // Override the original console methods in monitoring services
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  // Intercept analytics logs
  console.log = (...args) => {
    const message = args[0]?.toString() || '';
    
    if (message.includes('📊 Analytics:')) {
      smartLogger.analytics(message.replace('📊 Analytics: ', ''), args[1]);
      return;
    }
    
    if (message.includes('⚡ Performance:')) {
      smartLogger.performance(message.replace('⚡ Performance: ', ''), args[1]);
      return;
    }
    
    if (message.includes('🌐 Network:')) {
      smartLogger.network(message.replace('🌐 Network: ', ''), args[1]);
      return;
    }
    
    // Default console.log behavior
    originalLog.apply(console, args);
  };

  // Intercept error logs
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    if (message.includes('🚨 ERROR:')) {
      smartLogger.error(message.replace('🚨 ERROR: ', ''), args[1]);
      return;
    }
    
    // Default console.error behavior
    originalError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    
    if (message.includes('Warning:')) {
      smartLogger.warn(message, args[1]);
      return;
    }
    
    // Default console.warn behavior
    originalWarn.apply(console, args);
  };
}

// ================================================================
// EXPORTS
// ================================================================

export { SmartLogger, LogLevel };
export default smartLogger;