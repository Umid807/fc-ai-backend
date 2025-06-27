// config/constants.ts

// 🚨 REPLACE THIS WITH YOUR ACTUAL DEEPL API KEY
export const DEEPL_API_KEY = '7c65bc21-33f5-451d-a649-be56eccbcd5b:fx';

// For production, you might want to use environment variables:
// export const DEEPL_API_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY || 'your-fallback-key';

// Language configurations
export const DEFAULT_LANGUAGE = 'EN';

export const SUPPORTED_LANGUAGES = [
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'PT', name: 'Português', flag: '🇧🇷' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'JA', name: '日本語', flag: '🇯🇵' },
  { code: 'ZH', name: '中文', flag: '🇨🇳' },
];

// Translation settings
export const TRANSLATION_CONFIG = {
  cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  preserveFormatting: true,
  formality: 'default' as const,
  baseUrl: 'https://api-free.deepl.com/v2/translate',
  languagesUrl: 'https://api-free.deepl.com/v2/languages',
};

// ProVision FC specific constants
export const FC_CONFIG = {
  defaultCurrency: 'FC Coins',
  raffleTicketCost: 1000,
  vipBonusCoins: 5000,
  drawDay: 'Friday',
  drawTime: '6:00 PM (UTC)',
};