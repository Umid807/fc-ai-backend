// hooks/usePostTranslation.ts
import { useState, useCallback, useRef } from 'react';

interface TranslationState {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  isTranslated: boolean;
}

interface TranslationMap {
  [itemId: string]: TranslationState;
}

interface UsePostTranslationResult {
  translateItem: (
    itemId: string,
    originalText: string,
    targetLanguage: string,
    translateFn: (text: string, targetLang: string) => Promise<string>
  ) => Promise<void>;
  getTranslatedText: (itemId: string) => string | null;
  getTranslationState: (itemId: string) => TranslationState | null;
  isTranslating: boolean;
  isItemTranslated: (itemId: string) => boolean;
  getCurrentLanguage: (itemId: string) => string | null;
  clearTranslation: (itemId: string) => void;
  clearAllTranslations: () => void;
}

export const usePostTranslation = (): UsePostTranslationResult => {
  const [translations, setTranslations] = useState<TranslationMap>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const translationCacheRef = useRef<Map<string, TranslationState>>(new Map());

  const generateCacheKey = useCallback((text: string, targetLanguage: string): string => {
    // Create a cache key based on text content and target language
    const textHash = text.substring(0, 100) + text.length;
    return `${textHash}_${targetLanguage}`;
  }, []);

  const translateItem = useCallback(async (
    itemId: string,
    originalText: string,
    targetLanguage: string,
    translateFn: (text: string, targetLang: string) => Promise<string>
  ): Promise<void> => {
    // If already translated to the same language, return early
    const currentState = translations[itemId];
    if (currentState?.targetLanguage === targetLanguage && currentState.isTranslated) {
      return;
    }

    // Check cache first
    const cacheKey = generateCacheKey(originalText, targetLanguage);
    const cachedTranslation = translationCacheRef.current.get(cacheKey);

    if (cachedTranslation) {
      setTranslations(prev => ({
        ...prev,
        [itemId]: {
          ...cachedTranslation,
          originalText,
        },
      }));
      return;
    }

    setIsTranslating(true);

    try {
      const translatedText = await translateFn(originalText, targetLanguage);

      const newTranslationState: TranslationState = {
        originalText,
        translatedText,
        targetLanguage,
        isTranslated: true,
      };

      // Update state
      setTranslations(prev => ({
        ...prev,
        [itemId]: newTranslationState,
      }));

      // Cache the translation
      translationCacheRef.current.set(cacheKey, newTranslationState);

      // Limit cache size to prevent memory issues
      if (translationCacheRef.current.size > 100) {
        const firstKey = translationCacheRef.current.keys().next().value;
        translationCacheRef.current.delete(firstKey);
      }

    } catch (error) {
      console.error('Translation failed:', error);
      // On error, show original text
      setTranslations(prev => ({
        ...prev,
        [itemId]: {
          originalText,
          translatedText: originalText,
          targetLanguage,
          isTranslated: false,
        },
      }));
    } finally {
      setIsTranslating(false);
    }
  }, [translations, generateCacheKey]);

  const getTranslatedText = useCallback((itemId: string): string | null => {
    const state = translations[itemId];
    if (state?.isTranslated) {
      return state.translatedText;
    }
    return null;
  }, [translations]);

  const getTranslationState = useCallback((itemId: string): TranslationState | null => {
    return translations[itemId] || null;
  }, [translations]);

  const isItemTranslated = useCallback((itemId: string): boolean => {
    return translations[itemId]?.isTranslated || false;
  }, [translations]);

  const getCurrentLanguage = useCallback((itemId: string): string | null => {
    return translations[itemId]?.targetLanguage || null;
  }, [translations]);

  const clearTranslation = useCallback((itemId: string): void => {
    setTranslations(prev => {
      const newTranslations = { ...prev };
      delete newTranslations[itemId];
      return newTranslations;
    });
  }, []);

  const clearAllTranslations = useCallback((): void => {
    setTranslations({});
    translationCacheRef.current.clear();
  }, []);

  return {
    translateItem,
    getTranslatedText,
    getTranslationState,
    isTranslating,
    isItemTranslated,
    getCurrentLanguage,
    clearTranslation,
    clearAllTranslations,
  };
};