import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function MasteringTackles() {
  console.log("MasteringTackles: Component rendering initiated.");
  const navigation = useNavigation();
  console.log("MasteringTackles: Navigation hook initialized.");

  useEffect(() => {
    console.log("MasteringTackles: Component mounted successfully.");
    return () => {
      console.log("MasteringTackles: Component unmounting initiated.");
    };
  }, []);

  console.log("MasteringTackles: Preparing to return JSX.");
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {console.log("MasteringTackles: ScrollView container rendered.")}
      {console.log("MasteringTackles: Preparing to render main title section.")}
      <Text style={styles.title}>Mastering Tackles & Interceptions</Text>
      {console.log("MasteringTackles: Main title 'Mastering Tackles & Interceptions' rendered.")}

      {console.log("MasteringTackles: Preparing to render introduction paragraph.")}
      <Text style={styles.paragraph}>
        Tackling and intercepting are key defensive skills that require precise timing and smart
        positioning. Learning when to commit and when to hold back can make you an elite defender.
      </Text>
      {console.log("MasteringTackles: Introduction paragraph rendered.")}

      {/* First Image Placeholder */}
      {console.log("MasteringTackles: Preparing to render first image placeholder.")}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
        onLoad={() => console.log("MasteringTackles: First image loaded successfully from URI: https://via.placeholder.com/300x150")}
        onError={(error) => console.log("MasteringTackles: First image failed to load. Error: " + error.nativeEvent.error)}
      />
      {console.log("MasteringTackles: First image placeholder element rendered.")}

      {console.log("MasteringTackles: Preparing to render 'Timing Is Everything' section.")}
      <Text style={styles.subtitle}>1. Timing Is Everything</Text>
      {console.log("MasteringTackles: Subtitle 'Timing Is Everything' rendered.")}
      <Text style={styles.paragraph}>
        A good tackle isn’t just about aggression—it’s about timing. Wait for the right moment
        when the attacker miscontrols the ball or exposes it slightly. Lunging too early can leave
        you vulnerable.
      </Text>
      {console.log("MasteringTackles: Paragraph for 'Timing Is Everything' rendered.")}

      {console.log("MasteringTackles: Preparing to render 'Use Standing Tackles Wisely' section.")}
      <Text style={styles.subtitle}>2. Use Standing Tackles Wisely</Text>
      {console.log("MasteringTackles: Subtitle 'Use Standing Tackles Wisely' rendered.")}
      <Text style={styles.paragraph}>
        Standing tackles are effective when you’re side-by-side with an attacker. Use your body
        strength to shield the ball and regain possession without going to ground unnecessarily.
      </Text>
      {console.log("MasteringTackles: Paragraph for 'Use Standing Tackles Wisely' rendered.")}

      {/* Second Image Placeholder */}
      {console.log("MasteringTackles: Preparing to render second image placeholder.")}
      <Image
        source={{ uri: 'https://via.placeholder.com/300x150' }}
        style={styles.image}
        onLoad={() => console.log("MasteringTackles: Second image loaded successfully from URI: https://via.placeholder.com/300x150")}
        onError={(error) => console.log("MasteringTackles: Second image failed to load. Error: " + error.nativeEvent.error)}
      />
      {console.log("MasteringTackles: Second image placeholder element rendered.")}

      {console.log("MasteringTackles: Preparing to render 'Perfect Slide Tackles' section.")}
      <Text style={styles.subtitle}>3. Perfect Slide Tackles</Text>
      {console.log("MasteringTackles: Subtitle 'Perfect Slide Tackles' rendered.")}
      <Text style={styles.paragraph}>
        Slide tackles are high-risk, high-reward. Use them when you’re chasing back or in
        last-ditch situations. Always aim to make contact with the ball first to avoid fouls or
        disciplinary actions.
      </Text>
      {console.log("MasteringTackles: Paragraph for 'Perfect Slide Tackles' rendered.")}

      {console.log("MasteringTackles: Preparing to render 'Interceptions Over Tackles' section.")}
      <Text style={styles.subtitle}>4. Interceptions Over Tackles</Text>
      {console.log("MasteringTackles: Subtitle 'Interceptions Over Tackles' rendered.")}
      <Text style={styles.paragraph}>
        Often, intercepting a pass is better than tackling. Read the game, anticipate passing
        lanes, and position yourself to cut off the ball before it reaches the attacker. This keeps
        you on your feet and ready for the next move.
      </Text>
      {console.log("MasteringTackles: Paragraph for 'Interceptions Over Tackles' rendered.")}

      {/* Back Button */}
      {console.log("MasteringTackles: Preparing to render Back button.")}
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          console.log("MasteringTackles: Back button pressed. Initiating navigation.goBack().");
          navigation.goBack();
          console.log("MasteringTackles: Navigation goBack() executed.");
        }}
      >
        <Text style={styles.buttonText}>◀ Back</Text>
      </TouchableOpacity>
      {console.log("MasteringTackles: Back button rendered.")}
    </ScrollView>
  );
}

console.log("MasteringTackles: StyleSheet definition started.");
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
console.log("MasteringTackles: StyleSheet created successfully.");