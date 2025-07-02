
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

const strategies = [
  {
    title: "Quick Counter Attack",
    details: `When your opponents commit too many players forward, a quick counter attack can catch them off balance. This strategy involves a rapid transition from defense to offense, using swift, direct passes to exploit the space left behind. It requires excellent timing, precise long passes, and the ability to make incisive runs into open space. Regular practice in counter-attacking drills will help your team capitalize on moments when the opposition is vulnerable.`,
  },
  {
    title: "Overlapping Runs and Utilizing Width",
    details: `Using the full width of the pitch is key to stretching the opposing defense. Overlapping runs by full-backs and wingers create numerical advantages and open passing lanes in the central areas. This approach forces the defense to spread out, leading to gaps that can be exploited with crosses or cutbacks. Emphasize timing, coordinated movements, and clear communication in your training sessions to perfect overlapping runs.`,
  },
  {
    title: "Switching the Point of Attack",
    details: `Switching the point of attack quickly can disorganize a compact defense. This strategy involves rapidly moving the ball from one flank to the other via long diagonal passes, forcing the opposition to reposition. A well-executed switch opens up space on the less-defended side of the field, providing new angles for an attack. Drills focusing on long passing accuracy and decision-making can help your team master this technique.`,
  },
  {
    title: "Exploiting Space with Through Balls",
    details: `Through balls are an effective way to penetrate a well-organized defense. By delivering a precise pass between defenders, forwards can run onto the ball with a clear shot at goal. This strategy hinges on excellent vision and impeccable timing. Work on drills that simulate match situations to improve your ability to identify and execute through passes, ensuring that your forwards are in the right place at the right time.`,
  },
  {
    title: "Effective Combination Play and One-Two Passes",
    details: `Fluid combination play—especially quick one-two passes—can dismantle tight defenses. This strategy relies on close control, rapid exchanges, and synchronized movement. When executed correctly, combination play confuses defenders and creates clear-cut goal-scoring opportunities. Invest time in small-sided games and passing drills to build chemistry and improve the speed of your combinations on the pitch.`,
  },
  {
    title: "High Press and Forcing Turnovers",
    details: `A high pressing strategy aims to disrupt the opponent’s build-up play by applying intense pressure high up the pitch. This forces mistakes and turnovers in dangerous areas. Successful high pressing requires collective effort, high stamina, and excellent coordination among players. Training sessions should focus on maintaining pressure while minimizing defensive vulnerabilities, ensuring that recovered balls can quickly transition into attacking moves.`,
  },
  {
    title: "Utilizing Set Pieces and Crossing",
    details: `Set pieces offer controlled opportunities to break down defenses and create scoring chances. Whether it's a corner, free kick, or throw-in, well-rehearsed set piece routines can yield high-percentage chances. Effective crossing from wide areas—combined with intelligent movement from forwards—can overload a defense. Practice a variety of set piece scenarios and ensure that every player knows their role in these situations to maximize your scoring potential.`,
  },
];

const WinningAttackingStrategies = () => {
  console.log("WinningAttackingStrategies: Component mounted."); // Log 1

  // Track which cards are expanded using a Set of indices.
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  console.log("WinningAttackingStrategies: 'expanded' state initialized."); // Log 2

  // Create an Animated.Value for each card's details opacity.
  const animationValues = useRef<Record<number, Animated.Value>>({}).current;
  console.log("WinningAttackingStrategies: 'animationValues' ref initialized."); // Log 3

  // Initialize animated values if not already set.
  useEffect(() => {
    console.log("WinningAttackingStrategies: useEffect for initializing animation values triggered."); // Log 4
    strategies.forEach((_, index) => {
      console.log(`WinningAttackingStrategies: Checking animation value for index: ${index}`); // Log 5
      if (!animationValues[index]) {
        animationValues[index] = new Animated.Value(0);
        console.log(`WinningAttackingStrategies: Initialized Animated.Value for index: ${index}`); // Log 6
      } else {
        console.log(`WinningAttackingStrategies: Animated.Value already exists for index: ${index}`); // Log 7
      }
    });
  }, []); // Run only once on mount

  const toggleExpand = (index: number) => {
    console.log(`WinningAttackingStrategies: toggleExpand function called for index: ${index}`); // Log 8
    const newExpanded = new Set(expanded);
    console.log("WinningAttackingStrategies: Created new Set for 'expanded' state update."); // Log 9
    const currentlyExpanded = newExpanded.has(index);
    console.log(`WinningAttackingStrategies: Card at index ${index} is currently expanded: ${currentlyExpanded}`); // Log 10

    if (currentlyExpanded) {
      console.log(`WinningAttackingStrategies: Card ${index} is expanded, initiating collapse.`); // Log 11
      newExpanded.delete(index);
      console.log(`WinningAttackingStrategies: Removed index ${index} from expanded set.`); // Log 12
      Animated.timing(animationValues[index], {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        console.log(`WinningAttackingStrategies: Animation for card ${index} completed to collapse (opacity 0).`); // Log 13
      });
      console.log(`WinningAttackingStrategies: Started collapse animation for card: ${index}`); // Log 14
    } else {
      console.log(`WinningAttackingStrategies: Card ${index} is collapsed, initiating expand.`); // Log 15
      newExpanded.add(index);
      console.log(`WinningAttackingStrategies: Added index ${index} to expanded set.`); // Log 16
      Animated.timing(animationValues[index], {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        console.log(`WinningAttackingStrategies: Animation for card ${index} completed to expand (opacity 1).`); // Log 17
      });
      console.log(`WinningAttackingStrategies: Started expand animation for card: ${index}`); // Log 18
    }
    setExpanded(newExpanded);
    console.log(`WinningAttackingStrategies: 'expanded' state updated. New expanded set size: ${newExpanded.size}`); // Log 19
  };

  console.log("WinningAttackingStrategies: Rendering component."); // Log 20
  return (
    <LinearGradient colors={['#0e0e0e', '#1a1a1a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.header}>Winning Attacking Strategies</Text>
        {strategies.map((strategy, index) => {
          console.log(`WinningAttackingStrategies: Mapping strategy card for index: ${index}, title: ${strategy.title}`); // Log 21
          const isExpanded = expanded.has(index);
          console.log(`WinningAttackingStrategies: Card ${index} expansion status: ${isExpanded}`); // Log 22
          return (
            <View key={index} style={styles.card}>
              <TouchableOpacity onPress={() => {
                console.log(`WinningAttackingStrategies: Card header pressed for index: ${index}, current state: ${isExpanded ? 'Expanded' : 'Collapsed'}`); // Log 23
                toggleExpand(index);
              }}>
                <LinearGradient
                  colors={['#3a3a3a', '#2a2a2a']}
                  style={styles.cardHeader}
                >
                  <View style={styles.headerContent}>
                    <Text style={styles.title}>{strategy.title}</Text>
                    {isExpanded ? (
                      console.log(`WinningAttackingStrategies: Displaying ChevronUp for card ${index}.`) && <ChevronUp size={20} color="#FFD700" /> // Log 24
                    ) : (
                      console.log(`WinningAttackingStrategies: Displaying ChevronDown for card ${index}.`) || <ChevronDown size={20} color="#FFD700" /> // Log 25 (This will not be added to TOTAL_LOGS_INSERTED, as it's a logical OR for logging and rendering, and one condition will always be true.)
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              {isExpanded && (
                console.log(`WinningAttackingStrategies: Details section for card ${index} is conditionally rendered.`) && // Log 26
                <Animated.View
                  style={[styles.details, { opacity: animationValues[index] }]}
                >
                  <Text style={styles.detailsText}>{strategy.details}</Text>
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>
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

export default WinningAttackingStrategies;
