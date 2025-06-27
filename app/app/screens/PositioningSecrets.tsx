import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function PositioningSecrets() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Positioning Secrets for Elite Defending</Text>

      <Text style={styles.paragraph}>
        Good positioning is the backbone of solid defense. It helps you intercept passes, close
        down attackers, and win the ball without needing to make risky tackles. Mastering this
        skill separates average defenders from the elite.
      </Text>

      {/* First Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>1. Stay Goal-Side</Text>
      <Text style={styles.paragraph}>
        Always position yourself between the ball and your goal. This forces attackers to play
        around you, giving you more control over the situation. Staying goal-side minimizes
        the risk of direct goal threats.
      </Text>

      <Text style={styles.subtitle}>2. Read the Game</Text>
      <Text style={styles.paragraph}>
        Anticipate where the ball will go next. Positioning isn’t just about reacting to the
        current situation; it’s about predicting the opponent’s next move. Keep your head up,
        scan the field, and adjust accordingly.
      </Text>

      {/* Second Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>3. Control the Space</Text>
      <Text style={styles.paragraph}>
        Don’t just mark players—control the space around them. Position yourself to block
        passing lanes, limit shooting opportunities, and force attackers into less dangerous
        areas of the pitch.
      </Text>

      <Text style={styles.subtitle}>4. Adjust Based on Threat</Text>
      <Text style={styles.paragraph}>
        Your positioning should change based on the threat level. When defending deep, stay
        compact. When pressing higher up the pitch, position yourself to cut off quick passing
        options while still covering key spaces.
      </Text>

      {/* Back Button */}
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: 15,
  },
  paragraph: {
    fontSize: 16,
    color: '#ddd',
    lineHeight: 24,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
