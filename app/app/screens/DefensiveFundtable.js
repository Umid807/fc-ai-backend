import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

// 🛡️ Defensive Fundamentals Data - Now using unique i18n keys
const defensiveFundamentalsData = [
  {
    categoryKey: 'defensiveFundamentals.categories.jockeyingAndPositioningCategory',
    moves: [
      {
        nameKey: 'defensiveFundamentals.moves.basicJockeyingMove',
        descriptionKey: 'defensiveFundamentals.moves.basicJockeyingDescription',
        psKey: 'defensiveFundamentals.controls.basicJockeyingPS',
        xboxKey: 'defensiveFundamentals.controls.basicJockeyingXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.precisionJockeyingMove',
        descriptionKey: 'defensiveFundamentals.moves.precisionJockeyingDescription',
        psKey: 'defensiveFundamentals.controls.precisionJockeyingPS',
        xboxKey: 'defensiveFundamentals.controls.precisionJockeyingXbox',
      },
    ],
  },
  {
    categoryKey: 'defensiveFundamentals.categories.tacklingAndInterceptionsCategory',
    moves: [
      {
        nameKey: 'defensiveFundamentals.moves.standingTackleMove',
        descriptionKey: 'defensiveFundamentals.moves.standingTackleDescription',
        psKey: 'defensiveFundamentals.controls.standingTacklePS',
        xboxKey: 'defensiveFundamentals.controls.standingTackleXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.perfectSlideTackleMove',
        descriptionKey: 'defensiveFundamentals.moves.perfectSlideTackleDescription',
        psKey: 'defensiveFundamentals.controls.perfectSlideTacklePS',
        xboxKey: 'defensiveFundamentals.controls.perfectSlideTackleXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.interceptionTimingMove',
        descriptionKey: 'defensiveFundamentals.moves.interceptionTimingDescription',
        psKey: 'defensiveFundamentals.controls.interceptionTimingPS',
        xboxKey: 'defensiveFundamentals.controls.interceptionTimingXbox',
      },
    ],
  },
  {
    categoryKey: 'defensiveFundamentals.categories.pressingAndTeamDefenseCategory',
    moves: [
      {
        nameKey: 'defensiveFundamentals.moves.containDefenseMove',
        descriptionKey: 'defensiveFundamentals.moves.containDefenseDescription',
        psKey: 'defensiveFundamentals.controls.containDefensePS',
        xboxKey: 'defensiveFundamentals.controls.containDefenseXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.doublePressingMove',
        descriptionKey: 'defensiveFundamentals.moves.doublePressingDescription',
        psKey: 'defensiveFundamentals.controls.doublePressingPS',
        xboxKey: 'defensiveFundamentals.controls.doublePressingXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.pressAndTrapMove',
        descriptionKey: 'defensiveFundamentals.moves.pressAndTrapDescription',
        psKey: 'defensiveFundamentals.controls.pressAndTrapPS',
        xboxKey: 'defensiveFundamentals.controls.pressAndTrapXbox',
      },
    ],
  },
  {
    categoryKey: 'defensiveFundamentals.categories.cuttingPassingLanesAndAnticipationCategory',
    moves: [
      {
        nameKey: 'defensiveFundamentals.moves.trackAndBlockMove',
        descriptionKey: 'defensiveFundamentals.moves.trackAndBlockDescription',
        psKey: 'defensiveFundamentals.controls.trackAndBlockPS',
        xboxKey: 'defensiveFundamentals.controls.trackAndBlockXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.cuttingPassingLanesMove',
        descriptionKey: 'defensiveFundamentals.moves.cuttingPassingLanesDescription',
        psKey: 'defensiveFundamentals.controls.cuttingPassingLanesPS',
        xboxKey: 'defensiveFundamentals.controls.cuttingPassingLanesXbox',
      },
    ],
  },
  {
    categoryKey: 'defensiveFundamentals.categories.defendingCounterattacksCategory',
    moves: [
      {
        nameKey: 'defensiveFundamentals.moves.manualSwitchingMove',
        descriptionKey: 'defensiveFundamentals.moves.manualSwitchingDescription',
        psKey: 'defensiveFundamentals.controls.manualSwitchingPS',
        xboxKey: 'defensiveFundamentals.controls.manualSwitchingXbox',
      },
      {
        nameKey: 'defensiveFundamentals.moves.defendingCounterattacksMove',
        descriptionKey: 'defensiveFundamentals.moves.defendingCounterattacksDescription',
        psKey: 'defensiveFundamentals.controls.defendingCounterattacksPS',
        xboxKey: 'defensiveFundamentals.controls.defendingCounterattacksXbox',
      },
    ],
  },
];

// 🛡️ Defensive Fundamentals Table Component
export default function DefensiveFundamentalsTable() {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState(null);

  const toggleCategory = (index) => {
    setExpandedCategory(expandedCategory === index ? null : index);
  };

  return (
    <ScrollView style={styles.container}>
      {defensiveFundamentalsData.map((category, index) => (
        <View key={index} style={styles.categoryContainer}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategory(index)}
          >
            <Text style={styles.categoryTitle}>{t(category.categoryKey)}</Text>
            <Text style={styles.toggleIcon}>
              {expandedCategory === index ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {expandedCategory === index && (
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={styles.tableHeaderText}>{t('defensiveFundamentals.headers.defensiveMoveHeader')}</Text>
                <Text style={styles.tableHeaderText}>{t('defensiveFundamentals.headers.playstationHeader')}</Text>
                <Text style={styles.tableHeaderText}>{t('defensiveFundamentals.headers.xboxHeader')}</Text>
              </View>

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

// 🎨 Styling for Defensive Fundamentals Table
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121212',
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  categoryContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  table: {
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingVertical: 10,
  },
  tableRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
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
  toggleIcon: {
    color: '#FFD700',
    fontSize: 16,
  },
});