// components/forum/TranslationButton.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface TranslationButtonProps {
  onTranslate: (targetLanguage: string) => Promise<void>;
  isTranslating: boolean;
  isTranslated: boolean;
  currentLanguage?: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

// Popular languages for the forum
const POPULAR_LANGUAGES: Language[] = [
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'PT', name: 'Português', flag: '🇵🇹' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'JA', name: '日本語', flag: '🇯🇵' },
  { code: 'KO', name: '한국어', flag: '🇰🇷' },
  { code: 'ZH', name: '中文', flag: '🇨🇳' },
  { code: 'AR', name: 'العربية', flag: '🇸🇦' },
  { code: 'NL', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'SV', name: 'Svenska', flag: '🇸🇪' },
  { code: 'NO', name: 'Norsk', flag: '🇳🇴' },
  { code: 'DA', name: 'Dansk', flag: '🇩🇰' },
  { code: 'FI', name: 'Suomi', flag: '🇫🇮' },
  { code: 'PL', name: 'Polski', flag: '🇵🇱' },
  { code: 'TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'CS', name: 'Čeština', flag: '🇨🇿' },
  { code: 'HU', name: 'Magyar', flag: '🇭🇺' },
];

const TranslationButton: React.FC<TranslationButtonProps> = ({
  onTranslate,
  isTranslating,
  isTranslated,
  currentLanguage,
  style,
  size = 'medium',
  showLabel = true,
}) => {
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const handleOpenSelector = useCallback(() => {
    setShowLanguageSelector(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleCloseSelector = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLanguageSelector(false);
    });
  }, [fadeAnim, scaleAnim]);

  const handleLanguageSelect = useCallback(async (languageCode: string) => {
    handleCloseSelector();
    
    // Small delay for smooth animation
    setTimeout(async () => {
      await onTranslate(languageCode);
    }, 200);
  }, [onTranslate, handleCloseSelector]);

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { padding: 6, iconSize: 14, fontSize: 12 };
      case 'large':
        return { padding: 12, iconSize: 20, fontSize: 16 };
      default:
        return { padding: 8, iconSize: 16, fontSize: 14 };
    }
  };

  const buttonSize = getButtonSize();
  const currentLang = POPULAR_LANGUAGES.find(lang => lang.code === currentLanguage);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.translateButton,
          {
            padding: buttonSize.padding,
            opacity: isTranslating ? 0.7 : 1,
          },
          isTranslated && styles.translateButtonActive,
          style,
        ]}
        onPress={handleOpenSelector}
        disabled={isTranslating}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={isTranslated ? `Translated to ${currentLang?.name}` : 'Translate content'}
      >
        {isTranslating ? (
          <ActivityIndicator size="small" color="#00FFFF" />
        ) : (
          <>
            <Ionicons
              name={isTranslated ? "language" : "language-outline"}
              size={buttonSize.iconSize}
              color={isTranslated ? "#FFD700" : "#00FFFF"}
            />
            {showLabel && (
              <Text style={[
                styles.translateButtonText,
                { fontSize: buttonSize.fontSize },
                isTranslated && styles.translateButtonTextActive,
              ]}>
                {isTranslated ? currentLang?.flag || '🌐' : 'Translate'}
              </Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent
        animationType="none"
        onRequestClose={handleCloseSelector}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseSelector}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent modal close when tapping content
            >
              <LinearGradient
                colors={['#1a1a1a', '#0a0a0a']}
                style={styles.languageSelectorContainer}
              >
                {/* Header */}
                <View style={styles.selectorHeader}>
                  <Text style={styles.selectorTitle}>Select Language</Text>
                  <TouchableOpacity
                    onPress={handleCloseSelector}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={20} color="#999" />
                  </TouchableOpacity>
                </View>

                {/* Languages List */}
                <ScrollView
                  style={styles.languagesList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.languagesContent}
                >
                  {POPULAR_LANGUAGES.map((language) => (
                    <TouchableOpacity
                      key={language.code}
                      style={[
                        styles.languageItem,
                        currentLanguage === language.code && styles.languageItemActive,
                      ]}
                      onPress={() => handleLanguageSelect(language.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.languageFlag}>{language.flag}</Text>
                      <Text style={[
                        styles.languageName,
                        currentLanguage === language.code && styles.languageNameActive,
                      ]}>
                        {language.name}
                      </Text>
                      {currentLanguage === language.code && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#00FFFF"
                          style={styles.checkIcon}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Footer Note */}
                <Text style={styles.selectorFooter}>
                  Translation powered by DeepL • Cached for efficiency
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  translateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  translateButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  translateButtonText: {
    color: '#00FFFF',
    fontWeight: '600',
  },
  translateButtonTextActive: {
    color: '#FFD700',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  languageSelectorContainer: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    overflow: 'hidden',
  },

  // Header
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  selectorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },

  // Languages List
  languagesList: {
    maxHeight: 300,
  },
  languagesContent: {
    padding: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageItemActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  languageNameActive: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  checkIcon: {
    marginLeft: 8,
  },

  // Footer
  selectorFooter: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.1)',
  },
});

export default TranslationButton;