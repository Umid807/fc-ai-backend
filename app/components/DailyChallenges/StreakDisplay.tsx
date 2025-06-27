import React from "react";
import { View, Text, StyleSheet,TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import i18n from '../../app/i18n/i18n';

type StreakDisplayProps = {
  streakToday: number;
  dailyXP: number;
  vip: boolean;
  vipStreakRecoveryUsed: number;
  canRecoverStreak: boolean;
  recoverStreak: () => Promise<void>;
  rewardRules: any; // Ideally, define a more specific type for rewardRules
  userCoins: number; // Pass this as a prop for the recovery cost display
};

const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streakToday,
  dailyXP,
  vip,
  vipStreakRecoveryUsed,
  canRecoverStreak,
  recoverStreak,
  rewardRules,
  userCoins,
}) => {
  const xpThreshold = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");
const recoveryCost = rewardRules?.strikeRecovery || rewardRules?.streakRecovery?.coinsCost || 5000;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{i18n.t('daily_challenge.daily_streak_title')}</Text>
      <View style={styles.streakContainer}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => {
          const isCompleted = day <= (streakToday || 0);
          const isMaxStreak = streakToday === 7 && day === 7;

          return (
            <View key={day} style={styles.streakFlameWrapper}>
              <LinearGradient
                colors={
                  isMaxStreak
                    ? ["#FFD700", "#FF8C00"]
                    : isCompleted
                      ? ["#00FF9D", "#00BFFF"]
                      : ["#333", "#111"]
                }
                style={[
                  styles.streakFlame,
                  // Simplified the "isToday" logic, as streakToday is the current value
                  // If you had a concept of "today's streak mark", it'd be different
                  day === streakToday && { transform: [{ scale: 1.2 }] },
                ]}
              >
                <Text style={styles.streakFlameText}>{day}</Text>
              </LinearGradient>
              {isMaxStreak && (
                <Text style={styles.streakFlameGlow}>🔥</Text>
              )}
            </View>
          );
        })}
      </View>

      {streakToday === 7 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{i18n.t('daily_challenge.streak_boost_active')}</Text>
        </View>
      )}
      {dailyXP < xpThreshold && (
        <Text style={styles.warningText}>{i18n.t('daily_challenge.not_enough_xp_warning')}</Text>
      )}
      {canRecoverStreak && (
        vip ? (
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <TouchableOpacity style={[styles.recoverButton, { backgroundColor: "#00FF9D" }]} onPress={recoverStreak}>
              <Text style={[styles.recoverButtonText, { color: "#000" }]}>{i18n.t('daily_challenge.recover_streak_free')}</Text>
            </TouchableOpacity>
            <Text style={{ color: "#fff", marginTop: 4, fontSize: 13 }}>
              {i18n.t('daily_challenge.free_recoveries_left', { count: 2 - (vipStreakRecoveryUsed || 0) })}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", marginTop: 10 }}>
            <TouchableOpacity style={styles.recoverButton} onPress={recoverStreak}>
              <Text style={styles.recoverButtonText}>{i18n.t('daily_challenge.recover_streak_coins', { cost: recoveryCost })}</Text>
            </TouchableOpacity>
            <Text style={{ color: "#fff", marginTop: 4, fontSize: 13, fontStyle: "italic" }}>
              {i18n.t('daily_challenge.vip_ad_message')}
            </Text>
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  streakContainer: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  streakFlameWrapper: {
    alignItems: "center",
    marginHorizontal: 5,
    position: "relative",
  },
  streakFlame: {
    width: 40,
    height: 40,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#00FF9D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  streakFlameText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  streakFlameGlow: {
    position: "absolute",
    top: -18,
    fontSize: 20,
    color: "#FFD700",
    textShadowColor: "#FF8C00",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  badge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: "center",
    marginTop: 5,
  },
  badgeText: { color: "#000", fontWeight: "bold" },
  warningText: { color: "#FF4500", textAlign: "center", marginTop: 5 },
  recoverButton: {
    backgroundColor: "#1e90ff",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignSelf: "center",
  },
  recoverButtonText: { color: "#fff", fontWeight: "bold" },
});

export default StreakDisplay;