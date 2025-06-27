// OffenseTutorials.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';

const videos = [
  {
    id: 1,
    // Video: https://www.youtube.com/watch?v=S9gEnb26W4g
    embedUrl: 'https://www.youtube.com/embed/S9gEnb26W4g?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/S9gEnb26W4g/0.jpg',
    title: 'Attack Tutorial 1',
  },
  {
    id: 2,
    // Video: https://www.youtube.com/watch?v=cuIO9AOcA-0
    embedUrl: 'https://www.youtube.com/embed/cuIO9AOcA-0?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/cuIO9AOcA-0/0.jpg',
    title: 'Attack Tutorial 2',
  },
  {
    id: 3,
    // Video: https://www.youtube.com/watch?v=G54SMe8pXEI
    embedUrl: 'https://www.youtube.com/embed/G54SMe8pXEI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/G54SMe8pXEI/0.jpg',
    title: 'Attack Tutorial 3',
  },
  {
    id: 4,
    // Video: https://www.youtube.com/watch?v=85RBxKTzHFI
    embedUrl: 'https://www.youtube.com/embed/85RBxKTzHFI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/85RBxKTzHFI/0.jpg',
    title: 'Attack Tutorial 4',
  },
  {
    id: 5,
    // New Video: https://www.youtube.com/watch?v=iZHQDLm2KYM
    embedUrl: 'https://www.youtube.com/embed/iZHQDLm2KYM?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/iZHQDLm2KYM/0.jpg',
    title: 'Attack Tutorial 5',
  },
  {
    id: 6,
    // New Video: https://www.youtube.com/watch?v=HQMXKjLzaEU
    embedUrl: 'https://www.youtube.com/embed/HQMXKjLzaEU?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/HQMXKjLzaEU/0.jpg',
    title: 'Attack Tutorial 6',
  },
  {
    id: 7,
    // New Video: https://www.youtube.com/watch?v=BO9F8pWTmWY
    embedUrl: 'https://www.youtube.com/embed/BO9F8pWTmWY?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/BO9F8pWTmWY/0.jpg',
    title: 'Attack Tutorial 7',
  },
  {
    id: 8,
    // New Video: https://www.youtube.com/watch?v=Fu7xBkbaAjY
    embedUrl: 'https://www.youtube.com/embed/Fu7xBkbaAjY?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/Fu7xBkbaAjY/0.jpg',
    title: 'Attack Tutorial 8',
  },
  {
    id: 9,
    // New Video: https://www.youtube.com/watch?v=CKLvyFd467c
    embedUrl: 'https://www.youtube.com/embed/CKLvyFd467c?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/CKLvyFd467c/0.jpg',
    title: 'Attack Tutorial 9',
  },
  {
    id: 10,
    // New Video: https://www.youtube.com/watch?v=ibWfHNIFbWA
    embedUrl: 'https://www.youtube.com/embed/ibWfHNIFbWA?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/ibWfHNIFbWA/0.jpg',
    title: 'Attack Tutorial 10',
  },
];

export default function OffenseTutorials() {
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');

  const handleVideoPress = (embedUrl: string) => {
    setSelectedVideoUrl(embedUrl);
    setVideoModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>More Offense Videos</Text>
      <View style={styles.gridContainer}>
        {videos.map((video) => (
          <TouchableOpacity
            key={video.id}
            style={styles.videoItem}
            onPress={() => handleVideoPress(video.embedUrl)}
          >
            <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
            <Text style={styles.videoTitle}>{video.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setVideoModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
          <WebView
            source={{ uri: selectedVideoUrl }}
            style={styles.webview}
            allowsFullscreenVideo
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoItem: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbnail: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  videoTitle: {
    padding: 8,
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalCloseButton: {
    padding: 15,
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
    margin: 10,
    borderRadius: 5,
  },
  modalCloseText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
});
