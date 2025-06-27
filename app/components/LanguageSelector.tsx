// components/LanguageSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LanguageSelectorProps } from '../types/translation';

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  supportedLanguages,
  onLanguageChange,
  style
}) => {
  const popularLanguages = [
    { code: 'EN', name: 'English', flag: '🇺🇸' },
    { code: 'ES', name: 'Español', flag: '🇪🇸' },
    { code: 'PT', name: 'Português', flag: '🇧🇷' },
    { code: 'FR', name: 'Français', flag: '🇫🇷' },
    { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
    { code: 'JA', name: '日本語', flag: '🇯🇵' },
    { code: 'ZH', name: '中文', flag: '🇨🇳' },
  ];

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>🌍 Choose Language</Text>
      <View style={styles.languageGrid}>
        {popularLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageButton,
              currentLanguage === lang.code && styles.activeLanguage
            ]}
            onPress={() => onLanguageChange(lang.code)}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[
              styles.languageName,
              currentLanguage === lang.code && styles.activeLanguageName
            ]}>
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 12,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeLanguage: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
  },
  flag: {
    fontSize: 20,
    marginBottom: 4,
  },
  languageName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  activeLanguageName: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});