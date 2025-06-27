// app/trick-detail/[index].tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
// Use useLocalSearchParams for dynamic route parameters
import { useLocalSearchParams, Link } from 'expo-router';

// The list of 30 tricks
const tricksList: string[] = [
  "🔥 The Most Broken Dribbling Trick in FC 25!",
  "🎯 This Hidden Passing Cheat Will Make You Unstoppable!",
  "⚡ The Overpowered Skill Move That No One Can Defend!",
  "💨 Speed Glitch Move That Leaves Defenders in the Dust!",
  "🎮 Pros Are Using This Camera Setting for a Huge Advantage!",
  "🛡️ The One Defensive Trick That Will Make You a Brick Wall!",
  "🔥 This Custom Tactic is Breaking FC 25’s Meta Right Now!",
  "⚽ The Most Overpowered Formation for Automatic Wins!",
  "🚀 Timed Finishing Secret: How to Score Perfect Shots Every Time!",
  "💥 The Passing Trick That Bypasses AI Defenders Like Magic!",
  "🔥 The One Button Combo That Turns Any Player Into a Skiller!",
  "🕵️ EA’s Hidden Feature That Gives You an Edge in Ultimate Team!",
  "⚡ The Counter-Attack Setup That’s Impossible to Defend Against!",
  "🎯 Auto-Defending Glitch: Let AI Do All the Work for You!",
  "🔍 The Secret Shooting Angle That Guarantees Goals!",
  "🚀 The Overpowered Custom Set Piece That Nobody Knows About!",
  "🛡️ 3 Hidden Defensive Settings That Give You a Huge Advantage!",
  "⚔️ This Aggressive Pressing System Will Destroy Your Opponent!",
  "🔥 The Noob-Friendly Tactic That Even Works in Elite Ranks!",
  "⚡ The Skill Move Spam That Can’t Be Stopped Right Now!",
  "💨 Exploit AI Defending With This Simple Trick!",
  "🎮 How to Trigger the Most Broken Through Ball in FC 25!",
  "🛡️ This One Defensive Button Saves You from Every Counterattack!",
  "🎯 The First-Touch Passing Trick That Feels Like a Cheat Code!",
  "⚽ The OP Custom Tactic That Will Get Patched Soon!",
  "🚀 This Explosive Sprint Boost Will Make You Feel Like Mbappé!",
  "🔥 How to Jockey Like a Pro and Shut Down Any Attack!",
  "💥 The Overpowered Finesse Shot Secret Nobody Is Talking About!",
  "🕵️ This One Setting Change Can Instantly Improve Your Game!",
  "⚔️ The Trick That Lets You Defend Without Tackling!",
];

// Detailed instructions for each trick
const trickDetails: { [key: number]: string } = {
  0: `Detailed instructions for "The Most Broken Dribbling Trick in FC 25!":

1. **Warm Up:** Begin with basic dribbling drills in training mode.
2. **Control Focus:** Emphasize tight ball control and rapid changes in direction.
3. **Feints & Speed:** Combine quick feints with bursts of speed to confuse defenders.
4. **Practice:** Implement the move in simulated matches to perfect your timing.

*Tip:* Repetition in training mode will help integrate this trick into your gameplay seamlessly.`,
  
  1: `Detailed instructions for "This Hidden Passing Cheat Will Make You Unstoppable!":

1. **Positioning:** Place your player in an open area to maximize passing options.
2. **Precision Passing:** Execute low-driven, precise passes to slip past defenders.
3. **Follow-Up:** Make a quick forward run to receive the ball after the pass.
4. **Practice:** Drill these moves in controlled environments before using them in matches.

*Tip:* Watch professional gameplay to see how timing and positioning make this trick effective.`,

  2: `Detailed instructions for "The Overpowered Skill Move That No One Can Defend!":

1. **Animation Mastery:** Spend time in training mode to learn the move’s animation.
2. **Timing:** Use the skill move during one-on-one situations for maximum impact.
3. **Observation:** Study professional players to capture nuances in execution.
4. **Integration:** Gradually add the move into your matches as you become more confident.

*Tip:* Consistent practice is the key to pulling off this advanced skill move.`,

  3: `Detailed instructions for "Speed Glitch Move That Leaves Defenders in the Dust!":

1. **Acceleration:** Leverage your player's sprint to catch defenders off guard.
2. **Direction Changes:** Combine sudden directional changes with high speed.
3. **Exploitation:** Identify gaps in the defense and accelerate through them.
4. **Drills:** Repeat these movements in training to perfect your timing.

*Tip:* Timing and anticipation are critical; adjust your approach based on in-game situations.`,

  4: `Detailed instructions for "Pros Are Using This Camera Setting for a Huge Advantage!":

1. **Access Settings:** Navigate to your game settings and select camera options.
2. **Experiment:** Test various camera angles, zoom levels, and field-of-view options.
3. **Optimization:** Choose settings that provide the best balance between awareness and control.
4. **Practice:** Use the new settings during practice matches to get comfortable.

*Tip:* A good camera setting can significantly improve your situational awareness on the field.`,

  5: `Detailed instructions for "The One Defensive Trick That Will Make You a Brick Wall!":

1. **Defensive Drills:** Work on defensive positioning in training mode.
2. **Interceptions:** Practice timely interceptions and smart tackling.
3. **Player Switching:** Improve your ability to quickly switch between players.
4. **Review:** Analyze match replays to refine your defensive tactics.

*Tip:* A well-timed interception can turn the tide of a match in your favor.`,

  6: `Detailed instructions for "This Custom Tactic is Breaking FC 25’s Meta Right Now!":

1. **Tactic Setup:** Access the tactics menu and start customizing your formation.
2. **Player Roles:** Assign roles that maximize each player’s strengths.
3. **Testing:** Experiment with your custom tactic in friendly matches.
4. **Adjustment:** Fine-tune based on feedback and observed in-game performance.

*Tip:* Stay adaptable—the meta can shift, so update your tactics regularly.`,

  7: `Detailed instructions for "The Most Overpowered Formation for Automatic Wins!":

1. **Research:** Study formations known for balancing offense and defense.
2. **Customization:** Tailor the formation to your personal play style.
3. **Implementation:** Use the formation in practice sessions to understand its strengths.
4. **Analysis:** Review performance data and adjust player roles accordingly.

*Tip:* A solid formation can make your team both resilient and versatile.`,

  8: `Detailed instructions for "Timed Finishing Secret: How to Score Perfect Shots Every Time!":

1. **Shooting Drills:** Focus on finishing drills to develop your shooting accuracy.
2. **Timing:** Learn to time your shot as defenders converge.
3. **Set Up:** Ensure you receive the ball in an optimal position for a shot.
4. **Consistency:** Regular practice is key to integrating this finishing secret into your game.

*Tip:* Combine precise passing with sharp shooting for best results.`,

  9: `Detailed instructions for "The Passing Trick That Bypasses AI Defenders Like Magic!":

1. **Read the Defense:** Develop an understanding of opponent positioning.
2. **Quick Passes:** Use rapid, incisive passes to break through defensive lines.
3. **Decoy Runs:** Incorporate feints and off-the-ball runs to create space.
4. **Practice:** Refine these techniques in controlled drills to improve accuracy.

*Tip:* Coordination between players is essential for making this trick work consistently.`,

  10: `Detailed instructions for "The One Button Combo That Turns Any Player Into a Skiller!":

1. **Combo Mastery:** Practice the specific button combination in training mode.
2. **Application:** Use the combo in one-on-one situations to outmaneuver defenders.
3. **Repetition:** Drill the combo repeatedly until it becomes second nature.
4. **Integration:** Gradually incorporate it into competitive play.

*Tip:* Consistent practice will help you perform the combo under pressure.`,

  11: `Detailed instructions for "EA’s Hidden Feature That Gives You an Edge in Ultimate Team!":

1. **Feature Discovery:** Explore the settings menu to uncover hidden features.
2. **Team Setup:** Adjust your lineup to make the most of the discovered feature.
3. **Observation:** Monitor your in-game performance to see the benefit.
4. **Collaboration:** Discuss and share your findings with teammates for further insights.

*Tip:* Hidden features can provide a subtle but significant edge over your opponents.`,

  12: `Detailed instructions for "The Counter-Attack Setup That’s Impossible to Defend Against!":

1. **Transition Training:** Focus on quick transitions from defense to attack.
2. **Speed:** Utilize fast wingers to exploit gaps left by the opposition.
3. **Coordination:** Ensure midfielders are prepared to deliver timely passes.
4. **Practice:** Simulate counter-attacks during training sessions to refine your strategy.

*Tip:* A well-executed counter-attack can catch opponents completely off guard.`,

  13: `Detailed instructions for "Auto-Defending Glitch: Let AI Do All the Work for You!":

1. **Identify Gaps:** Recognize moments when manual defense is less effective.
2. **Activate Auto-Defend:** Use the auto-defending feature in these situations.
3. **Observation:** Study how the AI positions itself and learn from its movements.
4. **Selective Use:** Apply this trick sparingly to maintain overall control.

*Tip:* Use this strategy as a backup rather than your primary defensive tactic.`,

  14: `Detailed instructions for "The Secret Shooting Angle That Guarantees Goals!":

1. **Experimentation:** Try shooting from various angles in training mode.
2. **Analysis:** Determine which angle provides the best chance of scoring.
3. **Practice:** Repeatedly practice shots from this “secret” angle.
4. **Adjustment:** Fine-tune your technique based on your success rate.

*Tip:* A consistent shooting angle can significantly improve your goal-scoring record.`,

  15: `Detailed instructions for "The Overpowered Custom Set Piece That Nobody Knows About!":

1. **Set Piece Setup:** Create a custom set piece in your tactics menu.
2. **Player Movement:** Experiment with different runs and player positions.
3. **Drills:** Practice the set piece in controlled scenarios.
4. **Variation:** Introduce variations to keep your opponents guessing.

*Tip:* Innovation in set pieces can be a game changer when used at the right moment.`,

  16: `Detailed instructions for "3 Hidden Defensive Settings That Give You a Huge Advantage!":

1. **Explore Settings:** Navigate to the defensive options in your tactics menu.
2. **Enable Features:** Activate the hidden settings one at a time.
3. **Test Impact:** Play matches or drills to observe improvements in defense.
4. **Refinement:** Adjust the settings to best fit your play style.

*Tip:* Even small tweaks in defense can lead to major improvements in performance.`,

  17: `Detailed instructions for "This Aggressive Pressing System Will Destroy Your Opponent!":

1. **High Intensity:** Adopt an aggressive pressing style during matches.
2. **Close Down:** Instruct your players to close down space quickly.
3. **Stamina:** Build up stamina with high-intensity training drills.
4. **Adaptation:** Adjust the system based on the opponent’s gameplay.

*Tip:* Aggressive pressing can force errors from your opponents and create scoring opportunities.`,

  18: `Detailed instructions for "The Noob-Friendly Tactic That Even Works in Elite Ranks!":

1. **Simplify:** Stick to basic principles with a simplified formation.
2. **Teamwork:** Focus on coordination and positional discipline.
3. **Fundamentals:** Practice basic passing and defending drills.
4. **Confidence:** Use the tactic in lower-pressure situations before applying it in higher-stakes matches.

*Tip:* Simple strategies executed well can often outperform overly complex tactics.`,

  19: `Detailed instructions for "The Skill Move Spam That Can’t Be Stopped Right Now!":

1. **Learn the Moves:** Master the series of skill moves in training mode.
2. **Chain Moves:** Link the moves together in rapid succession.
3. **Burst Usage:** Use the move spam in short bursts to overwhelm defenders.
4. **Practice:** Drill the sequence repeatedly to improve your reaction time.

*Tip:* Timing is everything—use the moves at the right moment to maximize their effect.`,

  20: `Detailed instructions for "Exploit AI Defending With This Simple Trick!":

1. **Pattern Recognition:** Observe and learn the AI’s defending patterns.
2. **Positioning:** Position your player to exploit predictable gaps.
3. **Quick Execution:** Use rapid passes to break down the AI’s formation.
4. **Adaptability:** Keep refining your approach as the AI adjusts its tactics.

*Tip:* Regularly update your strategy to stay ahead of the AI’s evolving patterns.`,

  21: `Detailed instructions for "How to Trigger the Most Broken Through Ball in FC 25!":

1. **Vision:** Develop a keen sense for spotting through ball opportunities.
2. **Weight & Timing:** Deliver the ball with perfect weight and timing.
3. **Player Movement:** Ensure your forward is making a well-timed run.
4. **Repetition:** Practice this move in drills to make it second nature.

*Tip:* A well-executed through ball can break down even the tightest defenses.`,

  22: `Detailed instructions for "This One Defensive Button Saves You from Every Counterattack!":

1. **Button Timing:** Learn the optimal moment to press the defensive button.
2. **Positioning:** Use it as a supplement to good defensive positioning.
3. **Integration:** Combine the button press with smart player movement.
4. **Drills:** Practice repeatedly to develop the reflex needed for high-pressure moments.

*Tip:* Use the button as a last line of defense when other measures fall short.`,

  23: `Detailed instructions for "The First-Touch Passing Trick That Feels Like a Cheat Code!":

1. **Soft Touch:** Focus on controlling the ball with a soft first touch.
2. **Quick Pass:** Immediately follow up with a fast, accurate pass.
3. **Timing:** Work on timing to ensure defenders are caught off guard.
4. **Practice:** Drill this sequence until it becomes an instinctive part of your game.

*Tip:* This trick relies on excellent ball control and split-second decision making.`,

  24: `Detailed instructions for "The OP Custom Tactic That Will Get Patched Soon!":

1. **Tactic Design:** Use the team management menu to set up your custom tactic.
2. **Role Assignment:** Experiment with different player roles and responsibilities.
3. **In-Game Testing:** Test the tactic in friendly matches and adjust as needed.
4. **Monitor Changes:** Keep abreast of game updates and be ready to tweak your tactic accordingly.

*Tip:* Being proactive with your tactics can give you a significant competitive edge.`,

  25: `Detailed instructions for "This Explosive Sprint Boost Will Make You Feel Like Mbappé!":

1. **Sprint Activation:** Time your sprints to exploit defensive lapses.
2. **Dribbling:** Combine sprinting with agile dribbling to maximize impact.
3. **Positioning:** Use the boost to either close down defenders or break away.
4. **Practice:** Train in high-pressure scenarios to improve your sprint timing.

*Tip:* Proper timing and positioning make the difference between a good sprint and an explosive, game-changing run.`,

  26: `Detailed instructions for "How to Jockey Like a Pro and Shut Down Any Attack!":

1. **Positioning:** Focus on maintaining the best defensive stance.
2. **Anticipation:** Read the opponent’s moves to predict where the ball is going.
3. **Interception:** Combine jockeying with timely interceptions.
4. **Repetition:** Practice these defensive techniques in training mode.

*Tip:* Mastery of jockeying will help you slow down and frustrate even the most aggressive attackers.`,

  27: `Detailed instructions for "The Overpowered Finesse Shot Secret Nobody Is Talking About!":

1. **Finesse Technique:** Practice finesse shots in the shooting drills.
2. **Delicate Touch:** Focus on the precise touch needed to curve the ball.
3. **Situational Use:** Apply the finesse shot when defenders are tightly packed.
4. **Variation:** Experiment with different angles and approaches to perfect your shot.

*Tip:* A well-placed finesse shot can be the difference between a goal and a miss.`,

  28: `Detailed instructions for "This One Setting Change Can Instantly Improve Your Game!":

1. **Explore Options:** Delve into the game’s settings to discover performance tweaks.
2. **Experiment:** Try various configuration changes to see what boosts your performance.
3. **Evaluate:** Monitor how these changes affect your gameplay during matches.
4. **Share & Adapt:** Exchange tips with teammates and refine your settings over time.

*Tip:* Small adjustments in settings can lead to big improvements in your overall game performance.`,

  29: `Detailed instructions for "The Trick That Lets You Defend Without Tackling!":

1. **Positional Play:** Focus on smart positioning to block passing lanes.
2. **Interception:** Use anticipation to intercept passes without committing to a tackle.
3. **Body Positioning:** Rely on your body to disrupt the opponent’s play.
4. **Drills:** Practice defensive positioning and movement in training mode.

*Tip:* This trick emphasizes intelligent play over physical challenges, making it ideal for conserving energy while defending.`,
};

export default function TrickDetail() {
  // Retrieve the dynamic parameter using useLocalSearchParams
  const { index } = useLocalSearchParams();
  const trickIndex = Number(index);

  // Validate the trick index
  if (isNaN(trickIndex) || trickIndex < 0 || trickIndex >= tricksList.length) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Invalid Trick Selected</Text>
        <Link href="/" style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Home</Text>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Trick Title Section */}
      <View style={styles.headerCard}>
        <Text style={styles.trickTitle}>{tricksList[trickIndex]}</Text>
      </View>

      {/* Detailed Instructions Card */}
      <View style={styles.detailCard}>
        <Text style={styles.detailText}>{trickDetails[trickIndex]}</Text>
      </View>

      {/* Back to Home Link */}
      <TouchableOpacity style={styles.backButton}>
        <Link href="/" style={styles.backLink}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </Link>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 15,
  },
  headerCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  trickTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  detailText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  backButton: {
    alignItems: 'center',
    marginBottom: 30,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00BFFF',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    color: 'red',
    marginBottom: 15,
  },
  backLink: {
    marginTop: 10,
  },
  backLinkText: {
    fontSize: 16,
    color: '#00BFFF',
    textDecorationLine: 'underline',
  },
});