import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { BadgeCheck, Trophy } from 'lucide-react-native';

type CoachCardProps = {
  coachImage: string;
  coachName: string;
  nationality: string; // e.g. "fr", "es"
  languages: string[]; // e.g. ["en", "es"]
  isVerified: boolean;
  playstyle: string;
  achievements?: string[];
  onViewSessions: () => void;
};

const CoachCard: React.FC<CoachCardProps> = ({
  coachImage,
  coachName,
  nationality,
  languages,
  isVerified,
  playstyle,
  achievements = [],
  onViewSessions,
}) => {
  return (
    <View style={styles.cardWrapper}>
      <ImageBackground
        source={require('../assets/images/Bronze placeholder.png')}
        resizeMode="cover"
        style={styles.background}
      >
        <View style={styles.topSection}>
          <Image
            source={{ uri: coachImage }}
            style={styles.avatar}
          />
          <Text style={styles.coachName}>{coachName}</Text>
          <Text style={styles.subtitle}>FC Academy Manager</Text>
          <Image
            source={require(`../assets/images/bk7.png`)}
            style={styles.flag}
          />
        </View>
      </ImageBackground>

      <View style={styles.infoSection}>
        <View style={styles.row}>
          <Text style={styles.label}>Languages:</Text>
          {languages.map((lang) => (
            <Text key={lang} style={styles.language}>
              {lang.toUpperCase()}
            </Text>
          ))}
        </View>

        <View style={styles.row}>
          {isVerified && (
            <View style={styles.verifiedBox}>
              <BadgeCheck size={16} color="gold" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          <View style={styles.playstyleBox}>
            <Text style={styles.playstyleText}>{playstyle}</Text>
          </View>
        </View>

        {achievements.length > 0 && (
          <View style={styles.achievementsSection}>
            <Text style={styles.label}>Glory Wall</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {achievements.map((ach, idx) => (
                <View key={idx} style={styles.achievementBox}>
                  <Trophy size={16} color="#FFD700" />
                  <Text style={styles.achievementText}>{ach}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Pressable
          onPress={onViewSessions}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>View Sessions</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#1c1c1c',
  },
  background: {
    height: 220,
    justifyContent: 'flex-end',
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: 'white',
  },
  coachName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    color: 'white',
    fontStyle: 'italic',
    fontSize: 12,
  },
  flag: {
    width: 24,
    height: 16,
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 3,
  },
  infoSection: {
    backgroundColor: '#000000cc',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  label: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 6,
  },
  language: {
    color: 'white',
    marginRight: 10,
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  verifiedText: {
    color: 'white',
    marginLeft: 4,
  },
  playstyleBox: {
    backgroundColor: '#444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  playstyleText: {
    color: 'white',
    fontSize: 12,
  },
  achievementsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  achievementBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#33333388',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 10,
  },
  achievementText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 12,
  },
  button: {
    backgroundColor: '#4e8cff',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});

export default CoachCard;
