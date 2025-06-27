import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ImageBackground,
  ActivityIndicator 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import Markdown from "react-native-markdown-display";


// Helper functions to auto-clean and perform basic spell check.
function autoCleanText(text) {
  // Reduce sequences of more than 2 identical letters to just 2.
  return text.replace(/(\w)\1{2,}/g, "$1$1");
}

function basicSpellCheck(text) {
  return text
    .replace(/\bteh\b/gi, "the")
    .replace(/\badn\b/gi, "and")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bdefinately\b/gi, "definitely");
}

function processText(text) {
  return basicSpellCheck(autoCleanText(text));
}

// This component simply processes the text and renders it using Markdown.
function AnswerDisplay({ text }) {
  const processedText = processText(text);
  return (
    <Markdown style={markdownStyles}>
      {processedText}
    </Markdown>
  );
}

// Markdown styles to complement the futuristic theme.
const markdownStyles = {
  body: {
    fontSize: 20,
    color: "#E0E0E0",
    lineHeight: 30,
    textShadowColor: "#00FFFF",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heading1: {
    fontSize: 26,
    color: "#FFD700",
    marginBottom: 10,
  },
  heading2: {
    fontSize: 24,
    color: "#FFD700",
    marginBottom: 8,
  },
};

// Helper: Convert ArrayBuffer to Base64 string.
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function AskAiFullPage() {
  const router = useRouter();
  const { fullAnswer } = useLocalSearchParams();

  // For demo purposes, VIP status is hardcoded.
  const isVIP = true;




  // Handles voice playback: simply play/stop the pre-fetched audio.


  return (
    <ImageBackground source={require("../assets/images/AiBk.png")} style={styles.container}>
      {/* Header with centered title */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Response</Text>
      </View>

      {/* Floating Back Button */}
      <TouchableOpacity style={styles.floatingBackButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>

  <View style={styles.answerContentWrapper}>
    <AnswerDisplay text={fullAnswer} />
  </View>




      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    width: "100%",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  floatingBackButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    backgroundColor: "rgba(255, 102, 0, 0.63)",
    padding: 12,
    borderRadius: 30,
    shadowColor: "#FF6600",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollContainer: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexGrow: 1,
  },

  textBackground: { flex: 1 },
  textBackgroundImage: {
    borderRadius: 2,
    resizeMode: "cover",
  },


  lockedButton: {
    backgroundColor: "rgba(128, 128, 128, 0.6)",
    padding: 15,
    borderRadius: 3,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
  },
  lockedButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  answerBackgroundImage: {
    width: '100%',
    minHeight: 300, // or whatever works
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    padding: 20,
  },
  
  answerContentWrapper: {
    backgroundColor: 'rgba(0,0,0,0.4)', // optional: soft black layer for readability
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  
});
