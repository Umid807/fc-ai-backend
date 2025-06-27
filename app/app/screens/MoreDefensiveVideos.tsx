import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Linking, StyleSheet } from 'react-native';

const videos = [
  {
    id: 1,
    title: 'Master the Art of Defending',
    description: 'Learn advanced techniques to improve your defensive game.',
    thumbnail: { uri: 'https://img.youtube.com/vi/example1/hqdefault.jpg' },
    url: 'https://www.youtube.com/watch?v=example1'
  },
  {
    id: 2,
    title: 'Top 5 Defensive Mistakes to Avoid',
    description: 'Identify and correct common defensive errors.',
    thumbnail: { uri: 'https://img.youtube.com/vi/example2/hqdefault.jpg' },
    url: 'https://www.youtube.com/watch?v=example2'
  },
  {
    id: 3,
    title: 'Perfect Your Pressing Techniques',
    description: 'Master the art of pressing effectively in different situations.',
    thumbnail: { uri: 'https://img.youtube.com/vi/example3/hqdefault.jpg' },
    url: 'https://www.youtube.com/watch?v=example3'
  }
];

export default function MoreDefensiveVideos() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Top Defensive Videos You Can’t Miss</Text>
      {videos.map(video => (
        <TouchableOpacity
          key={video.id}
          style={styles.videoContainer}
          onPress={() => Linking.openURL(video.url)}
        >
          <Image source={video.thumbnail} style={styles.thumbnail} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{video.title}</Text>
            <Text style={styles.description}>{video.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  videoContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 4,
  },
});
