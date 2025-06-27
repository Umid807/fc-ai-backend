import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, GestureResponderEvent } from "react-native";
import i18n from '../../app/i18n/i18n';

type Poll = {
  id: string;
  question: string;
  options: string[];
  voted: boolean;
  selectedChoice?: string;
};

type PollCardProps = {
  poll: Poll;
  onVote: (pollId: string, choice: string, pageX?: number, pageY?: number) => void;
};

const PollCard: React.FC<PollCardProps> = ({ poll, onVote }) => {
  return (
    <View style={styles.pollCard}>
      <Text style={styles.pollQuestion}>{poll.question}</Text>
      <View style={styles.pollOptions}>
        {poll.options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.pollOptionButton,
              poll.voted && styles.pollOptionDisabled,
            ]}
            onPress={(e: GestureResponderEvent) => {
              // Only allow voting if not already voted
              if (!poll.voted) {
                const { pageX, pageY } = e.nativeEvent;
                onVote(poll.id, option, pageX, pageY);
              }
            }}
            disabled={poll.voted} // Disable button if already voted
          >
            <Text style={styles.pollOptionText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {poll.voted && (
        <Text style={styles.pollThankYou}>{i18n.t('daily_challenge.thank_you_for_voting')}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pollCard: {
    backgroundColor: "#0f1923",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#00FF9D",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pollQuestion: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 14,
    fontWeight: "600",
  },
  pollOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  pollOptionButton: {
    backgroundColor: "#00FF9D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    margin: 6,
  },
  pollOptionDisabled: {
    backgroundColor: "#555",
    opacity: 0.7, // Add a visual cue for disabled
  },
  pollOptionText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 15,
  },
  pollThankYou: {
    marginTop: 12,
    textAlign: "center",
    color: "#FFD700",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default PollCard;