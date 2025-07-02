import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { registerUser } from "../authService"; // Import register function
import { useRouter } from "expo-router";

console.log("RegisterScreen: Component definition started.");

const RegisterScreen = () => {
  console.log("RegisterScreen: Component mounted.");

  const [email, setEmail] = useState("");
  console.log("RegisterScreen: Initializing email state.");
  const [password, setPassword] = useState("");
  console.log("RegisterScreen: Initializing password state.");
  const router = useRouter();
  console.log("RegisterScreen: Initializing router.");

  const handleRegister = async () => {
    console.log("RegisterScreen: Register button pressed. handleRegister function initiated.");
    console.log("RegisterScreen: Current email input: " + email);
    // console.log("RegisterScreen: Current password input: " + password); // Avoid logging password for security

    console.log("RegisterScreen: Performing input validation for registration.");
    if (!email || !password) {
      console.log("RegisterScreen: Validation failed: Email or password field is empty.");
      Alert.alert("Error", "Please enter email and password.");
      console.log("RegisterScreen: Displaying alert for missing fields.");
      return;
    }
    console.log("RegisterScreen: Input validation passed.");

    try {
      console.log("RegisterScreen: API call to register user started for email: " + email);
      const user = await registerUser(email, password);
      console.log("RegisterScreen: registerUser API call returned.");

      if (user) {
        console.log("RegisterScreen: User registration successful. User object received.");
        Alert.alert("Success", "Account created successfully! Logging in...");
        console.log("RegisterScreen: Displaying success alert after registration.");
        console.log("RegisterScreen: Initiating navigation to UserProfileScreen after successful registration.");
        router.replace("/screens/UserProfileScreen"); // Redirect to profile
        console.log("RegisterScreen: router.replace called for UserProfileScreen.");
      } else {
        console.log("RegisterScreen: User registration failed: No user object returned from API.");
        Alert.alert("Registration Failed", "Please try again.");
        console.log("RegisterScreen: Displaying registration failed alert.");
      }
    } catch (error: any) {
      console.log("RegisterScreen: API call to register user failed. Error: " + error.message);
      Alert.alert("Registration Error", "An unexpected error occurred during registration. Please try again.");
      console.log("RegisterScreen: Displaying unexpected error alert.");
    }
  };

  console.log("RegisterScreen: Rendering component JSX.");
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          console.log("RegisterScreen: Email input changed. New value length: " + text.length);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 chars)"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          console.log("RegisterScreen: Password input changed. New value length: " + text.length);
        }}
      />

      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          console.log("RegisterScreen: 'Already have an account? Login' link pressed.");
          console.log("RegisterScreen: Navigating to LoginScreen.");
          router.replace("/screens/LoginScreen");
          console.log("RegisterScreen: router.replace called for LoginScreen.");
        }}
      >
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 20,
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    color: "white",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: "#121212",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkText: {
    color: "#FFD700",
    fontSize: 14,
    marginTop: 10,
  },
});
console.log("RegisterScreen: Stylesheet created.");

export default RegisterScreen;
console.log("RegisterScreen: Exporting default component.");