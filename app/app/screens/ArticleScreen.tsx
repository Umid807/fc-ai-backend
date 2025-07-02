```
// REWRITTEN FILE: app/app/screens/ArticleScreen.tsx
// TOTAL_LOGS_INSERTED: 32
// COMPONENT_NAME: ArticleScreen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageSelector } from '../../components/LanguageSelector';
import { DEEPL_API_KEY } from '../../config/constants';

interface Article {
  id?: string;
  title: string;
  author: string;
  date: any; // Firestore timestamp or string
  content: string;
  image_url?: string;
  category?: string;
  readTime?: number;
}

interface TranslatedArticle {
  title: string;
  content: string;
  author: string;
}

const { width: screenWidth } = Dimensions.get('window');

export default function ArticleScreen() {
  console.log("ArticleScreen: Component mounted.");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  console.log("ArticleScreen: State 'showLanguageSelector' initialized to false.");
  const [translatedArticle, setTranslatedArticle] = useState<TranslatedArticle>({
    title: '',
    content: '',
    author: '',
  });
  console.log("ArticleScreen: State 'translatedArticle' initialized.");
  const [imageError, setImageError] = useState(false);
  console.log("ArticleScreen: State 'imageError' initialized to false.");

  const route = useRoute();
  const navigation = useNavigation();
  console.log("ArticleScreen: Route and Navigation hooks initialized.");
  
  const {
    translate,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  } = useTranslation(DEEPL_API_KEY);
  console.log(`ArticleScreen: useTranslation hook initialized. Current Language: ${currentLanguage}, Is Translating: ${isTranslating}`);

  // Parse article data from route params
  const getArticleData = (): Article => {
    console.log("ArticleScreen: Attempting to parse article data from route params.");
    const { article } = route.params || {};
    
    if (!article) {
      console.log("ArticleScreen: Article data not found in route params. Returning default 'Article Not Found' data.");
      return {
        title: 'Article Not Found',
        author: 'Unknown',
        date: new Date(),
        content: 'The requested article could not be loaded. Please try again.',
      };
    }

    let articleObj = article;
    if (typeof article === 'string') {
      console.log("ArticleScreen: Article data is a string, attempting JSON parse.");
      try {
        articleObj = JSON.parse(article);
        console.log("ArticleScreen: Article string parsed successfully.");
      } catch (error) {
        console.error('ArticleScreen: Failed to parse article string:', error);
        console.log("ArticleScreen: Returning 'Invalid Article Data' due to parsing error.");
        return {
          title: 'Invalid Article Data',
          author: 'System',
          date: new Date(),
          content: 'Article data is corrupted. Please contact support.',
        };
      }
    }
    console.log("ArticleScreen: Article data retrieved and formatted.");
    return {
      title: articleObj?.title || 'Untitled Article',
      author: articleObj?.author || 'Anonymous',
      date: articleObj?.date || new Date(),
      content: articleObj?.content || 'No content available.',
      image_url: articleObj?.image_url,
      category: articleObj?.category || 'General',
      readTime: articleObj?.readTime || estimateReadTime(articleObj?.content || ''),
    };
  };

  const article = getArticleData();
  console.log(`ArticleScreen: Article loaded with title: ${article.title}, Author: ${article.author}`);

  // Estimate reading time (average 200 words per minute)
  function estimateReadTime(content: string): number {
    console.log("ArticleScreen: Estimating read time.");
    const words = content.split(' ').length;
    const readTime = Math.ceil(words / 200);
    console.log(`ArticleScreen: Read time estimated: ${readTime} minutes.`);
    return readTime;
  }

  // Format Firestore timestamp to readable date
  function formatTimestamp(timestamp: any): string {
    console.log("ArticleScreen: Formatting timestamp.");
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      const dateObj = new Date(timestamp.seconds * 1000);
      console.log("ArticleScreen: Timestamp formatted from seconds.");
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (timestamp instanceof Date) {
      console.log("ArticleScreen: Timestamp formatted from Date object.");
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        console.log("ArticleScreen: Timestamp formatted from string.");
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
    console.log("ArticleScreen: Timestamp format not recognized. Returning 'Date not available'.");
    return 'Date not available';
  }

  // Handle language change and translation
  const handleLanguageChange = async (language: string) => {
    console.log(`ArticleScreen: Language change initiated to: ${language}`);
    setCurrentLanguage(language);
    console.log(`ArticleScreen: State 'currentLanguage' updated to: ${language}`);
    setShowLanguageSelector(false);
    console.log("ArticleScreen: State 'showLanguageSelector' set to false (selector closed).");
    
    if (language === 'EN') {
      console.log("ArticleScreen: Selected language is English. Resetting translated article to original.");
      // Reset to original content
      setTranslatedArticle({
        title: '',
        content: '',
        author: '',
      });
      console.log("ArticleScreen: 'translatedArticle' state reset.");
      return;
    }

    try {
      console.log(`ArticleScreen: Starting translation for title and content to ${language}.`);
      // Translate article content
      const [translatedTitle, translatedContent] = await Promise.all([
        translate(article.title, language),
        translate(article.content, language),
      ]);

      setTranslatedArticle({
        title: translatedTitle,
        content: translatedContent,
        author: article.author, // Keep author name as-is
      });
      console.log("ArticleScreen: Translation successful. State 'translatedArticle' updated.");
    } catch (error) {
      console.error('ArticleScreen: Translation failed:', error);
      Alert.alert(
        'Translation Error',
        'Failed to translate article. Please check your internet connection and try again.'
      );
      console.log("ArticleScreen: Translation error alert displayed.");
      // Reset to original content on error
      setTranslatedArticle({
        title: '',
        content: '',
        author: '',
      });
      console.log("ArticleScreen: 'translatedArticle' state reset due to translation error.");
    }
  };

  // Get current content based on language
  const getCurrentContent = () => {
    console.log("ArticleScreen: Getting current content based on language.");
    const isEnglish = currentLanguage === 'EN';
    if (isEnglish) {
      console.log("ArticleScreen: Current language is English, returning original content.");
    } else {
      console.log(`ArticleScreen: Current language is ${currentLanguage}, returning translated content if available.`);
    }
    return {
      title: isEnglish ? article.title : (translatedArticle.title || article.title),
      content: isEnglish ? article.content : (translatedArticle.content || article.content),
      author: article.author, // Author names typically don't get translated
    };
  };

  const currentContent = getCurrentContent();
  const formattedDate = formatTimestamp(article.date);

  // Handle image loading error
  const handleImageError = () => {
    setImageError(true);
    console.log("ArticleScreen: Image loading error occurred. State 'imageError' set to true.");
  };

  // Get image source with fallback
  const getImageSource = () => {
    console.log("ArticleScreen: Getting image source.");
    if (imageError || !article.image_url) {
      console.log("ArticleScreen: Image error or no image URL. Returning default fallback image.");
      return require('../../assets/images/bk.png');
    }
    console.log(`ArticleScreen: Returning image from URL: ${article.image_url}`);
    return { uri: article.image_url };
  };

  return (
    <View style={styles.container}>
      {/* Background Image */}
      <Image 
        source={require('../../assets/images/bk.png')} 
        style={styles.backgroundImage} 
      />
      
      {/* Header with Back Button and Language Toggle */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            navigation.goBack();
            console.log("ArticleScreen: Back button pressed. Navigating back.");
          }}
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.languageToggle}
          onPress={() => {
            setShowLanguageSelector(!showLanguageSelector);
            console.log(`ArticleScreen: Language toggle pressed. Language selector visibility toggled to: ${!showLanguageSelector}`);
          }}
        >
          <Text style={styles.languageToggleText}>🌐 {currentLanguage}</Text>
        </TouchableOpacity>
      </View>

      {/* Language Selector */}
      {showLanguageSelector && (
        <View style={styles.languageSelectorContainer}>
          <LanguageSelector
              currentLanguage={currentLanguage}
              supportedLanguages={supportedLanguages}
              onLanguageChange={handleLanguageChange}
              style={styles.languageSelectorStyle}
          />
          {console.log("ArticleScreen: Language selector displayed.")}
        </View>
      )}
      {!showLanguageSelector && console.log("ArticleScreen: Language selector hidden.")}

      {/* Translation Loading Indicator */}
      {isTranslating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.loadingText}>Translating article...</Text>
        </View>
      )}
      {isTranslating && console.log("ArticleScreen: Translation loading indicator displayed.")}
      {!isTranslating && console.log("ArticleScreen: Translation loading indicator hidden.")}

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)']}
          style={styles.contentContainer}
        >
          {/* Article Metadata */}
          <View style={styles.metaContainer}>
            {article.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{article.category}</Text>
              </View>
            )}
            {article.category && console.log(`ArticleScreen: Category badge displayed for: ${article.category}`)}
            {!article.category && console.log("ArticleScreen: No category badge displayed.")}
            <Text style={styles.readTime}>{article.readTime} min read</Text>
            {console.log(`ArticleScreen: Read time displayed: ${article.readTime} min.`)}
          </View>

          {/* Article Title */}
          <Text style={styles.title}>{currentContent.title}</Text>
          {console.log(`ArticleScreen: Article title displayed: ${currentContent.title}`)}

          {/* Author and Date */}
          <View style={styles.authorContainer}>
            <Text style={styles.author}>By {currentContent.author}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
            {console.log(`ArticleScreen: Author and date displayed: By ${currentContent.author}, on ${formattedDate}`)}
          </View>

          {/* Article Image */}
          <View style={styles.imageContainer}>
            <Image 
              source={getImageSource()}
              style={styles.articleImage}
              onError={handleImageError}
              defaultSource={require('../../assets/images/bk.png')}
            />
            {console.log("ArticleScreen: Article image displayed.")}
          </View>

          {/* Article Content */}
          <View style={styles.contentWrapper}>
            <Text style={styles.content}>{currentContent.content}</Text>
            {console.log("ArticleScreen: Article content displayed.")}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Translated by ProVision FC © Powered by DeepL
            </Text>
            {console.log("ArticleScreen: Footer displayed.")}
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  languageToggle: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  languageToggleText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: 100,
    right: 20,
    zIndex: 20,
    maxWidth: screenWidth * 0.8,
  },
  languageSelectorStyle: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  loadingText: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    margin: 15,
    borderRadius: 15,
    padding: 20,
    minHeight: '100%',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  categoryText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  readTime: {
    color: '#ddd',
    fontSize: 12,
    fontStyle: 'italic',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    lineHeight: 34,
  },
  authorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  author: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#ddd',
  },
  imageContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  articleImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  contentWrapper: {
    marginBottom: 30,
  },
  content: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
    textAlign: 'justify',
  },
  footer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
  },
});