import React from "react";
import { View, Text, StyleSheet,TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import i18n from '../../app/i18n/i18n';

type ResetTimerDisplayProps = {
  timeLeft: number;
  formatTime: (milliseconds: number) => string;
};

const ResetTimerDisplay: React.FC<ResetTimerDisplayProps> = ({ timeLeft, formatTime }) => {
  return (
    <View style={styles.resetTimerBox}>
      <LinearGradient
        colors={["#0f2027", "#203a43", "#2c5364"]}
        style={styles.resetTimerBackground}
      >
        <Text style={styles.resetTimerLabel}>{i18n.t('daily_challenge.challenge_reset_in')}</Text>
        <Text style={styles.resetTimerCountdown}>{formatTime(timeLeft)}</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  resetTimerBox: {
    marginBottom: 30,
    alignSelf: "center",
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#00FF9D",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 5,
  },
  resetTimerBackground: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    borderRadius: 12,
    backgroundColor: "#112233cc",
    alignItems: "center",
  },
  resetTimerLabel: {
    color: "#00FF9D",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },
  resetTimerCountdown: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

export default ResetTimerDisplay;