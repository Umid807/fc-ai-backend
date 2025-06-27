import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
import * as Haptics from 'expo-haptics';
import i18n from '../../app/i18n/i18n';

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  rewardXP: number;
  rewardCoins: number;
  watched: boolean;
};

type VideoCardProps = {
  video: VideoItem;
  watchedVideoIds: string[];
  onPress: (video: VideoItem) => void;
};

const VideoCard: React.FC<VideoCardProps> = ({ video, watchedVideoIds, onPress }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  const isWatched = watchedVideoIds.includes(video.id);

  const handlePress = () => {
    if (!isWatched) {
      // ✅ Add haptic feedback for better UX
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress(video);
    }
  };

  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
  };

  const handleImageLoadEnd = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <TouchableOpacity
      style={[
        styles.videoCard,
        isWatched && styles.videoCardDisabled, // ✅ Better disabled styling
      ]}
      onPress={handlePress}
      disabled={isWatched}
      activeOpacity={isWatched ? 1 : 0.8} // ✅ Different opacity for disabled state
    >
      <View style={styles.thumbnailContainer}>
        {!imageError ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={styles.videoThumbnail}
            onLoadStart={handleImageLoadStart}
            onLoadEnd={handleImageLoadEnd}
            onError={handleImageError}
          />
        ) : (
          // ✅ Fallback for broken images
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>📹</Text>
            <Text style={styles.imageFallbackSubtext}>
              {i18n.t('daily_challenge.thumbnail_unavailable')}
            </Text>
          </View>
        )}

        {/* ✅ Loading state with spinner */}
        {imageLoading && !imageError && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="small" color="#00FF9D" />
          </View>
        )}

        {/* Play button overlay for unwatched videos */}
        {!isWatched && !imageLoading && (
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        )}

        {/* Watched overlay */}
        {isWatched && (
          <View style={styles.watchedOverlay}>
            <View style={styles.watchedBadge}>
              <Text style={styles.watchedIcon}>✓</Text>
              <Text style={styles.watchedText}>
                {i18n.t('daily_challenge.completed')}
              </Text>
            </View>
          </View>
        )}

        {/* ✅ Reward indicators */}
        {!isWatched && (
          <View style={styles.rewardIndicators}>
            <View style={styles.rewardBadge}>
              <Text style={styles.rewardText}>+{video.rewardXP} XP</Text>
            </View>
            <View style={[styles.rewardBadge, styles.coinBadge]}>
              <Text style={styles.rewardText}>+{video.rewardCoins}</Text>
              <Text style={styles.coinIcon}>🪙</Text>
            </View>
          </View>
        )}
      </View>

      {/* Video details */}
      <View style={styles.videoDetails}>
        <Text style={styles.videoTitle} numberOfLines={2} ellipsizeMode="tail">
          {video.title}
        </Text>
        
        {/* ✅ Status indicator */}
        <View style={styles.statusContainer}>
          {isWatched ? (
            <Text style={styles.statusCompleted}>
              {i18n.t('daily_challenge.rewards_earned')}
            </Text>
          ) : (
            <Text style={styles.statusPending}>
              {i18n.t('daily_challenge.tap_to_watch')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  videoCard: {
    width: 220, // ✅ Slightly wider for better content display
    marginRight: 15,
    backgroundColor: "#0a1720",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 157, 0.1)",
  },
  videoCardDisabled: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }], // ✅ Subtle scale down for disabled state
    shadowOpacity: 0.15, // ✅ Reduced shadow for disabled
  },
  thumbnailContainer: {
    position: "relative",
    height: 120, // ✅ Slightly taller for better aspect ratio
  },
  videoThumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 23, 32, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a2332",
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  imageFallbackText: {
    fontSize: 32,
    marginBottom: 4,
  },
  imageFallbackSubtext: {
    color: "#888",
    fontSize: 11,
    textAlign: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  playButton: {
    backgroundColor: "rgba(0, 255, 157, 0.9)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  playIcon: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 3, // ✅ Slight offset for better visual centering
  },
  watchedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  watchedBadge: {
    backgroundColor: "rgba(0, 255, 157, 0.95)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  watchedIcon: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 6,
  },
  watchedText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 13,
  },
  rewardIndicators: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "column",
    alignItems: "flex-end",
    zIndex: 15,
  },
  rewardBadge: {
    backgroundColor: "rgba(0, 255, 157, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  coinBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.9)",
  },
  rewardText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
  },
  coinIcon: {
    fontSize: 10,
    marginLeft: 2,
  },
  videoDetails: {
    padding: 12,
    minHeight: 70, // ✅ Consistent height for alignment
  },
  videoTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
    lineHeight: 18,
    marginBottom: 8,
  },
  statusContainer: {
    marginTop: "auto", // ✅ Push to bottom
  },
  statusCompleted: {
    color: "#00FF9D",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  statusPending: {
    color: "#888",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default VideoCard;