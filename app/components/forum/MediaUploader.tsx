import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  Modal,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image as ExpoImage } from 'expo-image';

// Firebase imports
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Security utilities
import { validateImageFile, sanitizeURL, secureLog } from '../../utils/security';

// Types
interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  size: number;
  width?: number;
  height?: number;
  uploadProgress?: number;
  isUploading?: boolean;
  error?: string;
}

interface MediaUploaderProps {
  selectedImages: string[];
  selectedGif: string | null;
  onImagesUpdate: (images: string[]) => void;
  onGifRemove: () => void;
  onShowGifSelector: () => void;
  disabled?: boolean;
  maxImages?: number;
  maxFileSize?: number; // in MB
}

// Constants
const MAX_IMAGES_DEFAULT = 6;
const MAX_FILE_SIZE_DEFAULT = 10; // MB
const COMPRESSION_QUALITY = 0.8;
const MAX_DIMENSION = 1920;
const THUMBNAIL_SIZE = 150;

const storage = getStorage();
const auth = getAuth();

const MediaUploader: React.FC<MediaUploaderProps> = ({
  selectedImages,
  selectedGif,
  onImagesUpdate,
  onGifRemove,
  onShowGifSelector,
  disabled = false,
  maxImages = MAX_IMAGES_DEFAULT,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
}) => {
  const { t } = useTranslation();
  
  // Refs for animations
  const uploadAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const isMountedRef = useRef(true);
  
  // State management
  const [uploadingItems, setUploadingItems] = useState<{ [key: string]: MediaItem }>({});
  const [showImagePreview, setShowImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Animation helpers
  const createUploadAnimation = useCallback((itemId: string) => {
    const animation = new Animated.Value(0);
    uploadAnimations.current[itemId] = animation;
    
    Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    
    return animation;
  }, []);
  
  const removeUploadAnimation = useCallback((itemId: string) => {
    const animation = uploadAnimations.current[itemId];
    if (animation) {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        delete uploadAnimations.current[itemId];
      });
    }
  }, []);
  
  // File validation
  const validateFile = useCallback((fileInfo: any) => {
    // Size validation
    if (fileInfo.fileSize && fileInfo.fileSize > maxFileSize * 1024 * 1024) {
      return {
        isValid: false,
        error: t('mediaUploader.fileTooLarge', { maxSize: maxFileSize }),
      };
    }
    
    // Type validation
    if (!fileInfo.type?.startsWith('image/')) {
      return {
        isValid: false,
        error: t('mediaUploader.invalidFileType'),
      };
    }
    
    // Security validation
    const validation = validateImageFile(fileInfo);
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.errors[0] || t('mediaUploader.securityError'),
      };
    }
    
    return { isValid: true };
  }, [maxFileSize, t]);
  
  // Image compression and optimization
  const optimizeImage = useCallback(async (uri: string): Promise<string> => {
    try {
      const manipulatorResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          // Resize if too large
          { resize: { width: MAX_DIMENSION } },
        ],
        {
          compress: COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      secureLog('Image optimized', {
        originalUri: uri.substring(0, 50),
        optimizedUri: manipulatorResult.uri.substring(0, 50),
        timestamp: Date.now(),
      });
      
      return manipulatorResult.uri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      secureLog('Image optimization error', { error: error.message });
      throw new Error(t('mediaUploader.optimizationFailed'));
    }
  }, [t]);
  
  // Firebase upload
  const uploadToFirebase = useCallback(async (
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error(t('mediaUploader.authRequired'));
    }
    
    try {
      // Convert to blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image data');
      }
      
      const blob = await response.blob();
      
      // Create storage reference
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, `posts/${user.uid}/${filename}`);
      
      // Upload with progress tracking
      const uploadTask = uploadBytes(storageRef, blob);
      
      // Simulate progress for better UX (since uploadBytes doesn't provide real progress)
      const progressInterval = setInterval(() => {
        if (onProgress) {
          const fakeProgress = Math.min(Math.random() * 0.1 + 0.1, 0.9);
          onProgress(fakeProgress);
        }
      }, 200);
      
      const snapshot = await uploadTask;
      clearInterval(progressInterval);
      
      if (onProgress) onProgress(1);
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      secureLog('Image uploaded to Firebase', {
        userId: user.uid,
        filename,
        size: blob.size,
        timestamp: Date.now(),
      });
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase upload error:', error);
      secureLog('Firebase upload error', { 
        error: error.message,
        userId: user?.uid 
      });
      throw new Error(t('mediaUploader.uploadFailed'));
    }
  }, [t]);
  
  // Handle image selection from gallery
  const handleImagePicker = useCallback(async (multiple: boolean = false) => {
    if (disabled || isProcessing) return;
    
    try {
      // Check permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          t('mediaUploader.permissionTitle'),
          t('mediaUploader.permissionMessage')
        );
        return;
      }
      
      // Check image limit
      if (selectedImages.length >= maxImages) {
        Alert.alert(
          t('mediaUploader.limitTitle'),
          t('mediaUploader.limitMessage', { max: maxImages })
        );
        return;
      }
      
      setIsProcessing(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !multiple,
        allowsMultipleSelection: multiple,
        aspect: multiple ? undefined : [16, 9],
        quality: 1,
        selectionLimit: Math.min(maxImages - selectedImages.length, 5),
      });
      
      if (result.canceled || !result.assets.length) {
        setIsProcessing(false);
        return;
      }
      
      // Process selected images
      for (const asset of result.assets) {
        if (selectedImages.length >= maxImages) break;
        
        // Validate file
        const validation = validateFile({
          type: asset.type,
          fileSize: asset.fileSize,
        });
        
        if (!validation.isValid) {
          Alert.alert(t('mediaUploader.validationError'), validation.error);
          continue;
        }
        
        // Create media item
        const mediaItem: MediaItem = {
          id: `upload_${Date.now()}_${Math.random()}`,
          uri: asset.uri,
          type: 'image',
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
          uploadProgress: 0,
          isUploading: true,
        };
        
        // Add to uploading items
        setUploadingItems(prev => ({ ...prev, [mediaItem.id]: mediaItem }));
        createUploadAnimation(mediaItem.id);
        
        // Process and upload
        processAndUploadImage(mediaItem);
      }
      
      Vibration.vibrate(50);
      
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert(t('mediaUploader.error'), t('mediaUploader.selectionFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [
    disabled,
    isProcessing,
    selectedImages,
    maxImages,
    validateFile,
    createUploadAnimation,
    t,
  ]);
  
  // Handle camera capture
  const handleCamera = useCallback(async () => {
    if (disabled || isProcessing) return;
    
    try {
      // Check permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert(
          t('mediaUploader.cameraPermissionTitle'),
          t('mediaUploader.cameraPermissionMessage')
        );
        return;
      }
      
      // Check image limit
      if (selectedImages.length >= maxImages) {
        Alert.alert(
          t('mediaUploader.limitTitle'),
          t('mediaUploader.limitMessage', { max: maxImages })
        );
        return;
      }
      
      setIsProcessing(true);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });
      
      if (result.canceled || !result.assets.length) {
        setIsProcessing(false);
        return;
      }
      
      const asset = result.assets[0];
      
      // Validate file
      const validation = validateFile({
        type: asset.type,
        fileSize: asset.fileSize,
      });
      
      if (!validation.isValid) {
        Alert.alert(t('mediaUploader.validationError'), validation.error);
        setIsProcessing(false);
        return;
      }
      
      // Create media item
      const mediaItem: MediaItem = {
        id: `camera_${Date.now()}`,
        uri: asset.uri,
        type: 'image',
        size: asset.fileSize || 0,
        width: asset.width,
        height: asset.height,
        uploadProgress: 0,
        isUploading: true,
      };
      
      // Add to uploading items
      setUploadingItems(prev => ({ ...prev, [mediaItem.id]: mediaItem }));
      createUploadAnimation(mediaItem.id);
      
      // Process and upload
      processAndUploadImage(mediaItem);
      
      Vibration.vibrate(50);
      
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert(t('mediaUploader.error'), t('mediaUploader.cameraFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [
    disabled,
    isProcessing,
    selectedImages,
    maxImages,
    validateFile,
    createUploadAnimation,
    t,
  ]);
  
  // Process and upload image
  const processAndUploadImage = useCallback(async (mediaItem: MediaItem) => {
    try {
      // Update progress
      setUploadingItems(prev => ({
        ...prev,
        [mediaItem.id]: { ...prev[mediaItem.id], uploadProgress: 0.1 },
      }));
      
      // Optimize image
      const optimizedUri = await optimizeImage(mediaItem.uri);
      
      // Update progress
      setUploadingItems(prev => ({
        ...prev,
        [mediaItem.id]: { ...prev[mediaItem.id], uploadProgress: 0.3 },
      }));
      
      // Upload to Firebase
      const downloadURL = await uploadToFirebase(optimizedUri, (progress) => {
        setUploadingItems(prev => ({
          ...prev,
          [mediaItem.id]: { 
            ...prev[mediaItem.id], 
            uploadProgress: 0.3 + (progress * 0.7) 
          },
        }));
      });
      
      // Sanitize URL
      const sanitizedURL = sanitizeURL(downloadURL);
      if (!sanitizedURL) {
        throw new Error(t('mediaUploader.urlSecurityError'));
      }
      
      // Add to selected images
      onImagesUpdate([...selectedImages, sanitizedURL]);
      
      // Remove from uploading items
      removeUploadAnimation(mediaItem.id);
      setTimeout(() => {
        setUploadingItems(prev => {
          const newState = { ...prev };
          delete newState[mediaItem.id];
          return newState;
        });
      }, 200);
      
      secureLog('Image upload completed', {
        mediaId: mediaItem.id,
        finalUrl: sanitizedURL.substring(0, 50),
        timestamp: Date.now(),
      });
      
    } catch (error) {
      console.error('Image processing error:', error);
      
      // Update error state
      setUploadingItems(prev => ({
        ...prev,
        [mediaItem.id]: {
          ...prev[mediaItem.id],
          isUploading: false,
          error: error.message,
        },
      }));
      
      secureLog('Image upload failed', {
        mediaId: mediaItem.id,
        error: error.message,
      });
      
      Alert.alert(t('mediaUploader.uploadError'), error.message);
    }
  }, [
    optimizeImage,
    uploadToFirebase,
    selectedImages,
    onImagesUpdate,
    removeUploadAnimation,
    t,
  ]);
  
  // Remove uploaded image
  const handleRemoveImage = useCallback((imageUrl: string) => {
    Alert.alert(
      t('mediaUploader.removeTitle'),
      t('mediaUploader.removeMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => {
            const newImages = selectedImages.filter(img => img !== imageUrl);
            onImagesUpdate(newImages);
            Vibration.vibrate(30);
            
            secureLog('Image removed', {
              imageUrl: imageUrl.substring(0, 50),
              remainingCount: newImages.length,
            });
          },
        },
      ]
    );
  }, [selectedImages, onImagesUpdate, t]);
  
  // Remove uploading item
  const handleRemoveUploadingItem = useCallback((itemId: string) => {
    removeUploadAnimation(itemId);
    setTimeout(() => {
      setUploadingItems(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
    }, 200);
  }, [removeUploadAnimation]);
  
  // Retry failed upload
  const retryUpload = useCallback((itemId: string) => {
    const item = uploadingItems[itemId];
    if (item) {
      setUploadingItems(prev => ({
        ...prev,
        [itemId]: {
          ...item,
          isUploading: true,
          error: undefined,
          uploadProgress: 0,
        },
      }));
      processAndUploadImage(item);
    }
  }, [uploadingItems, processAndUploadImage]);
  
  // Memoized values
  const canAddMore = useMemo(() => 
    selectedImages.length < maxImages && !disabled,
  [selectedImages.length, maxImages, disabled]);
  
  const totalItems = useMemo(() => 
    selectedImages.length + Object.keys(uploadingItems).length,
  [selectedImages.length, uploadingItems]);
  
  // Render uploading item
  const renderUploadingItem = useCallback((item: MediaItem) => {
    const animation = uploadAnimations.current[item.id] || new Animated.Value(1);
    
    return (
      <Animated.View
        key={item.id}
        style={[
          styles.mediaItem,
          {
            transform: [{ scale: animation }],
            opacity: animation,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.2)', 'transparent']}
          style={styles.mediaItemGradient}
        >
          <Image source={{ uri: item.uri }} style={styles.mediaImage} />
          
          {/* Upload Overlay */}
          <View style={styles.uploadOverlay}>
            {item.isUploading ? (
              <View style={styles.uploadProgress}>
                <ActivityIndicator size="small" color="#00FFFF" />
                <Text style={styles.progressText}>
                  {Math.round((item.uploadProgress || 0) * 100)}%
                </Text>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { width: `${(item.uploadProgress || 0) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ) : item.error ? (
              <View style={styles.errorOverlay}>
                <Ionicons name="alert-circle" size={24} color="#FF6347" />
                <Text style={styles.errorText}>{t('mediaUploader.failed')}</Text>
                <TouchableOpacity
                  onPress={() => retryUpload(item.id)}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>{t('common.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            
            {/* Remove Button */}
            <TouchableOpacity
              onPress={() => handleRemoveUploadingItem(item.id)}
              style={styles.removeButton}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }, [retryUpload, handleRemoveUploadingItem, t]);
  
  // Render uploaded image
  const renderUploadedImage = useCallback((imageUrl: string, index: number) => (
    <TouchableOpacity
      key={imageUrl}
      style={styles.mediaItem}
      onPress={() => setShowImagePreview(imageUrl)}
      onLongPress={() => handleRemoveImage(imageUrl)}
    >
      <LinearGradient
        colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
        style={styles.mediaItemGradient}
      >
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.mediaImage}
          contentFit="cover"
          transition={200}
        />
        
        {/* Success Indicator */}
        <View style={styles.successIndicator}>
          <Ionicons name="checkmark-circle" size={20} color="#32CD32" />
        </View>
        
        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => handleRemoveImage(imageUrl)}
          style={styles.removeButton}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  ), [handleRemoveImage]);
  
  return (
    <View style={styles.container}>
      {/* Media Grid */}
      {(totalItems > 0 || selectedGif) && (
        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>{t('mediaUploader.attachedMedia')}</Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaGrid}
          >
            {/* Selected Images */}
            {selectedImages.map(renderUploadedImage)}
            
            {/* Uploading Items */}
            {Object.values(uploadingItems).map(renderUploadingItem)}
            
            {/* Selected GIF */}
            {selectedGif && (
              <View style={styles.gifContainer}>
                <LinearGradient
                  colors={['rgba(255, 215, 0, 0.2)', 'transparent']}
                  style={styles.gifGradient}
                >
                  <ExpoImage
                    source={{ uri: selectedGif }}
                    style={styles.gifImage}
                    contentFit="cover"
                    shouldAnimate
                  />
                  
                  {/* GIF Badge */}
                  <View style={styles.gifBadge}>
                    <Text style={styles.gifBadgeText}>GIF</Text>
                  </View>
                  
                  {/* Remove GIF */}
                  <TouchableOpacity
                    onPress={onGifRemove}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            )}
          </ScrollView>
          
          {/* Media Counter */}
          <Text style={styles.mediaCounter}>
            {t('mediaUploader.mediaCount', { 
              current: selectedImages.length, 
              max: maxImages 
            })}
          </Text>
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Gallery Button */}
        <TouchableOpacity
          style={[styles.actionButton, !canAddMore && styles.disabledButton]}
          onPress={() => handleImagePicker(false)}
          disabled={!canAddMore || isProcessing}
        >
          <LinearGradient
            colors={canAddMore ? ['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)'] : ['#333', '#222']}
            style={styles.buttonGradient}
          >
            <Ionicons 
              name="images" 
              size={20} 
              color={canAddMore ? "#00FFFF" : "#666"} 
            />
            <Text style={[styles.buttonText, !canAddMore && styles.disabledText]}>
              {t('mediaUploader.gallery')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Camera Button */}
        <TouchableOpacity
          style={[styles.actionButton, !canAddMore && styles.disabledButton]}
          onPress={handleCamera}
          disabled={!canAddMore || isProcessing}
        >
          <LinearGradient
            colors={canAddMore ? ['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)'] : ['#333', '#222']}
            style={styles.buttonGradient}
          >
            <Ionicons 
              name="camera" 
              size={20} 
              color={canAddMore ? "#00FFFF" : "#666"} 
            />
            <Text style={[styles.buttonText, !canAddMore && styles.disabledText]}>
              {t('mediaUploader.camera')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* GIF Button */}
        <TouchableOpacity
          style={[styles.actionButton, disabled && styles.disabledButton]}
          onPress={onShowGifSelector}
          disabled={disabled}
        >
          <LinearGradient
            colors={!disabled ? ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.1)'] : ['#333', '#222']}
            style={styles.buttonGradient}
          >
            <Ionicons 
              name="film" 
              size={20} 
              color={!disabled ? "#FFD700" : "#666"} 
            />
            <Text style={[styles.buttonText, { color: !disabled ? "#FFD700" : "#666" }]}>
              {t('mediaUploader.gif')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* Image Preview Modal */}
      <Modal
        visible={!!showImagePreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePreview(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewCloseArea}
            onPress={() => setShowImagePreview(null)}
          >
            <View style={styles.previewContainer}>
              <ExpoImage
                source={{ uri: showImagePreview || '' }}
                style={styles.previewImage}
                contentFit="contain"
              />
              
              <TouchableOpacity
                onPress={() => setShowImagePreview(null)}
                style={styles.previewCloseButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default MediaUploader;

/* ----------------- STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  mediaSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textShadowColor: '#FFD70066',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  mediaGrid: {
    paddingVertical: 8,
  },
  mediaItem: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaItemGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FFFF33',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadProgress: {
    alignItems: 'center',
  },
  progressText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  progressBarContainer: {
    width: 80,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00FFFF',
    borderRadius: 2,
  },
  errorOverlay: {
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6347',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    color: '#FF6347',
    fontSize: 10,
    fontWeight: 'bold',
  },
  successIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 2,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  gifContainer: {
    width: THUMBNAIL_SIZE * 1.2,
    height: THUMBNAIL_SIZE,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gifGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFD70066',
  },
  gifImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  gifBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gifBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mediaCounter: {
    color: '#888',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#00FFFF33',
  },
  buttonText: {
    color: '#00FFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  disabledText: {
    color: '#666',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  previewCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
});