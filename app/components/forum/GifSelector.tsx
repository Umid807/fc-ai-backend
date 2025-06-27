import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Security utilities
import { validateSearchQuery, sanitizeURL, secureLog } from '../../utils/security';

// Types
interface GifItem {
  id: string;
  images: {
    fixed_height?: { url: string };
    original?: { url: string };
    preview_gif?: { url: string };
  };
  title?: string;
}

interface GifSelectorProps {
  visible: boolean;
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Constants
const GIPHY_API_KEY = 'CiJb7SohSkMLgj3pRd25f0yPXyk1pqbf';
const SEARCH_DEBOUNCE_MS = 500;
const MAX_GIFS_PER_LOAD = 20;
const GIF_COLUMNS = 2;

const GifSelector: React.FC<GifSelectorProps> = ({
  visible,
  onSelect,
  onClose,
}) => {
  const { t } = useTranslation();
  
  // Refs for cleanup and debouncing
  const isMountedRef = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [gifList, setGifList] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Network error handling
  const handleNetworkError = useCallback((error: any, context: string) => {
    console.error(`GIF API error (${context}):`, error);
    secureLog('GIF API error', { 
      context, 
      error: error.message,
      timestamp: Date.now() 
    });
    
    let userMessage = t('gifSelector.networkError');
    if (error.code === 'ECONNABORTED') {
      userMessage = t('gifSelector.timeoutError');
    } else if (error.response?.status === 429) {
      userMessage = t('gifSelector.rateLimitError');
    } else if (error.response?.status >= 500) {
      userMessage = t('gifSelector.serverError');
    }
    
    setError(userMessage);
  }, [t]);
  
  // Fetch trending GIFs
  const fetchTrendingGifs = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await axios.get('https://api.giphy.com/v1/gifs/trending', {
        params: {
          api_key: GIPHY_API_KEY,
          limit: MAX_GIFS_PER_LOAD,
          rating: 'pg-13', // Keep content appropriate
        },
        timeout: 10000,
        signal: abortControllerRef.current.signal,
      });
      
      if (!isMountedRef.current) return;
      
      const gifs = response.data.data || [];
      setGifList(gifs);
      setHasSearched(false);
      
      secureLog('Trending GIFs fetched', { 
        count: gifs.length,
        timestamp: Date.now() 
      });
      
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error.name === 'CanceledError') return; // Ignore aborted requests
      
      handleNetworkError(error, 'trending');
      setGifList([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [handleNetworkError]);
  
  // Search for GIFs
  const searchGifs = useCallback(async (query: string) => {
    if (!isMountedRef.current) return;
    
    // Validate search query
    const validation = validateSearchQuery(query.trim());
    if (!validation.isValid) {
      secureLog('Invalid search query', { 
        errors: validation.errors,
        query: query.substring(0, 50) // Log truncated query
      });
      setError(validation.errors[0] || t('gifSelector.invalidQuery'));
      return;
    }
    
    const sanitizedQuery = validation.sanitizedContent;
    
    if (sanitizedQuery === '') {
      fetchTrendingGifs();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: GIPHY_API_KEY,
          q: sanitizedQuery,
          limit: MAX_GIFS_PER_LOAD,
          rating: 'pg-13',
          lang: 'en',
        },
        timeout: 10000,
        signal: abortControllerRef.current.signal,
      });
      
      if (!isMountedRef.current) return;
      
      const gifs = response.data.data || [];
      setGifList(gifs);
      setHasSearched(true);
      
      secureLog('GIF search completed', { 
        query: sanitizedQuery,
        resultCount: gifs.length,
        timestamp: Date.now() 
      });
      
    } catch (error) {
      if (!isMountedRef.current) return;
      if (error.name === 'CanceledError') return; // Ignore aborted requests
      
      handleNetworkError(error, 'search');
      setGifList([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchTrendingGifs, handleNetworkError, t]);
  
  // Debounced search handler
  const handleSearchInput = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(query);
    }, SEARCH_DEBOUNCE_MS);
  }, [searchGifs]);
  
  // Manual search trigger
  const handleSearchSubmit = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    searchGifs(searchQuery);
  }, [searchGifs, searchQuery]);
  
  // GIF selection handler
  const handleGifSelect = useCallback((gif: GifItem) => {
    const gifUrl = gif.images?.fixed_height?.url || 
                   gif.images?.original?.url ||
                   gif.images?.preview_gif?.url;
    
    if (!gifUrl) {
      console.warn('⚠️ GIF missing valid URL', gif);
      secureLog('Invalid GIF selected', { gifId: gif.id });
      Alert.alert(t('gifSelector.errorTitle'), t('gifSelector.invalidGif'));
      return;
    }
    
    // Sanitize URL before selection
    const sanitizedUrl = sanitizeURL(gifUrl);
    if (!sanitizedUrl) {
      secureLog('Unsafe GIF URL blocked', { gifId: gif.id });
      Alert.alert(t('gifSelector.errorTitle'), t('gifSelector.unsafeGif'));
      return;
    }
    
    secureLog('GIF selected', { 
      gifId: gif.id,
      title: gif.title?.substring(0, 50),
      timestamp: Date.now() 
    });
    
    onSelect(sanitizedUrl);
  }, [onSelect, t]);
  
  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setError(null);
    fetchTrendingGifs();
  }, [fetchTrendingGifs]);
  
  // Modal lifecycle effects
  useEffect(() => {
    if (visible) {
      isMountedRef.current = true;
      setSearchQuery('');
      setError(null);
      fetchTrendingGifs();
    } else {
      cleanup();
    }
    
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [visible, fetchTrendingGifs, cleanup]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);
  
  // Memoized values
  const screenWidth = useMemo(() => Dimensions.get('window').width, []);
  const gifItemWidth = useMemo(() => 
    (screenWidth * 0.9 - 32 - 16) / GIF_COLUMNS, [screenWidth]
  );
  
  const emptyStateMessage = useMemo(() => {
    if (hasSearched) {
      return searchQuery.trim() 
        ? t('gifSelector.noResults', { query: searchQuery.trim() })
        : t('gifSelector.noTrendingGifs');
    }
    return t('gifSelector.loadingTrending');
  }, [hasSearched, searchQuery, t]);
  
  // Render GIF item
  const renderGifItem = useCallback(({ item }: { item: GifItem }) => {
    const gifUrl = item.images?.fixed_height?.url || 
                   item.images?.original?.url ||
                   item.images?.preview_gif?.url;
    
    if (!gifUrl) {
      return null; // Skip invalid GIFs
    }
    
    return (
      <TouchableOpacity
        style={[styles.gifItem, { width: gifItemWidth }]}
        onPress={() => handleGifSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={t('gifSelector.selectGif', { title: item.title || 'GIF' })}
      >
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
          style={styles.gifItemGradient}
        >
          <ExpoImage 
            source={{ uri: gifUrl }} 
            style={styles.gifImage}
            contentFit="cover"
            shouldAnimate
            placeholder="🎬"
            transition={200}
          />
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [gifItemWidth, handleGifSelect, t]);
  
  // Render empty state
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={error ? "alert-circle" : "film"} 
        size={48} 
        color={error ? "#FF6347" : "#00FFFF"} 
      />
      <Text style={[styles.emptyText, error && styles.errorText]}>
        {error || emptyStateMessage}
      </Text>
      {error && (
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => searchQuery.trim() ? handleSearchSubmit() : fetchTrendingGifs()}
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [error, emptyStateMessage, searchQuery, handleSearchSubmit, fetchTrendingGifs, t]);
  
  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={['rgba(0, 20, 30, 0.95)', 'rgba(0, 10, 20, 0.98)']}
          style={styles.modalContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('gifSelector.title')}</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.05)']}
              style={styles.searchInputContainer}
            >
              <Ionicons name="search" size={20} color="#00FFFF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('gifSelector.searchPlaceholder')}
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={handleSearchInput}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                maxLength={100}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              )}
            </LinearGradient>
            
            <TouchableOpacity 
              style={styles.searchButton} 
              onPress={handleSearchSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('gifSelector.searchButton')}
            >
              <LinearGradient
                colors={['#00FFFF', '#0080FF']}
                style={styles.searchButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#121212" />
                ) : (
                  <Text style={styles.searchButtonText}>{t('gifSelector.searchButton')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Results */}
          <View style={styles.resultsContainer}>
            {loading && gifList.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00FFFF" />
                <Text style={styles.loadingText}>{t('gifSelector.loading')}</Text>
              </View>
            ) : (
              <FlatList
                data={gifList}
                renderItem={renderGifItem}
                keyExtractor={(item) => item.id}
                numColumns={GIF_COLUMNS}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gifList}
                columnWrapperStyle={styles.gifRow}
                ListEmptyComponent={renderEmptyState}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={10}
                removeClippedSubviews={true}
              />
            )}
          </View>
          
          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

export default GifSelector;

/* ----------------- STYLES ----------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#00FFFF33',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00FFFF22',
  },
  headerTitle: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: '#FFD70066',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FFFF44',
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#00FFFF',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  searchButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultsContainer: {
    flex: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00FFFF',
    fontSize: 16,
    marginTop: 12,
  },
  gifList: {
    paddingVertical: 8,
  },
  gifRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gifItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifItemGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#00FFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 20,
  },
  errorText: {
    color: '#FF6347',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  retryButtonText: {
    color: '#FF6347',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#00FFFF22',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00FFFF66',
  },
  cancelButtonText: {
    color: '#00FFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});