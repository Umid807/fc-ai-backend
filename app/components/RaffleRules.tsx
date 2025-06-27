import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageSelector } from '../components/LanguageSelector';
import { DEEPL_API_KEY } from '../config/constants';

interface RaffleRulesProps {
  visible: boolean;
  onClose: () => void;
}

export const RaffleRules: React.FC<RaffleRulesProps> = ({ visible, onClose }) => {
  const [rhymeMode, setRhymeMode] = useState(true);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    rhyme: string;
    detailed: string;
    title: string;
  }>({
    rhyme: '',
    detailed: '',
    title: ''
  });

  const {
    translate,
    isTranslating,
    currentLanguage,
    setCurrentLanguage,
    supportedLanguages,
  } = useTranslation(DEEPL_API_KEY);

  // Original content
  const originalContent = useMemo(() => ({
    title: "🎟️ Weekly Raffle Rules 🎟️",
    rhyme: `Welcome to the raffle
where luck takes the stage,
Get ready, get hyped
it's the hottest new craze!

1,000 COINS = 1 TICKET
Each ticket costs
exactly a thousand coins,
No refunds nor swaps,
just commit to your choice!

HOW TO ENTER
Buying a ticket doesn't seal your fate,
You must toss it in—don't hesitate!

Once it's entered, it's locked in tight,
No backing out, day or night.

There's no retreat, no second guess,
So only commit if you're ready for the test!

Ready to roll? Don't miss the play,
Tap "Enter Draw" and seize the day!

THE BIG REVEAL
Friday at 6 PM, the draw goes live.
All tickets shuffle, a few winners will rise!
If you're lucky, your name will be the one.
If not? No worries—there's always next one!

VIP Perks
VIP winners get +5,000 coins,
a sweet bonus prize,
Another reason to level up and strategize!

WATCH IT LIVE
Even if you didn't play,
you can watch it unfold.
Cheer, react, and celebrate
be part of the gold!
A live shuffle box,
the thrill, the suspense…
Just a few will win,
but the fun is immense!`,
    
    detailed: `Overview
The Weekly Raffle is a digital lottery system where participants can enter by purchasing tickets using in-app coins. Winners are selected randomly at the designated draw time. All participants are bound by these rules and regulations upon purchasing tickets.

Ticket Purchase & Entry Conditions
• Each ticket costs 1,000 in-app coins.
• Ticket purchases are final—no refunds, exchanges, or transfers.
• Purchasing a ticket does NOT automatically enter a user into the raffle. Users must manually submit their tickets before the entry deadline to be eligible for the draw.
• There is no limit to the number of tickets a user can purchase or submit for a draw.
• Submitted tickets are locked in and cannot be withdrawn after the deadline.

Entry Rules
• Once submitted, raffle tickets are "locked in permanently" for that week's draw.
• Tickets cannot be withdrawn or transferred after submission.
• Please double-check your entries before submitting.

Raffle Draw Process
• The official raffle draw occurs every Friday at 6:00 PM (UTC).
• At the time of the draw, all entered tickets are shuffled, and winners are selected randomly based on the number of entries.
• The number of winners and the distribution of prizes are predetermined and announced before each draw.
• Winning users will receive an in-app notification, and their rewards will be credited to their accounts automatically.
• Users who do not win do not receive any compensation, but they may participate in future draws by entering new tickets.

VIP Benefits & Special Conditions
• VIP members who win in the raffle receive an additional 5,000 in-app coins as a bonus prize.
• VIP status does not increase a user's chance of winning but only provides additional rewards if selected as a winner.
• Users can check their VIP status in their profile settings.

Live Raffle Viewing & Transparency
• The raffle draw is broadcasted live to ensure transparency. Users can watch the process as it unfolds.
• Even users who did not enter may spectate the event and engage through reactions and discussions.
• The live draw consists of a real-time randomization process to ensure fairness.

Fair Play & No Guaranteed Outcomes
• The raffle system operates on pure chance and does not guarantee any winnings, regardless of the number of tickets purchased.
• The odds of winning depend on the total number of tickets entered into the draw.
• There is no "priority system" or "weighted advantage"—all tickets have an equal probability of being drawn.
• Users acknowledge that spending more coins does not guarantee a win and that all participation is at their own discretion.

Fraud Prevention & Violation Consequences
• Any attempt to exploit, manipulate, or abuse the raffle system, including but not limited to:
• Creating multiple accounts for additional entries.
• Engaging in unauthorized transactions to acquire coins unfairly.
• Using external software, hacks, or bots to influence outcomes.
• Any detected fraudulent activity will result in permanent disqualification, account suspension, and forfeiture of all in-app assets.

Liability & Final Authority
• The raffle system is automated and free from human intervention. The results of each draw are final and non-disputable.
• The platform reserves the right to adjust, suspend, or cancel the raffle at any time due to unforeseen circumstances, including but not limited to:
• Technical failures.
• Security breaches.
• Legal or regulatory requirements.
• In the event of system errors affecting the raffle process, the platform reserves the right to re-run or nullify the draw as deemed necessary.
• The platform is not liable for any loss of virtual currency due to user decisions, participation, or system failures.

General Conduct & Community Engagement
• Users are expected to engage in the raffle in good faith and maintain respectful conduct when interacting with other participants.
• Harassment, spamming, or any disruptive behavior related to the raffle draw will result in temporary or permanent account suspension.
• Users are encouraged to participate responsibly and within their means.

Amendments & Rule Updates
• These rules are subject to updates as necessary. Any modifications will be communicated via in-app notifications or official announcements.
• Continued participation in the raffle after an update implies acceptance of the revised terms.

By purchasing and entering raffle tickets, all users acknowledge that they have read, understood, and agreed to these terms. Participation is entirely voluntary, and users assume full responsibility for their choices.`
  }), []);

  // Handle language change and trigger translation
  const handleLanguageChange = async (language: string) => {
    setCurrentLanguage(language);
    setShowLanguageSelector(false);
    
    if (language === 'EN') {
      // Reset to original content
      setTranslatedContent({
        rhyme: '',
        detailed: '',
        title: ''
      });
      return;
    }

    try {
      // Translate all content pieces
      const [translatedTitle, translatedRhyme, translatedDetailed] = await Promise.all([
        translate(originalContent.title, language),
        translate(originalContent.rhyme, language),
        translate(originalContent.detailed, language)
      ]);

      setTranslatedContent({
        title: translatedTitle,
        rhyme: translatedRhyme,
        detailed: translatedDetailed
      });
    } catch (error) {
      console.error('Translation failed:', error);
      // Fallback to original content on error
      setTranslatedContent({
        rhyme: '',
        detailed: '',
        title: ''
      });
    }
  };

  const toggleRhymeMode = () => setRhymeMode(!rhymeMode);

  // Get current content based on language and mode
  const getCurrentContent = () => {
    const isEnglish = currentLanguage === 'EN';
    return {
      title: isEnglish ? originalContent.title : (translatedContent.title || originalContent.title),
      content: rhymeMode 
        ? (isEnglish ? originalContent.rhyme : (translatedContent.rhyme || originalContent.rhyme))
        : (isEnglish ? originalContent.detailed : (translatedContent.detailed || originalContent.detailed))
    };
  };

  const currentContent = getCurrentContent();

  const formatTextWithHighlights = (text: string) => {
    // Split text into lines and format highlights
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Check if line should be highlighted (contains certain keywords or is in caps)
      const shouldHighlight = rhymeMode 
        ? /^[A-Z\s]+$/.test(line.trim()) && line.trim().length > 0 && line.trim().length < 50
        : /^[A-Z][^a-z]*$/.test(line.trim()) || line.includes('•');
      
      return (
        <Text key={index}>
          {shouldHighlight ? (
            <Text style={styles.highlight}>{line}</Text>
          ) : (
            <Text style={styles.regularText}>{line}</Text>
          )}
          {'\n'}
        </Text>
      );
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlayBackground} />
        </TouchableWithoutFeedback>
        <View style={styles.rulesModalContentWrapper}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <LinearGradient colors={['#141E30', '#243B55']} style={styles.rulesContainer}>
              {/* Header with title and language selector toggle */}
              <View style={styles.header}>
                <Text style={styles.rulesTitle}>{currentContent.title}</Text>
                <TouchableOpacity 
                  style={styles.languageToggle}
                  onPress={() => setShowLanguageSelector(!showLanguageSelector)}
                >
                  <Text style={styles.languageToggleText}>🌍 {currentLanguage}</Text>
                </TouchableOpacity>
              </View>

              {/* Language Selector */}
              {showLanguageSelector && (
                <LanguageSelector
                  currentLanguage={currentLanguage}
                  supportedLanguages={supportedLanguages}
                  onLanguageChange={handleLanguageChange}
                  style={styles.languageSelectorStyle}
                />
              )}

              {/* Translation Loading Indicator */}
              {isTranslating && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFD700" />
                  <Text style={styles.loadingText}>Translating...</Text>
                </View>
              )}

              {/* Main Content */}
              <ScrollView style={styles.contentContainer}>
                <Text style={styles.rulesText}>
                  {formatTextWithHighlights(currentContent.content)}
                </Text>
              </ScrollView>
              
              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={toggleRhymeMode} style={styles.switchButton}>
                  <Text style={styles.switchButtonText}>
                    {rhymeMode ? 'Detailed Mode' : 'Fun Mode (Rhyme)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  rulesModalContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    maxHeight: '90%',
  },
  rulesContainer: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    flex: 1,
  },
  languageToggle: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  languageToggleText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  languageSelectorStyle: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 14,
  },
  contentContainer: {
    maxHeight: 400,
    marginBottom: 20,
  },
  rulesText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'left',
    lineHeight: 24,
  },
  regularText: {
    color: '#fff',
  },
  highlight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FACC15',
  },
  gold: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  switchButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#1E90FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  switchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#FF4500',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});