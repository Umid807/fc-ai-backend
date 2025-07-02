import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image, TouchableOpacity, ImageBackground } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

export default function AboutApp() {
  console.log("AboutApp: Component mount initiated."); // Log 1

  const router = useRouter();
  console.log("AboutApp: useRouter hook successfully initialized for navigation operations."); // Log 2

  // Data operation: Retrieving app version from Constants.
  const manifestVersion = Constants.manifest?.version;
  console.log(`AboutApp: Attempting to read 'Constants.manifest.version'. Value found: ${manifestVersion || 'undefined'}.`); // Log 3

  let appVersion: string;
  // Conditional logic for version assignment
  if (manifestVersion) {
    appVersion = manifestVersion;
    console.log(`AboutApp: Manifest version detected. Setting app version to: '${appVersion}'.`); // Log 4 (Conditional Logic)
  } else {
    appVersion = '1.0.0';
    console.log(`AboutApp: No manifest version found. Defaulting app version to: '${appVersion}'.`); // Log 5 (Conditional Logic)
  }
  console.log(`AboutApp: Final app version for display is: '${appVersion}'.`); // Log 6

  // UI preparation and rendering intention logs
  console.log("AboutApp: Preparing to render primary ImageBackground component."); // Log 7
  console.log("AboutApp: ImageBackground source resolved: '../../../assets/images/settingsbk.png'."); // Log 8
  console.log("AboutApp: Preparing to render ScrollView component."); // Log 9
  console.log("AboutApp: Preparing to render Logo Image component."); // Log 10
  console.log("AboutApp: Logo Image source resolved: '../../../assets/images/logo.png'."); // Log 11
  console.log("AboutApp: Preparing to render Header Text component with content 'About FC 25 Companion'."); // Log 12
  console.log("AboutApp: Preparing to render App Description Text component."); // Log 13
  console.log(`AboutApp: Preparing to render Version Text component with dynamic value: '${appVersion}'.`); // Log 14
  console.log("AboutApp: Preparing to render 'Contact Us' TouchableOpacity component."); // Log 15
  console.log("AboutApp: Preparing to render 'Contact Us' button Text component."); // Log 16

  // Before return statement - indicates successful preparation for rendering
  console.log("AboutApp: All UI components prepared for rendering. Returning JSX."); // Log 17

  return (
    <ImageBackground
      source={require('../../../assets/images/settingsbk.png')}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../../../assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.header}>About FC 25 Companion</Text>
        <Text style={styles.text}>
          [Placeholder] This app is designed to help you stay connected and get the most out of the FC 25 experience. Enjoy the latest updates, manage your profile, and more—all with a sleek, neon-infused design.
        </Text>
        <Text style={styles.version}>Version: {appVersion}</Text>
        <TouchableOpacity style={styles.button} onPress={() => {
          console.log("AboutApp: 'Contact Us' button press detected."); // Log 18 (User Interaction)
          try {
            console.log("AboutApp: Attempting to navigate back using router.back()."); // Log 19 (Navigation Action)
            router.back();
            console.log("AboutApp: Navigation back successfully initiated."); // Log 20 (Navigation Success)
          } catch (error: any) { // Error Scenarios: Try/catch block
            console.log(`AboutApp: Navigation back failed. Error: ${error.message}.`); // Log 21 (Error Scenario)
          }
        }}>
          <Text style={styles.buttonText}>Contact Us</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
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

// Logs for StyleSheet creation completion (after variable declaration 'styles')
console.log("AboutApp: StyleSheet.create for 'background' style defined."); // Log 22
console.log("AboutApp: StyleSheet.create for 'container' style defined."); // Log 23
console.log("AboutApp: StyleSheet.create for 'logo' style defined."); // Log 24
console.log("AboutApp: StyleSheet.create for 'header' style defined."); // Log 25
console.log("AboutApp: StyleSheet.create for 'text' style defined."); // Log 26
console.log("AboutApp: StyleSheet.create for 'version' style defined."); // Log 27
console.log("AboutApp: StyleSheet.create for 'button' style defined."); // Log 28
console.log("AboutApp: StyleSheet.create for 'buttonText' style defined."); // Log 29