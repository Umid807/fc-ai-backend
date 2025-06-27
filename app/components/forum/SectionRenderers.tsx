import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

// Types
interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: any;
  config: {
    type: 'text' | 'image' | 'quote' | 'table' | 'video' | 'poll';
    allowEmpty: boolean;
  };
  order: number;
  showLabel?: boolean;
  images?: any[];
  imageSize?: 'Small' | 'Medium' | 'Large' | 'Full';
  quoteData?: {
    text: string;
    attribution: string;
    source?: string;
    platform?: 'twitter' | 'twitch' | 'youtube' | 'reddit';
  };
  quoteStyle?: 'Gold' | 'Green' | 'Blue' | 'Clear';
  tableData?: {
    template: string;
    headers: string[];
    rows: string[][];
    styling: {
      theme: 'blue' | 'gold' | 'dark' | 'green' | 'purple';
      showBorders: boolean;
      alternateRows: boolean;
      headerStyle: 'bold' | 'normal';
    };
  };
  videoData?: {
    url: string;
    platform: 'youtube' | 'twitch' | 'streamable' | 'tiktok' | 'twitter' | 'other';
    title?: string;
    description?: string;
    embedUrl?: string;
    thumbnailUrl?: string;
  };
  pollData?: {
    question: string;
    options: string[];
    settings: {
      isAnonymous: boolean;
      allowMultipleVotes: boolean;
      showResultsAfterVote: boolean;
    };
  };
  sectionBackground?: 'dark' | 'light' | 'transparent' | 'gradient';
  customStyle?: any;
}

interface SectionRendererProps {
  section: TemplateSection;
  isEditing?: boolean;
  onPreviewInteraction?: (action: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ================================================================
// TABLE THEMES (Gaming-focused)
// ================================================================
const TABLE_THEMES = {
  blue: {
    name: 'Ocean Blue',
    headerBg: '#003d82',
    headerText: '#FFFFFF',
    rowBg: '#001122',
    altRowBg: '#002244',
    borderColor: '#0066CC',
    textColor: '#FFFFFF',
  },
  gold: {
    name: 'Champions Gold',
    headerBg: '#B8860B',
    headerText: '#000000',
    rowBg: '#1a1a00',
    altRowBg: '#2d2d00',
    borderColor: '#FFD700',
    textColor: '#FFD700',
  },
  dark: {
    name: 'Midnight',
    headerBg: '#1a1a1a',
    headerText: '#FFFFFF',
    rowBg: '#0d0d0d',
    altRowBg: '#1a1a1a',
    borderColor: '#333333',
    textColor: '#CCCCCC',
  },
  green: {
    name: 'Matrix Green',
    headerBg: '#006400',
    headerText: '#FFFFFF',
    rowBg: '#001100',
    altRowBg: '#002200',
    borderColor: '#32CD32',
    textColor: '#32CD32',
  },
  purple: {
    name: 'Royal Purple',
    headerBg: '#4B0082',
    headerText: '#FFFFFF',
    rowBg: '#1a0033',
    altRowBg: '#2d0066',
    borderColor: '#9370DB',
    textColor: '#DDA0DD',
  },
};

// ================================================================
// ENHANCED TABLE RENDERER - Complete fix for object rendering
// ================================================================
export const TableRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false,
  onPreviewInteraction 
}) => {
  const tableData = section.tableData;
  
  if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="grid" size={32} color="#888" />
        <Text style={styles.fallbackText}>📊 Table data not configured</Text>
        <Text style={styles.fallbackSubtext}>Add table content in edit mode</Text>
      </View>
    );
  }

  const theme = TABLE_THEMES[tableData.styling?.theme || 'blue'];
  const styling = tableData.styling || {
    theme: 'blue',
    showBorders: true,
    alternateRows: true,
    headerStyle: 'bold',
  };

  // Ensure all data is safely converted to strings
  const safeHeaders = tableData.headers.map((header, index) => 
    String(header || `Column ${index + 1}`)
  );
  
  const safeRows = tableData.rows.map((row, rowIndex) => 
    Array.isArray(row) 
      ? row.map((cell, cellIndex) => String(cell || ''))
      : Array(safeHeaders.length).fill('').map((_, cellIndex) => String(row || ''))
  );

  return (
    <View style={[styles.tableContainer, isEditing && styles.editingOverlay]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.table}>
          {/* Headers Row */}
          <View style={styles.tableRow}>
            {safeHeaders.map((header, colIndex) => (
              <View
                key={`header-${colIndex}-${header.length}`}
                style={[
                  styles.tableCell,
                  styles.headerCell,
                  {
                    backgroundColor: theme.headerBg,
                    borderColor: theme.borderColor,
                    borderWidth: styling.showBorders ? 1 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cellText,
                    styles.headerText,
                    {
                      color: theme.headerText,
                      fontWeight: styling.headerStyle === 'bold' ? 'bold' : 'normal',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {header}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Data Rows */}
          {safeRows.map((row, rowIndex) => (
            <View key={`row-${rowIndex}-${row.length}`} style={styles.tableRow}>
              {row.map((cell, colIndex) => (
                <View
                  key={`cell-${rowIndex}-${colIndex}-${String(cell).length}`}
                  style={[
                    styles.tableCell,
                    {
                      backgroundColor: styling.alternateRows && rowIndex % 2 === 1
                        ? theme.altRowBg
                        : theme.rowBg,
                      borderColor: theme.borderColor,
                      borderWidth: styling.showBorders ? 1 : 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      { color: theme.textColor },
                    ]}
                    numberOfLines={3}
                  >
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Table Info Footer */}
      <View style={styles.tableFooter}>
        <LinearGradient
          colors={[`${theme.borderColor}20`, 'transparent']}
          style={styles.tableFooterGradient}
        >
          <Ionicons name="grid" size={14} color={theme.borderColor} />
          <Text style={[styles.tableThemeText, { color: theme.borderColor }]}>
            {theme.name} • {safeRows.length} rows • {safeHeaders.length} columns
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

// ================================================================
// ENHANCED VIDEO RENDERER - Complete fix for object rendering
// ================================================================
export const VideoRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false,
  onPreviewInteraction 
}) => {
  const videoData = section.videoData;
  
  if (!videoData || !videoData.url) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="videocam" size={32} color="#888" />
        <Text style={styles.fallbackText}>🎬 Video not configured</Text>
        <Text style={styles.fallbackSubtext}>Add video URL in edit mode</Text>
      </View>
    );
  }

  const platformInfo = {
    youtube: { color: '#FF0000', icon: 'logo-youtube', name: 'YouTube' },
    twitch: { color: '#9146FF', icon: 'game-controller', name: 'Twitch' },
    streamable: { color: '#00D4AA', icon: 'play-circle', name: 'Streamable' },
    tiktok: { color: '#000000', icon: 'musical-notes', name: 'TikTok' },
    twitter: { color: '#1DA1F2', icon: 'logo-twitter', name: 'Twitter' },
    other: { color: '#888888', icon: 'videocam', name: 'Video' },
  };

  const platform = platformInfo[videoData.platform] || platformInfo.other;
  const safeTitle = String(videoData.title || 'Video');
  const safeDescription = String(videoData.description || '');
  const safeUrl = String(videoData.url || '');
  const safeEmbedUrl = String(videoData.embedUrl || '');

  return (
    <View style={[styles.videoContainer, isEditing && styles.editingOverlay]}>
      {/* Video Player */}
      <View style={styles.videoPlayer}>
        {safeEmbedUrl ? (
          <WebView
            source={{ uri: safeEmbedUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onError={() => onPreviewInteraction?.('video_error')}
            renderError={() => (
              <View style={styles.videoErrorContainer}>
                <Ionicons name="warning" size={32} color="#FF6B6B" />
                <Text style={styles.videoErrorText}>Failed to load video</Text>
              </View>
            )}
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
              style={styles.placeholderGradient}
            >
              <Ionicons 
                name="play-circle" 
                size={48} 
                color="#FFFFFF" 
              />
              <Text style={styles.placeholderText}>Video Preview</Text>
              <Text style={styles.placeholderSubtext}>
                {platform.name} • Preview Mode
              </Text>
            </LinearGradient>
          </View>
        )}
        
        {/* Platform Badge */}
        <View style={[styles.platformBadge, { backgroundColor: platform.color }]}>
          <Ionicons 
            name={platform.icon as any} 
            size={14} 
            color="#FFFFFF" 
          />
        </View>

        {/* Play Overlay for Preview */}
        {!safeEmbedUrl && (
          <TouchableOpacity 
            style={styles.playOverlay}
            onPress={() => onPreviewInteraction?.('video_link')}
          >
            <LinearGradient
              colors={['rgba(0, 255, 255, 0.9)', 'rgba(106, 90, 205, 0.7)']}
              style={styles.playOverlayGradient}
            >
              <Ionicons name="play" size={24} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Video Info */}
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {safeTitle}
        </Text>
        {safeDescription && (
          <Text style={styles.videoDescription} numberOfLines={3}>
            {safeDescription}
          </Text>
        )}
        <TouchableOpacity 
          style={styles.videoLink}
          onPress={() => onPreviewInteraction?.('video_link')}
        >
          <LinearGradient
            colors={['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)']}
            style={styles.videoLinkGradient}
          >
            <Ionicons name="open-outline" size={14} color="#00FFFF" />
            <Text style={styles.videoLinkText}>View Original</Text>
            <Ionicons name="arrow-forward" size={12} color="#00FFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ================================================================
// ENHANCED POLL RENDERER - Complete fix for object rendering
// ================================================================
export const PollRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false,
  onPreviewInteraction 
}) => {
  const pollData = section.pollData;
  
  if (!pollData || !Array.isArray(pollData.options) || pollData.options.length === 0) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="stats-chart" size={32} color="#888" />
        <Text style={styles.fallbackText}>🗳️ Poll not configured</Text>
        <Text style={styles.fallbackSubtext}>Add poll options in edit mode</Text>
      </View>
    );
  }

  // Generate consistent mock data for preview
  const generateMockVotes = useCallback((optionIndex: number, totalOptions: number) => {
    const baseVotes = 15 + (optionIndex * 8);
    const variationFactor = (optionIndex + 1) * 4;
    return baseVotes + (variationFactor % 30);
  }, []);

  const safeQuestion = String(pollData.question || 'Poll Question');
  const safeOptions = pollData.options.map(option => String(option || 'Option'));
  
  // Calculate mock results
  const mockVotes = safeOptions.map((_, index) => 
    generateMockVotes(index, safeOptions.length)
  );
  const totalVotes = mockVotes.reduce((sum, votes) => sum + votes, 0);
  
  const mockResults = mockVotes.map(votes => ({
    votes,
    percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
  }));

  return (
    <View style={[styles.pollContainer, isEditing && styles.editingOverlay]}>
      {/* Poll Header */}
      <View style={styles.pollHeader}>
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.1)', 'rgba(0, 255, 255, 0.05)']}
          style={styles.pollHeaderGradient}
        >
          <View style={styles.pollQuestionContainer}>
            <Ionicons name="stats-chart" size={20} color="#FFD700" />
            <Text style={styles.pollQuestion} numberOfLines={3}>
              {safeQuestion}
            </Text>
          </View>
          
          <View style={styles.pollMetadata}>
            {pollData.settings?.isAnonymous && (
              <View style={styles.pollBadge}>
                <Ionicons name="eye-off" size={12} color="#888" />
                <Text style={styles.pollBadgeText}>Anonymous</Text>
              </View>
            )}
            {pollData.settings?.allowMultipleVotes && (
              <View style={styles.pollBadge}>
                <Ionicons name="checkmark-done" size={12} color="#32CD32" />
                <Text style={styles.pollBadgeText}>Multiple votes</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
      
      {/* Poll Options */}
      <View style={styles.pollOptions}>
        {safeOptions.map((option, index) => {
          const result = mockResults[index];
          const isLeading = result.votes === Math.max(...mockVotes);
          
          return (
            <TouchableOpacity
              key={`poll-option-${index}-${option.length}`}
              style={[
                styles.pollOption,
                isLeading && styles.pollOptionLeading
              ]}
              onPress={() => onPreviewInteraction?.('poll_vote')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isLeading 
                    ? ['rgba(0, 255, 255, 0.2)', 'rgba(0, 255, 255, 0.1)']
                    : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
                }
                style={styles.pollOptionGradient}
              >
                <View style={styles.pollOptionHeader}>
                  <Ionicons 
                    name={isLeading ? "radio-button-on" : "radio-button-off"} 
                    size={16} 
                    color={isLeading ? "#00FFFF" : "#CCCCCC"} 
                  />
                  <Text style={[
                    styles.pollOptionText,
                    isLeading && styles.pollOptionTextLeading
                  ]} numberOfLines={2}>
                    {option}
                  </Text>
                  <View style={styles.pollOptionStats}>
                    <Text style={[
                      styles.pollOptionVotes,
                      isLeading && styles.pollOptionVotesLeading
                    ]}>
                      {result.votes}
                    </Text>
                  </View>
                </View>
                
                {/* Results Bar */}
                <View style={styles.pollResultContainer}>
                  <View style={styles.pollResultBar}>
                    <LinearGradient
                      colors={
                        isLeading 
                          ? ['#00FFFF', '#6A5ACD']
                          : ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']
                      }
                      style={[
                        styles.pollResultFill, 
                        { width: `${Math.min(Math.max(result.percentage, 0), 100)}%` }
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.pollResultText,
                    isLeading && styles.pollResultTextLeading
                  ]}>
                    {result.percentage}%
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Poll Footer */}
      <View style={styles.pollFooter}>
        <LinearGradient
          colors={['rgba(0, 255, 255, 0.1)', 'transparent']}
          style={styles.pollFooterGradient}
        >
          <View style={styles.pollStats}>
            <Ionicons name="people" size={14} color="#888" />
            <Text style={styles.pollStatsText}>
              {totalVotes} total votes • Preview mode
            </Text>
          </View>
          
          {pollData.settings?.showResultsAfterVote && (
            <View style={styles.pollNote}>
              <Ionicons name="eye" size={12} color="#00FFFF" />
              <Text style={styles.pollNoteText}>Results shown after voting</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </View>
  );
};

// ================================================================
// ENHANCED QUOTE RENDERER
// ================================================================
export const QuoteRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false 
}) => {
  const quoteStyle = section.quoteStyle || 'Gold';
  const safeContent = String(section.content || 'Quote text...');
  
  const quoteStyles = {
    Gold: { 
      color: '#FFD700', 
      bg: 'rgba(255, 215, 0, 0.1)', 
      border: '#FFD700',
      icon: 'trophy'
    },
    Green: { 
      color: '#32CD32', 
      bg: 'rgba(50, 205, 50, 0.1)', 
      border: '#32CD32',
      icon: 'code-slash'
    },
    Blue: { 
      color: '#00BFFF', 
      bg: 'rgba(0, 191, 255, 0.1)', 
      border: '#00BFFF',
      icon: 'water'
    },
    Clear: { 
      color: '#FFFFFF', 
      bg: 'transparent', 
      border: 'rgba(255, 255, 255, 0.3)',
      icon: 'contract'
    },
  };
  
  const currentStyle = quoteStyles[quoteStyle] || quoteStyles.Gold;
  const safeAttribution = section.quoteData?.attribution ? String(section.quoteData.attribution) : '';
  const safeSource = section.quoteData?.source ? String(section.quoteData.source) : '';

  return (
    <View style={[styles.quoteContainer, isEditing && styles.editingOverlay]}>
      <LinearGradient
        colors={[currentStyle.bg, 'transparent']}
        style={[styles.quoteGradient, { borderLeftColor: currentStyle.border }]}
      >
        <View style={styles.quoteHeader}>
          <Ionicons 
            name={currentStyle.icon as any} 
            size={20} 
            color={currentStyle.color} 
          />
          <Text style={styles.quoteStyleLabel}>
            {quoteStyle} Quote
          </Text>
        </View>
        
<Text style={[styles.quoteText, { color: currentStyle.color }]}>
  "{section.quoteData?.text || safeContent}"
</Text>

{safeAttribution && (
  <Text style={[styles.quoteAttribution, { color: currentStyle.color }]}>
    — {safeAttribution}
    {safeSource && ` • ${safeSource}`}
  </Text>
)}
      </LinearGradient>
    </View>
  );
};

// ================================================================
// ENHANCED IMAGE RENDERER - Live sizing support
// ================================================================
export const ImageRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false 
}) => {
  if (!section.images || !Array.isArray(section.images) || section.images.length === 0) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="image" size={32} color="#888" />
        <Text style={styles.fallbackText}>🖼️ No images added</Text>
        <Text style={styles.fallbackSubtext}>Add images in edit mode</Text>
      </View>
    );
  }

  const imageSize = section.imageSize || 'Medium';
  const imageDimensions = {
    Small: { width: 120, height: 90, columns: 3 },
    Medium: { width: 200, height: 150, columns: 2 },
    Large: { width: 280, height: 200, columns: 1 },
    Full: { width: SCREEN_WIDTH - 80, height: 250, columns: 1 }
  }[imageSize] || { width: 200, height: 150, columns: 2 };

const renderImageLayout = () => {
  if (imageSize === 'Large') {
    // Large size - vertical ScrollView to show all images
    return (
      <ScrollView 
        horizontal={false}
        showsVerticalScrollIndicator={false}
        style={styles.imageScroll}
        contentContainerStyle={styles.imageScrollContent}
      >
        {section.images.map((image: any, index: number) => renderSingleImage(image, index))}
      </ScrollView>
    );
  } else if (imageDimensions.columns === 1 || section.images.length === 1) {
    // Single column or single image - use ScrollView
    return (
      <ScrollView 
        horizontal={imageSize !== 'Full'} 
        showsHorizontalScrollIndicator={false}
        style={styles.imageScroll}
        contentContainerStyle={styles.imageScrollContent}
      >
        {section.images.map((image: any, index: number) => renderSingleImage(image, index))}
      </ScrollView>
    );
  } else {
    // Multi-column grid
    return (
      <View style={styles.imageGrid}>
        {section.images.map((image: any, index: number) => renderSingleImage(image, index))}
      </View>
    );
  }
};

  const renderSingleImage = (image: any, index: number) => {
    let imageUri = '';
    let imageCaption = '';
    
    if (typeof image === 'string') {
      imageUri = image;
    } else if (image && typeof image === 'object') {
      imageUri = String(image.uri || image.url || '');
      imageCaption = String(image.caption || '');
    }
    
    const safeKey = `image-${index}-${imageUri.length || 0}`;
    
    return (
      <View 
        key={safeKey} 
        style={[
          styles.imageItem,
          { 
            width: imageDimensions.width,
            marginRight: imageDimensions.columns > 1 ? 8 : 12
          }
        ]}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: imageUri }}
            style={[
              styles.imagePreview,
              imageDimensions,
              isEditing && styles.imageEditing
            ]}
            resizeMode="cover"
          />
          
          {/* Image Overlay Info */}
          <View style={styles.imageOverlay}>
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.6)']}
              style={styles.imageOverlayGradient}
            >
              <Text style={styles.imageSizeIndicator}>
                {imageSize}
              </Text>
            </LinearGradient>
          </View>
        </View>
        
        {imageCaption && (
          <Text style={styles.imageCaption} numberOfLines={2}>
            {imageCaption}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.imageContainer, isEditing && styles.editingOverlay]}>
      <View style={styles.imageHeader}>
        <View style={styles.imageSizeInfo}>
          <Ionicons name="resize" size={16} color="#32CD32" />
          <Text style={styles.imageSizeText}>
            {imageSize} • {section.images.length} image{section.images.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {renderImageLayout()}
    </View>
  );
};

// ================================================================
// ENHANCED TEXT RENDERER
// ================================================================
export const TextRenderer: React.FC<SectionRendererProps> = ({ 
  section, 
  isEditing = false 
}) => {
  const safeContent = String(section.content || '');
  
  if (!safeContent.trim()) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="document-text" size={32} color="#888" />
        <Text style={styles.fallbackText}>📝 No content added</Text>
        <Text style={styles.fallbackSubtext}>Add text content in edit mode</Text>
      </View>
    );
  }

  const textStyle = {
    color: section.style?.color || '#FFFFFF',
    fontSize: section.style?.fontSize || 16,
    fontWeight: section.style?.fontWeight || 'normal' as const,
    fontStyle: section.style?.fontStyle || 'normal' as const,
    textAlign: section.style?.textAlign || 'left' as const,
    lineHeight: 22,
  };

  return (
    <View style={[styles.textContainer, isEditing && styles.editingOverlay]}>
      <Text style={[styles.textContent, textStyle]}>
        {safeContent}
      </Text>
    </View>
  );
};

// ================================================================
// MAIN SECTION RENDERER
// ================================================================
export const SectionRenderer: React.FC<SectionRendererProps> = (props) => {
  const { section } = props;
  
  switch (section.config.type) {
    case 'table':
      return <TableRenderer {...props} />;
    case 'video':
      return <VideoRenderer {...props} />;
    case 'poll':
      return <PollRenderer {...props} />;
    case 'quote':
      return <QuoteRenderer {...props} />;
    case 'image':
      return <ImageRenderer {...props} />;
    default:
      return <TextRenderer {...props} />;
  }
};

// ================================================================
// COMPREHENSIVE STYLES
// ================================================================
const styles = StyleSheet.create({
  // Common Styles
  fallbackContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    minHeight: 100,
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  fallbackSubtext: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  editingOverlay: {
    borderWidth: 2,
    borderColor: '#00FFFF',
    borderRadius: 8,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    
  },
  
  // Table Styles
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  table: {
    minWidth: SCREEN_WIDTH - 80,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    minWidth: 100,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerCell: {
    minHeight: 50,
  },
  cellText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  headerText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tableFooter: {
    overflow: 'hidden',
  },
  tableFooterGradient: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tableThemeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Video Styles
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderSubtext: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  platformBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  playOverlayGradient: {
    padding: 8,
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    gap: 8,
  },
  videoErrorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    lineHeight: 22,
  },
  videoDescription: {
    color: '#CCCCCC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  videoLink: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoLinkGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  videoLinkText: {
    color: '#00FFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Poll Styles
  pollContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  pollHeader: {
    overflow: 'hidden',
  },
  pollHeaderGradient: {
    padding: 16,
  },
  pollQuestionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  pollQuestion: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    lineHeight: 24,
  },
  pollMetadata: {
    flexDirection: 'row',
    gap: 8,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(136, 136, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pollBadgeText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
  },
  pollOptions: {
    padding: 16,
    gap: 12,
  },
  pollOption: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pollOptionLeading: {
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  pollOptionGradient: {
    padding: 16,
  },
  pollOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  pollOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  pollOptionTextLeading: {
    color: '#00FFFF',
    fontWeight: '700',
  },
  pollOptionStats: {
    alignItems: 'flex-end',
  },
  pollOptionVotes: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pollOptionVotesLeading: {
    color: '#00FFFF',
  },
  pollResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pollResultBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  pollResultFill: {
    height: '100%',
    borderRadius: 3,
  },
  pollResultText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  pollResultTextLeading: {
    color: '#00FFFF',
  },
  pollFooter: {
    overflow: 'hidden',
  },
  pollFooterGradient: {
    padding: 16,
    gap: 8,
  },
  pollStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollStatsText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  pollNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollNoteText: {
    color: '#00FFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Quote Styles
  quoteContainer: {
    marginVertical: 8,
  },
  quoteGradient: {
    padding: 20,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  quoteStyleLabel: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
    marginBottom: 12,
  },
  quoteAttribution: {
    fontSize: 14,
    textAlign: 'right',
    opacity: 0.8,
    fontWeight: '500',
  },
  
  // Image Styles
  imageContainer: {
    marginVertical: 8,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageSizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageSizeText: {
    color: '#32CD32',
    fontSize: 12,
    fontWeight: '600',
  },
  imageScroll: {
    flexDirection: 'row',
  },
  imageScrollContent: {
    paddingRight: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageItem: {
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageEditing: {
    borderWidth: 2,
    borderColor: '#32CD32',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  imageOverlayGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  imageSizeIndicator: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    alignSelf: 'flex-end',
  },
  imageCaption: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  
  // Text Styles
  textContainer: {
    marginVertical: 4,
  },
  textContent: {
    lineHeight: 22,
  },
});