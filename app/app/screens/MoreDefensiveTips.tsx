import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MoreDefensiveTips() {
  console.log("MoreDefensiveTips: Component function execution started."); // Log 1 - Component Lifecycle

  const navigation = useNavigation();
  console.log("MoreDefensiveTips: Navigation hook initialized for screen interactions."); // Log 2 - Data Operations (hook init)

  // Component Lifecycle: Logs when screen comes into focus and when it goes out of focus
  // useFocusEffect is ideal for logging mount/unmount equivalents in navigation stacks
  useFocusEffect(
    useCallback(() => {
      console.log("MoreDefensiveTips: Screen focused (mounted). Component is now active."); // Log 3 - Component Lifecycle
      return () => {
        console.log("MoreDefensiveTips: Screen unfocused (unmounting/cleanup initiated). Component is about to become inactive."); // Log 4 - Component Lifecycle
      };
    }, [])
  );

  console.log("MoreDefensiveTips: Initializing static tips data array."); // Log 5 - Data Operations
  const tips = [
    {
      id: '1',
      title: 'Anticipate Opponent Moves',
      description: 'Learn how to read the game and predict your opponent’s next move.',
      image: 'https://via.placeholder.com/80',
      screen: 'AnticipateTips',
    },
    {
      id: '2',
      title: 'Master Defensive Stamina',
      description: 'Tips on maintaining high defensive performance throughout the match.',
      image: 'https://via.placeholder.com/80',
      screen: 'StaminaTips',
    },
    {
      id: '3',
      title: 'Defending in 1v1 Situations',
      description: 'How to stay composed and win crucial 1v1 duels.',
      image: 'https://via.placeholder.com/80',
      screen: 'OneVsOneTips',
    },
  ];
  console.log("MoreDefensiveTips: Tips data array loaded successfully. Total tips found: " + tips.length); // Log 6 - Data Operations

  console.log("MoreDefensiveTips: Preparing for main component UI rendering cycle."); // Log 7 - Component Lifecycle

  return (
    <View style={styles.container}>
      {/* Back Button */}
      {console.log("MoreDefensiveTips: Back button TouchableOpacity prepared for rendering.")} {/* Log 8 - UI */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          console.log("MoreDefensiveTips: User Interaction: Back button pressed. Initiating navigation action."); // Log 9 - User Interactions
          try {
            navigation.goBack();
            console.log("MoreDefensiveTips: Navigation & UI: Successfully navigated back to previous screen."); // Log 10 - Navigation & UI
          } catch (error: any) { // Catch potential errors during navigation
            console.log("MoreDefensiveTips: Error Scenario: Navigation back failed. Error: " + error.message); // Log 11 - Error Scenarios
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#FFD700" />
      </TouchableOpacity>

      {/* Header Text */}
      {console.log("MoreDefensiveTips: Header Text element 'More Defensive Tips' prepared for rendering.")} {/* Log 12 - UI */}
      <Text style={styles.header}>More Defensive Tips</Text>

      {/* Scrollable Content Area */}
      {console.log("MoreDefensiveTips: ScrollView prepared for rendering tips list.")} {/* Log 13 - UI */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {console.log("MoreDefensiveTips: Conditional Logic: Checking if tips data is available for iteration.")} {/* Log 14 - Conditional Logic */}
        {
          // Conditional Logic: Render tips if available, otherwise display a fallback message
          tips.length > 0 ? (
            tips.map((tip) => {
              console.log("MoreDefensiveTips: Conditional Logic: Mapping and preparing to render individual tip card for ID: " + tip.id + " - " + tip.title); // Log 15 - Conditional Logic
              return (
                <TouchableOpacity
                  key={tip.id}
                  style={styles.card}
                  onPress={() => {
                    console.log("MoreDefensiveTips: User Interaction: Tip card pressed for ID: " + tip.id + ", Title: " + tip.title + ". Attempting screen navigation to: " + tip.screen); // Log 16 - User Interactions
                    try {
                      navigation.navigate(tip.screen);
                      console.log("MoreDefensiveTips: Navigation & UI: Successfully initiated navigation to screen: " + tip.screen + "."); // Log 17 - Navigation & UI
                    } catch (error: any) { // Catch potential errors during navigation
                      console.log("MoreDefensiveTips: Error Scenario: Navigation failed for screen: " + tip.screen + ". Error: " + error.message); // Log 18 - Error Scenarios
                    }
                  }}
                >
                  <Image source={{ uri: tip.image }} style={styles.thumbnail} />
                  <View style={styles.textContainer}>
                    <Text style={styles.title}>{tip.title}</Text>
                    <Text style={styles.description}>{tip.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFD700" style={styles.arrowIcon} />
                </TouchableOpacity>
              );
            })
          ) : (
            console.log("MoreDefensiveTips: Conditional Rendering: No tips available to render. Displaying fallback text."), // Log 19 - Conditional Rendering
            <Text style={styles.description}>No defensive tips found.</Text>
          )
        }
      </ScrollView>
    </View>
  );
}

console.log("MoreDefensiveTips: Stylesheet definition initiated for component styling."); // Log 20 - Component Lifecycle
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  backButton: {
    marginBottom: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#bbb',
  },
  arrowIcon: {
    marginLeft: 8,
  },
});
console.log("MoreDefensiveTips: Stylesheet object created successfully and applied."); // Log 21 - Component Lifecycle