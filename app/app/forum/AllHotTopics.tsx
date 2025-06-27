import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const hotTopics = [
  { id: 'h1', title: 'Unstoppable Ultimate Team Tactics', preview: 'Discover key tactics that dominate FC 25 Ultimate Team.', likes: 120 },
  { id: 'h2', title: 'Career Mode Hidden Gems You Need', preview: 'Find young talents that boost your career mode team.', likes: 95 },
  { id: 'h3', title: 'Pro Clubs Meta Build for Dominance', preview: 'Maximize your club’s potential with pro meta builds.', likes: 88 },
  { id: 'h4', title: 'Best Formations for Defense', preview: 'Solid defensive tactics to stop any opponent.', likes: 150 },
  { id: 'h5', title: 'Mastering Free Kicks', preview: 'Learn how to score from set pieces like a pro.', likes: 110 },
];

export default function AllHotTopics() {
  const router = useRouter();

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.topicCard} onPress={() => router.replace(`/forum/PostDetails?id=${item.id}`)}>
      <Text style={styles.topicTitle}>{item.title}</Text>
      <Text style={styles.topicPreview}>{item.preview}</Text>
      <Text style={styles.likes}>🔥 {item.likes} Likes</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔥 All Hot Topics</Text>
      <FlatList
        data={hotTopics}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
    paddingTop: 50,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  topicCard: {
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  topicTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  topicPreview: {
    color: '#ccc',
    marginTop: 4,
    fontSize: 14,
  },
  likes: {
    color: '#FF6347',
    marginTop: 4,
  },
});
