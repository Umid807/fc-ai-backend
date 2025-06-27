import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

// 🏆 Skill Moves Data Keys Structure
const skillMovesDataKeys = [
  {
    rating: 'skillMoves.categories.oneStarTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.directionalNutmeg',
        psKey: 'skillMoves.controls.directionalNutmegPS',
        xboxKey: 'skillMoves.controls.directionalNutmegXbox',
      },
      {
        nameKey: 'skillMoves.moves.standingBallJuggle',
        psKey: 'skillMoves.controls.standingBallJugglePS',
        xboxKey: 'skillMoves.controls.standingBallJuggleXbox',
      },
      {
        nameKey: 'skillMoves.moves.openUpFakeShot',
        psKey: 'skillMoves.controls.openUpFakeShotPS',
        xboxKey: 'skillMoves.controls.openUpFakeShotXbox',
      },
      {
        nameKey: 'skillMoves.moves.flickUp',
        psKey: 'skillMoves.controls.flickUpPS',
        xboxKey: 'skillMoves.controls.flickUpXbox',
      },
      {
        nameKey: 'skillMoves.moves.firstTimeFeintTurn',
        psKey: 'skillMoves.controls.firstTimeFeintTurnPS',
        xboxKey: 'skillMoves.controls.firstTimeFeintTurnXbox',
      },
    ],
  },
  {
    rating: 'skillMoves.categories.twoStarTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.feintForwardAndTurn',
        psKey: 'skillMoves.controls.feintForwardAndTurnPS',
        xboxKey: 'skillMoves.controls.feintForwardAndTurnXbox',
      },
      {
        nameKey: 'skillMoves.moves.bodyFeint',
        psKey: 'skillMoves.controls.bodyFeintPS',
        xboxKey: 'skillMoves.controls.bodyFeintXbox',
      },
      {
        nameKey: 'skillMoves.moves.stepover',
        psKey: 'skillMoves.controls.stepoverPS',
        xboxKey: 'skillMoves.controls.stepoverXbox',
      },
      {
        nameKey: 'skillMoves.moves.reverseStepover',
        psKey: 'skillMoves.controls.reverseStepoverPS',
        xboxKey: 'skillMoves.controls.reverseStepoverXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRoll',
        psKey: 'skillMoves.controls.ballRollPS',
        xboxKey: 'skillMoves.controls.ballRollXbox',
      },
      {
        nameKey: 'skillMoves.moves.dragBack',
        psKey: 'skillMoves.controls.dragBackPS',
        xboxKey: 'skillMoves.controls.dragBackXbox',
      },
      {
        nameKey: 'skillMoves.moves.bigFeint',
        psKey: 'skillMoves.controls.bigFeintPS',
        xboxKey: 'skillMoves.controls.bigFeintXbox',
      },
      {
        nameKey: 'skillMoves.moves.stopAndGo',
        psKey: 'skillMoves.controls.stopAndGoPS',
        xboxKey: 'skillMoves.controls.stopAndGoXbox',
      },
    ],
  },
  {
    rating: 'skillMoves.categories.threeStarTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.heelFlick',
        psKey: 'skillMoves.controls.heelFlickPS',
        xboxKey: 'skillMoves.controls.heelFlickXbox',
      },
      {
        nameKey: 'skillMoves.moves.rouletteRight',
        psKey: 'skillMoves.controls.rouletteRightPS',
        xboxKey: 'skillMoves.controls.rouletteRightXbox',
      },
      {
        nameKey: 'skillMoves.moves.rouletteLeft',
        psKey: 'skillMoves.controls.rouletteLeftPS',
        xboxKey: 'skillMoves.controls.rouletteLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.fakeLeftGoRight',
        psKey: 'skillMoves.controls.fakeLeftGoRightPS',
        xboxKey: 'skillMoves.controls.fakeLeftGoRightXbox',
      },
      {
        nameKey: 'skillMoves.moves.fakeRightGoLeft',
        psKey: 'skillMoves.controls.fakeRightGoLeftPS',
        xboxKey: 'skillMoves.controls.fakeRightGoLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.heelChop',
        psKey: 'skillMoves.controls.heelChopPS',
        xboxKey: 'skillMoves.controls.heelChopXbox',
      },
      {
        nameKey: 'skillMoves.moves.stutterFeint',
        psKey: 'skillMoves.controls.stutterFeintPS',
        xboxKey: 'skillMoves.controls.stutterFeintXbox',
      },
      {
        nameKey: 'skillMoves.moves.feintRightExitLeft',
        psKey: 'skillMoves.controls.feintRightExitLeftPS',
        xboxKey: 'skillMoves.controls.feintRightExitLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.feintLeftExitRight',
        psKey: 'skillMoves.controls.feintLeftExitRightPS',
        xboxKey: 'skillMoves.controls.feintLeftExitRightXbox',
      },
    ],
  },
  {
    rating: 'skillMoves.categories.fourStarTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.ballHop',
        psKey: 'skillMoves.controls.ballHopPS',
        xboxKey: 'skillMoves.controls.ballHopXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollDrag',
        psKey: 'skillMoves.controls.ballRollDragPS',
        xboxKey: 'skillMoves.controls.ballRollDragXbox',
      },
      {
        nameKey: 'skillMoves.moves.dragBackTurn',
        psKey: 'skillMoves.controls.dragBackTurnPS',
        xboxKey: 'skillMoves.controls.dragBackTurnXbox',
      },
      {
        nameKey: 'skillMoves.moves.flairNutmegs',
        psKey: 'skillMoves.controls.flairNutmegsPS',
        xboxKey: 'skillMoves.controls.flairNutmegsXbox',
      },
      {
        nameKey: 'skillMoves.moves.heelToHeelFlick',
        psKey: 'skillMoves.controls.heelToHeelFlickPS',
        xboxKey: 'skillMoves.controls.heelToHeelFlickXbox',
      },
      {
        nameKey: 'skillMoves.moves.simpleRainbow',
        psKey: 'skillMoves.controls.simpleRainbowPS',
        xboxKey: 'skillMoves.controls.simpleRainbowXbox',
      },
      {
        nameKey: 'skillMoves.moves.spinRight',
        psKey: 'skillMoves.controls.spinRightPS',
        xboxKey: 'skillMoves.controls.spinRightXbox',
      },
      {
        nameKey: 'skillMoves.moves.spinLeft',
        psKey: 'skillMoves.controls.spinLeftPS',
        xboxKey: 'skillMoves.controls.spinLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.stopAndTurn',
        psKey: 'skillMoves.controls.stopAndTurnPS',
        xboxKey: 'skillMoves.controls.stopAndTurnXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollCutRight',
        psKey: 'skillMoves.controls.ballRollCutRightPS',
        xboxKey: 'skillMoves.controls.ballRollCutRightXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollCutLeft',
        psKey: 'skillMoves.controls.ballRollCutLeftPS',
        xboxKey: 'skillMoves.controls.ballRollCutLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.fakePassStanding',
        psKey: 'skillMoves.controls.fakePassStandingPS',
        xboxKey: 'skillMoves.controls.fakePassStandingXbox',
      },
      {
        nameKey: 'skillMoves.moves.fakePassExit',
        psKey: 'skillMoves.controls.fakePassExitPS',
        xboxKey: 'skillMoves.controls.fakePassExitXbox',
      },
      {
        nameKey: 'skillMoves.moves.quickBallRolls',
        psKey: 'skillMoves.controls.quickBallRollsPS',
        xboxKey: 'skillMoves.controls.quickBallRollsXbox',
      },
      {
        nameKey: 'skillMoves.moves.dragToHeel',
        psKey: 'skillMoves.controls.dragToHeelPS',
        xboxKey: 'skillMoves.controls.dragToHeelXbox',
      },
      {
        nameKey: 'skillMoves.moves.laneChange',
        psKey: 'skillMoves.controls.laneChangePS',
        xboxKey: 'skillMoves.controls.laneChangeXbox',
      },
      {
        nameKey: 'skillMoves.moves.threeTouchRoulette',
        psKey: 'skillMoves.controls.threeTouchRoulettePS',
        xboxKey: 'skillMoves.controls.threeTouchRouletteXbox',
      },
      {
        nameKey: 'skillMoves.moves.dragBackSpin',
        psKey: 'skillMoves.controls.dragBackSpinPS',
        xboxKey: 'skillMoves.controls.dragBackSpinXbox',
      },
      {
        nameKey: 'skillMoves.moves.heelToBallRoll',
        psKey: 'skillMoves.controls.heelToBallRollPS',
        xboxKey: 'skillMoves.controls.heelToBallRollXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollCut',
        psKey: 'skillMoves.controls.ballRollCutPS',
        xboxKey: 'skillMoves.controls.ballRollCutXbox',
      },
      {
        nameKey: 'skillMoves.moves.explosiveFakeShot',
        psKey: 'skillMoves.controls.explosiveFakeShotPS',
        xboxKey: 'skillMoves.controls.explosiveFakeShotXbox',
      },
      {
        nameKey: 'skillMoves.moves.stepOverBall',
        psKey: 'skillMoves.controls.stepOverBallPS',
        xboxKey: 'skillMoves.controls.stepOverBallXbox',
      },
    ],
  },
  {
    rating: 'skillMoves.categories.fiveStarTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.elastico',
        psKey: 'skillMoves.controls.elasticoPS',
        xboxKey: 'skillMoves.controls.elasticoXbox',
      },
      {
        nameKey: 'skillMoves.moves.reverseElastico',
        psKey: 'skillMoves.controls.reverseElasticoPS',
        xboxKey: 'skillMoves.controls.reverseElasticoXbox',
      },
      {
        nameKey: 'skillMoves.moves.advancedRainbow',
        psKey: 'skillMoves.controls.advancedRainbowPS',
        xboxKey: 'skillMoves.controls.advancedRainbowXbox',
      },
      {
        nameKey: 'skillMoves.moves.hocusPocus',
        psKey: 'skillMoves.controls.hocusPocusPS',
        xboxKey: 'skillMoves.controls.hocusPocusXbox',
      },
      {
        nameKey: 'skillMoves.moves.tripleElastico',
        psKey: 'skillMoves.controls.tripleElasticoPS',
        xboxKey: 'skillMoves.controls.tripleElasticoXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollAndFlick',
        psKey: 'skillMoves.controls.ballRollAndFlickPS',
        xboxKey: 'skillMoves.controls.ballRollAndFlickXbox',
      },
      {
        nameKey: 'skillMoves.moves.heelFlickTurn',
        psKey: 'skillMoves.controls.heelFlickTurnPS',
        xboxKey: 'skillMoves.controls.heelFlickTurnXbox',
      },
      {
        nameKey: 'skillMoves.moves.sombreroFlickStanding',
        psKey: 'skillMoves.controls.sombreroFlickStandingPS',
        xboxKey: 'skillMoves.controls.sombreroFlickStandingXbox',
      },
      {
        nameKey: 'skillMoves.moves.turnAndSpin',
        psKey: 'skillMoves.controls.turnAndSpinPS',
        xboxKey: 'skillMoves.controls.turnAndSpinXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollFakeStanding',
        psKey: 'skillMoves.controls.ballRollFakeStandingPS',
        xboxKey: 'skillMoves.controls.ballRollFakeStandingXbox',
      },
      {
        nameKey: 'skillMoves.moves.ballRollFakeTurn',
        psKey: 'skillMoves.controls.ballRollFakeTurnPS',
        xboxKey: 'skillMoves.controls.ballRollFakeTurnXbox',
      },
      {
        nameKey: 'skillMoves.moves.elasticoChopRight',
        psKey: 'skillMoves.controls.elasticoChopRightPS',
        xboxKey: 'skillMoves.controls.elasticoChopRightXbox',
      },
      {
        nameKey: 'skillMoves.moves.elasticoChopLeft',
        psKey: 'skillMoves.controls.elasticoChopLeftPS',
        xboxKey: 'skillMoves.controls.elasticoChopLeftXbox',
      },
      {
        nameKey: 'skillMoves.moves.spinFlick',
        psKey: 'skillMoves.controls.spinFlickPS',
        xboxKey: 'skillMoves.controls.spinFlickXbox',
      },
      {
        nameKey: 'skillMoves.moves.flickOver',
        psKey: 'skillMoves.controls.flickOverPS',
        xboxKey: 'skillMoves.controls.flickOverXbox',
      },
      {
        nameKey: 'skillMoves.moves.tornadoSpin',
        psKey: 'skillMoves.controls.tornadoSpinPS',
        xboxKey: 'skillMoves.controls.tornadoSpinXbox',
      },
      {
        nameKey: 'skillMoves.moves.rabonaFake',
        psKey: 'skillMoves.controls.rabonaFakePS',
        xboxKey: 'skillMoves.controls.rabonaFakeXbox',
      },
      {
        nameKey: 'skillMoves.moves.heelFake',
        psKey: 'skillMoves.controls.heelFakePS',
        xboxKey: 'skillMoves.controls.heelFakeXbox',
      },
      {
        nameKey: 'skillMoves.moves.flairRainbow',
        psKey: 'skillMoves.controls.flairRainbowPS',
        xboxKey: 'skillMoves.controls.flairRainbowXbox',
      },
      {
        nameKey: 'skillMoves.moves.toeDragStepover',
        psKey: 'skillMoves.controls.toeDragStepoverPS',
        xboxKey: 'skillMoves.controls.toeDragStepoverXbox',
      },
    ],
  },
  {
    rating: 'skillMoves.categories.jugglingTitle',
    moves: [
      {
        nameKey: 'skillMoves.moves.sombreroFlickDirectional',
        psKey: 'skillMoves.controls.sombreroFlickDirectionalPS',
        xboxKey: 'skillMoves.controls.sombreroFlickDirectionalXbox',
      },
      {
        nameKey: 'skillMoves.moves.aroundTheWorld',
        psKey: 'skillMoves.controls.aroundTheWorldPS',
        xboxKey: 'skillMoves.controls.aroundTheWorldXbox',
      },
      {
        nameKey: 'skillMoves.moves.inAirElastico',
        psKey: 'skillMoves.controls.inAirElasticoPS',
        xboxKey: 'skillMoves.controls.inAirElasticoXbox',
      },
      {
        nameKey: 'skillMoves.moves.reverseInAirElastico',
        psKey: 'skillMoves.controls.reverseInAirElasticoPS',
        xboxKey: 'skillMoves.controls.reverseInAirElasticoXbox',
      },
      {
        nameKey: 'skillMoves.moves.flickUpForVolley',
        psKey: 'skillMoves.controls.flickUpForVolleyPS',
        xboxKey: 'skillMoves.controls.flickUpForVolleyXbox',
      },
      {
        nameKey: 'skillMoves.moves.chestFlick',
        psKey: 'skillMoves.controls.chestFlickPS',
        xboxKey: 'skillMoves.controls.chestFlickXbox',
      },
      {
        nameKey: 'skillMoves.moves.tAroundTheWorld',
        psKey: 'skillMoves.controls.tAroundTheWorldPS',
        xboxKey: 'skillMoves.controls.tAroundTheWorldXbox',
      },
    ],
  },
];

// 🔥 The Skill Moves Table Component
export default function SkillMovesTable() {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleCategory = (index) => {
    setExpandedCategory(expandedCategory === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      {skillMovesDataKeys.map((category, index) => (
        <View key={index} style={styles.categoryContainer}>
          {/* Category Header (Collapsible) */}
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory(index)}
          >
            <Text style={styles.categoryTitle}>{t(category.rating)}</Text>
            <Text style={styles.toggleIcon}>
              {expandedCategory === index ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Skill Moves List (Expands on Click) */}
          {expandedCategory === index && (
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableRowHeader}>
                <Text style={styles.tableHeaderText}>{t('skillMoves.headers.skillMove')}</Text>
                <Text style={styles.tableHeaderText}>{t('skillMoves.headers.playstation')}</Text>
                <Text style={styles.tableHeaderText}>{t('skillMoves.headers.xbox')}</Text>
              </View>

              {/* Skill Moves Rows */}
              {category.moves.map((move, moveIndex) => (
                <View key={moveIndex} style={styles.tableRow}>
                  <Text style={styles.cell}>{t(move.nameKey)}</Text>
                  <Text style={styles.cell}>{t(move.psKey)}</Text>
                  <Text style={styles.cell}>{t(move.xboxKey)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// 🌌 High-Tech Neon-Themed Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00FFFF', // Neon Cyan
  },
  categoryContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    backgroundColor: 'rgba(112, 132, 112, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryTitle: {
    color: '#FFD700', // Gold for premium look
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleIcon: {
    color: '#FFD700',
    fontSize: 16,
  },
  table: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingVertical: 10,
  },
  tableRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: 'rgba(199, 218, 218, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableHeaderText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cell: {
    color: '#FFFFFF',
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
});