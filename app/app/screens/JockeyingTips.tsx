import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function JockeyingTips() {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Perfect Your Jockeying</Text>

      <Text style={styles.paragraph}>
        Mastering jockeying is crucial for effective defense. It allows you to control space,
        delay attackers, and force mistakes. Here’s how to perfect it:
      </Text>

      {/* First Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>1. Understand the Basics</Text>
      <Text style={styles.paragraph}>
        Jockeying isn’t about rushing to tackle the opponent. Instead, it's about containing them 
        and reducing their attacking options. By holding your position and maintaining defensive 
        shape, you force the attacker to make a mistake or take a less dangerous shot.
      </Text>

      <Text style={styles.subtitle}>2. Maintain the Right Distance</Text>
      <Text style={styles.paragraph}>
        The key to effective jockeying is positioning. Stay close enough to apply pressure, but 
        far enough to react if the attacker changes direction. A good rule is to maintain a 
        distance where you can still lunge for a tackle if needed.
      </Text>

      {/* Second Image Placeholder */}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
      />

      <Text style={styles.subtitle}>3. Body Positioning</Text>
      <Text style={styles.paragraph}>
        Your body angle should guide the attacker away from goal or towards the sidelines. Keep 
        your knees slightly bent, stay on the balls of your feet, and shift your weight to react 
        quickly to changes in direction.
      </Text>

      <Text style={styles.subtitle}>4. Combine with Teammate Support</Text>
      <Text style={styles.paragraph}>
        Jockeying works best when done in coordination with your teammates. While you delay the 
        attacker, your teammates can recover their positions, close passing lanes, or prepare to 
        double-team the attacker if needed.
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
