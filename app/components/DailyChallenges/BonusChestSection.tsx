import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Animated } from "react-native";
import i18n from '../../app/i18n/i18n';

type BonusChestSectionProps = {
  dailyXP: number;
  bonusClaimed: boolean;
  rewardRules: any; // Ideally, define a more specific type
  handleClaimBonus: () => Promise<void>;
  chestAnimation: Animated.Value; // Pass the Animated.Value
  sparkleAnim: Animated.Value; // Pass the Animated.Value
};

const BonusChestSection: React.FC<BonusChestSectionProps> = ({
  dailyXP,
  bonusClaimed,
  rewardRules,
  handleClaimBonus,
  chestAnimation,
  sparkleAnim,
}) => {
  const requiredXP = parseInt(rewardRules?.bonusChest?.requiredDailyXP ?? "150");

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{i18n.t('daily_challenge.bonus_chest_title')}</Text>
      {dailyXP < requiredXP && !bonusClaimed ? (
        <View style={styles.chestContainer}>
          <Image
            source={require("../../assets/images/lockedChest.png")} // Adjust path
            style={styles.lockedChestImage}
          />
          <Text style={styles.chestMessage}>
            {i18n.t('daily_challenge.bonus_chest_locked_message', { xpNeeded: requiredXP })}
          </Text>
        </View>
      ) : !bonusClaimed ? (
        <TouchableOpacity
          onPress={handleClaimBonus}
          style={styles.chestContainer}
          activeOpacity={0.8}
        >
          <Animated.View
            style={{
              shadowOpacity: chestAnimation,
              transform: [
                {
                  scale: chestAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            }}
          >
            <Image
              source={require("../../assets/images/lockedChest.png")} // Adjust path
              style={styles.lockedChestImage}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkleOverlay,
              {
                opacity: chestAnimation,
                transform: [
                  {
                    scale: chestAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.sparkleText}>✨ {i18n.t('daily_challenge.bonus_chest_claim_button')}</Text>
          </Animated.View>
        </TouchableOpacity>
      ) : (
        <View style={{ alignItems: "center", marginBottom: 10 }}>
          <View style={styles.chestContainer}>
            <Image
              source={require("../../assets/images/unlockedchest.png")} // Adjust path
              style={styles.unlockedChestImage}
            />
            <Animated.View
              style={[
                styles.sparkleOverlay,
                {
                  opacity: sparkleAnim,
                  transform: [
                    {
                      scale: sparkleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sparkleText}>🌟</Text>
            </Animated.View>
          </View>

          <View style={styles.bonusClaimedBox}>
            <Text style={styles.bonusClaimedText}>{i18n.t('daily_challenge.bonus_chest_claimed_message')}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 30, alignItems: "center" }, // Centering content within the section
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  chestContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 200, // Adjusted height for image visibility
    width: 200, // Adjusted width for image visibility
    marginBottom: 10,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  lockedChestImage: {
    width: 250, // Increase size to match original
    height: 250, // Increase size to match original
    resizeMode: "contain",
    opacity: 0.9,
  },
  unlockedChestImage: {
    width: 250, // Increase size to match original
    height: 250, // Increase size to match original
    top: 20, // Keep original positioning
    resizeMode: "contain",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    shadowOpacity: 1,
  },
  sparkleOverlay: {
    position: "absolute",
    top: 55, // Adjusted to match image
    left: 70, // Adjusted to match image
    right: 0,
    width: 200,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    opacity: 0.6,
  },
  sparkleText: {
    fontSize: 32,
    color: "#FFD700",
    textShadowColor: "#fff",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    fontWeight: "bold",
  },
  chestMessage: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
  },
  bonusClaimedBox: {
    backgroundColor: "rgba(0, 255, 157, 0.08)",
    borderColor: "#00FF9D",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusClaimedText: {
    color: "#00FF9D",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default BonusChestSection;