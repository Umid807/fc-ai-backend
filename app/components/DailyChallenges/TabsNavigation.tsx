import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import i18n from '../../app/i18n/i18n';

type ActivityTab = "polls" | "videos" | "community";

type TabsNavigationProps = {
  activeTab: ActivityTab;
  setActiveTab: (tab: ActivityTab) => void;
};

const TabsNavigation: React.FC<TabsNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "polls" && styles.activeTab]}
        onPress={() => setActiveTab("polls")}
      >
        <Text style={styles.tabText}>{i18n.t('daily_challenge.polls_tab')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "videos" && styles.activeTab]}
        onPress={() => setActiveTab("videos")}
      >
        <Text style={styles.tabText}>{i18n.t('daily_challenge.videos_tab')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "community" && styles.activeTab]}
        onPress={() => setActiveTab("community")}
      >
        <Text style={styles.tabText}>{i18n.t('daily_challenge.community_tab')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  activeTab: { backgroundColor: "#2196F3" },
  tabText: { color: "#00FF9D", fontWeight: "bold" },
});

export default TabsNavigation;