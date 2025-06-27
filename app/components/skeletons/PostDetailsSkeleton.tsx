import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  Dimensions,
  StyleSheet,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ================================================================
// INTERFACES - COMPREHENSIVE SKELETON CONFIGURATION
// ================================================================

interface PostDetailsSkeletonProps {
  /**
   * Whether to show comment skeletons
   */
  showComments?: boolean;
  
  /**
   * Number of comment skeletons to show
   */
  commentCount?: number;
  
  /**
   * Whether to show image placeholders
   */
  showImages?: boolean;
  
  /**
   * Number of image placeholders to show
   */
  imageCount?: number;
  
  /**
   * Whether to show related posts section
   */
  showRelatedPosts?: boolean;
  
  /**
   * Animation speed (1 = normal, 2 = fast, 0.5 = slow)
   */
  animationSpeed?: number;
  
  /**
   * Whether to use reduced motion for accessibility
   */
  reducedMotion?: boolean;
  
  /**
   * Color scheme for the skeleton
   */
  colorScheme?: 'light' | 'dark' | 'auto';
  
  /**
   * Custom styling
   */
  style?: any;
  
  /**
   * Accessibility label for screen readers
   */
  accessibilityLabel?: string;
  
  /**
   * Test ID for testing
   */
  testID?: string;
}

interface SkeletonItemProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  marginBottom?: number;
  marginTop?: number;
  marginHorizontal?: number;
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}

// ================================================================
// SKELETON COLORS - ADAPTIVE COLOR SYSTEM
// ================================================================

const SKELETON_COLORS = {
  light: {
    primary: '#E1E9EE',
    secondary: '#F2F8FC',
    highlight: '#FFFFFF',
    background: '#FAFBFC',
    shimmer: ['#E1E9EE', '#F2F8FC', '#FFFFFF', '#F2F8FC', '#E1E9EE'],
  },
  dark: {
    primary: '#2A2A2A',
    secondary: '#3A3A3A',
    highlight: '#4A4A4A',
    background: '#1A1A1A',
    shimmer: ['#2A2A2A', '#3A3A3A', '#4A4A4A', '#3A3A3A', '#2A2A2A'],
  }
};

// ================================================================
// SKELETON ITEM COMPONENT - REUSABLE ANIMATED PLACEHOLDER
// ================================================================

const SkeletonItem: React.FC<SkeletonItemProps> = React.memo(({
  width,
  height,
  borderRadius = 8,
  marginBottom = 0,
  marginTop = 0,
  marginHorizontal = 0,
  animatedValue,
  colorScheme,
  reducedMotion = false
}) => {
  const colors = SKELETON_COLORS[colorScheme];
  
  const animatedStyle = useMemo(() => {
    if (reducedMotion) {
      return {
        backgroundColor: colors.primary
      };
    }

    return {
      transform: [
        {
          translateX: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-300, 300],
          }),
        },
      ],
    };
  }, [animatedValue, colors.primary, reducedMotion]);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          marginBottom,
          marginTop,
          marginHorizontal,
          backgroundColor: colors.primary,
          overflow: 'hidden',
        }
      ]}
      accessible={false}
    >
      {!reducedMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            animatedStyle,
          ]}
        >
          <LinearGradient
            colors={colors.shimmer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}
    </View>
  );
});

SkeletonItem.displayName = 'SkeletonItem';

// ================================================================
// PROFILE BANNER SKELETON - MATCHES ACTUAL PROFILE LAYOUT
// ================================================================

const ProfileBannerSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, reducedMotion }) => {
  return (
    <View style={styles.profileBannerContainer}>
      <View style={styles.profileBannerBackground}>
        <View style={styles.profileBannerContent}>
          {/* Avatar */}
          <SkeletonItem
            width={60}
            height={60}
            borderRadius={30}
            animatedValue={animatedValue}
            colorScheme={colorScheme}
            reducedMotion={reducedMotion}
          />
          
          {/* Author Info */}
          <View style={styles.authorInfoContainer}>
            {/* Username */}
            <SkeletonItem
              width={120}
              height={18}
              borderRadius={4}
              marginBottom={8}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
            
            {/* Stats */}
            <View style={styles.statsRow}>
              <SkeletonItem
                width={40}
                height={14}
                borderRadius={3}
                marginHorizontal={4}
                animatedValue={animatedValue}
                colorScheme={colorScheme}
                reducedMotion={reducedMotion}
              />
              <SkeletonItem
                width={60}
                height={14}
                borderRadius={3}
                marginHorizontal={4}
                animatedValue={animatedValue}
                colorScheme={colorScheme}
                reducedMotion={reducedMotion}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

ProfileBannerSkeleton.displayName = 'ProfileBannerSkeleton';

// ================================================================
// POST CONTENT SKELETON - MATCHES POST STRUCTURE
// ================================================================

const PostContentSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  showImages: boolean;
  imageCount: number;
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, showImages, imageCount, reducedMotion }) => {
  return (
    <View style={styles.postContainer}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <SkeletonItem
          width="90%"
          height={24}
          borderRadius={6}
          marginBottom={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width="65%"
          height={24}
          borderRadius={6}
          marginBottom={16}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
      </View>

      {/* Images */}
      {showImages && (
        <View style={styles.imagesContainer}>
          {Array.from({ length: imageCount }, (_, index) => (
            <SkeletonItem
              key={`image-${index}`}
              width={120}
              height={120}
              borderRadius={12}
              marginHorizontal={4}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
          ))}
        </View>
      )}

      {/* Content Lines */}
      <View style={styles.contentContainer}>
        <SkeletonItem
          width="95%"
          height={16}
          borderRadius={4}
          marginBottom={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width="88%"
          height={16}
          borderRadius={4}
          marginBottom={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width="92%"
          height={16}
          borderRadius={4}
          marginBottom={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width="75%"
          height={16}
          borderRadius={4}
          marginBottom={16}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
});

PostContentSkeleton.displayName = 'PostContentSkeleton';

// ================================================================
// ENGAGEMENT ROW SKELETON - MATCHES BUTTON LAYOUT
// ================================================================

const EngagementRowSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, reducedMotion }) => {
  return (
    <View style={styles.engagementRow}>
      {/* Like Button */}
      <SkeletonItem
        width={60}
        height={40}
        borderRadius={20}
        marginHorizontal={8}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
      
      {/* Share Button */}
      <SkeletonItem
        width={70}
        height={40}
        borderRadius={20}
        marginHorizontal={8}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
      
      {/* Save Button */}
      <SkeletonItem
        width={65}
        height={40}
        borderRadius={20}
        marginHorizontal={8}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
    </View>
  );
});

EngagementRowSkeleton.displayName = 'EngagementRowSkeleton';

// ================================================================
// SORT OPTIONS SKELETON - MATCHES TAB LAYOUT
// ================================================================

const SortOptionsSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, reducedMotion }) => {
  return (
    <View style={styles.sortOptionsContainer}>
      <SkeletonItem
        width={80}
        height={36}
        borderRadius={18}
        marginHorizontal={8}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
      <SkeletonItem
        width={100}
        height={36}
        borderRadius={18}
        marginHorizontal={8}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
    </View>
  );
});

SortOptionsSkeleton.displayName = 'SortOptionsSkeleton';

// ================================================================
// COMMENT SKELETON - MATCHES COMMENT STRUCTURE
// ================================================================

const CommentSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, reducedMotion }) => {
  return (
    <View style={styles.commentContainer}>
      {/* Comment Header */}
      <View style={styles.commentHeader}>
        {/* Avatar */}
        <SkeletonItem
          width={40}
          height={40}
          borderRadius={20}
          marginHorizontal={12}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        
        {/* User Info */}
        <View style={styles.commentUserInfo}>
          <SkeletonItem
            width={90}
            height={14}
            borderRadius={3}
            marginBottom={4}
            animatedValue={animatedValue}
            colorScheme={colorScheme}
            reducedMotion={reducedMotion}
          />
          <SkeletonItem
            width={60}
            height={12}
            borderRadius={3}
            animatedValue={animatedValue}
            colorScheme={colorScheme}
            reducedMotion={reducedMotion}
          />
        </View>
      </View>

      {/* Comment Content */}
      <View style={styles.commentContent}>
        <SkeletonItem
          width="95%"
          height={14}
          borderRadius={3}
          marginBottom={6}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width="82%"
          height={14}
          borderRadius={3}
          marginBottom={12}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
      </View>

      {/* Comment Actions */}
      <View style={styles.commentActions}>
        <SkeletonItem
          width={40}
          height={24}
          borderRadius={12}
          marginHorizontal={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
        <SkeletonItem
          width={50}
          height={24}
          borderRadius={12}
          marginHorizontal={8}
          animatedValue={animatedValue}
          colorScheme={colorScheme}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
});

CommentSkeleton.displayName = 'CommentSkeleton';

// ================================================================
// RELATED POSTS SKELETON - MATCHES HORIZONTAL SCROLL
// ================================================================

const RelatedPostsSkeleton: React.FC<{
  animatedValue: Animated.Value;
  colorScheme: 'light' | 'dark';
  reducedMotion?: boolean;
}> = React.memo(({ animatedValue, colorScheme, reducedMotion }) => {
  return (
    <View style={styles.relatedPostsSection}>
      {/* Section Title */}
      <SkeletonItem
        width={120}
        height={20}
        borderRadius={4}
        marginBottom={16}
        marginHorizontal={16}
        animatedValue={animatedValue}
        colorScheme={colorScheme}
        reducedMotion={reducedMotion}
      />
      
      {/* Related Posts Horizontal Scroll */}
      <View style={styles.relatedPostsScroll}>
        {Array.from({ length: 3 }, (_, index) => (
          <View key={`related-${index}`} style={styles.relatedPostCard}>
            {/* Post Thumbnail */}
            <SkeletonItem
              width={140}
              height={80}
              borderRadius={8}
              marginBottom={8}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
            
            {/* Post Title */}
            <SkeletonItem
              width={130}
              height={14}
              borderRadius={3}
              marginBottom={4}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
            <SkeletonItem
              width={100}
              height={14}
              borderRadius={3}
              marginBottom={8}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
            
            {/* Post Meta */}
            <SkeletonItem
              width={80}
              height={12}
              borderRadius={3}
              animatedValue={animatedValue}
              colorScheme={colorScheme}
              reducedMotion={reducedMotion}
            />
          </View>
        ))}
      </View>
    </View>
  );
});

RelatedPostsSkeleton.displayName = 'RelatedPostsSkeleton';

// ================================================================
// MAIN COMPONENT - COMPREHENSIVE POST DETAILS SKELETON
// ================================================================

const PostDetailsSkeleton: React.FC<PostDetailsSkeletonProps> = ({
  showComments = true,
  commentCount = 5,
  showImages = true,
  imageCount = 2,
  showRelatedPosts = false,
  animationSpeed = 1,
  reducedMotion = false,
  colorScheme = 'auto',
  style,
  accessibilityLabel = 'Loading post content',
  testID = 'post-details-skeleton'
}) => {
  // Animation setup
  const animatedValue = useRef(new Animated.Value(0)).current;
  const { width } = Dimensions.get('window');

  // Determine color scheme
  const resolvedColorScheme = useMemo(() => {
    if (colorScheme === 'auto') {
      // In a real app, you'd get this from a theme context or system settings
      return 'light'; // Default fallback
    }
    return colorScheme;
  }, [colorScheme]);

  // Setup animation
  useEffect(() => {
    if (reducedMotion) return;

    const startAnimation = () => {
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1500 / animationSpeed,
          useNativeDriver: true,
        }),
        { iterations: -1 }
      ).start();
    };

    startAnimation();

    return () => {
      animatedValue.stopAnimation();
    };
  }, [animatedValue, animationSpeed, reducedMotion]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: SKELETON_COLORS[resolvedColorScheme].background },
        style
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      testID={testID}
    >
      {/* Back Button Skeleton */}
      <View style={styles.backButtonContainer}>
        <SkeletonItem
          width={80}
          height={36}
          borderRadius={18}
          marginBottom={16}
          marginHorizontal={16}
          animatedValue={animatedValue}
          colorScheme={resolvedColorScheme}
          reducedMotion={reducedMotion}
        />
      </View>

      {/* Profile Banner Skeleton */}
      <ProfileBannerSkeleton
        animatedValue={animatedValue}
        colorScheme={resolvedColorScheme}
        reducedMotion={reducedMotion}
      />

      {/* Post Content Skeleton */}
      <PostContentSkeleton
        animatedValue={animatedValue}
        colorScheme={resolvedColorScheme}
        showImages={showImages}
        imageCount={imageCount}
        reducedMotion={reducedMotion}
      />

      {/* Engagement Row Skeleton */}
      <EngagementRowSkeleton
        animatedValue={animatedValue}
        colorScheme={resolvedColorScheme}
        reducedMotion={reducedMotion}
      />

      {/* Comments Section */}
      {showComments && (
        <>
          {/* Sort Options Skeleton */}
          <SortOptionsSkeleton
            animatedValue={animatedValue}
            colorScheme={resolvedColorScheme}
            reducedMotion={reducedMotion}
          />

          {/* Comments List */}
          <View style={styles.commentsSection}>
            {Array.from({ length: commentCount }, (_, index) => (
              <React.Fragment key={`comment-skeleton-${index}`}>
                <CommentSkeleton
                  animatedValue={animatedValue}
                  colorScheme={resolvedColorScheme}
                  reducedMotion={reducedMotion}
                />
                {index < commentCount - 1 && (
                  <View
                    style={[
                      styles.commentSeparator,
                      { backgroundColor: SKELETON_COLORS[resolvedColorScheme].primary }
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {/* Related Posts Section */}
      {showRelatedPosts && (
        <RelatedPostsSkeleton
          animatedValue={animatedValue}
          colorScheme={resolvedColorScheme}
          reducedMotion={reducedMotion}
        />
      )}

      {/* Back to Top Button Skeleton */}
      <View style={styles.backToTopContainer}>
        <SkeletonItem
          width={120}
          height={40}
          borderRadius={20}
          marginTop={24}
          animatedValue={animatedValue}
          colorScheme={resolvedColorScheme}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
};

// ================================================================
// STYLES - COMPREHENSIVE LAYOUT MATCHING
// ================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 120, // Space for floating comment bar
  },
  
  backButtonContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },

  // Profile Banner Styles
  profileBannerContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  
  profileBannerBackground: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  
  profileBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  authorInfoContainer: {
    marginLeft: 16,
    flex: 1,
  },
  
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Post Content Styles
  postContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  
  titleContainer: {
    marginBottom: 16,
  },
  
  imagesContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  
  contentContainer: {
    marginBottom: 16,
  },

  // Engagement Styles
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
  },

  // Sort Options Styles
  sortOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
  },

  // Comments Styles
  commentsSection: {
    marginHorizontal: 16,
  },
  
  commentContainer: {
    paddingVertical: 16,
  },
  
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  commentUserInfo: {
    flex: 1,
  },
  
  commentContent: {
    marginLeft: 64,
    marginBottom: 8,
  },
  
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 64,
  },
  
  commentSeparator: {
    height: 1,
    marginVertical: 8,
    opacity: 0.1,
  },

  // Related Posts Styles
  relatedPostsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  
  relatedPostsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  
  relatedPostCard: {
    width: 140,
    marginRight: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },

  // Back to Top Button
  backToTopContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});

// ================================================================
// EXPORT WITH PERFORMANCE OPTIMIZATION
// ================================================================

export default React.memo(PostDetailsSkeleton);

// Export types for external use
export type { PostDetailsSkeletonProps };