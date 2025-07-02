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
  console.log("LoginScreen: Component mounted successfully.");
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [gmailHijackCount, setGmailHijackCount] = useState(0);
  const router = useRouter();
  console.log("LoginScreen: State variables initialized.");

  // 🔴 CRITICAL: Use your actual Android client ID
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: '313289431085-hfp2mt1cd7330b3k4n1k19hd4d9iq5i3.apps.googleusercontent.com',
    iosClientId: '313289431085-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: '313289431085-hrrpagn4h0ddjmde35k9shi18d1d14s9.apps.googleusercontent.com',
    extraParams: {
      prompt: 'select_account',
      access_type: 'offline',
    },
  });
  console.log("LoginScreen: Google ID Token Auth Request configured.");

  // Handle Google Auth Response with Smart Error Handling
  useEffect(() => {
    console.log("LoginScreen: Google Auth useEffect triggered. Current response type: " + response?.type);
    if (response?.type === 'success') {
      console.log("LoginScreen: Google Auth successful, ID token received.");
      setGoogleAuthInProgress(true);
      console.log("LoginScreen: googleAuthInProgress state updated to true.");
      const { id_token } = response.params;
      if (id_token) {
        console.log("LoginScreen: Processing ID token for Firebase login.");
        setTimeout(() => {
          router.replace("/");
          console.log("LoginScreen: Navigating to HomeScreen after Google Auth success.");
          handleGoogleSignIn(id_token);
          console.log("LoginScreen: Initiating Firebase Google Sign-In with received ID token.");
        }, 1500);
      }
    } else if (response?.type === 'dismiss') {
      console.log("LoginScreen: Google Auth dismissed by user.");
      setGoogleAuthInProgress(false);
      console.log("LoginScreen: googleAuthInProgress state updated to false.");
      setGmailHijackCount(prev => {
        const newCount = prev + 1;
        console.log("LoginScreen: Gmail hijack count incremented to: " + newCount);
        return newCount;
      });
      if (gmailHijackCount === 0) {
        console.log("LoginScreen: First Gmail redirection detected, showing user prompt.");
        Alert.alert(
          "Almost there! 👋", 
          "Looks like you got redirected to Gmail. Just close Gmail and return here - your login will complete automatically!",
          [
            { text: t('login_screen.try_again'), onPress: () => {
              setLoading(false);
              console.log("LoginScreen: Alert 'Try Again' button pressed. Loading state reset.");
            }},
            { text: "Got it", onPress: () => {
              setLoading(false);
              console.log("LoginScreen: Alert 'Got it' button pressed. Loading state reset.");
            }}
          ]
        );
      } else {
        // Second+ hijack - suggest alternatives
        console.log("LoginScreen: Subsequent Gmail redirection, suggesting alternatives.");
        Alert.alert(
          "Let's try something else", 
          "Google login seems to be having issues on your device. Email signup is more reliable and just as quick!",
          [
            { text: t('login_screen.try_again'), onPress: () => {
              setLoading(false);
              console.log("LoginScreen: Alert 'Try Again' button pressed. Loading state reset.");
            }},
            { text: "Use Email Instead", onPress: () => {
                setLoading(false);
                console.log("LoginScreen: Alert 'Use Email Instead' button pressed. Loading state reset.");
            }}
          ]
        );
      }
    }
  }, [response, gmailHijackCount, t]);

  // Process Google Sign-In with Firebase
  const handleGoogleSignIn = async (idToken) => {
    console.log("LoginScreen: handleGoogleSignIn started with ID Token.");
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      console.log("LoginScreen: Google credential created for Firebase.");
      
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      console.log("LoginScreen: Firebase sign-in with Google successful for user: " + user.uid);
      console.log("LoginScreen: User Email: " + user.email);
      console.log("LoginScreen: User Name: " + user.displayName);
      
      await createUpdateUserDocumentIfNotExist(user);
      console.log("LoginScreen: Attempting to create/update user document for Google user.");
      
      setGoogleAuthInProgress(false);
      console.log("LoginScreen: googleAuthInProgress state updated to false.");
      
      setTimeout(() => {
        Alert.alert(t('login_screen.success_title'), t('login_screen.login_success'));
        console.log("LoginScreen: Displaying Google login success alert.");
      }, 500);
      
    } catch (error) {
      console.error("LoginScreen: Firebase Google Sign-In failed. Error code: " + error.code + ", message: " + error.message);
      
      setGoogleAuthInProgress(false);
      console.log("LoginScreen: googleAuthInProgress state updated to false on error.");
      
      let errorMessage = t('login_screen.google_login_error_generic');
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('login_screen.google_login_error_account_exists');
        console.log("LoginScreen: Google login error: Account exists with different credential.");
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = t('login_screen.google_login_error_invalid_credential');
        console.log("LoginScreen: Google login error: Invalid credential.");
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = t('login_screen.google_login_error_not_enabled');
        console.log("LoginScreen: Google login error: Operation not allowed (e.g., Google sign-in not enabled).");
      } else if (error.message) {
        errorMessage = error.message;
        console.log("LoginScreen: Google login error: Specific error message received.");
      }
      
      Alert.alert(t('login_screen.google_login_error'), errorMessage);
      console.log("LoginScreen: Displaying Google login error alert.");
      router.replace("/screens/LoginScreen");
      console.log("LoginScreen: Redirecting to LoginScreen after Google login error.");
    } finally {
      setLoading(false);
      console.log("LoginScreen: Google login process completed (loading state reset).");
    }
  };

  // Create/Update User Document
  const createUpdateUserDocumentIfNotExist = async (user) => {
    console.log("LoginScreen: createUpdateUserDocumentIfNotExist started for user: " + (user ? user.uid : "undefined"));
    if (!user) {
      console.log("LoginScreen: createUpdateUserDocumentIfNotExist aborted, no user provided.");
      return;
    }
    
    try {
      const userRef = doc(db, "users", user.uid);
      console.log("LoginScreen: Checking if user document exists for UID: " + user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log("LoginScreen: User document not found, creating new one for UID: " + user.uid);
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
        console.log("LoginScreen: New user document created for UID: " + user.uid);
      } else {
        console.log("LoginScreen: User document exists, updating last login for UID: " + user.uid);
        await updateDoc(userRef, { lastLogin: serverTimestamp() });
        console.log("LoginScreen: Existing user document updated for UID: " + user.uid);
      }
    } catch (error) {
      console.error("LoginScreen: Error creating/updating user document: " + error.message);
    }
  };

  // Email/Password Login
  const handleLogin = async () => {
    console.log("LoginScreen: handleLogin (email/password) initiated.");
    if (!email || !password) {
      Alert.alert(t('login_screen.error_title'), t('login_screen.error_empty_fields'));
      console.log("LoginScreen: Email/Password login validation failed: empty fields.");
      return;
    }
    try {
      setLoading(true);
      console.log("LoginScreen: Setting loading state to true for Email/Password login.");
      const user = await loginUser(email, password);
      if (user) {
        console.log("LoginScreen: Email/Password login successful for user: " + email);
        await createUpdateUserDocumentIfNotExist(user);
        console.log("LoginScreen: Attempting to create/update user document for Email/Password user.");
        Alert.alert(t('login_screen.success_title'), t('login_screen.login_success'));
        console.log("LoginScreen: Displaying Email/Password login success alert.");
        router.push("/");
        console.log("LoginScreen: Navigating to HomeScreen after Email/Password login success.");
      } else {
        Alert.alert(t('login_screen.login_failed_title'), t('login_screen.login_failed'));
        console.log("LoginScreen: Email/Password login failed: Invalid credentials.");
      }
    } catch (error) {
      Alert.alert(t('login_screen.login_error'), error.message || t('login_screen.login_error_generic'));
      console.error("LoginScreen: Email/Password login encountered an error: " + error.message);
    } finally {
      setLoading(false);
      console.log("LoginScreen: Email/Password login process completed (loading state reset).");
    }
  };

  // Phone Login Placeholder
  const handlePhoneLogin = async () => {
    console.log("LoginScreen: Phone login button pressed.");
    try {
      Alert.alert(t('login_screen.phone_login_title'), t('login_screen.phone_login_placeholder'));
      console.log("LoginScreen: Displaying phone login placeholder alert.");
    } catch (error) {
      Alert.alert(t('login_screen.phone_login_error'), error.message || t('login_screen.login_error_generic'));
      console.error("LoginScreen: Phone login encountered an error: " + error.message);
    }
  };

  // Facebook Login Placeholder
  const handleFacebookLogin = async () => {
    console.log("LoginScreen: Facebook login button pressed.");
    try {
      Alert.alert(t('login_screen.facebook_login_title'), t('login_screen.facebook_login_placeholder'));
      console.log("LoginScreen: Displaying Facebook login placeholder alert.");
    } catch (error) {
      Alert.alert(t('login_screen.facebook_login_error'), error.message || t('login_screen.login_error_generic'));
      console.error("LoginScreen: Facebook login encountered an error: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    console.log("LoginScreen: Google login button pressed.");
    try {
      console.log("LoginScreen: Starting Google Login prompt.");
      setLoading(true);
      if (!request) {
        console.log("LoginScreen: Google request object not available.");
        Alert.alert(t('login_screen.configuration_error_title'), t('login_screen.configuration_error_message'));
        setLoading(false);
        return;
      }
      console.log("LoginScreen: Prompting Google Auth...");
      await promptAsync();
    } catch (error) {
      console.error("LoginScreen: Google Login Handler Error: " + error.message);
      Alert.alert(t('login_screen.google_login_error'), t('login_screen.google_login_error_generic'));
      setLoading(false);
    }
  };


  return (
    <>
      <LinearGradient colors={["#0DC0D2", "#222222"]} style={styles.pageGradient}>
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
              onChangeText={(text) => {
                setEmail(text);
                console.log("LoginScreen: Email input changed to: " + text);
              }}
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
                onChangeText={(text) => {
                  setPassword(text);
                  console.log("LoginScreen: Password input changed.");
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  setShowPassword(!showPassword);
                  console.log("LoginScreen: Show password toggled to: " + !showPassword);
                }}
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

            <TouchableOpacity onPress={() => {
              router.push("/screens/RegisterScreen");
              console.log("LoginScreen: Navigate to RegisterScreen button pressed.");
            }}>
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