import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  ImageBackground,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
  console.log("FormationsScreen: LayoutAnimation enabled experimentally for Android.");
}

export default function FormationsPage() {
  console.log("FormationsScreen: Component rendered.");
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState(null);
  console.log("FormationsScreen: Initializing expandedIndex state to: " + expandedIndex);
  const scrollViewRef = useRef(null);
  console.log("FormationsScreen: Initializing scrollViewRef.");
  const scrollY = useRef(new Animated.Value(0)).current;
  console.log("FormationsScreen: Initializing scrollY Animated.Value to 0.");

  // Re-ordered so that all 3- formations come first, then 4-, then 5-.
  const formationsData = [
    // === START WITH '3' ===
    {
      name: '3-5-2',
      description: t('formationsScreen.formation352Description'),
      pros: [
        t('formationsScreen.formation352Pro1'),
        t('formationsScreen.formation352Pro2'),
        t('formationsScreen.formation352Pro3'),
      ],
      cons: [
        t('formationsScreen.formation352Con1'),
        t('formationsScreen.formation352Con2'),
      ],
      recommendedFor: t('formationsScreen.formation352RecommendedFor'),
      thumbnail: require('../../assets/images/352.png'),
    },
    {
      name: '3-4-3',
      description: t('formationsScreen.formation343Description'),
      pros: [
        t('formationsScreen.formation343Pro1'),
        t('formationsScreen.formation343Pro2'),
        t('formationsScreen.formation343Pro3'),
      ],
      cons: [
        t('formationsScreen.formation343Con1'),
        t('formationsScreen.formation343Con2'),
      ],
      recommendedFor: t('formationsScreen.formation343RecommendedFor'),
      thumbnail: require('../../assets/images/343.png'),
    },
    {
      name: '3-4-1-2',
      description: t('formationsScreen.formation3412Description'),
      pros: [
        t('formationsScreen.formation3412Pro1'),
        t('formationsScreen.formation3412Pro2'),
        t('formationsScreen.formation3412Pro3'),
      ],
      cons: [
        t('formationsScreen.formation3412Con1'),
        t('formationsScreen.formation3412Con2'),
      ],
      recommendedFor: t('formationsScreen.formation3412RecommendedFor'),
      thumbnail: require('../../assets/images/3412.png'),
    },
    {
      name: '3-1-4-2',
      description: t('formationsScreen.formation3142Description'),
      pros: [
        t('formationsScreen.formation3142Pro1'),
        t('formationsScreen.formation3142Pro2'),
        t('formationsScreen.formation3142Pro3'),
      ],
      cons: [
        t('formationsScreen.formation3142Con1'),
        t('formationsScreen.formation3142Con2'),
      ],
      recommendedFor: t('formationsScreen.formation3142RecommendedFor'),
      thumbnail: require('../../assets/images/3142.png'),
    },
    {
      name: '3-4-2-1',
      description: t('formationsScreen.formation3421Description'),
      pros: [
        t('formationsScreen.formation3421Pro1'),
        t('formationsScreen.formation3421Pro2'),
        t('formationsScreen.formation3421Pro3'),
      ],
      cons: [
        t('formationsScreen.formation3421Con1'),
        t('formationsScreen.formation3421Con2'),
      ],
      recommendedFor: t('formationsScreen.formation3421RecommendedFor'),
      thumbnail: require('../../assets/images/3421.png'),
    },

    // === THEN '4' ===
    {
      name: '4-2-3-1',
      description: t('formationsScreen.formation4231Description'),
      pros: [
        t('formationsScreen.formation4231Pro1'),
        t('formationsScreen.formation4231Pro2'),
        t('formationsScreen.formation4231Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4231Con1'),
        t('formationsScreen.formation4231Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4231RecommendedFor'),
      thumbnail: require('../../assets/images/4231.png'),
    },
    {
      name: '4-4-2',
      description: t('formationsScreen.formation442Description'),
      pros: [
        t('formationsScreen.formation442Pro1'),
        t('formationsScreen.formation442Pro2'),
        t('formationsScreen.formation442Pro3'),
      ],
      cons: [
        t('formationsScreen.formation442Con1'),
        t('formationsScreen.formation442Con2'),
      ],
      recommendedFor: t('formationsScreen.formation442RecommendedFor'),
      thumbnail: require('../../assets/images/442.png'),
    },
    {
      name: '4-3-3 (Attack)',
      description: t('formationsScreen.formation433AttackDescription'),
      pros: [
        t('formationsScreen.formation433AttackPro1'),
        t('formationsScreen.formation433AttackPro2'),
        t('formationsScreen.formation433AttackPro3'),
      ],
      cons: [
        t('formationsScreen.formation433AttackCon1'),
        t('formationsScreen.formation433AttackCon2'),
      ],
      recommendedFor: t('formationsScreen.formation433AttackRecommendedFor'),
      thumbnail: require('../../assets/images/433.png'),
    },
    {
      name: '4-3-3 (Defend)',
      description: t('formationsScreen.formation433DefendDescription'),
      pros: [
        t('formationsScreen.formation433DefendPro1'),
        t('formationsScreen.formation433DefendPro2'),
        t('formationsScreen.formation433DefendPro3'),
      ],
      cons: [
        t('formationsScreen.formation433DefendCon1'),
        t('formationsScreen.formation433DefendCon2'),
      ],
      recommendedFor: t('formationsScreen.formation433DefendRecommendedFor'),
      thumbnail: require('../../assets/images/433-3.png'),
    },
    {
      name: '4-5-1',
      description: t('formationsScreen.formation451Description'),
      pros: [
        t('formationsScreen.formation451Pro1'),
        t('formationsScreen.formation451Pro2'),
        t('formationsScreen.formation451Pro3'),
      ],
      cons: [
        t('formationsScreen.formation451Con1'),
        t('formationsScreen.formation451Con2'),
      ],
      recommendedFor: t('formationsScreen.formation451RecommendedFor'),
      thumbnail: require('../../assets/images/451.png'),
    },
    {
      name: '4-1-4-1',
      description: t('formationsScreen.formation4141Description'),
      pros: [
        t('formationsScreen.formation4141Pro1'),
        t('formationsScreen.formation4141Pro2'),
        t('formationsScreen.formation4141Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4141Con1'),
        t('formationsScreen.formation4141Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4141RecommendedFor'),
      thumbnail: require('../../assets/images/4141.png'),
    },
    {
      name: '4-2-2-2',
      description: t('formationsScreen.formation4222Description'),
      pros: [
        t('formationsScreen.formation4222Pro1'),
        t('formationsScreen.formation4222Pro2'),
        t('formationsScreen.formation4222Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4222Con1'),
        t('formationsScreen.formation4222Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4222RecommendedFor'),
      thumbnail: require('../../assets/images/4222.png'),
    },
    {
      name: '4-1-2-1-2 (Christmas Tree)',
      description: t('formationsScreen.formation41212Description'),
      pros: [
        t('formationsScreen.formation41212Pro1'),
        t('formationsScreen.formation41212Pro2'),
        t('formationsScreen.formation41212Pro3'),
      ],
      cons: [
        t('formationsScreen.formation41212Con1'),
        t('formationsScreen.formation41212Con2'),
      ],
      recommendedFor: t('formationsScreen.formation41212RecommendedFor'),
      thumbnail: require('../../assets/images/41212.png'),
    },
    {
      name: '4-3-1-2',
      description: t('formationsScreen.formation4312Description'),
      pros: [
        t('formationsScreen.formation4312Pro1'),
        t('formationsScreen.formation4312Pro2'),
        t('formationsScreen.formation4312Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4312Con1'),
        t('formationsScreen.formation4312Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4312RecommendedFor'),
      thumbnail: require('../../assets/images/4312.png'),
    },
    {
      name: '4-4-1-1',
      description: t('formationsScreen.formation4411Description'),
      pros: [
        t('formationsScreen.formation4411Pro1'),
        t('formationsScreen.formation4411Pro2'),
        t('formationsScreen.formation4411Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4411Con1'),
        t('formationsScreen.formation4411Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4411RecommendedFor'),
      thumbnail: require('../../assets/images/4411.png'),
    },
    {
      name: '4-3-2-1',
      description: t('formationsScreen.formation4321Description'),
      pros: [
        t('formationsScreen.formation4321Pro1'),
        t('formationsScreen.formation4321Pro2'),
        t('formationsScreen.formation4321Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4321Con1'),
        t('formationsScreen.formation4321Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4321RecommendedFor'),
      thumbnail: require('../../assets/images/4321.png'),
    },
    {
      name: '4-2-4',
      description: t('formationsScreen.formation424Description'),
      pros: [
        t('formationsScreen.formation424Pro1'),
        t('formationsScreen.formation424Pro2'),
        t('formationsScreen.formation424Pro3'),
      ],
      cons: [
        t('formationsScreen.formation424Con1'),
        t('formationsScreen.formation424Con2'),
      ],
      recommendedFor: t('formationsScreen.formation424RecommendedFor'),
      thumbnail: require('../../assets/images/424.png'),
    },
    {
      name: '4-1-3-2',
      description: t('formationsScreen.formation4132Description'),
      pros: [
        t('formationsScreen.formation4132Pro1'),
        t('formationsScreen.formation4132Pro2'),
        t('formationsScreen.formation4132Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4132Con1'),
        t('formationsScreen.formation4132Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4132RecommendedFor'),
      thumbnail: require('../../assets/images/4132.png'),
    },
    {
      name: '4-2-1-3',
      description: t('formationsScreen.formation4213Description'),
      pros: [
        t('formationsScreen.formation4213Pro1'),
        t('formationsScreen.formation4213Pro2'),
        t('formationsScreen.formation4213Pro3'),
      ],
      cons: [
        t('formationsScreen.formation4213Con1'),
        t('formationsScreen.formation4213Con2'),
      ],
      recommendedFor: t('formationsScreen.formation4213RecommendedFor'),
      thumbnail: require('../../assets/images/4213.png'),
    },
    {
      name: '4-3-3 (Balanced)',
      description: t('formationsScreen.formation433BalancedDescription'),
      pros: [
        t('formationsScreen.formation433BalancedPro1'),
        t('formationsScreen.formation433BalancedPro2'),
        t('formationsScreen.formation433BalancedPro3'),
      ],
      cons: [
        t('formationsScreen.formation433BalancedCon1'),
        t('formationsScreen.formation433BalancedCon2'),
      ],
      recommendedFor: t('formationsScreen.formation433BalancedRecommendedFor'),
      thumbnail: require('../../assets/images/433-2.png'),
    },

    // === FINALLY '5' ===
    {
      name: '5-3-2',
      description: t('formationsScreen.formation532Description'),
      pros: [
        t('formationsScreen.formation532Pro1'),
        t('formationsScreen.formation532Pro2'),
        t('formationsScreen.formation532Pro3'),
      ],
      cons: [
        t('formationsScreen.formation532Con1'),
        t('formationsScreen.formation532Con2'),
      ],
      recommendedFor: t('formationsScreen.formation532RecommendedFor'),
      thumbnail: require('../../assets/images/532.png'),
    },
    {
      name: '5-4-1',
      description: t('formationsScreen.formation541Description'),
      pros: [
        t('formationsScreen.formation541Pro1'),
        t('formationsScreen.formation541Pro2'),
        t('formationsScreen.formation541Pro3'),
      ],
      cons: [
        t('formationsScreen.formation541Con1'),
        t('formationsScreen.formation541Con2'),
      ],
      recommendedFor: t('formationsScreen.formation541RecommendedFor'),
      thumbnail: require('../../assets/images/541.png'),
    },
    {
      name: '5-2-1-2',
      description: t('formationsScreen.formation5212Description'),
      pros: [
        t('formationsScreen.formation5212Pro1'),
        t('formationsScreen.formation5212Pro2'),
        t('formationsScreen.formation5212Pro3'),
      ],
      cons: [
        t('formationsScreen.formation5212Con1'),
        t('formationsScreen.formation5212Con2'),
      ],
      recommendedFor: t('formationsScreen.formation5212RecommendedFor'),
      thumbnail: require('../../assets/images/5212.png'),
    },
    {
      name: '5-2-3',
      description: t('formationsScreen.formation523Description'),
      pros: [
        t('formationsScreen.formation523Pro1'),
        t('formationsScreen.formation523Pro2'),
        t('formationsScreen.formation523Pro3'),
      ],
      cons: [
        t('formationsScreen.formation523Con1'),
        t('formationsScreen.formation523Con2'),
      ],
      recommendedFor: t('formationsScreen.formation523RecommendedFor'),
      thumbnail: require('../../assets/images/523.png'),
    },
  ];
  console.log("FormationsScreen: Formations data array initialized with " + formationsData.length + " formations.");

  // UseEffect for component mount and unmount
  useEffect(() => {
    console.log("FormationsScreen: Component mounted successfully.");
    return () => {
      console.log("FormationsScreen: Component unmounted.");
    };
  }, []);

  // UseEffect for expandedIndex state changes
  useEffect(() => {
    console.log("FormationsScreen: expandedIndex state updated to: " + expandedIndex);
  }, [expandedIndex]);


  const toggleExpand = (index) => {
    console.log("FormationsScreen: toggleExpand function called. Toggling index: " + index + ", current expandedIndex: " + expandedIndex);
    // Animate layout changes
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    console.log("FormationsScreen: LayoutAnimation configured with easeInEaseOut preset.");
    setExpandedIndex(expandedIndex === index ? null : index);
    console.log("FormationsScreen: expandedIndex state set. New value will be: " + (expandedIndex === index ? "null (collapsed)" : index + " (expanded)"));
  };

  const handleScrollToTop = () => {
    console.log("FormationsScreen: handleScrollToTop function called.");
    if (scrollViewRef.current) {
      console.log("FormationsScreen: ScrollView ref available. Initiating scroll to top.");
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
      console.log("FormationsScreen: Scroll to top animated successfully.");
    } else {
      console.log("FormationsScreen: ScrollView ref not available, unable to scroll to top.");
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/Article bk.png')} // Page background
      style={styles.pageBackground}
    >
      <ScrollView
        ref={scrollViewRef}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false } // Changed to false as true causes an error with interpolation on web.
        )}
        scrollEventThrottle={16}
      >
        {console.log("FormationsScreen: ScrollView rendered and listening for scroll events.")}
        {formationsData.map((formation, index) => (
          <ImageBackground
            key={index}
            source={require('../../assets/images/button2.png')} // Container background
            style={styles.formationContainer}
            imageStyle={{ borderRadius: 10 }}
          >
            {console.log("FormationsScreen: Rendering formation card for: " + formation.name + " (Index: " + index + ").")}
            <TouchableOpacity
              onPress={() => toggleExpand(index)}
              style={styles.formationHeader}
            >
              {console.log("FormationsScreen: TouchableOpacity for formation header rendered for " + formation.name + ".")}
              <Image
                source={formation.thumbnail}
                style={styles.thumbnail}
                resizeMode="contain"
              />
              <Text style={styles.formationName}>{formation.name}</Text>
              {expandedIndex === index ? (
                <>
                  {console.log("FormationsScreen: Showing ChevronUp for expanded formation: " + formation.name)}
                  <ChevronUp size={20} color="#fff" />
                </>
              ) : (
                <>
                  {console.log("FormationsScreen: Showing ChevronDown for collapsed formation: " + formation.name)}
                  <ChevronDown size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            {expandedIndex === index && (
              <ImageBackground
                source={require('../../assets/images/Article bk.png')} // Expanded details background
                style={styles.formationDetails}
                imageStyle={{ borderRadius: 5 }}
              >
                {console.log("FormationsScreen: Formation details section is visible for: " + formation.name)}
                <Text style={styles.description}>
                  {formation.description}
                </Text>
                <Text style={styles.sectionTitle}>{t('formationsScreen.prosLabel')}</Text>
                {formation.pros.map((pro, i) => (
                  <Text key={i} style={styles.listItem}>
                    - {pro}
                  </Text>
                ))}
                {console.log("FormationsScreen: Pros listed for " + formation.name + ". Count: " + formation.pros.length)}
                <Text style={styles.sectionTitle}>{t('formationsScreen.consLabel')}</Text>
                {formation.cons.map((con, i) => (
                  <Text key={i} style={styles.listItem}>
                    - {con}
                  </Text>
                ))}
                {console.log("FormationsScreen: Cons listed for " + formation.name + ". Count: " + formation.cons.length)}
                <Text style={styles.sectionTitle}>{t('formationsScreen.recommendedForLabel')}</Text>
                <Text style={styles.recommended}>
                  {formation.recommendedFor}
                </Text>
                {console.log("FormationsScreen: Recommended for section displayed for " + formation.name)}
              </ImageBackground>
            )}
          </ImageBackground>
        ))}
      </ScrollView>
      <Animated.View
        style={[
          styles.backToTopContainer,
          {
            opacity: scrollY.interpolate({
              inputRange: [100, 200], // Adjust these values based on when you want the button to appear
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        {console.log("FormationsScreen: Back to Top button container rendered. Opacity interpolated based on scrollY.")}
        <TouchableOpacity
          onPress={handleScrollToTop}
          style={styles.backToTopButton}
        >
          {console.log("FormationsScreen: Back to Top button TouchableOpacity rendered.")}
          <Text style={styles.backToTopText}>{t('formationsScreen.backToTop')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    resizeMode: 'cover',
  },
  formationContainer: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',

    // Adding subtle shadow for depth
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  formationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  thumbnail: {
    width: 80,
    height: 40,
    marginRight: 10,
    borderRadius: 5,
  },
  formationName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formationDetails: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  description: {
    color: '#FFFFFF',
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for titles
    marginTop: 10,
  },
  listItem: {
    color: '#FFFFFF',
    marginLeft: 10,
  },
  recommended: {
    color: '#FFFFFF',
    fontStyle: 'italic',
    marginTop: 5,
  },
  backToTopContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  backToTopButton: {
    backgroundColor: '#00BFFF', // Deep sky blue
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  backToTopText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
console.log("FormationsScreen: StyleSheet created successfully.");