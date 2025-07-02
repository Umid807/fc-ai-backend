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

const principles = [
  {
    title: "Create Space",
    details: `Effective attacking play starts with creating space. Good attackers constantly move off the ball to stretch the opposition's defense, making gaps that can be exploited by through balls and quick passes. Practice making intelligent runs and timing them perfectly to receive passes in areas where defenders are less concentrated.`,
  },
  {
    title: "Quick Passing and Movement",
    details: `Fast, precise passing is the backbone of a dynamic attack. By moving the ball quickly and supporting each other with constant movement, attackers can dismantle organized defenses. Focus on short, rapid passes and use one-twos to keep the opposition off balance while always looking to move into space after making a pass.`,
  },
  {
    title: "Utilize Width and Depth",
    details: `Spreading the play across the full width of the pitch forces defenders to cover more ground, opening up channels in the middle. At the same time, deep runs behind the defense add vertical threat. Train to combine lateral movement with forward runs so that you can pull defenders out of position and create scoring opportunities.`,
  },
  {
    title: "Switching Play",
    details: `Switching the point of attack quickly is crucial when the defense is compact. A well-executed switch can leave one side of the field vulnerable, allowing your advanced team to exploit a contemporary numerical advantage. Work on cross-field passes and make sure you’re aware of teammates making runs to support these switches.`,
  },
  {
    title: "Changing the Tempo",
    details: `Maintaining a constant rhythm makes your attack predictable. Changing the tempo alternating between quick, incisive moves and slower, more controlled play. can unsettle even the best-organized defenses. Learn to read the game and adjust your pace accordingly, knowing when to push forward rapidly or when to hold the ball to let teammates join the attack.`,
  },
  {
    title: "Effective Combination Play",
    details: `Combination play is all about synchronizing with your teammates. Overlapping runs, wall passes, and quick interchanges require excellent communication and timing. Developing chemistry on the pitch through practice drills can help you and your teammates understand each other’s movement patterns, ultimately leading to more fluid and unpredictable attacking moves.`,
  },
  {
    title: "Anticipation and Timing",
    details: `Anticipation is the difference between a reactive and a proactive attacker. Knowing when to make a run, when to hold back, and when to deliver the final pass is critical. This comes from studying the game, analyzing opponents, and understanding the flow of play. Focus on drills that sharpen your decision-making and timing, so that you can be in the right place at the right time.`,
  },
  // You can add more principles as needed.
];

const AttackingPrinciples = () => {
  console.log("AttackingPrinciples: Component rendering started.");

  // Using a Set to track expanded card indices.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  console.log("AttackingPrinciples: useState 'expanded' initialized with an empty Set.");

  // Animated values for each card (for smooth fade in/out of details).
  const animationValues = useRef<Record<number, Animated.Value>>({});
  console.log("AttackingPrinciples: useRef 'animationValues' initialized.");

  useEffect(() => {
    console.log("AttackingPrinciples: Component mounted successfully.");
    // No cleanup needed for this effect, but adding for demonstration.
    return () => {
      console.log("AttackingPrinciples: Component unmounting.");
    };
  }, []);

  // Initialize animated values if not already done.
  principles.forEach((_, index) => {
    if (!animationValues.current[index]) {
      animationValues.current[index] = new Animated.Value(0);
      console.log(`AttackingPrinciples: Initializing animation value for index: ${index}`);
    } else {
      console.log(`AttackingPrinciples: Animation value already exists for index: ${index}. Skipping initialization.`);
    }
  });

  const toggleExpand = (index: number) => {
    console.log(`AttackingPrinciples: Toggle expand called for index: ${index}`);
    try {
      const newExpanded = new Set(expanded);
      console.log(`AttackingPrinciples: Created new Set from current expanded state. Current size: ${expanded.size}`);
      const currentlyExpanded = newExpanded.has(index);
      console.log(`AttackingPrinciples: Card at index ${index} is currently expanded: ${currentlyExpanded}`);

      if (currentlyExpanded) {
        newExpanded.delete(index);
        console.log(`AttackingPrinciples: Card at index ${index} was expanded. Deleting from set.`);
        Animated.timing(animationValues.current[index], {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          console.log(`AttackingPrinciples: Animation to collapse card ${index} completed.`);
        });
        console.log(`AttackingPrinciples: Started collapse animation for index: ${index}`);
      } else {
        newExpanded.add(index);
        console.log(`AttackingPrinciples: Card at index ${index} was collapsed. Adding to set.`);
        Animated.timing(animationValues.current[index], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          console.log(`AttackingPrinciples: Animation to expand card ${index} completed.`);
        });
        console.log(`AttackingPrinciples: Started expand animation for index: ${index}`);
      }
      setExpanded(newExpanded);
      console.log(`AttackingPrinciples: Expanded state updated. New expanded set size: ${newExpanded.size}`);
    } catch (error) {
      console.error(`AttackingPrinciples: Error in toggleExpand for index ${index}. Error: ${error.message}`);
    }
  };

  console.log("AttackingPrinciples: Component rendering return block.");
  return (
    <LinearGradient colors={['#0e0e0e', '#1a1a1a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>Essential Attacking Principles</Text>
        {console.log("AttackingPrinciples: Mapping through principles array for rendering cards.")}
        {principles.map((principle, index) => {
          const isExpanded = expanded.has(index);
          console.log(`AttackingPrinciples: Rendering card for index: ${index}, title: "${principle.title}", isExpanded: ${isExpanded}`);
          return (
            <View key={index} style={styles.card}>
              <TouchableOpacity onPress={() => {
                console.log(`AttackingPrinciples: TouchableOpacity pressed for card index: ${index}`);
                toggleExpand(index);
              }}>
                <LinearGradient
                    colors={['#3a3a3a', '#2a2a2a']}
                   style={styles.cardHeader}
                >
                  <View style={styles.headerContent}>
                    <Text style={styles.title}>{principle.title}</Text>
                    {isExpanded ? (
                        <>
                          <ChevronUp size={20} color="#FFD300" />
                          {console.log(`AttackingPrinciples: Displaying ChevronUp for card index: ${index}`)}
                        </>
                    ) : (
                        <>
                          <ChevronDown size={20} color="#FFD300" />
                          {console.log(`AttackingPrinciples: Displaying ChevronDown for card index: ${index}`)}
                        </>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              {isExpanded && (
                <>
                  {console.log(`AttackingPrinciples: Details view conditionally rendered for card index: ${index}`)}
                  <Animated.View
                    style={[styles.details, { opacity: animationValues.current[index] }]}
                  >
                    <Text style={styles.detailsText}>{principle.details}</Text>
                  </Animated.View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
      {console.log("AttackingPrinciples: ScrollView rendering complete.")}
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
    color: '#FFD300',
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

export default AttackingPrinciples;