import React, { useState, useCallback, useRef, useMemo, useEffect, useReducer } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Vibration,
  Dimensions,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  InteractionManager,
  AppState,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Security utilities
import { validatePostContent } from '../../utils/security';

// Types
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline' | 'gradient';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
}

interface ImageData {
  id: string;
  uri: string;
  originalUri?: string;
  caption?: string;
  category?: 'squad' | 'gameplay' | 'stats' | 'achievements' | 'general';
  uploadedAt: string;
  size: { width: number; height: number };
  fileSize: number;
  format: 'JPEG' | 'PNG' | 'WEBP';
  compressionLevel: number;
  hash?: string;
  metadata?: {
    hasTransparency: boolean;
    colorDepth: number;
    aspectRatio: number;
  };
}

interface GalleryConfig {
  layout: 'horizontal' | 'grid' | 'showcase' | 'story';
  maxImages: number;
  allowCaptions: boolean;
  category?: 'squad' | 'gameplay' | 'stats' | 'achievements' | 'general';
  spacing: 'tight' | 'normal' | 'loose';
  compressionQuality: 'low' | 'medium' | 'high' | 'lossless';
}

interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: TextStyle;
  config: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: string;
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  images?: ImageData[];
  galleryConfig?: GalleryConfig;
}

interface ImageSectionEditorProps {
  section: TemplateSection;
  onContentChange: (content: string) => void;
  onStyleUpdate: (styleUpdates: Partial<TextStyle>) => void;
  onSectionUpdate: (updates: Partial<TemplateSection>) => void;
  userVIPStatus: boolean;
  disabled: boolean;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentFile: number;
  totalFiles: number;
  stage: 'validating' | 'compressing' | 'optimizing' | 'finalizing';
  error?: string;
}

// Constants - Enterprise Grade Limits
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_CAPTION_LENGTH = 150;
const FREE_USER_IMAGE_LIMIT = 3;
const VIP_USER_IMAGE_LIMIT = 15;
const MAX_FILE_SIZE_MB = 25; // 25MB max input
const MAX_OUTPUT_SIZE_KB = 2048; // 2MB max output
const MAX_CONCURRENT_UPLOADS = 3;
const COMPRESSION_TIMEOUT = 30000; // 30 seconds
const AUTO_SAVE_DELAY = 2000;
const MAX_RETRY_ATTEMPTS = 3;
const PROGRESS_UPDATE_THROTTLE = 100; // ms

// Instagram-style compression presets
const INSTAGRAM_PRESETS = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  landscape: { width: 1080, height: 608 },
  story: { width: 1080, height: 1920 },
} as const;

// Security file type whitelist
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
] as const;

// State reducer for complex image management
interface ImageState {
  images: ImageData[];
  galleryConfig: GalleryConfig;
  processing: ProcessingState;
  uploadQueue: string[];
  errors: Record<string, string>;
}

type ImageAction =
  | { type: 'SET_IMAGES'; payload: ImageData[] }
  | { type: 'ADD_IMAGES'; payload: ImageData[] }
  | { type: 'REMOVE_IMAGE'; payload: string }
  | { type: 'UPDATE_IMAGE'; payload: { id: string; updates: Partial<ImageData> } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<GalleryConfig> }
  | { type: 'SET_PROCESSING'; payload: Partial<ProcessingState> }
  | { type: 'ADD_TO_QUEUE'; payload: string[] }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'SET_ERROR'; payload: { id: string; error: string } }
  | { type: 'CLEAR_ERROR'; payload: string }
  | { type: 'RESET_STATE' };

const imageReducer = (state: ImageState, action: ImageAction): ImageState => {
  switch (action.type) {
    case 'SET_IMAGES':
      return { ...state, images: action.payload };
    
    case 'ADD_IMAGES':
      return { 
        ...state, 
        images: [...state.images, ...action.payload].slice(0, state.galleryConfig.maxImages)
      };
    
    case 'REMOVE_IMAGE':
      return {
        ...state,
        images: state.images.filter(img => img.id !== action.payload),
        errors: { ...state.errors, [action.payload]: undefined },
      };
    
    case 'UPDATE_IMAGE':
      return {
        ...state,
        images: state.images.map(img => 
          img.id === action.payload.id 
            ? { ...img, ...action.payload.updates }
            : img
        ),
      };
    
    case 'UPDATE_CONFIG':
      return {
        ...state,
        galleryConfig: { ...state.galleryConfig, ...action.payload },
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        processing: { ...state.processing, ...action.payload },
      };
    
    case 'ADD_TO_QUEUE':
      return {
        ...state,
        uploadQueue: [...state.uploadQueue, ...action.payload],
      };
    
    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        uploadQueue: state.uploadQueue.filter(id => id !== action.payload),
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload.id]: action.payload.error },
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.payload]: undefined },
      };
    
    case 'RESET_STATE':
      return {
        ...state,
        processing: { isProcessing: false, progress: 0, currentFile: 0, totalFiles: 0, stage: 'validating' },
        uploadQueue: [],
        errors: {},
      };
    
    default:
      return state;
  }
};

// Gallery Layout Templates
const GALLERY_LAYOUTS = [
  {
    id: 'horizontal' as const,
    name: 'Horizontal Scroll',
    icon: 'arrow-forward',
    description: 'Side-by-side scrolling gallery',
    isVIP: false,
  },
  {
    id: 'grid' as const,
    name: 'Grid Layout',
    icon: 'grid',
    description: 'Organized grid display',
    isVIP: false,
  },
  {
    id: 'showcase' as const,
    name: 'Showcase',
    icon: 'star',
    description: 'Featured image focus',
    isVIP: true,
  },
  {
    id: 'story' as const,
    name: 'Story Mode',
    icon: 'phone-portrait',
    description: 'Vertical story layout',
    isVIP: true,
  },
] as const;

// Gaming Categories
const IMAGE_CATEGORIES = [
  {
    id: 'general' as const,
    name: 'General',
    icon: 'camera',
    color: '#888',
    description: 'Mixed content',
  },
  {
    id: 'squad' as const,
    name: 'Squad',
    icon: 'people',
    color: '#00FFFF',
    description: 'Team formations & lineups',
  },
  {
    id: 'gameplay' as const,
    name: 'Gameplay',
    icon: 'game-controller',
    color: '#32CD32',
    description: 'In-game screenshots',
  },
  {
    id: 'stats' as const,
    name: 'Statistics',
    icon: 'bar-chart',
    color: '#FFD700',
    description: 'Performance data',
  },
  {
    id: 'achievements' as const,
    name: 'Achievements',
    icon: 'trophy',
    color: '#FF6347',
    description: 'Victories & milestones',
  },
] as const;

// Spacing Options
const SPACING_OPTIONS = [
  { id: 'tight' as const, name: 'Tight', value: 4 },
  { id: 'normal' as const, name: 'Normal', value: 8 },
  { id: 'loose' as const, name: 'Loose', value: 16 },
] as const;

// ✅ FIXED: React Native compatible base64 conversion
const base64ToHex = (base64: string): string => {
  try {
    // Use Buffer if available (Node.js environments), fallback to manual conversion
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('hex').toLowerCase();
    }
    
    // Fallback manual implementation for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let bits = 0;
    let bitsLength = 0;
    
    for (let i = 0; i < base64.length; i++) {
      const char = base64[i];
      if (char === '=') break;
      
      const charCode = chars.indexOf(char);
      if (charCode === -1) continue;
      
      bits = (bits << 6) | charCode;
      bitsLength += 6;
      
      while (bitsLength >= 8) {
        const byte = (bits >>> (bitsLength - 8)) & 0xff;
        result += byte.toString(16).padStart(2, '0');
        bitsLength -= 8;
      }
    }
    
    return result.toLowerCase();
  } catch (error) {
    return '';
  }
};

// ✅ FIXED: React Native compatible ASCII conversion
const base64ToAscii = (base64: string): string => {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('ascii').toLowerCase();
    }
    
    // Manual implementation for React Native
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let bits = 0;
    let bitsLength = 0;
    
    for (let i = 0; i < base64.length; i++) {
      const char = base64[i];
      if (char === '=') break;
      
      const charCode = chars.indexOf(char);
      if (charCode === -1) continue;
      
      bits = (bits << 6) | charCode;
      bitsLength += 6;
      
      while (bitsLength >= 8) {
        const byte = (bits >>> (bitsLength - 8)) & 0xff;
        result += String.fromCharCode(byte);
        bitsLength -= 8;
      }
    }
    
    return result.toLowerCase();
  } catch (error) {
    return '';
  }
};

// ✅ FIXED: Cross-platform vibration with safety check
const safeTriggerVibration = (duration: number = 50) => {
  try {
    if (Platform.OS !== 'web' && Vibration && typeof Vibration.vibrate === 'function') {
      Vibration.vibrate(duration);
    }
  } catch (error) {
    // Silently fail if vibration is not available
    console.log('Vibration not available on this platform');
  }
};

// ✅ FIXED: Show user-friendly errors with proper alerts
const showPersistenceError = (operation: string, error: any) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  console.error(`${operation} failed:`, errorMessage);
  
  Alert.alert(
    'Save Warning',
    `Unable to ${operation.toLowerCase()}. Your changes may not be saved. Please try again or restart the app if the problem persists.`,
    [
      { text: 'OK', style: 'default' },
      { text: 'Retry Later', style: 'cancel' }
    ]
  );
};

// ✅ FIXED: Throttle utility for performance optimization
const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return (...args: Parameters<T>) => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

const ImageSectionEditor: React.FC<ImageSectionEditorProps> = ({
  section,
  onContentChange,
  onStyleUpdate,
  onSectionUpdate,
  userVIPStatus,
  disabled,
}) => {
  const { t } = useTranslation();
  
  // Initialize state
  const initialState: ImageState = {
    images: section.images || [],
    galleryConfig: section.galleryConfig || {
      layout: 'grid',
      maxImages: userVIPStatus ? VIP_USER_IMAGE_LIMIT : FREE_USER_IMAGE_LIMIT,
      allowCaptions: true,
      category: 'general',
      spacing: 'normal',
      compressionQuality: 'high',
    },
    processing: {
      isProcessing: false,
      progress: 0,
      currentFile: 0,
      totalFiles: 0,
      stage: 'validating',
    },
    uploadQueue: [],
    errors: {},
  };

  const [state, dispatch] = useReducer(imageReducer, initialState);
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const previewAnimation = useRef(new Animated.Value(1)).current;
  const uploadAnimation = useRef(new Animated.Value(0)).current;
  
  // Modal states
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState('');
  
  // Auto-save and cleanup
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  const abortControllers = useRef<Set<AbortController>>(new Set());
  
  // ✅ FIXED: Throttled progress update for performance
  const throttledProgressUpdate = useCallback(
    throttle((progress: number) => {
      dispatch({ type: 'SET_PROCESSING', payload: { progress }});
    }, PROGRESS_UPDATE_THROTTLE),
    []
  );
  
  // Initialize component
  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();

    // Load persisted state if available
    loadPersistedState();

    return () => {
      // Cleanup all resources
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
      abortControllers.current.forEach(controller => controller.abort());
    };
  }, []);

  // Load persisted state for crash recovery
  const loadPersistedState = useCallback(async () => {
    try {
      const persistedData = await AsyncStorage.getItem(`gallery_${section.id}`);
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        if (parsed.images && Array.isArray(parsed.images)) {
          dispatch({ type: 'SET_IMAGES', payload: parsed.images });
        }
      }
    } catch (error) {
      console.error('Failed to load persisted gallery state', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: section.id 
      });
    }
  }, [section.id]);

  // ✅ FIXED: Persist state with proper error handling
  const persistState = useCallback(async (images: ImageData[]) => {
    try {
      console.log('🔍 Persisting state for', images.length, 'images...');
      await AsyncStorage.setItem(`gallery_${section.id}`, JSON.stringify({ images }));
      console.log('🔍 State persisted successfully');
    } catch (error) {
      showPersistenceError('Save gallery state', error);
    }
  }, [section.id]);

  // Security: Validate file type and content
  const validateImageSecurity = useCallback(async (uri: string): Promise<{ isValid: boolean; error?: string }> => {
    try {
      // Check file existence and size
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      if (!fileInfo.exists) {
        return { isValid: false, error: 'File does not exist' };
      }

      const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        return { isValid: false, error: `File too large (${fileSizeMB.toFixed(1)}MB). Maximum ${MAX_FILE_SIZE_MB}MB allowed.` };
      }

      // Read file header for validation (first 32 bytes should be enough)
      const headerData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 32,
      });

      if (!headerData) {
        return { isValid: false, error: 'Unable to read file header' };
      }

      // Convert to hex and ASCII for validation
      const headerHex = base64ToHex(headerData);
      const headerText = base64ToAscii(headerData);
      
      // Basic malicious content check
      const suspiciousPatterns = ['<?xml', '<!doctype', '<script', '<html', '%pdf'];
      for (const pattern of suspiciousPatterns) {
        if (headerText.includes(pattern)) {
          return { isValid: false, error: 'Invalid file format detected' };
        }
      }

      // Validate image format by magic numbers
      const isJPEG = headerHex.startsWith('ffd8ff');
      const isPNG = headerHex.startsWith('89504e47');
      const isWebP = headerHex.startsWith('52494646') && headerHex.includes('57454250');
      const isBMP = headerHex.startsWith('424d');

      if (!isJPEG && !isPNG && !isWebP && !isBMP) {
        return { isValid: false, error: 'Unsupported image format. Please use JPEG, PNG, or WebP.' };
      }

      return { isValid: true };
    } catch (error) {
      console.error('File validation error:', error);
      return { isValid: false, error: 'File validation failed' };
    }
  }, []);

  // Instagram-style intelligent compression
  const compressImageIntelligently = useCallback(async (
    uri: string, 
    targetDimensions?: { width: number; height: number },
    onProgress?: (progress: number) => void
  ): Promise<{ uri: string; size: number; dimensions: { width: number; height: number } }> => {
    
    const abortController = new AbortController();
    abortControllers.current.add(abortController);

    try {
      // Get original image info
      const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {});
      let { width: originalWidth, height: originalHeight } = imageInfo;

      // Determine optimal dimensions (Instagram-style)
      let targetWidth: number, targetHeight: number;
      
      if (targetDimensions) {
        targetWidth = targetDimensions.width;
        targetHeight = targetDimensions.height;
      } else {
        // Auto-select best Instagram preset
        const aspectRatio = originalWidth / originalHeight;
        
        if (Math.abs(aspectRatio - 1) < 0.1) {
          // Square-ish
          ({ width: targetWidth, height: targetHeight } = INSTAGRAM_PRESETS.square);
        } else if (aspectRatio < 0.8) {
          // Portrait
          ({ width: targetWidth, height: targetHeight } = INSTAGRAM_PRESETS.portrait);
        } else if (aspectRatio > 1.7) {
          // Landscape
          ({ width: targetWidth, height: targetHeight } = INSTAGRAM_PRESETS.landscape);
        } else {
          // Standard
          ({ width: targetWidth, height: targetHeight } = INSTAGRAM_PRESETS.square);
        }
      }

      // Progressive compression with size targeting
      let quality = 0.9;
      let currentAttempt = 0;
      const maxAttempts = 5;
      let result: any;

      while (currentAttempt < maxAttempts) {
        if (abortController.signal.aborted) {
          throw new Error('Compression cancelled');
        }

        onProgress?.(20 + (currentAttempt / maxAttempts) * 60);

        result = await ImageManipulator.manipulateAsync(
          uri,
          [
            {
              resize: {
                width: Math.min(targetWidth, originalWidth),
                height: Math.min(targetHeight, originalHeight),
              },
            },
          ],
          {
            compress: quality,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: false,
          }
        );

        // Check file size
        const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
        const fileSizeKB = (fileInfo.size || 0) / 1024;

        if (fileSizeKB <= MAX_OUTPUT_SIZE_KB || quality <= 0.3) {
          break;
        }

        // Reduce quality for next attempt
        quality -= 0.15;
        currentAttempt++;
      }

      onProgress?.(90);

      // Final size check
      const finalFileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
      
      onProgress?.(100);

      return {
        uri: result.uri,
        size: finalFileInfo.size || 0,
        dimensions: { width: result.width, height: result.height },
      };

    } finally {
      abortControllers.current.delete(abortController);
    }
  }, []);

  // Generate secure hash for duplicate detection
  const generateImageHash = useCallback(async (uri: string): Promise<string> => {
    try {
      // Get file info for basic fingerprinting
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 9);
      const size = fileInfo.size || 0;
      
      // Create a simple hash based on file size, timestamp, and random value
      const hashInput = `${size}_${timestamp}_${random}`;
      
      // Use Crypto if available, otherwise fallback to simple hash
      try {
        return await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          hashInput,
          { encoding: Crypto.CryptoEncoding.HEX }
        );
      } catch (cryptoError) {
        // Fallback to timestamp-based ID if crypto fails
        return `img_${timestamp}_${random}_${size}`;
      }
    } catch (error) {
      // Ultimate fallback
      return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Process multiple images with queue management
  const processImageBatch = useCallback(async (assets: any[]) => {
    const totalAssets = assets.length;
    const processedImages: ImageData[] = [];
    
    dispatch({ type: 'SET_PROCESSING', payload: { 
      isProcessing: true, 
      progress: 0, 
      currentFile: 0,
      totalFiles: totalAssets,
      stage: 'validating'
    }});

    try {
      // Process in chunks to avoid memory issues
      const chunkSize = MAX_CONCURRENT_UPLOADS;
      
      for (let i = 0; i < totalAssets; i += chunkSize) {
        const chunk = assets.slice(i, i + chunkSize);
        
        const chunkPromises = chunk.map(async (asset, chunkIndex) => {
          const globalIndex = i + chunkIndex;
          
          try {
            // Validate asset structure
            if (!asset || !asset.uri) {
              throw new Error('Invalid asset: missing URI');
            }

            console.log('🔍 Starting image validation for:', asset.uri);

            // Security validation
            const validation = await validateImageSecurity(asset.uri);
            console.log('🔍 Validation result:', validation);
            
            if (!validation.isValid) {
              throw new Error(validation.error || 'Invalid image');
            }

            dispatch({ type: 'SET_PROCESSING', payload: { stage: 'compressing' }});

            // Intelligent compression with throttled progress updates
            const compressed = await compressImageIntelligently(
              asset.uri,
              undefined,
              (progress) => {
                const totalProgress = ((globalIndex + progress / 100) / totalAssets) * 100;
                throttledProgressUpdate(totalProgress);
              }
            );

            dispatch({ type: 'SET_PROCESSING', payload: { stage: 'finalizing' }});
            console.log('🔍 Starting finalization...');

            // Generate unique ID and hash
            console.log('🔍 Generating image hash...');
            const imageHash = await generateImageHash(compressed.uri);
            console.log('🔍 Generated hash:', imageHash);
            
            // Check for duplicates
            const isDuplicate = state.images.some(img => img.hash === imageHash);
            console.log('🔍 Duplicate check:', isDuplicate);
            
            if (isDuplicate) {
              throw new Error('Duplicate image detected');
            }

            console.log('🔍 Creating image data object...');
            const newImage: ImageData = {
              id: `img_${Date.now()}_${globalIndex}_${Math.random().toString(36).substr(2, 9)}`,
              uri: compressed.uri,
              originalUri: asset.uri,
              caption: '',
              category: state.galleryConfig.category,
              uploadedAt: new Date().toISOString(),
              size: compressed.dimensions,
              fileSize: compressed.size,
              format: 'JPEG',
              compressionLevel: 0.8,
              hash: imageHash,
              metadata: {
                hasTransparency: false,
                colorDepth: 24,
                aspectRatio: compressed.dimensions.width / compressed.dimensions.height,
              },
            };

            console.log('🔍 Image data created:', {
              id: newImage.id,
              uri: newImage.uri,
              size: newImage.size,
              fileSize: newImage.fileSize
            });

            return newImage;

          } catch (error) {
            const errorId = `error_${globalIndex}`;
            const errorMessage = error instanceof Error ? error.message : 'Processing failed';
            dispatch({ type: 'SET_ERROR', payload: { 
              id: errorId, 
              error: errorMessage
            }});
            console.error('Image processing failed', { 
              index: globalIndex, 
              error: errorMessage,
              assetUri: asset?.uri || 'unknown'
            });
            return null;
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        const validResults = chunkResults.filter((result): result is ImageData => result !== null);
        console.log('🔍 Chunk results:', { total: chunkResults.length, valid: validResults.length });
        
        processedImages.push(...validResults);

        // Yield to UI thread
        await new Promise(resolve => InteractionManager.runAfterInteractions(resolve));
      }

      console.log('🔍 All chunks processed. Total images:', processedImages.length);
      console.log('🔍 Processed images details:', processedImages.map(img => ({ id: img.id, fileSize: img.fileSize })));

      if (processedImages.length > 0) {
        console.log('🔍 Adding images to state...');
        
        // Dispatch the images to state immediately
        dispatch({ type: 'ADD_IMAGES', payload: processedImages });
        
        console.log('🔍 Images added to state, persisting...');
        
        // Use the current state images + new processed images for persistence
        const currentImages = state.images || [];
        const updatedImages = [...currentImages, ...processedImages];
        console.log('🔍 Total images for persistence:', updatedImages.length);
        
        // ✅ FIXED: Persist state with proper error handling
        try {
          await Promise.race([
            persistState(updatedImages),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Persist timeout')), 5000)
            )
          ]);
          console.log('🔍 State persisted successfully');
        } catch (persistError) {
          console.log('🔍 Persist failed, but continuing...', persistError);
          showPersistenceError('Save images', persistError);
        }
        
        console.log('🔍 Triggering haptic feedback...');
        // ✅ FIXED: Safe vibration with platform check
        safeTriggerVibration(50);
        
        console.log('Image batch processed successfully', {
          sectionId: section.id,
          processed: processedImages.length,
          total: totalAssets,
          category: state.galleryConfig.category,
        });
        
        // Force progress to 100% to ensure completion
        dispatch({ type: 'SET_PROCESSING', payload: { progress: 100 }});
        
      } else {
        console.log('🔍 No images were successfully processed');
      }

    } catch (error) {
      console.error('Batch processing error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        sectionId: section.id,
        processedCount: processedImages.length,
        totalAssets: totalAssets
      });
      Alert.alert(
        'Processing Error', 
        `${processedImages.length > 0 ? `${processedImages.length} images were processed successfully, but ` : ''}some images could not be processed. Please try again.`
      );
    } finally {
      console.log('🔍 Resetting processing state...');
      // Add a small delay to ensure UI updates properly
      setTimeout(() => {
        dispatch({ type: 'SET_PROCESSING', payload: { 
          isProcessing: false, 
          progress: 0,
          currentFile: 0,
          totalFiles: 0,
          stage: 'validating'
        }});
        console.log('🔍 Processing state reset complete');
      }, 100);
    }
  }, [state.images, state.galleryConfig, section.id, validateImageSecurity, compressImageIntelligently, generateImageHash, persistState, throttledProgressUpdate]);

  // Request permissions with proper error handling
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is required to add images to your gallery. Please enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => {
              // In a real app, you'd open device settings
            }},
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      Alert.alert('Permission Error', 'Unable to request photo library permission.');
      return false;
    }
  }, []);

  // Enhanced image picker with comprehensive error handling
  const pickImages = useCallback(async () => {
    // Pre-flight checks
    if (state.processing.isProcessing) {
      Alert.alert('Processing', 'Please wait for current upload to complete.');
      return;
    }

    if (state.images.length >= state.galleryConfig.maxImages) {
      const upgradeMessage = userVIPStatus 
        ? 'You\'ve reached the maximum number of images for this gallery.'
        : `Free users are limited to ${FREE_USER_IMAGE_LIMIT} images. Upgrade to VIP for up to ${VIP_USER_IMAGE_LIMIT} images!`;
      
      Alert.alert('Gallery Full', upgradeMessage);
      return;
    }

    // Check permissions
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // Animate upload indicator
    Animated.timing(uploadAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    try {
      const remainingSlots = state.galleryConfig.maxImages - state.images.length;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1, // Start with highest quality for processing
        allowsMultipleSelection: true,
        selectionLimit: Math.min(10, remainingSlots),
        exif: false, // Don't include EXIF for privacy
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processImageBatch(result.assets);
      }

    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(
        'Selection Error', 
        'Unable to select images. Please check your photo library permissions and try again.'
      );
    } finally {
      Animated.timing(uploadAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [state, userVIPStatus, requestPermissions, processImageBatch, uploadAnimation]);

  // Secure image removal with confirmation
  const removeImage = useCallback((imageId: string) => {
    const image = state.images.find(img => img.id === imageId);
    if (!image) return;

    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            dispatch({ type: 'REMOVE_IMAGE', payload: imageId });
            
            // Clean up file system
            try {
              await FileSystem.deleteAsync(image.uri, { idempotent: true });
              if (image.originalUri && image.originalUri !== image.uri) {
                await FileSystem.deleteAsync(image.originalUri, { idempotent: true });
              }
            } catch (error) {
              // File cleanup failed, but continue
              console.error('File cleanup failed', { 
                imageId, 
                error: error instanceof Error ? error.message : 'Unknown error' 
              });
            }
            
            // ✅ FIXED: Persist updated state with error handling
            try {
              const updatedImages = state.images.filter(img => img.id !== imageId);
              await persistState(updatedImages);
            } catch (persistError) {
              showPersistenceError('Save after image removal', persistError);
            }
            
            // ✅ FIXED: Safe vibration
            safeTriggerVibration(30);
            
            console.log('Image removed', { imageId, sectionId: section.id });
          },
        },
      ]
    );
  }, [state.images, section.id, persistState]);

  // Enhanced caption update with sanitization
  const updateCaption = useCallback(async (imageId: string, caption: string) => {
    // Sanitize and validate caption
    const sanitizedCaption = caption.trim().replace(/[<>]/g, ''); // Basic XSS prevention
    const validation = validatePostContent(sanitizedCaption);
    
    if (!validation.isValid && sanitizedCaption !== '') {
      Alert.alert('Invalid Caption', validation.errors[0] || 'Caption contains inappropriate content');
      return;
    }

    dispatch({ type: 'UPDATE_IMAGE', payload: { 
      id: imageId, 
      updates: { caption: sanitizedCaption } 
    }});
    
    setEditingCaption(null);
    setCaptionText('');
    
    // ✅ FIXED: Persist updated state with error handling
    try {
      const updatedImages = state.images.map(img => 
        img.id === imageId ? { ...img, caption: sanitizedCaption } : img
      );
      await persistState(updatedImages);
    } catch (persistError) {
      showPersistenceError('Save caption', persistError);
    }
    
    console.log('Caption updated', { imageId, sectionId: section.id });
  }, [state.images, section.id, persistState]);

  // Layout selection with VIP validation
  const selectLayout = useCallback((layoutId: string) => {
    const layout = GALLERY_LAYOUTS.find(l => l.id === layoutId);
    if (!layout) return;
    
    if (layout.isVIP && !userVIPStatus) {
      Alert.alert(
        'VIP Feature',
        `${layout.name} is available for VIP members only. Upgrade to unlock premium gallery layouts!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', style: 'default' },
        ]
      );
      return;
    }
    
    dispatch({ type: 'UPDATE_CONFIG', payload: { layout: layoutId as any } });
    setShowLayoutSelector(false);
    // ✅ FIXED: Safe vibration
    safeTriggerVibration(30);
    
    console.log('Gallery layout changed', {
      sectionId: section.id,
      layout: layoutId,
      isVIP: layout.isVIP,
    });
  }, [userVIPStatus, section.id]);

  // ✅ FIXED: Memoized content formatting for performance
  const formattedContent = useMemo(() => {
    if (state.images.length === 0) return '';
    
    let content = `📸 Gallery (${state.images.length} ${state.images.length === 1 ? 'photo' : 'photos'})`;
    
    const captionedItems = state.images.filter(item => item.caption?.trim());
    if (captionedItems.length > 0) {
      content += '\n\n';
      content += captionedItems
        .map(item => item.caption?.trim())
        .filter(Boolean)
        .join('\n');
    }
    
    return content.trim();
  }, [state.images]);

  // Auto-save with debouncing
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(() => {
      // Prevent auto-save during processing to avoid infinite loops
      if (state.processing.isProcessing) {
        console.log('🔍 Skipping auto-save during processing');
        return;
      }

      onSectionUpdate({
        images: state.images,
        galleryConfig: state.galleryConfig,
        content: formattedContent,
      });
      
      onContentChange(formattedContent);
      
      console.log('Gallery auto-saved', {
        sectionId: section.id,
        imageCount: state.images.length,
        layout: state.galleryConfig.layout,
      });
    }, AUTO_SAVE_DELAY);
  }, [state.images, state.galleryConfig, state.processing.isProcessing, section.id, onSectionUpdate, onContentChange, formattedContent]);

  // Effect for auto-save (only when not processing)
  useEffect(() => {
    if (!state.processing.isProcessing) {
      debouncedAutoSave();
    }
  }, [state.images, state.galleryConfig, state.processing.isProcessing, debouncedAutoSave]);

  // Gallery preview animation
  const animatePreview = useCallback(() => {
    Animated.sequence([
      Animated.timing(previewAnimation, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(previewAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [previewAnimation]);

  // Trigger preview animation when images change
  useEffect(() => {
    if (state.images.length > 0) {
      animatePreview();
    }
  }, [state.images.length, animatePreview]);

  // Memoized values
  const currentLayout = useMemo(() => 
    GALLERY_LAYOUTS.find(l => l.id === state.galleryConfig.layout) || GALLERY_LAYOUTS[0],
    [state.galleryConfig.layout]
  );
  
  const spacingValue = useMemo(() => 
    SPACING_OPTIONS.find(s => s.id === state.galleryConfig.spacing)?.value || 8,
    [state.galleryConfig.spacing]
  );
  
  const hasContent = state.images.length > 0;
  const hasErrors = Object.values(state.errors).some(Boolean);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: slideAnimation }],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="images" size={20} color="#32CD32" />
          <Text style={styles.headerTitle}>Image Gallery</Text>
          <Text style={styles.imageCount}>
            ({state.images.length}/{state.galleryConfig.maxImages})
          </Text>
          {state.processing.isProcessing && (
            <View style={styles.processingIndicator}>
              <ActivityIndicator size="small" color="#32CD32" />
              <Text style={styles.processingText}>
                {state.processing.stage}...
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowLayoutSelector(true)}
            disabled={disabled}
          >
            <Ionicons name="grid-outline" size={18} color="#32CD32" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Display */}
      {hasErrors && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#FF6347" />
          <Text style={styles.errorText}>
            Some images couldn't be processed. Check individual errors below.
          </Text>
        </View>
      )}
      
      {/* Gallery Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Layout:</Text>
          <Text style={styles.infoValue}>{currentLayout.name}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Quality:</Text>
          <Text style={styles.infoValue}>{state.galleryConfig.compressionQuality}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Size:</Text>
          <Text style={styles.infoValue}>
            {Math.round(state.images.reduce((sum, img) => sum + img.fileSize, 0) / 1024)} KB
          </Text>
        </View>
      </View>
      
      {/* Gallery Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[
              styles.controlOption, 
              state.galleryConfig.allowCaptions && styles.controlOptionActive
            ]}
            onPress={() => dispatch({ type: 'UPDATE_CONFIG', payload: { 
              allowCaptions: !state.galleryConfig.allowCaptions 
            }})}
            disabled={disabled}
          >
            <Ionicons
              name={state.galleryConfig.allowCaptions ? "checkbox" : "square-outline"}
              size={16}
              color={state.galleryConfig.allowCaptions ? "#32CD32" : "#888"}
            />
            <Text style={styles.controlText}>Captions</Text>
          </TouchableOpacity>
          
          <View style={styles.spacingControls}>
            {SPACING_OPTIONS.map(spacing => (
              <TouchableOpacity
                key={spacing.id}
                style={[
                  styles.spacingButton,
                  state.galleryConfig.spacing === spacing.id && styles.spacingButtonActive,
                ]}
                onPress={() => dispatch({ type: 'UPDATE_CONFIG', payload: { 
                  spacing: spacing.id as any 
                }})}
                disabled={disabled}
              >
                <Text style={[
                  styles.spacingText,
                  state.galleryConfig.spacing === spacing.id && styles.spacingTextActive,
                ]}>
                  {spacing.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      
      {/* Add Images Button */}
      <TouchableOpacity
        style={[
          styles.addButton,
          state.processing.isProcessing && styles.addButtonProcessing,
          state.images.length >= state.galleryConfig.maxImages && styles.addButtonDisabled,
        ]}
        onPress={pickImages}
        disabled={disabled || state.processing.isProcessing || state.images.length >= state.galleryConfig.maxImages}
      >
        <LinearGradient
          colors={
            state.processing.isProcessing
              ? ['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.1)']
              : state.images.length >= state.galleryConfig.maxImages
              ? ['rgba(255, 100, 71, 0.3)', 'rgba(255, 100, 71, 0.1)']
              : ['rgba(50, 205, 50, 0.3)', 'rgba(50, 205, 50, 0.1)']
          }
          style={styles.addButtonGradient}
        >
          {state.processing.isProcessing ? (
            <View style={styles.processingContent}>
              <ActivityIndicator size="small" color="#FFD700" />
              <Text style={styles.processingText}>
                Processing {state.processing.currentFile}/{state.processing.totalFiles}...
              </Text>
            </View>
          ) : (
            <View style={styles.addButtonContent}>
              <Ionicons
                name="add-circle"
                size={24}
                color={state.images.length >= state.galleryConfig.maxImages ? "#FF6347" : "#32CD32"}
              />
              <Text style={[
                styles.addButtonText,
                state.images.length >= state.galleryConfig.maxImages && styles.addButtonTextDisabled,
              ]}>
                {state.images.length >= state.galleryConfig.maxImages
                  ? 'Gallery Full'
                  : 'Add Images'
                }
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      {/* Processing Progress */}
      {state.processing.isProcessing && (
        <Animated.View
          style={[
            styles.progressContainer,
            {
              opacity: uploadAnimation,
              transform: [{ scale: uploadAnimation }],
            },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {state.processing.stage.charAt(0).toUpperCase() + state.processing.stage.slice(1)}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(state.processing.progress)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${state.processing.progress}%`,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}
      
      {/* Images Gallery Preview */}
      {hasContent && (
        <Animated.View
          style={[
            styles.galleryContainer,
            {
              transform: [{ scale: previewAnimation }],
            },
          ]}
        >
          <View style={styles.galleryHeader}>
            <Text style={styles.galleryLabel}>Gallery Preview:</Text>
            <Text style={styles.galleryStats}>
              {Math.round(state.images.reduce((sum, img) => sum + img.fileSize, 0) / 1024)} KB total
            </Text>
          </View>
          
          {/* Dynamic Layout Rendering */}
          {state.galleryConfig.layout === 'showcase' ? (
            // Showcase Layout
            <View style={styles.showcaseContainer}>
              {state.images.length > 0 && (
                <TouchableOpacity
                  style={styles.showcaseFeatured}
                  onLongPress={() => removeImage(state.images[0].id)}
                >
                  <LinearGradient
                    colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
                    style={styles.imageItemGradient}
                  >
                    <Image
                      source={{ uri: state.images[0].uri }}
                      style={styles.showcaseFeaturedImage}
                      resizeMode="cover"
                    />
                    
                    {state.galleryConfig.allowCaptions && state.images[0].caption && (
                      <View style={styles.captionContainer}>
                        <Text style={styles.captionText} numberOfLines={2}>
                          {state.images[0].caption}
                        </Text>
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(state.images[0].id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF6347" />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {state.images.length > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.showcaseThumbnails}
                  contentContainerStyle={styles.showcaseThumbnailsContent}
                >
                  {state.images.slice(1).map((image, index) => (
                    <TouchableOpacity
                      key={image.id}
                      style={[styles.showcaseThumbnail, { marginRight: spacingValue }]}
                      onLongPress={() => removeImage(image.id)}
                    >
                      <LinearGradient
                        colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
                        style={styles.imageItemGradient}
                      >
                        <Image
                          source={{ uri: image.uri }}
                          style={styles.showcaseThumbnailImage}
                          resizeMode="cover"
                        />
                        
                        <TouchableOpacity
                          style={styles.removeButtonSmall}
                          onPress={() => removeImage(image.id)}
                        >
                          <Ionicons name="close-circle" size={16} color="#FF6347" />
                        </TouchableOpacity>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : state.galleryConfig.layout === 'story' ? (
            // Story Layout
            <ScrollView
              style={styles.storyScroll}
              showsVerticalScrollIndicator={false}
            >
              {state.images.map((image, index) => (
                <TouchableOpacity
                  key={image.id}
                  style={[styles.storyItem, { marginBottom: spacingValue }]}
                  onLongPress={() => removeImage(image.id)}
                >
                  <LinearGradient
                    colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
                    style={styles.imageItemGradient}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.storyImage}
                      resizeMode="cover"
                    />
                    
                    {state.galleryConfig.allowCaptions && (
                      <View style={styles.captionContainer}>
                        {image.caption ? (
                          <Text style={styles.captionText} numberOfLines={3}>
                            {image.caption}
                          </Text>
                        ) : (
                          <TouchableOpacity
                            style={styles.addCaptionButton}
                            onPress={() => {
                              setEditingCaption(image.id);
                              setCaptionText(image.caption || '');
                            }}
                          >
                            <Text style={styles.addCaptionText}>Add caption...</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF6347" />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            // Grid/Horizontal Layout
            <ScrollView
              horizontal={state.galleryConfig.layout === 'horizontal'}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              style={styles.galleryScroll}
              contentContainerStyle={[
                styles.galleryContent,
                state.galleryConfig.layout === 'grid' && styles.galleryGrid,
              ]}
            >
              {state.images.map((image, index) => (
                <TouchableOpacity
                  key={image.id}
                  style={[
                    styles.imageItem,
                    { marginRight: spacingValue, marginBottom: spacingValue },
                    state.galleryConfig.layout === 'grid' && styles.imageItemGrid,
                    state.galleryConfig.layout === 'horizontal' && styles.imageItemHorizontal,
                  ]}
                  onPress={() => {
                    if (state.galleryConfig.allowCaptions) {
                      setEditingCaption(image.id);
                      setCaptionText(image.caption || '');
                    }
                  }}
                  onLongPress={() => removeImage(image.id)}
                >
                  <LinearGradient
                    colors={['rgba(50, 205, 50, 0.1)', 'transparent']}
                    style={styles.imageItemGradient}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    
                    {/* Image Info Overlay */}
                    <View style={styles.imageInfoOverlay}>
                      <Text style={styles.imageSize}>
                        {Math.round(image.fileSize / 1024)}KB
                      </Text>
                    </View>
                    
                    {state.galleryConfig.allowCaptions && (
                      <View style={styles.captionContainer}>
                        {image.caption ? (
                          <Text style={styles.captionText} numberOfLines={2}>
                            {image.caption}
                          </Text>
                        ) : (
                          <TouchableOpacity
                            style={styles.addCaptionButton}
                            onPress={() => {
                              setEditingCaption(image.id);
                              setCaptionText(image.caption || '');
                            }}
                          >
                            <Text style={styles.addCaptionText}>Add caption...</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeImage(image.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF6347" />
                    </TouchableOpacity>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
      
      {/* Empty State */}
      {!hasContent && !state.processing.isProcessing && (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['rgba(50, 205, 50, 0.1)', 'rgba(50, 205, 50, 0.05)']}
            style={styles.emptyStateGradient}
          >
            <Ionicons name="images-outline" size={48} color="#888" />
            <Text style={styles.emptyStateTitle}>Create Your Gallery</Text>
            <Text style={styles.emptyStateText}>
              Add photos to share your gaming moments with the community
            </Text>
            <View style={styles.emptyStateFeatures}>
              <Text style={styles.featureText}>✨ Instagram-style compression</Text>
              <Text style={styles.featureText}>🔒 Enterprise-grade security</Text>
              <Text style={styles.featureText}>📱 Multiple layout options</Text>
            </View>
          </LinearGradient>
        </View>
      )}
      
      {/* Layout Selector Modal */}
      <Modal
        visible={showLayoutSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLayoutSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.layoutModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.layoutContent}
            >
              <View style={styles.layoutHeader}>
                <Text style={styles.layoutTitle}>Choose Layout</Text>
                <TouchableOpacity onPress={() => setShowLayoutSelector(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.layoutList}>
                {GALLERY_LAYOUTS.map(layout => (
                  <TouchableOpacity
                    key={layout.id}
                    style={[
                      styles.layoutItem,
                      layout.isVIP && !userVIPStatus && styles.layoutItemLocked,
                      state.galleryConfig.layout === layout.id && styles.layoutItemActive,
                    ]}
                    onPress={() => selectLayout(layout.id)}
                    disabled={layout.isVIP && !userVIPStatus}
                  >
                    <LinearGradient
                      colors={
                        layout.isVIP && !userVIPStatus
                          ? ['rgba(255, 215, 0, 0.1)', 'transparent']
                          : state.galleryConfig.layout === layout.id
                          ? ['rgba(50, 205, 50, 0.2)', 'rgba(50, 205, 50, 0.1)']
                          : ['rgba(255, 255, 255, 0.05)', 'transparent']
                      }
                      style={styles.layoutItemGradient}
                    >
                      <View style={styles.layoutItemHeader}>
                        <Ionicons
                          name={layout.icon as any}
                          size={24}
                          color={layout.isVIP && !userVIPStatus ? "#FFD700" : "#32CD32"}
                        />
                        <Text style={[
                          styles.layoutName,
                          layout.isVIP && !userVIPStatus && styles.layoutNameLocked,
                        ]}>
                          {layout.name}
                          {layout.isVIP && (
                            <Text style={styles.vipBadge}> 👑</Text>
                          )}
                        </Text>
                      </View>
                      <Text style={styles.layoutDescription}>{layout.description}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
      
      {/* Caption Editor Modal */}
      <Modal
        visible={editingCaption !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCaption(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.captionModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.captionModalContent}
            >
              <View style={styles.captionModalHeader}>
                <Text style={styles.captionModalTitle}>Add Caption</Text>
                <TouchableOpacity onPress={() => setEditingCaption(null)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.captionInputContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Describe your image..."
                  placeholderTextColor="#888"
                  value={captionText}
                  onChangeText={setCaptionText}
                  maxLength={MAX_CAPTION_LENGTH}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                />
                <Text style={styles.captionCharCount}>
                  {captionText.length}/{MAX_CAPTION_LENGTH}
                </Text>
              </View>
              
              <View style={styles.captionActions}>
                <TouchableOpacity
                  style={styles.captionCancel}
                  onPress={() => setEditingCaption(null)}
                >
                  <Text style={styles.captionCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.captionSave}
                  onPress={() => {
                    if (editingCaption) {
                      updateCaption(editingCaption, captionText);
                    }
                  }}
                >
                  <LinearGradient
                    colors={['#32CD32', '#228B22']}
                    style={styles.captionSaveGradient}
                  >
                    <Text style={styles.captionSaveText}>Save Caption</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default ImageSectionEditor;

/* ----------------- ENTERPRISE-GRADE STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 205, 50, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imageCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  processingText: {
    color: '#32CD32',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.3)',
  },
  
  // Error Display
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 100, 71, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 100, 71, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF6347',
    fontSize: 12,
    flex: 1,
  },
  
  // Info
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  
  // Controls
  controlsContainer: {
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  controlOptionActive: {
    borderColor: '#32CD32',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  spacingControls: {
    flexDirection: 'row',
    gap: 4,
  },
  spacingButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  spacingButtonActive: {
    borderColor: '#32CD32',
    backgroundColor: 'rgba(50, 205, 50, 0.2)',
  },
  spacingText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '500',
  },
  spacingTextActive: {
    color: '#32CD32',
  },
  
  // Add Button
  addButton: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(50, 205, 50, 0.3)',
  },
  addButtonProcessing: {
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  addButtonDisabled: {
    borderColor: 'rgba(255, 100, 71, 0.5)',
    opacity: 0.7,
  },
  addButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#32CD32',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButtonTextDisabled: {
    color: '#FF6347',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  // Progress
  progressContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  
  // Gallery
  galleryContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.2)',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  galleryLabel: {
    color: '#32CD32',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryStats: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  galleryScroll: {
    flex: 1,
  },
  galleryContent: {
    flexDirection: 'row',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  
  // Image Items
  imageItem: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  imageItemGrid: {
    width: (SCREEN_WIDTH - 80) / 2,
  },
  imageItemHorizontal: {
    width: 200,
  },
  imageItemGradient: {
    padding: 4,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imageInfoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageSize: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  captionContainer: {
    marginTop: 8,
    minHeight: 20,
  },
  captionText: {
    color: '#CCCCCC',
    fontSize: 12,
    lineHeight: 16,
  },
  addCaptionButton: {
    alignSelf: 'flex-start',
  },
  addCaptionText: {
    color: '#888',
    fontSize: 11,
    fontStyle: 'italic',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  removeButtonSmall: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 1,
  },
  
  // Showcase Layout
  showcaseContainer: {
    flex: 1,
  },
  showcaseFeatured: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.3)',
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  showcaseFeaturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  showcaseThumbnails: {
    maxHeight: 80,
  },
  showcaseThumbnailsContent: {
    paddingBottom: 8,
  },
  showcaseThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  showcaseThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  
  // Story Layout
  storyScroll: {
    flex: 1,
  },
  storyItem: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  storyImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(50, 205, 50, 0.2)',
    borderStyle: 'dashed',
    minHeight: 200,
  },
  emptyStateGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    color: '#32CD32',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateFeatures: {
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Layout Modal
  layoutModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.3)',
  },
  layoutContent: {
    maxHeight: '100%',
  },
  layoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 205, 50, 0.2)',
  },
  layoutTitle: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  layoutList: {
    maxHeight: 400,
    padding: 16,
  },
  layoutItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(50, 205, 50, 0.2)',
  },
  layoutItemLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.8,
  },
  layoutItemActive: {
    borderColor: '#32CD32',
    borderWidth: 2,
  },
  layoutItemGradient: {
    padding: 16,
  },
  layoutItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  layoutName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  layoutNameLocked: {
    color: '#FFD700',
  },
  vipBadge: {
    color: '#FFD700',
  },
  layoutDescription: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Caption Modal
  captionModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  captionModalContent: {
    padding: 0,
  },
  captionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  captionModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  captionInputContainer: {
    padding: 20,
  },
  captionInput: {
    color: '#FFFFFF',
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  captionCharCount: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  captionActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  captionCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
  },
  captionCancelText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  captionSave: {
    flex: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  captionSaveGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  captionSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});