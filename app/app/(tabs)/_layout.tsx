// app/(tabs)/_layout.tsx



import React, { useContext, useEffect, useState } from "react";
import { Platform, View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { Tabs, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import auth from "../firebaseAuth";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider } from '../../services/useAuth';

// Imports
import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import TabBarBackground from "../../components/ui/TabBarBackground";
import { Colors } from "@/constants/Colors";
import { ThemeProvider, ThemeContext } from "@/context/ThemeContext";

WebBrowser.maybeCompleteAuthSession();

// ================================================================
// PRODUCTION CONSOLE OPTIMIZATION - STOP SPAM IMMEDIATELY
// ================================================================

// Initialize console optimization on app start
if (!__DEV__) {
  // Store original console methods
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // Rate limiting for logs
  let logCount = 0;
  let lastLogReset = Date.now();
  const MAX_LOGS_PER_SECOND = 3;
  
  const resetLogCount = () => {
    if (Date.now() - lastLogReset > 1000) {
      logCount = 0;
      lastLogReset = Date.now();
    }
  };
  
  // Override console.log to filter spam
// ================================================================
// NUCLEAR OPTION - COMPLETE CONSOLE SILENCE
// ================================================================

if (!__DEV__) {
  // Store original for emergencies
  const originalError = console.error;
  
  // COMPLETE SILENCE
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.debug = () => {};
  
  // Only keep errors
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    // Only show actual errors, not performance logs disguised as errors
    if (message.includes('🚨 ERROR:') || 
        message.includes('Error:') ||
        message.includes('Warning:')) {
      originalError.apply(console, args);
    }
  };
  
  // Single confirmation message
  originalError('🔇 NUCLEAR MODE: All console logs completely silenced');
}
  // Always keep errors
  console.error = (...args) => {
    originalError.apply(console, args);
  };
  
  // Log that console optimization is active
  console.log('🔇 Production mode: Console spam filtering active');
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthWrapper>
          <ThemedTabs />
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}

// ✅ Properly typed AuthWrapper with Firebase + Custom Auth integration
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setFirebaseUser(currentUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Debug logging (only in development) - REDUCED FREQUENCY
  useEffect(() => {
    if (__DEV__) {
      // Only log on meaningful changes, not every render
      const routeString = JSON.stringify(segments);
      const userStatus = firebaseUser ? "Authenticated" : "Not authenticated";
      
      // Use a ref to prevent spam
      const currentState = `${routeString}-${userStatus}`;
      
      // Only log if state actually changed
      if (AuthWrapper.lastLoggedState !== currentState) {
        console.log("🔍 Route/Auth State:", { segments, firebaseUser: !!firebaseUser });
        AuthWrapper.lastLoggedState = currentState;
      }
    }
  }, [segments, firebaseUser]);

  // Show login banner logic
  const showLoginBanner = !firebaseUser && 
                          !isLoading && 
                          segments.length > 1 && 
                          segments[1] === "Home";

  // Don't render anything while loading
  if (isLoading) {
    return (
      <SafeAreaView style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
      }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      {children}

      {/* Enhanced Login Banner */}
      {showLoginBanner && (
        <SafeAreaView style={{
          position: "absolute",
          top: Platform.OS === 'ios' ? 68 : 48,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          paddingVertical: 8,
          paddingHorizontal: 15,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(0, 0, 0, 0.1)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <TouchableOpacity 
            onPress={() => {
              try {
                router.push("/screens/LoginScreen");
              } catch (error) {
                console.warn("Navigation error:", error);
                // Fallback navigation
                router.replace("/screens/LoginScreen");
              }
            }}
            style={{
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 4,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ 
              fontWeight: "bold", 
              color: "#333",
              fontSize: 14,
              textAlign: 'center'
            }}>
              🚀 Log in to unlock full features!
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </>
  );
}

// Add static property to track logging state
(AuthWrapper as any).lastLoggedState = '';

// ✅ Enhanced ThemedTabs with error handling
function ThemedTabs() {
  const themeContext = useContext(ThemeContext);
  
  // Fallback if ThemeContext is not available
  const isDarkMode = themeContext?.isDarkMode ?? false;
  const themeKey = isDarkMode ? "dark" : "light";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[themeKey]?.tint ?? "#007AFF",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => (
          <TabBarBackground 
            backgroundColor={Colors[themeKey]?.background ?? "#FFFFFF"} 
          />
        ),
        tabBarStyle: {
          backgroundColor: Colors[themeKey]?.background ?? "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? "#333" : "#E5E5E5",
          ...Platform.select({
            ios: { 
              position: "absolute",
              paddingBottom: 0,
            },
            android: {
              height: 60,
              paddingBottom: 5,
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 28} 
              name="house.fill" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 28} 
              name="paperplane.fill" 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="forum"
        options={{
          title: "Forum",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 30 : 28} 
              name="bubble.left.and.bubble.right.fill" 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}