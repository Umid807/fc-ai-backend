import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import { Image as ExpoImage } from 'expo-image';
import HeartBurst from '../HeartBurst';

// Types
interface Post {
  id: string;
  title: string;
  content: string;
  username: string;
  userId: string;
  userAvatar: string;
  likes: number;
  comments: number;
  engagement: number;
  images?: string[];
  gif?: string;
  vip?: boolean;
  category?: string;
  likedBy?: string[];
  createdAt: any;
}

interface PostAuthor {
  uid: string;
  username: string;
  profileImage: string;
  reputation?: number;
  vip?: boolean;
  rank?: string;
}

interface PostContentProps {
  post: Post;
  postAuthor: PostAuthor | null;
  onShowQuickInfo: (userData: any, fromBanner?: boolean) => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void; // NEW: Add comment handler
  hasLiked: boolean;
  isSaved: boolean;
  canInteract: boolean;
  showHeartAnim: boolean;
  heartAnimCoords: { x: number; y: number };
  translationButton?: React.ReactNode; // NEW: Translation button support
}

const PostContent: React.FC<PostContentProps> = ({
  post,
  postAuthor,
  onShowQuickInfo,
  onLike,
  onSave,
  onComment, // NEW: Add comment prop
  hasLiked,
  isSaved,
  canInteract,
  showHeartAnim,
  heartAnimCoords,
  translationButton, // NEW: Translation button prop
}) => {
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `https://fc25locker.com/post/${post.id}`;
      const shareContent = {
        message: `Check out this post: "${post.title}" - ${shareUrl}`,
        url: shareUrl,
      };
      
      await Share.share(shareContent);
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Share Error', 'Unable to share post at this time.');
    }
  }, [post.id, post.title]);

  const handleImageError = useCallback((imageUrl: string) => {
    setImageLoadErrors(prev => new Set(prev).add(imageUrl));
  }, []);

  const handleProfilePress = useCallback(() => {
    if (!postAuthor) return;

    onShowQuickInfo({
      uid: post.userId,
      username: post.username,
      profileImage: post.userAvatar || postAuthor.profileImage,
      reputation: postAuthor.reputation ?? 0,
      vip: postAuthor.vip ?? false,
      rank: postAuthor.rank ?? '',
    }, true);
  }, [postAuthor, post, onShowQuickInfo]);

  // ================================================================
  // RENDER COMPONENTS
  // ================================================================

  const renderProfileBanner = () => (
    <View style={styles.profileBannerContainer}>
      <ImageBackground
        source={require('../../assets/images/bk17.png')}
        style={styles.profileBannerImageBackground}
        imageStyle={{ borderRadius: 8 }}
      >
        <TouchableOpacity
          style={styles.profileBanner}
          onPress={handleProfilePress}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.username}'s profile`}
        >
          {/* Avatar with VIP glow effect */}
          <View style={styles.avatarContainer}>
            {postAuthor?.vip && <View style={styles.vipGlow} />}
            <Image
              source={{ 
                uri: postAuthor?.profileImage || post.userAvatar || 'https://via.placeholder.com/80' 
              }}
              style={styles.userAvatar}
              onError={() => console.warn('Avatar load failed')}
            />
          </View>

          {/* Author Info */}
          <View style={styles.authorInfo}>
            <Text style={styles.authorName} numberOfLines={1}>
              {postAuthor?.username || post.username || 'Anonymous'}
            </Text>
            <View style={styles.statsRow}>
              {postAuthor?.vip && (
                <Text style={styles.vipText}>VIP</Text>
              )}
              {postAuthor?.reputation !== undefined && (
                <Text style={styles.repText}>
                  {postAuthor.vip ? '  |  ' : ''}Rep: {postAuthor.reputation}
                </Text>
              )}
              {postAuthor?.rank && (
                <Text style={styles.rankText}>  •  {postAuthor.rank}</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );

  const renderPostContent = () => (
    <View style={styles.postContainer}>
      {/* Title with trending badge */}
      <View style={styles.titleContainer}>
        <Text style={styles.title} accessibilityRole="header">
          {post.title}
        </Text>
        {post.engagement && post.engagement > 1000 && (
          <View style={styles.trendingBadge}>
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
      </View>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagesScroll}
          accessibilityLabel={`${post.images.length} images`}
        >
          {post.images.map((imgUrl, idx) => {
            if (imageLoadErrors.has(imgUrl)) {
              return null; // Skip failed images
            }

            return (
              <Image
                key={`${imgUrl}-${idx}`}
                source={{ uri: imgUrl }}
                style={styles.attachedImage}
                onError={() => handleImageError(imgUrl)}
                accessibilityLabel={`Post image ${idx + 1}`}
              />
            );
          })}
        </ScrollView>
      )}

      {/* Text Content */}
      {post.content && (
        <View style={styles.contentContainer}>
          <Markdown style={markdownStyles}>
            {post.content}
          </Markdown>
        </View>
      )}

      {/* GIF */}

{post.gif && !imageLoadErrors.has(post.gif) && (
  <View style={styles.gifContainer}>
    <Text style={styles.gifLabel}>GIF</Text>
    <ExpoImage
      source={{ uri: post.gif }}
      style={styles.gifImage}
      contentFit="cover"
      placeholder={require('../../assets/images/post_match.png')}
      onError={() => handleImageError(post.gif!)}
      accessibilityLabel="Post GIF"
    />
  </View>
)}

{/* Translation Button - Inside Post Container */}
{translationButton && (
  <View style={styles.postTranslationContainer}>
    {translationButton}
  </View>
)}
    </View>
    
  );

  const renderEngagementRow = () => (
    <View style={styles.engagementContainer}>
      <View style={styles.engagementRow}>
        {/* Like Button */}
        <TouchableOpacity
          style={[
            styles.engagementButton,
            hasLiked && styles.engagementButtonLiked,
            !canInteract && styles.engagementButtonDisabled,
          ]}
          onPress={onLike}
          disabled={!canInteract || hasLiked}
          accessibilityRole="button"
          accessibilityLabel={`${hasLiked ? 'Unlike' : 'Like'} post. ${post.likes || 0} likes`}
          accessibilityState={{ selected: hasLiked, disabled: !canInteract }}
        >
          <Ionicons
            name={hasLiked ? "heart" : "heart-outline"}
            size={24}
            color={hasLiked ? "#FF6347" : "#FFD700"}
          />
          <Text style={[
            styles.engagementText,
            hasLiked && styles.engagementTextLiked,
          ]}>
            {post.likes || 0}
          </Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.engagementButton}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Share post"
        >
          <Ionicons name="share-social" size={20} color="#FFD700" />
          <Text style={styles.engagementText}>Share</Text>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.engagementButton,
            isSaved && styles.engagementButtonSaved,
            !canInteract && styles.engagementButtonDisabled,
          ]}
          onPress={onSave}
          disabled={!canInteract || isSaved}
          accessibilityRole="button"
          accessibilityLabel={`${isSaved ? 'Unsave' : 'Save'} post`}
          accessibilityState={{ selected: isSaved, disabled: !canInteract }}
        >
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={isSaved ? "#FFD700" : "#999"}
          />
          <Text style={[
            styles.engagementText,
            isSaved && styles.engagementTextSaved,
          ]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>

      </View>

{/* Comment Section - ENHANCED GAMING STYLE */}
      <View style={styles.commentSection}>
        <TouchableOpacity
          style={[
            styles.gamingCommentButton,
            !canInteract && styles.commentButtonDisabled,
          ]}
          onPress={onComment}
          disabled={!canInteract}
          accessibilityRole="button"
          accessibilityLabel="Join discussion"
        >
          {/* Gaming button border effect */}
          <View style={styles.gamingButtonBorder}>
            <LinearGradient
              colors={['#00FFFF', '#0080FF', '#6A5ACD']}
              style={styles.gamingButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.gamingButtonContent}>
                <View style={styles.commentIconWrapper}>
                  <Ionicons name="chatbubbles" size={22} color="#000" />
                  {post.comments > 0 && (
                    <View style={styles.commentCountBadge}>
                      <Text style={styles.commentCountText}>{post.comments}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.gamingButtonText}>
                  WRITE A COMMENT
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#000" />
              </View>
            </LinearGradient>
          </View>
          
          {/* Subtle glow effect */}
          <View style={styles.gamingButtonGlow} />
        </TouchableOpacity>
      </View>

      {/* Heart Animation */}
      {showHeartAnim && (
        <View style={[
          styles.heartAnimationContainer,
          {
            left: heartAnimCoords.x - 25,
            top: heartAnimCoords.y - 25,
          }
        ]}>
          <HeartBurst onComplete={() => {}} />
        </View>
      )}
    </View>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <View style={styles.container}>
      {renderProfileBanner()}
      {renderPostContent()}
      {renderEngagementRow()}
    </View>
  );
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  
  postTranslationContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 255, 0.2)',
  },
  // Profile Banner
  profileBannerContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  profileBannerImageBackground: {
    minHeight: 80,
  },
  profileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    minHeight: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  vipGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 33,
    backgroundColor: '#FFD700',
    opacity: 0.4,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 255, 0.5)',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  vipText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  repText: {
    color: '#ccc',
    fontSize: 14,
  },
  rankText: {
    color: '#87CEFA',
    fontSize: 14,
    fontWeight: '600',
  },

  commentButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  commentButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  commentButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Post Content
  postContainer: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    lineHeight: 32,
  },
  trendingBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  trendingText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  imagesScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  attachedImage: {
    width: 280,
    height: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
  },
  contentContainer: {
    marginVertical: 8,
  },
  gifContainer: {
    alignSelf: 'center',
    width: 200,
    height: 150,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 16,
    position: 'relative',
  },
  gifLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    color: '#FFD700',
    fontSize: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
    fontWeight: 'bold',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },

  // Engagement
  engagementContainer: {
    position: 'relative',
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  engagementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  
  engagementButtonLiked: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
  },
  engagementButtonSaved: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  engagementButtonDisabled: {
    opacity: 0.5,
  },
  engagementText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  engagementTextLiked: {
    color: '#FF6347',
  },
  engagementTextSaved: {
    color: '#FFD700',
  },

  // Translation Button Container - NEW
  translationButtonContainer: {
    // Styling will be handled by the TranslationButton component itself
  },

  heartAnimationContainer: {
    position: 'absolute',
    width: 50,
    height: 50,
    zIndex: 100,
  },

// Comment Section - ENHANCED GAMING STYLE
  commentSection: {
    marginTop: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  gamingCommentButton: {
    position: 'relative',
    minWidth: 260,
    height: 54,
  },
  gamingButtonBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 27,
    padding: 2,
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
  },
  gamingButtonGradient: {
    flex: 1,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gamingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  commentIconWrapper: {
    position: 'relative',
  },
  commentCountBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6347',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  commentCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  gamingButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  gamingButtonGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 29,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    zIndex: -1,
  },
  commentButtonDisabled: {
    opacity: 0.5,
  },
});

// Markdown Styles
const markdownStyles = {
  body: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: {
    color: '#00FFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  heading2: {
    color: '#00FFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paragraph: {
    color: '#fff',
    marginBottom: 8,
    lineHeight: 22,
  },
  strong: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  em: {
    color: '#00FFFF',
    fontStyle: 'italic',
  },
  link: {
    color: '#00FFFF',
    textDecorationLine: 'underline',
  },
  code_inline: {
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    color: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  code_block: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#00FFFF',
    marginVertical: 8,
  },
  blockquote: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#00FFFF',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    fontStyle: 'italic',
  },
  list_item: {
    color: '#fff',
    marginBottom: 4,
  },
};

export default memo(PostContent);