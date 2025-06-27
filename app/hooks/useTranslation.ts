// hooks/useTranslation.ts
import { useState, useEffect, useCallback } from 'react';
import { DeepLTranslationService } from '../services/DeepLTranslationService';
import { UseTranslationResult } from '../types/translation';

export const useTranslation = (apiKey: string): UseTranslationResult => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('EN');
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [translationService] = useState(() => DeepLTranslationService.getInstance(apiKey));

  useEffect(() => {
    const loadSupportedLanguages = async () => {
      const languages = await translationService.getSupportedLanguages();
      setSupportedLanguages(languages);
    };
    loadSupportedLanguages();
  }, [translationService]);

  const translate = useCallback(async (text: string, targetLang: string): Promise<string> => {
    if (targetLang === 'EN') return text; // No translation needed
    
    setIsTranslating(true);
    try {
      const result = await translationService.translateText(text, targetLang);
      return result;
    } finally {
      setIsTranslating(false);
    }
  }, [translationService]);

  const translateMultiple = useCallback(async (texts: string[], targetLang: string): Promise<string[]> => {
    if (targetLang === 'EN') return texts; // No translation needed
    
    setIsTranslating(true);
    try {
      const results = await translationService.translateMultiple(texts, targetLang);
      return results;
    } finally {
      setIsTranslating(false);
    }
  }, [translationService]);

  return {
    translate,
    translateMultiple,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  };
};