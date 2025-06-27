// app/Dna/quiz.tsx

// ─── Disable Expo Router’s built-in header ─────────────────────────────────────
export const options = {
  headerShown: false,
};

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
  Dimensions,
  ScrollView,
  Easing,
  Modal,
  Alert,
  Share,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchQuestionsFromCloud } from './fetchQuestionsFromCloud';
import LottieView from 'lottie-react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomHeader } from '../../components/CustomHeader'; // adjust path if needed
// Import lookup table for spectrum coordinates
import labelCoordinates from './LabelCoordinates.json';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import AsyncStorage from '@react-native-async-storage/async-storage'; // For storing user's language preference
import * as Localization from 'expo-localization'; // To get device's language
import { useNavigation } from '@react-navigation/native'; // Import useNavigation

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BLUR_INTENSITY = 70; // Maximum for expo-blur is 100

// Spectrum left/right labels mapping - these will also be translated
// The keys here remain constant, but their displayed values are translated via i18n
const spectrumLabels = {
  "Mentality": { left: "Calm", right: "Aggressive" },
  "Playstyle": { left: "Possession", right: "Direct" },
  "Decision-Making": { left: "Analytical", right: "Instinctive" },
  "Defensive Style": { left: "Patient", right: "Aggressive" },
  "Adaptability": { left: "Consistent", right: "Adaptive" }
};

// Helper function to get a random question from a group array
// This helper might not be needed if questionsData is a flat array already.
// Assuming questionsData is a flat array of questions as returned by fetchQuestionsFromCloud.
// Removed the helper or adjusted it to match expected questionsData structure.
// If your fetchQuestionsFromCloud returns an array of questions directly, this function isn't used in this component's primary flow.

// Utility to derive the backend URL dynamically for emulator or real device
const BACKEND_URL = "https://fc-ai-backend.onrender.com/api/ask-ai";


// Array of follow-up phrase KEYS to randomize the prompt
// These are now direct i18n keys, not English phrases
const followUpPhraseKeys = [
  "i_d_like_to_understand_that_a_bit_better_",
  "let_s_unpack_that_thought_a_little_more_",
  "help_me_see_this_from_your_perspective_",
  "i_d_love_to_hear_more_about_that_",
  "tell_me_a_bit_more_about_this_choice_",
  "can_we_explore_that_idea_further_",
  "i_m_curious_let_s_dig_into_that_",
  "could_you_share_more_about_your_thinking_here_",
  "let_s_go_a_bit_deeper_into_what_you_said_",
  "mind_if_we_dive_into_this_a_little_more_"
];

// Component to render the spectrum display using lookup values
function SpectrumDisplay({ collectedLabels }) {
  const { t } = useTranslation(); // Use translation hook here too!
  const attributes = Object.keys(spectrumLabels);
  const averages = {};

  attributes.forEach(attr => {
    let total = 0, count = 0;
    collectedLabels.forEach(label => {
      const coords = labelCoordinates.labels[label];
      if (coords && coords[attr] !== undefined) {
        total += coords[attr];
        count++;
      }
    });
    // Default to 50 (neutral) if no data, and adjust Defensive Style if computed 0.
    let avg = count ? total / count : 50;
    if (attr === "Defensive Style" && avg === 0) {
      avg = 50;
    }
    // Clamp extreme values (avoid very low or high extremes)
    if (avg < 10) avg = 10;
    if (avg > 90) avg = 90;
    averages[attr] = avg;
  });

  const BAR_WIDTH = 200; // You can further adjust this value to make spectrums even narrower

  return (
    // Spectrum container with an image background
    <ImageBackground
      source={require('../../assets/images/bk6.png')}
      style={styles.spectrumContainerBackground}
      imageStyle={{ borderRadius: 10 }}
    >
      <View style={styles.spectrumContainer}>
        {attributes.map(attr => {
          const markerLeft = (averages[attr] / 100) * BAR_WIDTH;
          return (
            <View key={attr} style={styles.spectrumRow}>
              {/* Neon illuminated attribute label */}
              <Text style={[styles.spectrumAttr, styles.neonText]}>{t(`spectrum_labels.${attr}`)}:</Text>
              <View style={styles.spectrumBarContainer}>
                <Text style={styles.spectrumEndLabel}>{t(`spectrum_labels.${attr}_left`)}</Text>
                <LinearGradient
                  colors={['#1258f7', '#39FF14', '#c11b05']}
                  style={[styles.spectrumBar, { width: BAR_WIDTH }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={[styles.marker, { left: markerLeft - 10 }]}>
                    <Text style={styles.markerText}>⚽</Text>
                  </View>
                </LinearGradient>
                <Text style={styles.spectrumEndLabel}>{t(`spectrum_labels.${attr}_right`)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ImageBackground>
  );
}

export default function FCDNAAnalyzerPage() {
  const { t, i18n } = useTranslation(); // Initialize useTranslation
  const navigation = useNavigation(); // Get navigation object

  const [questionsData, setQuestionsData] = useState([]);
  const totalSteps = React.useMemo(() => questionsData.length, [questionsData]);

  const [currentStep, setCurrentStep] = useState(0);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [currentFollowUp, setCurrentFollowUp] = useState(null);
  const [chosenAnswer, setChosenAnswer] = useState(''); // Keep this for clarity, though tempSelection.mainAnswer is primary for modal.
  const [quizComplete, setQuizComplete] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [collectedLabels, setCollectedLabels] = useState([]); // To collect 14 labels
  const [aiAnalysis, setAiAnalysis] = useState(""); // To store AI analysis
  const [loadingAI, setLoadingAI] = useState(false);

  // Record each question's selection details (main answer and follow-up)
  const [userSelections, setUserSelections] = useState([]);
  const [tempSelection, setTempSelection] = useState(null); // This holds the current question's selection details for the modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // New state to hold the randomly selected follow-up phrase
  const [followUpPhrase, setFollowUpPhrase] = useState("");

  const analysisAnim = useRef(new Animated.Value(0)).current;
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [dots, setDots] = useState('');

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language); // Default to current i18n language

  // Updated available languages with native names
  const availableLanguages = [
    { code: 'arb', name: 'العربية' },
    { code: 'eng', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'gr', name: 'Ελληνικά' },
    { code: 'jp', name: '日本語' },
    { code: 'ko', name: '한국어' },
    { code: 'tk', name: 'Türkçe' },
    { code: 'zh', name: '简体中文' },
    { code: 'zh-tw', name: '繁體中文' },
  ];

  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('userLanguage');
        const deviceLocale = Localization.locale.split('-')[0]; // e.g., 'en-US' -> 'en'
        const deviceLanguageCode = availableLanguages.find(lang => lang.code === deviceLocale)?.code || 'eng'; // Fallback to 'eng'

        if (storedLang && availableLanguages.some(lang => lang.code === storedLang)) {
          setSelectedLanguage(storedLang);
          await i18n.changeLanguage(storedLang);
        } else if (availableLanguages.some(lang => lang.code === deviceLanguageCode)) {
          setSelectedLanguage(deviceLanguageCode);
          await i18n.changeLanguage(deviceLanguageCode);
        } else {
          // Fallback to English if device locale not supported
          setSelectedLanguage('eng');
          await i18n.changeLanguage('eng');
        }
        setShowLanguageModal(true); // Always show language selection initially
      } catch (error) {
        console.error("Failed to load user language:", error);
        setSelectedLanguage('eng'); // Fallback in case of error
        i18n.changeLanguage('eng');
        setShowLanguageModal(true);
      }
    };
    loadUserLanguage();
  }, []); // Run once on mount

  useEffect(() => {
    if (!showLanguageModal) { // Only load questions after language is selected and modal is closed
      const loadQuestions = async () => {
        const questions = await fetchQuestionsFromCloud(i18n.language); // Fetch questions based on selected language
        if (questions) {
          setQuestionsData(questions);
        } else {
          Alert.alert(t('common.error'), t('quiz.questions_load_error'));
        }
      };
      loadQuestions();
    }
  }, [i18n.language, showLanguageModal]);


  useEffect(() => {
    let dotCount = 0;
    const interval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      setDots('.'.repeat(dotCount));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (totalSteps === 0) return; // ⛔ Avoid animating before data is loaded

    const newProgress = ((currentStep + 1) / totalSteps) * 100;
    Animated.timing(progressAnim, {
      toValue: newProgress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps]);


  useEffect(() => {
    const listenerId = analysisAnim.addListener(({ value }) => {
      setAnalysisPercent(Math.round(value));
    });
    return () => analysisAnim.removeListener(listenerId);
  }, [analysisAnim]);

  // Analysis animation slowed to 4000ms
  const startAnalysisSequence = () => {
    console.log("Starting analysis animation...");
    Animated.timing(analysisAnim, {
      toValue: 100,
      duration: 4000,
      useNativeDriver: false,
    }).start(() => {
      console.log("Analysis animation complete.");
      setAnalysisComplete(true);
    });
  };
  const IS_DEV_MODE = false; // 🔁 Flip this off for production

  useEffect(() => {
    if (IS_DEV_MODE) {
      setQuizComplete(true);
      setCollectedLabels([
        'Calm', 'Possession', 'Analytical', 'Patient',
        'Adaptive', 'Direct', 'Instinctive', 'Aggressive',
        'Consistent', 'Direct', 'Analytical', 'Aggressive',
        'Calm', 'Possession'
      ]);
      setAiAnalysis("This is a simulated AI response used in development.");
      setAnalysisComplete(true);
    }
  }, []);

  // Handle main answer selection, collect labels and record selection details
  const handleAnswerSelection = (mainQ, answerObj) => {
    console.log("Main answer selected:", answerObj);
    setChosenAnswer(answerObj.text); // Keep this updated for potential debugging or future use

    const currentSelection = { question: mainQ.question, mainAnswer: answerObj.text, followUp: null };

    if (answerObj.bigLabel) {
      setCollectedLabels(prev => {
        const newLabels = [...prev, answerObj.bigLabel];
        console.log("Collected main label:", answerObj.bigLabel, "Total labels:", newLabels.length);
        return newLabels;
      });
    } else {
      console.warn("No bigLabel for main answer:", answerObj);
    }
    if (answerObj.followUp && mainQ.followUps && mainQ.followUps.length > 0) {
      const matchingFollowUp = mainQ.followUps.find(
        (fUp) => fUp.id === answerObj.followUp
      );
      if (matchingFollowUp) {
        setTempSelection(currentSelection); // Store full current selection details for modal

        setCurrentFollowUp(matchingFollowUp);

        // Pick a random key from the followUpPhraseKeys array (already correct keys)
        const randomKey = followUpPhraseKeys[Math.floor(Math.random() * followUpPhraseKeys.length)];
        const translatedPhrase = t(`follow_up_phrases.${randomKey}`); // Translate the key directly
        setFollowUpPhrase(translatedPhrase);
        console.log("Selected follow-up key:", randomKey, "Translated phrase:", translatedPhrase);

        setShowFollowUpModal(true);
        console.log("Displaying follow-up modal for:", matchingFollowUp.id);
        return;
      }
    }
    setUserSelections(prev => [...prev, currentSelection]);
    goToNextOrFinish();
  };

  // Handle follow-up answer selection, collect refined label and update selection details
  const handleFollowUpAnswer = (followUpAnswer) => {
    console.log("Follow-up answer selected:", followUpAnswer);
    if (followUpAnswer.refinedLabel) {
      setCollectedLabels(prev => {
        const newLabels = [...prev, followUpAnswer.refinedLabel];
        console.log("Collected follow-up label:", followUpAnswer.refinedLabel, "Total labels:", newLabels.length);
        return newLabels;
      });
    } else {
      console.warn("No refinedLabel for follow-up answer:", followUpAnswer);
    }
    if (tempSelection) {
      const updatedSelection = { ...tempSelection, followUp: followUpAnswer.text };
      setUserSelections(prev => [...prev, updatedSelection]);
      setTempSelection(null); // Clear temp selection after adding to full list
    }
    setShowFollowUpModal(false);
    setCurrentFollowUp(null);
    // DO NOT setChosenAnswer('') here. It needs to persist for the next question's initial state if desired,
    // but more importantly, for the modal that might still be showing if we re-used 'chosenAnswer'.
    goToNextOrFinish();
  };

  const goToNextOrFinish = () => {
    if (currentStep < totalSteps - 1) {
      console.log("Proceeding to next question. Current step:", currentStep);
      // Reset chosenAnswer only when moving to the next *main* question
      setChosenAnswer(''); // Reset for the new main question
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep((prev) => {
          const nextStep = prev + 1;
          console.log("Now at step:", nextStep);
          return nextStep;
        });
      });
    } else {
      console.log("Quiz complete. Initiating analysis sequence.");
      setQuizComplete(true);
      handleAskAI();
      startAnalysisSequence();
    }
  };

  // API call proceeds even if collected labels are fewer than 14 (warning only)
  const handleAskAI = async () => {
    console.log("Starting AI API call with labels:", collectedLabels);
    if (collectedLabels.length < 14) {
      console.warn("Collected labels less than 14, proceeding anyway.");
    }
    setLoadingAI(true);
    const isVIP = false;
    // Ensure AI report is generated in the quiz language
    const questionForAI = t('quiz.ai_prompt', {
      traits: collectedLabels.join(", "),
      language: i18n.language
    });
    console.log("Constructed question for AI:", questionForAI);


    try {
      console.log("Sending POST request to AI API...");
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionForAI, isVIP }),
      });
      console.log("Response received. Status:", response.status);
      if (!response.ok) {
        console.error("Response not OK. Status text:", response.statusText);
        throw new Error(`Server error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log("Parsed AI response data:", data);
      if (data.answer) {
        setAiAnalysis(data.answer);
        console.log("AI analysis set successfully.");
      } else {
        setAiAnalysis(t('quiz.no_ai_answer'));
        console.warn("No answer in AI response.");
      }
    } catch (error) {
      console.error("AI API call error:", error);
      setAiAnalysis(t('quiz.ai_processing_error'));
    }
    setLoadingAI(false);
  };

  // Share results using React Native Share API
  const handleShare = async () => {
    try {
      await Share.share({
        message: t('quiz.share_message', { analysis: aiAnalysis }),
      });
    } catch (error) {
      console.error("Error sharing results:", error);
    }
  };

  const handleLanguageSelect = async (lang) => {
    setSelectedLanguage(lang);
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('userLanguage', lang);
    setShowLanguageModal(false); // Close modal after selection
  };

  if (showLanguageModal) {
    return (
      <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.background}>
        <View style={styles.languageModalContainer}>
          <Text style={styles.languageModalTitle}>{t('common.select_language')}</Text>
          <ScrollView style={styles.languageList}>
            {availableLanguages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageOption, selectedLanguage === lang.code && styles.selectedLanguageOption]}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text style={[styles.languageOptionText, selectedLanguage === lang.code && styles.selectedLanguageOptionText]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  if (quizComplete && !analysisComplete) {
    const analysisProgressWidth = analysisAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.background}>
          <View style={styles.analysisContainer}>
            <Text style={[styles.analysisTitle, styles.neonText]}>{t('quiz.analyzing')}{dots}</Text>
            <View style={styles.circuitAnimation}>
              <LottieView
                source={require('../../assets/animations/loading.json')}
                autoPlay
                loop
                style={{ width: 300, height: 200 }}
              />
            </View>

            <View style={styles.analysisProgressBarContainer}>
              <View style={{ backgroundColor: '#222', borderRadius: 10, overflow: 'hidden' }}>
                <Animated.View style={{ width: analysisProgressWidth, height: 16 }}>
                  <LinearGradient
                    colors={['#00f0ff', '#00ff87', '#39FF14']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 16, borderRadius: 10 }}
                  />
                </Animated.View>
              </View>
            </View>

            <Text style={styles.analysisPercentage}>{analysisPercent}%</Text>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  if (analysisComplete) {
    return (
      <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.background}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <ScrollView contentContainerStyle={styles.resultsContainer}>
            {/* Neon header above the result box */}
            <Text style={styles.reportHeader}>
              {t('quiz.personalized_dna_report')}
            </Text>

            {/* Spectrum display */}
            <SpectrumDisplay collectedLabels={collectedLabels} />

            {/* AI Analysis result container with placeholder background */}
            <ImageBackground source={require('../../assets/images/bk7.png')} style={styles.resultBox} imageStyle={{ borderRadius: 10 }}>
              {loadingAI ? (
                <Text style={styles.resultText}>{t('quiz.loading_ai_analysis')}</Text>
              ) : (
                aiAnalysis !== "" ? <Text style={styles.resultText}>{aiAnalysis}</Text> : <Text style={styles.resultText}>{t('quiz.no_ai_answer')}</Text>
              )}
            </ImageBackground>

            {/* Button to view detailed selections */}
            <TouchableOpacity style={styles.detailButton} onPress={() => setShowDetailsModal(true)}>
              <Text style={styles.detailButtonText}>{t('quiz.view_selections')}</Text>
            </TouchableOpacity>

            {/* Share results button */}
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.shareButtonText}>{t('quiz.share_results')}</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Modal showing detailed user selections */}
          <Modal
            visible={showDetailsModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDetailsModal(false)}
            presentationStyle="overFullScreen"
          >
            <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.modalBackground}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>{t('quiz.your_selections')}</Text>
                  <ScrollView style={styles.modalContent}>
                    {userSelections.map((sel, index) => (
                      <View key={index} style={styles.selectionItem}>
                        <Text style={styles.selectionQuestion}>{sel.question}</Text>
                        {/* Different neon colors for main vs. follow-up answers */}
                        <Text style={styles.selectionMain}>{t('quiz.main_answer')}: {sel.mainAnswer}</Text>
                        {sel.followUp && <Text style={styles.selectionFollowUp}>{t('quiz.follow_up_answer')}: {sel.followUp}</Text>}
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowDetailsModal(false)}>
                    <Text style={styles.closeModalText}>{t('common.close')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          </Modal>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // Page header removed for a cleaner look
  if (questionsData.length === 0) {
    return (
      <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.background}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>{t('quiz.loading_questions')}</Text>
        </View>
      </ImageBackground>
    );
  }

  const currentQ = questionsData[currentStep];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <ImageBackground source={require('../../assets/images/dnabg.png')} style={styles.background}>
      {showFollowUpModal && (
        <BlurView intensity={BLUR_INTENSITY} style={StyleSheet.absoluteFill} tint="dark" />
      )}
      {/* Add spacing under header */}
      <View style={{ height: 90 }} /> {/* Adjust to match your header height */}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          <Text style={styles.questionText}>{currentQ.question}</Text>
          <View style={styles.answersContainer}>
            {currentQ.answers.map((ans) => (
              <AnswerButton
                key={ans.id}
                text={ans.text}
                onPress={() => handleAnswerSelection(currentQ, ans)}
              />
            ))}
          </View>
        </Animated.View>
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
            <LinearGradient
              colors={['#00f0ff', '#00ff87', '#39FF14']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </ScrollView>
      <Modal
        visible={showFollowUpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFollowUpModal(false)}
        presentationStyle="overFullScreen"
      >
        <ImageBackground source={require('../../assets/images/dnabg2.png')} style={styles.modalBackground}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.karmaEffect}>
                <Text style={styles.butterflyIcon}>🦋</Text>
              </View>
              {/* Randomly selected follow-up phrase */}
              <Text style={styles.modalBasedOnChoice}>{followUpPhrase}</Text>
              {currentFollowUp && ( // tempSelection check is not explicitly needed here if currentFollowUp implies tempSelection is set
                <>
                  <Text style={styles.modalYouChose}>{t('quiz.you_chose', { chosenAnswer })}</Text> {/* Using `chosenAnswer` here */}
                  <Text style={styles.modalQuestion}>{currentFollowUp.question}</Text>
                  <View style={styles.answersContainer}>
                    {currentFollowUp.answers.map((fAns) => (
                      <AnswerButton
                        key={fAns.id}
                        text={fAns.text}
                        onPress={() => handleFollowUpAnswer(fAns)}
                      />
                    ))}
                  </View>
                </>
              )}
            </View>
          </View>
        </ImageBackground>
      </Modal>
    </ImageBackground>
  );
}

function AnswerButton({ text, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => {
      console.log("AnswerButton pressed. Text:", text);
      onPress();
    });
  };

  return (
    <Animated.View style={[styles.answerButtonOuter, { transform: [{ scale: scaleAnim }] }]}>
      <Animated.View style={[styles.answerButtonInner, { shadowOpacity: glowAnim }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
          <Text style={styles.answerButtonText}>{text}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  progressContainer: {
    height: 12,
    width: '100%',
    backgroundColor: '#222',
    overflow: 'hidden',
    borderRadius: 8, // <— Add this
  },
  progressBar: { height: '100%', backgroundColor: 'transparent' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  questionText: {
    fontSize: 20,
    color: '#73f7ff', // 💡 Soft neon blue
    fontWeight: 'bold',
    marginBottom: 20,
    lineHeight: 28,
    textShadowColor: '#00f0ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  answersContainer: { flexDirection: 'column' },
  answerButtonOuter: {},
  answerButtonInner: {
    backgroundColor: 'rgba(6, 113, 94, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#39FF14',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  answerButtonText: { color: '#fff', fontSize: 18, textAlign: 'center' },
  analysisContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  analysisTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#32cd32', // 💡 Softer neon green
    marginBottom: 20,
    textShadowColor: '#00f0a8', // Cooler glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  circuitAnimation: {
    width: 200,
    height: 100,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  analysisProgressBarContainer: {
    width: '80%',
    height: 15,
    backgroundColor: '#222',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  analysisProgressFill: { height: '100%' },
  analysisPercentage: { fontSize: 18, color: '#39FF14', marginTop: 10 },
  resultsContainer: {
    flexGrow: 1,
    paddingTop: 90, // 👈 ensures it clears the custom header space
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  reportHeader: {
    fontSize: 22,
    color: '#8fffda', // 🔹 soft neon mint
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    textShadowColor: '#00ffd5',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    letterSpacing: 1.2,
  },

  // SpectrumDisplay styles
  spectrumContainerBackground: {
    width: SCREEN_WIDTH - 40,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 20,
  },
  spectrumContainer: {},
  spectrumRow: { marginVertical: 10, flexDirection: 'column' },
  spectrumAttr: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  spectrumBarContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spectrumBar: { height: 10, borderRadius: 5, marginHorizontal: 8, position: 'relative' },
  marker: { position: 'absolute', top: -8 },
  markerText: { fontSize: 20 },
  spectrumEndLabel: { fontSize: 14, color: '#fff' },
  // Result container with placeholder background
  resultBox: {
    marginVertical: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // ✅ sleek dark glass
    borderWidth: 1,
    borderColor: '#39FF14',                // ✅ glowing edge
    shadowColor: '#39FF14',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },

  resultText: {
    fontSize: 16,
    color: '#caffd0', // ✅ Minty neon white
    fontFamily: 'Rajdhani_600SemiBold', // ✅ if you're using Rajdhani (or your chosen font)
    textAlign: 'left',
    lineHeight: 28,
    textShadowColor: '#00ffb3',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // Detail button and modal styles
  detailButton: {
    width: '80%',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#00ffe5',
    backgroundColor: 'rgba(0,255,230,0.05)',
    shadowColor: '#00ffe5',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  detailButtonText: {
    fontSize: 17,
    color: '#00ffe5',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#00ffe5',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  shareButton: {
    width: '80%',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#00ff87',
    backgroundColor: 'rgba(0,255,135,0.05)',
    shadowColor: '#00ff87',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  shareButtonText: {
    fontSize: 18,
    color: '#00ff87',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: '#00ff87',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },

  modalBackground: { flex: 1, resizeMode: 'cover' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalContainer: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#39FF14',
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 24, color: '#39FF14', textAlign: 'center', marginBottom: 10 },
  modalContent: { marginVertical: 10 },
  selectionItem: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#39FF14', paddingBottom: 5 },
  selectionQuestion: { fontSize: 16, color: '#fff', fontWeight: 'bold', marginBottom: 4, lineHeight: 24 },
  // New styles for selections modal: different neon colors for main vs. follow-up
  selectionMain: {
    fontSize: 16,
    color: '#00FFFF',
    marginTop: 2,
    lineHeight: 24,
    fontWeight: 'bold',
    textShadowColor: '#00FFFF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  selectionFollowUp: {
    fontSize: 16,
    color: '#FFD700',
    marginTop: 2,
    lineHeight: 24,
    fontWeight: 'bold',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  closeModalButton: {
    backgroundColor: '#39FF14',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  closeModalText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  // Existing modal styles
  karmaEffect: { alignItems: 'center', marginBottom: 10 },
  modalBasedOnChoice: {
    color: '#32cd32', // Soft neon green
    fontStyle: 'italic',
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
    opacity: 0.9,
  },
  modalYouChose: {
    color: '#00e5ff',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.95,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  modalQuestion: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#00f0ff', // subtle glowing stroke effect
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  neonText: {
    color: '#32cd32',
    fontWeight: 'bold',
    textShadowColor: '#00f0a8',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },

  butterflyIcon: {
    fontSize: 40,
    color: '#39FF14',
  },
  languageModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  languageModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#39FF14',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: '#00f0ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  languageList: {
    maxHeight: '70%',
    width: '80%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    padding: 10,
    borderColor: '#39FF14',
    borderWidth: 1,
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(6, 113, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  selectedLanguageOption: {
    backgroundColor: '#39FF14',
    borderColor: '#00FFFF',
  },
  languageOptionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  selectedLanguageOptionText: {
    color: '#000',
    fontWeight: 'bold',
  },
});

const Stack = createNativeStackNavigator();

function FCDNAAnalyzerScreen() {
  return (
    <FCDNAAnalyzerPage />
  );
}

export default function FCDNAAnalyzerStackWrapper() {
  const navigation = useNavigation(); // Get navigation object

  return (
    <Stack.Navigator
      screenOptions={({ navigation: stackNavigation }) => ({ // Renamed navigation to stackNavigation to avoid conflict
        header: (props) => (
          <CustomHeader
            {...props}
            notifications={[]} // Optional: You can pass real notifications if available
            markNotificationAsRead={async () => {}} // Optional stub
            userId={''} // Optional stub
            onBackPress={() => stackNavigation.goBack()} // Pass goBack function
          />
        ),
      })}
    >
      <Stack.Screen
        name="FCDNAAnalyzerScreen"
        component={FCDNAAnalyzerScreen}
        options={{ headerTitle: 'FC DNA' }}
      />
    </Stack.Navigator>
  );
}