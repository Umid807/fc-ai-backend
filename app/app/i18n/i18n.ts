import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import all language files with error handling
let arb, en, es, fr, gr, jp, ko, tk, zh, zhTw;

try {
  arb = require('./locales/arb.json');
  en = require('./locales/en.json');
  es = require('./locales/es.json');
  fr = require('./locales/fr.json');
  gr = require('./locales/gr.json');
  jp = require('./locales/jp.json');
  ko = require('./locales/ko.json');
  tk = require('./locales/tk.json');
  zh = require('./locales/zh.json');
  zhTw = require('./locales/zh-tw.json');
} catch (error) {
  console.error('Error loading language files:', error);
}

const LANGUAGE_KEY = 'user-language';

// Helper function to safely get translation object
const getTranslations = (langObj) => {
  if (!langObj) return {};
  
  // Handle different JSON structures
  if (langObj.translation) {
    return langObj.translation;
  } else if (typeof langObj === 'object') {
    return langObj;
  }
  return {};
};

// Debug: Log what we're loading
console.log('🌍 Loading languages...');
console.log('Arabic (ar):', !!arb);
console.log('German (de):', !!gr);
console.log('Japanese (ja):', !!jp);
console.log('Chinese Traditional (zh-TW):', !!zhTw);

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: true, // Enable debug mode to see what's happening
    resources: {
      // Use standard ISO language codes
      ar: {
        translation: getTranslations(arb),
      },
      en: {
        translation: getTranslations(en),
      },
      es: {
        translation: getTranslations(es),
      },
      fr: {
        translation: getTranslations(fr),
      },
      de: { // German should be 'de', not 'gr'
        translation: getTranslations(gr),
      },
      ja: { // Japanese should be 'ja', not 'jp'  
        translation: getTranslations(jp),
      },
      ko: {
        translation: getTranslations(ko),
      },
      tr: { // Turkish should be 'tr', not 'tk'
        translation: getTranslations(tk),
      },
      zh: {
        translation: getTranslations(zh),
      },
      'zh-TW': { // Traditional Chinese
        translation: getTranslations(zhTw),
      },
    },
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language on change
i18n.on('languageChanged', async (lng) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  } catch (e) {
    console.log('🔁 Failed to save language to storage', e);
  }
});

// Load stored language on boot
(async () => {
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang && storedLang !== i18n.language) {
      await i18n.changeLanguage(storedLang);
    }
  } catch (e) {
    console.log('🚫 Failed to load language from storage', e);
  }
})();

export default i18n;