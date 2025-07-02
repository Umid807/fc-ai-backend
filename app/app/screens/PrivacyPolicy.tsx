// app/screens/PrivacyPolicy.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/settingsbk.png')}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Privacy & Cookie Policy</Text>
        <Text style={styles.subheader}>Your privacy is important to us.</Text>
        <Text style={styles.text}>
          [Placeholder] Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur ac leo nunc. Vestibulum et mauris vel ante finibus maximus nec ut leo. Integer consectetur luctus nulla, sit amet tincidunt lorem pretium sit amet. Praesent id semper est. Duis a arcu eu ligula faucibus luctus.
        </Text>
        <Text style={styles.text}>
          [Placeholder] Suspendisse potenti. In non leo et mauris mollis posuere. Integer blandit odio ac diam ultrices, vitae tincidunt sapien pretium.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://www.example.com/privacy')}>
          <Text style={styles.link}>Read Full Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, resizeMode: 'cover' },
  container: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E5FF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subheader: {
    fontSize: 18,
    color: '#00E5FF',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
    marginBottom: 20,
  },
  link: {
    fontSize: 16,
    color: '#00E5FF',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignSelf: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
});
