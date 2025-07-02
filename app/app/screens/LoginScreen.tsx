import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Image, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { loginUser } from "../authService";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseApp } from "../firebaseConfig";
import * as WebBrowser from "expo-web-browser";
import * as Google from 'expo-auth-session/providers/google';
import { useTranslation } from 'react-i18next';

const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [gmailHijackCount, setGmailHijackCount] = useState(0);
  const router = useRouter();

  // 🔑 CRITICAL: Use your actual Android client ID
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: '313289431085-hfp2mt1cd7330b3k4n1k19hd4d9iq5i3.apps.googleusercontent.com',
    iosClientId: '313289431085-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: '313289431085-hrrpagn4h0ddjmde35k9shi18d1d14s9.apps.googleusercontent.com',
    extraParams: {
      prompt: 'select_account',
      access_type: 'offline',
    },
  });

  // Handle Google Auth Response with Smart Error Handling
  useEffect(() => {
    if (response?.type === 'success') {
      setGoogleAuthInProgress(true);
      const { id_token } = response.params;
      if (id_token) {
        setTimeout(() => {
          router.replace("/");
          handleGoogleSignIn(id_token);
        }, 1500);
      }
    } else if (response?.type === 'dismiss') {
      setGoogleAuthInProgress(false);
      setGmailHijackCount(prev => prev + 1);
      if (gmailHijackCount === 0) {
        Alert.alert(
          "Almost there! 😊", 
          "Looks like you got redirected to Gmail. Just close Gmail and return here - your login will complete automatically!",
          [
            { text: t('login_screen.try_again'), onPress: () => setLoading(false) },
            { text: "Got it", onPress: () => setLoading(false) }
          ]
        );
      } else {
        // Second+ hijack - suggest alternatives
        Alert.alert(
          "Let's try something else", 
          "Google login seems to be having issues on your device. Email signup is more reliable and just as quick!",
          [
            { text: t('login_screen.try_again'), onPress: () => setLoading(false) },
            { text: "Use Email Instead", onPress: () => {
              setLoading(false);
            }}
          ]
        );
      }
    }
    console.log("============================");
  }, [response, gmailHijackCount, t]);

  // Process Google Sign-In with Firebase
  const handleGoogleSignIn = async (idToken) => {
    try {
      console.log("🔥 Processing Google ID Token with Firebase...");
      
      const credential = GoogleAuthProvider.credential(idToken);
      console.log("✅ Google credential created");
      
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      console.log("🎉 Firebase Sign-In Successful!");
      console.log("User ID:", user.uid);
      console.log("User Email:", user.email);
      console.log("User Name:", user.displayName);
      
      await createUserDocumentIfNotExists(user);
      
      setGoogleAuthInProgress(false);
      
      setTimeout(() => {
        Alert.alert(t('login_screen.success_title'), t('login_screen.login_success'));
      }, 500);
      
    } catch (error) {
      console.error("❌ Firebase Sign-In Error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      setGoogleAuthInProgress(false);
      
      let errorMessage = t('login_screen.google_login_error_generic');
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('login_screen.google_login_error_account_exists');
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = t('login_screen.google_login_error_invalid_credential');
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = t('login_screen.google_login_error_not_enabled');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t('login_screen.google_login_error'), errorMessage);
      router.replace("/screens/LoginScreen");
    } finally {
      setLoading(false);
    }
  };

  // Create/Update User Document
  const createUserDocumentIfNotExists = async (user) => {
    if (!user) return;
    
    try {
      console.log("📝 Creating/updating user document...");
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log("Creating new user document");
        await setDoc(userRef, {
          uid: user.uid,
          username: user.displayName || "Anonymous",
          email: user.email,
          profileImage: user.photoURL || "https://via.placeholder.com/80",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          vipStatus: false,
          coins: 0,
          rank: "Member",
          remainingFreeAIQuestions: 3,
          dailyChallengeCoins: 0,
        });
        console.log("✅ User document created for:", user.uid);
      } else {
        console.log("Updating existing user document");
        await updateDoc(userRef, { lastLogin: serverTimestamp() });
        console.log("✅ User document updated for:", user.uid);
      }
    } catch (error) {
      console.error("❌ Error creating/updating user document:", error);
    }
  };

  // Email/Password Login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('login_screen.error_title'), t('login_screen.error_empty_fields'));
      return;
    }
    try {
      setLoading(true);
      const user = await loginUser(email, password);
      if (user) {
        await createUserDocumentIfNotExists(user);
        Alert.alert(t('login_screen.success_title'), t('login_screen.login_success'));
        router.push("/");
      } else {
        Alert.alert(t('login_screen.login_failed_title'), t('login_screen.login_failed'));
      }
    } catch (error) {
      Alert.alert(t('login_screen.login_error'), error.message || t('login_screen.login_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      console.log("🚀 Starting Google Login...");
      setLoading(true);
      
      if (!request) {
        console.log("❌ Google request not available");
        Alert.alert(t('login_screen.configuration_error_title'), t('login_screen.configuration_error_message'));
        setLoading(false);
        return;
      }

      // Trigger Google Sign-In
      console.log("🔄 Prompting Google Auth...");
      await promptAsync();
      
    } catch (error) {
      console.error("❌ Google Login Handler Error:", error);
      Alert.alert(t('login_screen.google_login_error'), t('login_screen.google_login_error_generic'));
      setLoading(false);
    }
  };

  // Phone Login Placeholder
  const handlePhoneLogin = async () => {
    try {
      Alert.alert(t('login_screen.phone_login_title'), t('login_screen.phone_login_placeholder'));
    } catch (error) {
      Alert.alert(t('login_screen.phone_login_error'), error.message || t('login_screen.login_error_generic'));
    }
  };

  // Facebook Login Placeholder
  const handleFacebookLogin = async () => {
    try {
      Alert.alert(t('login_screen.facebook_login_title'), t('login_screen.facebook_login_placeholder'));
    } catch (error) {
      Alert.alert(t('login_screen.facebook_login_error'), error.message || t('login_screen.login_error_generic'));
    }
  };

  return (
    <>
      <LinearGradient colors={["#0D0D0D", "#222222"]} style={styles.pageGradient}>
        <Image
          source={require("../../assets/images/tactical.png")}
          style={styles.tacticalBg}
          resizeMode="cover"
        />

        <View style={styles.container}>
          <Text style={styles.welcomeText}>{t('login_screen.enter_tunnel')}</Text>

          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>{t('login_screen.app_title')}</Text>

          <LinearGradient
            colors={["#1e1e1e", "#3a3a3a"]}
            style={styles.loginPanel}
          >
            <TextInput
              style={styles.input}
              placeholder={t('login_screen.email_placeholder')}
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('login_screen.password_placeholder')}
                placeholderTextColor="#bbb"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={24}
                  color="#bbb"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? t('login_screen.loading') : t('login_screen.login_button')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.orText}>{t('login_screen.or_text')}</Text>

            <View style={styles.socialButtonsRow}>
              <TouchableOpacity style={styles.socialButton} onPress={handlePhoneLogin}>
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.socialButton, loading && { opacity: 0.6 }]}
                onPress={handleGoogleLogin}
                disabled={loading || !request}
              >
                <FontAwesome name="google" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookLogin}>
                <FontAwesome name="facebook" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/screens/RegisterScreen")}>
              <Text style={styles.linkText}>{t('login_screen.create_account')}</Text>
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.ticker}>
            <Ionicons name="football" size={16} color="#FFD700" />
            <Text style={styles.tickerText}>
              {"  "}{t('login_screen.ticker_prefix')} 4-3-3
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cool Loading Overlay for Google Authentication */}
      {googleAuthInProgress && (
        <View style={styles.loadingOverlay}>
          <LinearGradient 
            colors={['rgba(13,13,13,0.95)', 'rgba(34,34,34,0.95)']} 
            style={styles.loadingGradient}
          >
            <View style={styles.loadingContent}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.loadingLogo}
                resizeMode="contain"
              />
              <ActivityIndicator size="large" color="#FFD700" style={styles.loadingSpinner} />
              <Text style={styles.loadingText}>{t('login_screen.google_signing_in')}</Text>
              <Text style={styles.loadingSubText}>{t('login_screen.please_wait')}</Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  pageGradient: {
    flex: 1,
  },
  tacticalBg: {
    position: "absolute",
    width: "110%",
    height: "110%",
    opacity: 0.15,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  welcomeText: {
    position: "absolute",
    top: 40,
    fontSize: 18,
    color: "#00FFFF",
    fontWeight: "bold",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 15,
  },
  title: {
    color: "#FFD700",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  loginPanel: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "#00FFFF",
    shadowColor: "#00FFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    color: "#fff",
    marginBottom: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    position: "relative",
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
  },
  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 14,
    borderRadius: 8,
    width: "80%",
    alignSelf: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  orText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  socialButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
    marginBottom: 10,
  },
  socialButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  linkText: {
    color: "#FFD700",
    fontSize: 14,
    marginTop: 15,
    textAlign: "center",
  },
  ticker: {
    position: "absolute",
    bottom: 30,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tickerText: {
    color: "#FFD700",
    fontSize: 14,
  },
  
  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 30,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#00FFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default LoginScreen;