import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native"; // ✅ Removed unused TouchableOpacity
import { LinearGradient } from "expo-linear-gradient";
import i18n from '../../app/i18n/i18n';

type ProgressBarsProps = {
  dailyXP: number;
  targetXP: number;
  dailyCoins: number;
  targetCoins: number;
};

const ProgressBars: React.FC<ProgressBarsProps> = ({ dailyXP, targetXP, dailyCoins, targetCoins }) => {
  const xpProgressPercent = Math.min((dailyXP / targetXP) * 100, 100); // Cap at 100%
  const coinsProgressPercent = Math.min((dailyCoins / targetCoins) * 100, 100); // Cap at 100%

  // ✅ Added smooth animations for progress bars
  const [animatedXP] = useState(new Animated.Value(0));
  const [animatedCoins] = useState(new Animated.Value(0));

  useEffect(() => {
    // Animate XP progress
    Animated.timing(animatedXP, {
      toValue: xpProgressPercent,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [xpProgressPercent, animatedXP]);

  useEffect(() => {
    // Animate Coins progress
    Animated.timing(animatedCoins, {
      toValue: coinsProgressPercent,
      duration: 1200, // Slightly different timing for visual variety
      useNativeDriver: false,
    }).start();
  }, [coinsProgressPercent, animatedCoins]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{i18n.t('daily_challenge.todays_progress_title')}</Text>
      
      {/* XP Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressLabel}>{i18n.t('daily_challenge.xp_label')}</Text>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressWrapper, { width: animatedXP.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp'
          })}]}>
            <LinearGradient
              colors={["#00FF9D", "#00BFFF"]}
              style={styles.progressFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressValue}>
          {i18n.t('daily_challenge.xp_progress_text', { currentXP: dailyXP, targetXP: targetXP })}
        </Text>
      </View>

      {/* Coins Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Text style={styles.progressLabel}>{i18n.t('daily_challenge.coins_label')}</Text>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressWrapper, { width: animatedCoins.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
            extrapolate: 'clamp'
          })}]}>
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              style={styles.progressFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressValue}>
          {i18n.t('daily_challenge.coins_progress_text', { currentCoins: dailyCoins, targetCoins: targetCoins })}
        </Text>
      </View>

      {/* ✅ FIXED: Replaced broken i18n interpolation with proper JSX */}
      <View style={styles.rewardSummaryBox}>
        <Text style={styles.rewardSummaryText}>
          {i18n.t('daily_challenge.rewards_earned_today')}{' '}
          <Text style={styles.xpHighlight}>{dailyXP} / {targetXP} XP</Text>
          {' '}{i18n.t('daily_challenge.and')}{' '}
          <Text style={styles.coinHighlight}>{dailyCoins} / {targetCoins} Coins</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { 
    marginBottom: 30 
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: { 
    marginBottom: 15 // ✅ Improved spacing
  },
  progressLabel: { 
    fontSize: 16, 
    color: "#fff", 
    marginBottom: 8, // ✅ Better spacing
    fontWeight: "500" // ✅ Improved typography
  },
  progressBar: { 
    height: 24, // ✅ Slightly taller for better visibility
    backgroundColor: "#333", // ✅ Better contrast
    borderRadius: 12, 
    overflow: "hidden",
    shadowColor: "#000", // ✅ Added subtle shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  progressWrapper: {
    height: "100%",
    borderRadius: 12,
  },
  progressFill: { 
    height: "100%", 
    borderRadius: 12,
    shadowColor: "#00FF9D", // ✅ Added glow effect
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  progressValue: { 
    fontSize: 14, 
    color: "#fff", 
    textAlign: "center", 
    marginTop: 6, // ✅ Better spacing
    fontWeight: "400"
  },
  rewardSummaryBox: {
    backgroundColor: "rgba(0, 255, 157, 0.05)", // ✅ Subtle theme color
    borderColor: "rgba(0, 255, 157, 0.2)",
    borderWidth: 1,
    padding: 16, // ✅ More generous padding
    marginVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  rewardSummaryText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400"
  },
  xpHighlight: {
    color: "#00FF9D", // ✅ Theme color
    fontWeight: "bold",
    fontSize: 16, // ✅ Slightly larger for emphasis
  },
  coinHighlight: {
    color: "#FFD700",
    fontWeight: "bold",
    fontSize: 16, // ✅ Slightly larger for emphasis
  },
});

export default ProgressBars;