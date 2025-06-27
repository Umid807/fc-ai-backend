import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MoreDefensiveTips() {
  const navigation = useNavigation();

  const tips = [
    {
      id: '1',
      title: 'Anticipate Opponent Moves',
      description: 'Learn how to read the game and predict your opponent’s next move.',
      image: 'https://via.placeholder.com/80',
      screen: 'AnticipateTips',
    },
    {
      id: '2',
      title: 'Master Defensive Stamina',
      description: 'Tips on maintaining high defensive performance throughout the match.',
      image: 'https://via.placeholder.com/80',
      screen: 'StaminaTips',
    },
    {
      id: '3',
      title: 'Defending in 1v1 Situations',
      description: 'How to stay composed and win crucial 1v1 duels.',
      image: 'https://via.placeholder.com/80',
      screen: 'OneVsOneTips',
    },
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#FFD700" />
      </TouchableOpacity>

      <Text style={styles.header}>More Defensive Tips</Text>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {tips.map((tip) => (
          <TouchableOpacity
            key={tip.id}
            style={styles.card}
            onPress={() => navigation.navigate(tip.screen)}
          >
            <Image source={{ uri: tip.image }} style={styles.thumbnail} />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{tip.title}</Text>
              <Text style={styles.description}>{tip.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFD700" style={styles.arrowIcon} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  backButton: {
    marginBottom: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#bbb',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});
