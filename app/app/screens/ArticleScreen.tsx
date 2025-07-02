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
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [translatedArticle, setTranslatedArticle] = useState<TranslatedArticle>({
    title: '',
    content: '',
    author: '',
  });
  const [imageError, setImageError] = useState(false);

  const route = useRoute();
  const navigation = useNavigation();
  
  const {
    translate,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  } = useTranslation(DEEPL_API_KEY);

  // Parse article data from route params
  const getArticleData = (): Article => {
    const { article } = route.params || {};
    
    if (!article) {
      return {
        title: 'Article Not Found',
        author: 'Unknown',
        date: new Date(),
        content: 'The requested article could not be loaded. Please try again.',
      };
    }

    let articleObj = article;
    if (typeof article === 'string') {
      try {
        articleObj = JSON.parse(article);
      } catch (error) {
        console.error('Failed to parse article string:', error);
        return {
          title: 'Invalid Article Data',
          author: 'System',
          date: new Date(),
          content: 'Article data is corrupted. Please contact support.',
        };
      }
    }

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

  // Estimate reading time (average 200 words per minute)
  function estimateReadTime(content: string): number {
    const words = content.split(' ').length;
    return Math.ceil(words / 200);
  }

  // Format Firestore timestamp to readable date
  function formatTimestamp(timestamp: any): string {
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      const dateObj = new Date(timestamp.seconds * 1000);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }
    return 'Date not available';
  }

  // Handle language change and translation
  const handleLanguageChange = async (language: string) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);
    
    if (language === 'EN') {
      // Reset to original content
      setTranslatedArticle({
        title: '',
        content: '',
        author: '',
      });
      return;
    }

    try {
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
    } catch (error) {
      console.error('Translation failed:', error);
      Alert.alert(
        'Translation Error',
        'Failed to translate article. Please check your internet connection and try again.'
      );
      // Reset to original content on error
      setTranslatedArticle({
        title: '',
        content: '',
        author: '',
      });
    }
  };

  // Get current content based on language
  const getCurrentContent = () => {
    const isEnglish = currentLanguage === 'EN';
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
  };

  // Get image source with fallback
  const getImageSource = () => {
    if (imageError || !article.image_url) {
      return require('../../assets/images/bk.png');
    }
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
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.languageToggle}
          onPress={() => setShowLanguageSelector(!showLanguageSelector)}
        >
          <Text style={styles.languageToggleText}>🌍 {currentLanguage}</Text>
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
        </View>
      )}

      {/* Translation Loading Indicator */}
      {isTranslating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#FFD700" />
          <Text style={styles.loadingText}>Translating article...</Text>
        </View>
      )}

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
            <Text style={styles.readTime}>{article.readTime} min read</Text>
          </View>

          {/* Article Title */}
          <Text style={styles.title}>{currentContent.title}</Text>

          {/* Author and Date */}
          <View style={styles.authorContainer}>
            <Text style={styles.author}>By {currentContent.author}</Text>
            <Text style={styles.date}>{formattedDate}</Text>
          </View>

          {/* Article Image */}
          <View style={styles.imageContainer}>
            <Image 
              source={getImageSource()}
              style={styles.articleImage}
              onError={handleImageError}
              defaultSource={require('../../assets/images/bk.png')}
            />
          </View>

          {/* Article Content */}
          <View style={styles.contentWrapper}>
            <Text style={styles.content}>{currentContent.content}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Translated by ProVision FC • Powered by DeepL
            </Text>
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