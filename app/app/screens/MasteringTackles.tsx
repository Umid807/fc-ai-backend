import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MasteringTackles() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mastering Tackles & Interceptions</Text>

      <Text style={styles.paragraph}>
        Tackling and intercepting are key defensive skills that require precise timing and smart
        positioning. Learning when to commit and when to hold back can make you an elite defender.
      </Text>

      {/* First Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>1. Timing Is Everything</Text>
      <Text style={styles.paragraph}>
        A good tackle isn’t just about aggression—it’s about timing. Wait for the right moment
        when the attacker miscontrols the ball or exposes it slightly. Lunging too early can leave
        you vulnerable.
      </Text>

      <Text style={styles.subtitle}>2. Use Standing Tackles Wisely</Text>
      <Text style={styles.paragraph}>
        Standing tackles are effective when you’re side-by-side with an attacker. Use your body
        strength to shield the ball and regain possession without going to ground unnecessarily.
      </Text>

      {/* Second Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>3. Perfect Slide Tackles</Text>
      <Text style={styles.paragraph}>
        Slide tackles are high-risk, high-reward. Use them when you’re chasing back or in
        last-ditch situations. Always aim to make contact with the ball first to avoid fouls or
        disciplinary actions.
      </Text>

      <Text style={styles.subtitle}>4. Interceptions Over Tackles</Text>
      <Text style={styles.paragraph}>
        Often, intercepting a pass is better than tackling. Read the game, anticipate passing
        lanes, and position yourself to cut off the ball before it reaches the attacker. This keeps
        you on your feet and ready for the next move.
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
