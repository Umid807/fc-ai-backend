import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const mistakes = [
  {
    title: "Poor Positioning in the Final Third",
    details: `Many offensive players tend to crowd around the ball and fail to position themselves effectively in the final third. This leads to easy marking by defenders, a lack of clear passing lanes, and missed goal-scoring opportunities.
Good positioning means understanding the space, timing your runs, and anticipating where the ball will be. To avoid this mistake, focus on off-ball movement, study game footage to recognize where you should be, and practice drills that emphasize spatial awareness in the attacking third.`,
  },
  {
    title: "Overdribbling",
    details: `Overdribbling happens when a player tries to beat too many opponents on their own, resulting in loss of control and unnecessary turnovers. Excessive individual dribbling can disrupt the flow of the attack and isolate you from your teammates.
Instead, learn to recognize when to pass rather than try to take on defenders solo. Work on decision-making drills that help you maintain possession and create better scoring opportunities through quick, simple passes.`,
  },
  {
    title: "Forcing Shots from Distance",
    details: `Taking a shot from outside the optimal scoring area usually results in poor accuracy and low conversion rates. Forcing a long-range shot can also disrupt the buildup of an attack, giving defenders time to reorganize.
Focus on building your attack by circulating the ball and moving closer to the goal. Only attempt long-range shots when you have a clear view and a high chance of scoring, or when the goalkeeper is out of position.`,
  },
  {
    title: "Lack of Off-Ball Movement",
    details: `A static attacking line makes it easy for defenders to predict your play. Without effective off-ball movement, you can become isolated and the team’s attacking options get limited.
To overcome this, work on creating space by making timely runs and constantly repositioning. This not only opens up passing lanes but also forces defenders to shift, potentially creating gaps in the defense. Team drills and communication exercises can help enhance this aspect.`,
  },
  {
    title: "Ineffective Combination Play",
    details: `Ineffective combination play occurs when players fail to connect with quick, incisive passes. This mistake is often the result of poor communication and timing between teammates, which breaks down the flow of the attack.
To improve, focus on short, rapid passing drills and exercises that enhance your understanding of your teammates’ movements. Developing a strong sense of timing and spatial awareness on the pitch is key to building a more fluid and dangerous attack.`,
  },
  {
    title: "Failing to Change the Tempo",
    details: `Maintaining a constant pace can render your attack predictable. When a team fails to change the tempo, it allows defenders to settle and adjust, making it harder to break through a well-organized defense.
Learn to vary your speed—sometimes slowing down to maintain control, and at other times accelerating to catch the defense off guard. Practicing transition drills and being mindful of game rhythm can help you master tempo changes effectively.`,
  },
  {
    title: "Miscommunication and Poor Decision Making",
    details: `Miscommunication among attackers often leads to misplaced runs, incorrect passes, and ultimately, lost scoring opportunities. Poor decision-making in the final third disrupts the flow of an attack and can easily result in turnovers.
To avoid these pitfalls, invest time in building on-field chemistry with your teammates. Analyze game situations through video review, engage in tactical drills that emphasize clear communication, and always be aware of the options available around you.`,
  },
];

const OffenseMistakes = () => {
  console.log("OffenseMistakes: Component mounted successfully.");

  // Keep track of expanded cards using a Set
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  console.log("OffenseMistakes: Initialized 'expanded' state:", expanded);

  // Store Animated.Value for each card's details opacity
  const animationValues = useRef<Record<number, Animated.Value>>({});
  console.log("OffenseMistakes: Initialized 'animationValues' ref.");

  // Initialize animated values for each mistake if not already done
  mistakes.forEach((_, index) => {
    if (!animationValues.current[index]) {
      animationValues.current[index] = new Animated.Value(0);
      console.log(`OffenseMistakes: Initialized Animated.Value for index ${index}.`);
    }
  });

  const toggleExpand = (index: number) => {
    console.log(`OffenseMistakes: toggleExpand called for index: ${index}`);
    const newExpanded = new Set(expanded);
    const isCurrentlyExpanded = newExpanded.has(index);
    console.log(`OffenseMistakes: Card at index ${index} is currently expanded: ${isCurrentlyExpanded}`);

    try {
      if (isCurrentlyExpanded) {
        newExpanded.delete(index);
        console.log(`OffenseMistakes: Collapsing card at index ${index}.`);
        Animated.timing(animationValues.current[index], {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          console.log(`OffenseMistakes: Animation for index ${index} to collapse completed.`);
        });
      } else {
        newExpanded.add(index);
        console.log(`OffenseMistakes: Expanding card at index ${index}.`);
        Animated.timing(animationValues.current[index], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          console.log(`OffenseMistakes: Animation for index ${index} to expand completed.`);
        });
      }
      setExpanded(newExpanded);
      console.log(`OffenseMistakes: Updated expanded state. New size: ${newExpanded.size}`);
    } catch (error: any) {
      console.log(`OffenseMistakes: Error in toggleExpand for index ${index}. Error: ${error.message}`);
    }
  };

  console.log("OffenseMistakes: Rendering component UI.");
  return (
    <LinearGradient colors={['#0e0e0e', '#1a1a1a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>Avoid These Offensive Mistakes</Text>
        {mistakes.map((mistake, index) => {
          const isExpanded = expanded.has(index);
          console.log(`OffenseMistakes: Rendering card for index ${index}. Is expanded: ${isExpanded}`);
          return (
            <View key={index} style={styles.card}>
              <TouchableOpacity onPress={() => {
                console.log(`OffenseMistakes: TouchableOpacity pressed for index ${index}.`);
                toggleExpand(index);
              }}>
                <LinearGradient
                  colors={['#3a3a3a', '#2a2a2a']}
                  style={styles.cardHeader}
                >
                  <View style={styles.headerContent}>
                    <Text style={styles.title}>{mistake.title}</Text>
                    {isExpanded ? (
                      <ChevronUp size={20} color="#FFD700" />
                    ) : (
                      <ChevronDown size={20} color="#FFD700" />
                    )}
                    {console.log(`OffenseMistakes: Chevron icon rendered for index ${index}. Direction: ${isExpanded ? 'Up' : 'Down'}`)}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              {isExpanded && (
                <Animated.View
                  style={[styles.details, { opacity: animationValues.current[index] }]}
                >
                  <Text style={styles.detailsText}>{mistake.details}</Text>
                  {console.log(`OffenseMistakes: Details visible for index ${index}. Opacity: ${animationValues.current[index]}`)}
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>
      {console.log("OffenseMistakes: ScrollView rendering complete.")}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  cardHeader: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  details: {
    backgroundColor: '#2A2A2A',
    padding: 16,
  },
  detailsText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
});

export default OffenseMistakes;