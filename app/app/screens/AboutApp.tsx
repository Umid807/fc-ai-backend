// app/screens/AboutApp.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ImageBackground } from 'react-native';

export default function AboutApp() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/settingsbk.png')}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../../assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.header}>About FC 25 Companion</Text>
        <Text style={styles.text}>
          [Placeholder] This app is designed to help you stay connected and get the most out of the FC 25 experience. Enjoy the latest updates, manage your profile, and more—all with a sleek, neon-infused design.
        </Text>
        <Text style={styles.version}>Version: {Constants.manifest?.version || '1.0.0'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Contact Us</Text>
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
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
    resizeMode: 'contain',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00E5FF',
    marginBottom: 20,
    textShadowColor: '#00E5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  text: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  version: {
    fontSize: 14,
    color: '#AAA',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#00E5FF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: 'bold',
  },
});
