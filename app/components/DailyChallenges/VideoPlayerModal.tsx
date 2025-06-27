import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Dimensions } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import i18n from '../../app/i18n/i18n';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

type VideoItem = {
  id: string;
  title: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  rewardXP: number;
  rewardCoins: number;
  watched: boolean; // This will come from the local state
};

type VideoPlayerModalProps = {
  visible: boolean;
  onClose: () => void;
  currentVideo: VideoItem | null;
  playerRef: React.RefObject<any>;
  playing: boolean;
  onReady: () => void;
  onChangeState: (state: string) => void;
  videoDuration: number;
  videoProgress: number;
  handleVideoCompletion: () => Promise<void>;
};

const extractYouTubeId = (url: string | undefined): string | null => {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/[?&]v=([^&#]+)/);
  return match ? match[1] : null;
};

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  onClose,
  currentVideo,
  playerRef,
  playing,
  onReady,
  onChangeState,
  videoDuration,
  videoProgress,
  handleVideoCompletion,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {currentVideo ? (
          <>
            <View style={styles.videoPlayerContainer}>
              <YoutubePlayer
                ref={playerRef}
                height={300}
                play={playing}
                videoId={extractYouTubeId(currentVideo.youtubeUrl)}
                onReady={onReady}
                onChangeState={onChangeState}
              />
            </View>
            {currentVideo && videoDuration > 0 && (
              <View style={{ alignItems: "center", marginTop: 20 }}>
                <AnimatedCircularProgress
                  size={120}
                  width={10}
                  fill={videoProgress}
                  tintColor="#00FF9D"
                  backgroundColor="#444"
                  rotation={0}
                >
                  {() => (
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                      {Math.floor(videoProgress)}%
                    </Text>
                  )}
                </AnimatedCircularProgress>
              </View>
            )}
            {__DEV__ && ( // Keep debug button only in DEV mode
              <TouchableOpacity style={styles.completeButton} onPress={handleVideoCompletion}>
                <Text style={styles.completeButtonText}>{i18n.t('daily_challenge.debug_mark_watched')}</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <ActivityIndicator size="large" color="#00FF9D" />
        )}
        <TouchableOpacity
          style={styles.modalCloseButton}
          onPress={onClose}
        >
          <Text style={styles.modalCloseText}>{i18n.t('daily_challenge.close_button')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  videoPlayerContainer: { width: "100%", height: "60%" },
  completeButton: { backgroundColor: "#00FF9D", padding: 15, borderRadius: 5, marginTop: 10, alignSelf: "center" },
  completeButtonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  modalCloseButton: { marginTop: 20, alignSelf: "center", padding: 10 },
  modalCloseText: { color: "#fff", fontSize: 16 },
});

export default VideoPlayerModal;
