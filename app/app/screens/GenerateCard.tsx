import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import nationOptions from '../../assets/data/flags';
import countryList from '../../assets/data/flags';
import leagueOptions from '../../assets/data/leagues';
import playstyleOptions from '../../assets/data/playstyles';
import { SvgUri } from 'react-native-svg';
import IconBg from '../../assets/playstyles_svg/emptybg_filled'; // <- this is your hex background
import { Ionicons } from '@expo/vector-icons';
import chemstyleOptions from '../../assets/data/chemstyles';
import { Linking } from 'react-native';
import { getFirestore, collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';

import { app } from '../../firebaseConfig'; // make sure this is your correct firebase init
import { getAuth } from 'firebase/auth';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Modal from 'react-native-modal';
import { useTranslation } from 'react-i18next'; // Import useTranslation

console.log("GenerateCard: Component file loaded.");

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.8;
const CARD_HEIGHT = CARD_WIDTH * 1.25;
console.log(`GenerateCard: Screen dimensions - Width: ${SCREEN_WIDTH}, Height: ${SCREEN_HEIGHT}`);
console.log(`GenerateCard: Card dimensions - Width: ${CARD_WIDTH}, Height: ${CARD_HEIGHT}`);

// page background image – replace with your actual asset
const PAGE_BG = require('../../assets/images/generateCard.png');

// your card template options


// selector data

const clubOptions = [
  { label: 'Real Madrid', value: 'real_madrid' },
  { label: 'Man City', value: 'man_city' },
  { label: 'Barcelona', value: 'barcelona' },
];

const GenerateCard: React.FC = () => {
  console.log("GenerateCard: Component mounted.");
  const { t } = useTranslation(); // Initialize useTranslation
  const db = getFirestore(app);
  console.log("GenerateCard: Firestore initialized.");

  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  console.log(`GenerateCard: Current user UID: ${currentUser?.uid || 'Not logged in'}`);
  const [xp, setXp] = useState(0);
  console.log(`GenerateCard: Initial XP state: ${xp}`);

  const xpThresholds = [
    0, 1000, 3000, 6000, 10000, 14000, 18000,
    20000, 22500, 25500, 29000, 33000
  ];

  const rankNames = [
    "Academy Prospect", "Youth Talent", "Rising Star", "Starting XI", "Key Player",
    "Fan Favorite", "Team Captain", "Club Icon", "League Legend", "World Class",
    "Hall of Famer", "GOAT"
  ];


  const userRankIndex = useMemo(() => {
    console.log(`GenerateCard: Calculating user rank index for XP: ${xp}`);
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
      if (xp >= xpThresholds[i]) return i;
    }
    console.log("GenerateCard: User rank index calculated: 0");
    return 0;
  }, [xp]);
  console.log(`GenerateCard: User rank index memoized: ${userRankIndex}`);

  // Fetch user XP
  useEffect(() => {
    console.log("GenerateCard: useEffect triggered for fetching user XP.");
    const fetchUserXp = async () => {
      if (!currentUser) {
        console.log("GenerateCard: No current user, skipping XP fetch.");
        return;
      }

      try {
        console.log(`GenerateCard: Fetching user XP for UID: ${currentUser.uid}`);
        const userRef = doc(db, 'users', currentUser.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setXp(data.XP || 0); // <-- use capital XP
          console.log('GenerateCard: ✅ XP fetched:', data.XP);
        } else {
          console.warn('GenerateCard: ⚠️ User document does not exist for XP fetch.');
        }
      } catch (err) {
        console.error('GenerateCard: ❌ Failed to fetch user XP:', err);
      }
    };

    fetchUserXp();
  }, []);

  const [templateOptions, setTemplateOptions] = useState<any[]>([]);
  console.log(`GenerateCard: Initial templateOptions state: ${templateOptions.length} templates.`);

  useEffect(() => {
    console.log("GenerateCard: useEffect triggered for fetching templates.");
    const fetchTemplates = async () => {
      try {
        console.log('GenerateCard: ⏳ Fetching templates from Firestore...');
        const querySnapshot = await getDocs(collection(db, 'templates'));

        const templates = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || doc.id,
            backgroundUrl: data.imageUrl || '',
            textColor: data.textColor || '#ffffff',
            accentColor: data.accentColor || '#00c3ff',
            rankRequired: data.rankRequired ?? 0,
          };
        });

        console.log('GenerateCard: ✅ Templates:', templates);

        if (templates.length > 0) {
          setTemplateOptions(templates);
          console.log(`GenerateCard: Templates loaded, setting selected template to first available.`);
        }

        if (templates.length > 0) {
          setTemplateOptions(templates);

          const firstUnlocked = templates.find(
            (tpl) => tpl.rankRequired !== undefined && tpl.rankRequired <= userRankIndex
          );

          if (firstUnlocked) {
            setSelectedTemplate(firstUnlocked);
            console.log(`GenerateCard: First unlocked template set: ${firstUnlocked.name}`);
          } else {
            console.warn('GenerateCard: ⚠️ No unlocked templates found for current rank.');
          }
        }

        else {
          console.warn('GenerateCard: ⚠️ No templates found in Firestore.');
        }
      } catch (err) {
        console.error('GenerateCard: ❌ Failed to fetch templates:', err);
      }
    };

    fetchTemplates();
  }, []);

  const [cardRules, setCardRules] = useState<any>(null);
  console.log(`GenerateCard: Initial cardRules state: ${cardRules ? 'loaded' : 'null'}`);

  useEffect(() => {
    console.log("GenerateCard: useEffect triggered for fetching card rules.");
    const fetchCardRules = async () => {
      try {
        console.log("GenerateCard: Attempting to fetch card rules from Firestore.");
        const docRef = doc(db, 'config', 'cardRules');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log('GenerateCard: ✅ cardRules:', data);
          setCardRules(data);
        } else {
          console.warn('GenerateCard: ⚠️ cardRules doc does not exist.');
        }
      } catch (err) {
        console.error('GenerateCard: ❌ Failed to fetch cardRules:', err);
      }
    };

    fetchCardRules();
  }, []);

  useEffect(() => {
    console.log("GenerateCard: useEffect triggered for skill points and OVR calculation.");
    if (!cardRules) {
      console.log("GenerateCard: Card rules not loaded, skipping skill point calculation.");
      return;
    }

    const baseSkill = cardRules.startingSkillPoints ?? 400;
    const perRankSkill = cardRules.skillPerRank ?? 30;
    const totalSkillPoints = baseSkill + perRankSkill * userRankIndex;
    console.log(`GenerateCard: Skill Point Calculation - Base: ${baseSkill}, Per Rank: ${perRankSkill}, Total: ${totalSkillPoints}`);

    // 💡 Cumulative OVR increase logic
    const baseOvr = cardRules.ovrStart ?? 80;
    const increase = Object.entries(cardRules.ovrIncreasePerRank ?? {})
      .filter(([key]) => Number(key) > 0 && Number(key) <= userRankIndex)
      .reduce((sum, [_, val]) => sum + val, 0);

    const finalOvr = baseOvr + increase;
    const cappedOvr = Math.min(finalOvr, cardRules.ovrMax ?? 99);
    console.log(`GenerateCard: OVR Calculation - Base: ${baseOvr}, Increase: ${increase}, Final: ${finalOvr}, Capped: ${cappedOvr}`);


    // 💡 Evenly split skill points across 6 stats (then capped)
    const perStat = Math.floor(totalSkillPoints / 6);
    const cappedStat = Math.min(perStat, 99); // cap per stat at 99
    console.log(`GenerateCard: Per Stat Calculation - Per Stat: ${perStat}, Capped: ${cappedStat}`);

    // Set values
    setPace(cappedStat.toString());
    setShooting(cappedStat.toString());
    setPassing(cappedStat.toString());
    setDribbling(cappedStat.toString());
    setDefending(cappedStat.toString());
    setPhysical(cappedStat.toString());
    console.log("GenerateCard: Player stats updated.");

    // Only overwrite OVR if not manually changed
    if (!rating || parseInt(rating) > cappedOvr) {
      setRating(cappedOvr.toString());
      console.log(`GenerateCard: OVR updated to capped value: ${cappedOvr}`);
    }

    console.log(`GenerateCard: 📊 OVR Breakdown ➡️ Base: ${baseOvr}, +Increase: ${increase}, =Final: ${finalOvr}, ⚽ Capped: ${cappedOvr}`);
    console.log(`GenerateCard: 📈 Stats: ${cappedStat} x 6`);
  }, [cardRules, userRankIndex]);


  // --- States ---
  const [searchText, setSearchText] = useState('');
  console.log(`GenerateCard: Initial searchText state: '${searchText}'`);

  const [playerName, setPlayerName] = useState(t('generateCard.playerNameDefault'));
  console.log(`GenerateCard: Initial playerName state: '${playerName}'`);
  const [position, setPosition] = useState('ST');
  console.log(`GenerateCard: Initial position state: '${position}'`);
  const [rating, setRating] = useState(''); // will be set dynamically
  console.log(`GenerateCard: Initial rating state: '${rating}'`);
  const [pace, setPace] = useState('');
  console.log(`GenerateCard: Initial pace state: '${pace}'`);
  const [shooting, setShooting] = useState('');
  console.log(`GenerateCard: Initial shooting state: '${shooting}'`);
  const [passing, setPassing] = useState('');
  console.log(`GenerateCard: Initial passing state: '${passing}'`);
  const [dribbling, setDribbling] = useState('');
  console.log(`GenerateCard: Initial dribbling state: '${dribbling}'`);
  const [defending, setDefending] = useState('');
  console.log(`GenerateCard: Initial defending state: '${defending}'`);
  const [physical, setPhysical] = useState('');
  console.log(`GenerateCard: Initial physical state: '${physical}'`);
  const [saving, setSaving] = useState(false);
  console.log(`GenerateCard: Initial saving state: ${saving}`);
  const [hideFloatingUI, setHideFloatingUI] = useState(false);
  console.log(`GenerateCard: Initial hideFloatingUI state: ${hideFloatingUI}`);

  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  console.log(`GenerateCard: Initial selectedTemplate state: ${selectedTemplate ? selectedTemplate.name : 'null'}`);

  const [playerImage, setPlayerImage] = useState<string | null>(null);
  console.log(`GenerateCard: Initial playerImage state: ${playerImage ? 'set' : 'null'}`);
  const [isEditingPhoto, setIsEditingPhoto] = useState(true);
  console.log(`GenerateCard: Initial isEditingPhoto state: ${isEditingPhoto}`);
  const [nation, setNation] = useState('');
  console.log(`GenerateCard: Initial nation state: '${nation}'`);
  const [showClubLogo, setShowClubLogo] = useState(true);
  console.log(`GenerateCard: Initial showClubLogo state: ${showClubLogo}`);
  const [chemstyle, setChemstyle] = useState('');
  console.log(`GenerateCard: Initial chemstyle state: '${chemstyle}'`);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  console.log(`GenerateCard: Initial confirmModalVisible state: ${confirmModalVisible}`);
  const [cardRef, setCardRef] = useState<any>(null);

  const [club, setClub] = useState('None');
  console.log(`GenerateCard: Initial club state: '${club}'`);
  const [league, setLeague] = useState('None');
  console.log(`GenerateCard: Initial league state: '${league}'`);
  const [playstyles, setPlaystyles] = useState<string[]>([]);
  console.log(`GenerateCard: Initial playstyles state: ${playstyles.join(', ')}`);
  const [editingField, setEditingField] = useState<string | null>(null);
  console.log(`GenerateCard: Initial editingField state: ${editingField || 'null'}`);
  const [modalType, setModalType] = useState<
    'nation' | 'club' | 'league' | 'playstyle' | 'chemstyle' | null
  >(null);
  console.log(`GenerateCard: Initial modalType state: ${modalType || 'null'}`);


  const selectedNationEmoji = useMemo(() => {
    console.log(`GenerateCard: Calculating selectedNationEmoji for nation: ${nation}`);
    const match = countryList.find((n) => n.value === nation);
    if (!match) {
      console.log("GenerateCard: No matching nation found for emoji.");
      return '';
    }

    // Match full emoji flag using regional indicator Unicode pattern
    const flagMatch = match.label.match(/[\uD83C][\uDDE6-\uDDE6][\uD83C][\uDDE6-\uDDFF]/g);
    const emoji = flagMatch ? flagMatch[0] : '';

    console.log('GenerateCard: 📍 Selected:', nation);
    console.log('GenerateCard: 🏷️ Match label:', match.label);
    console.log('GenerateCard: 🚩 Extracted emoji:', emoji);

    return emoji;
  }, [nation]);
  const selectedLeagueImage = useMemo(() => {
    console.log(`GenerateCard: Calculating selectedLeagueImage for league: ${league}`);
    const found = leagueOptions.find((l) => l.value === league);
    console.log(`GenerateCard: League image found: ${found?.image ? 'Yes' : 'No'}`);
    return found?.image || null;
  }, [league]);

  const selectedPlaystyleWhiteIcons = useMemo(() => {
    console.log(`GenerateCard: Calculating selectedPlaystyleWhiteIcons for playstyles: ${playstyles.join(', ')}`);
    return playstyles.map((val) => {
      const icon = playstyleOptions.find((ps) => ps.value === val)?.whiteIcon;
      return icon || null;
    }).filter(Boolean);
  }, [playstyles]);

  console.log('GenerateCard: 🎨 Current playstyles:', playstyles);
  useEffect(() => {
    console.log(
      'GenerateCard: 🔄 PLAYSTYLE ICON TYPES:',
      selectedPlaystyleWhiteIcons.map(Icon => typeof Icon)
    );
  }, [selectedPlaystyleWhiteIcons]);

  const totalUsed = [
    Number(pace),
    Number(shooting),
    Number(passing),
    Number(dribbling),
    Number(defending),
    Number(physical),
  ].reduce((a, b) => a + b, 0);

  const maxPlaystylesAllowed = cardRules?.maxPlaystylesByRank?.[userRankIndex] ?? 3;
  console.log(`GenerateCard: Max playstyles allowed: ${maxPlaystylesAllowed}`);
  const totalSkillPoints = useMemo(() => {
    const base = cardRules?.startingSkillPoints ?? 400;
    const perRank = cardRules?.skillPerRank ?? 30;
    const total = base + userRankIndex * perRank;
    console.log(`GenerateCard: Memoized total skill points: ${total}`);
    return total;
  }, [cardRules, userRankIndex]);

  const maxOvr = useMemo(() => {
    if (!cardRules) return 99;

    const baseOvr = cardRules.ovrStart ?? 80;
    const ovrIncreases = cardRules.ovrIncreasePerRank ?? {};

    const totalIncrease = Object.entries(ovrIncreases)
      .filter(([key]) => Number(key) > 0 && Number(key) <= userRankIndex)
      .reduce((sum, [_, val]) => sum + val, 0);

    const calculatedMaxOvr = Math.min(baseOvr + totalIncrease, cardRules.ovrMax ?? 99);
    console.log(`GenerateCard: Memoized max OVR: ${calculatedMaxOvr}`);
    return calculatedMaxOvr;
  }, [cardRules, userRankIndex]);


  const togglePlaystyle = (val: string) => {
    console.log(`GenerateCard: Toggling playstyle: ${val}`);
    setPlaystyles((prev) => {
      const newPlaystyles = prev.includes(val)
        ? prev.filter((x) => x !== val)
        : prev.length < maxPlaystylesAllowed
          ? [...prev, val]
          : prev;
      console.log(`GenerateCard: Playstyles updated to: ${newPlaystyles.join(', ')}`);
      return newPlaystyles;
    });
  };


  const handleSelect = (val: string) => {
    console.log(`GenerateCard: handleSelect called with value: ${val}`);

    if (!modalType) {
      console.warn("GenerateCard: No modalType set for handleSelect.");
      return;
    }

    const selected = modalData.find((item) => item.label === val || item.value === val);
    console.log('GenerateCard: 🔍 Found item:', selected);

    if (!selected) {
      console.warn("GenerateCard: No item found for selection.");
      return;
    }

    if (modalType === 'nation') {
      setNation(selected.value);
      console.log(`GenerateCard: Nation set to: ${selected.value}`);
    }
    if (modalType === 'club') {
      setClub(selected.value);
      console.log(`GenerateCard: Club set to: ${selected.value}`);
    }
    if (modalType === 'league') {
      setLeague(selected.value);
      console.log(`GenerateCard: League set to: ${selected.value}`);
    }
    if (modalType === 'playstyle') {
      togglePlaystyle(selected.value);
      console.log(`GenerateCard: Playstyle toggled: ${selected.value}`);
    }
    if (modalType === 'chemstyle') {
      setChemstyle(selected.value);
      console.log(`GenerateCard: Chemstyle set to: ${selected.value}`);
    }

    if (modalType !== 'playstyle') {
      setModalType(null);
      console.log("GenerateCard: Modal type reset to null.");
    }
    console.log('GenerateCard: 🎨 handleSelect called with:', val);
    console.log('GenerateCard: 💡 Current modalType:', modalType);

  };
  const totalUsedSkillPoints = [
    Number(pace),
    Number(shooting),
    Number(passing),
    Number(dribbling),
    Number(defending),
    Number(physical),
  ].reduce((a, b) => a + b, 0);

  const handleFinalSave = async () => {
    console.log("GenerateCard: handleFinalSave initiated.");
    try {
      setSaving(true);
      setHideFloatingUI(true); //  скрываем кнопку замка
      console.log("GenerateCard: Saving state set to true, UI hidden.");

      await new Promise((res) => setTimeout(res, 350)); // wait to ensure UI updates

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });
      console.log(`GenerateCard: Card screenshot captured: ${uri}`);

      const filename = `player_cards/${currentUser.uid}_${Date.now()}.png`;
      const storage = getStorage(app);
      const storageRef = ref(storage, filename);

      const response = await fetch(uri);
      const blob = await response.blob();
      console.log("GenerateCard: Image blob created from URI.");

      await uploadBytes(storageRef, blob, {
        contentType: 'image/png',
      });
      console.log("GenerateCard: Image uploaded to Firebase Storage.");

      const downloadURL = await getDownloadURL(storageRef);
      console.log(`GenerateCard: Image download URL: ${downloadURL}`);
      const userRef = doc(db, 'users', currentUser.uid);

      await updateDoc(userRef, {
        playerCard: downloadURL,
        isCardConfirmed: true,
        lastClaimedRank: rankNames[userRankIndex],
      });
      console.log("GenerateCard: User document updated in Firestore with new card data.");

      await MediaLibrary.createAssetAsync(uri);
      console.log("GenerateCard: Image saved to device media library.");

      Alert.alert(t('generateCard.cardSavedSuccess'));
      console.log("GenerateCard: Success alert shown.");
    } catch (err) {
      console.error('GenerateCard: ❌ Save failed:', err);
      Alert.alert(t('generateCard.cardSaveFailed'));
      console.log("GenerateCard: Failure alert shown.");
    } finally {
      setSaving(false);
      setHideFloatingUI(false); // 💡 show lock button again
      console.log("GenerateCard: Saving state set to false, UI shown.");
    }
  };

  const canSave =
    playerName.trim() !== '' &&
    rating.trim() !== '' &&
    position.trim() !== '' &&
    totalUsedSkillPoints <= totalSkillPoints;
  console.log(`GenerateCard: Can save status: ${canSave}`);

  // 🚨 Early check to prevent crash
  if (!selectedTemplate) {
    console.log("GenerateCard: No selected template, rendering loading state.");
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ImageBackground source={PAGE_BG} style={styles.backgroundImage}>
          <SafeAreaView style={styles.container}>
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 50 }}>
              {t('generateCard.loadingTemplate')}
            </Text>
          </SafeAreaView>
        </ImageBackground>
      </GestureHandlerRootView>
    );
  }


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ImageBackground source={PAGE_BG} style={styles.backgroundImage}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!modalType}
          >

            <SafeAreaView style={{ flex: 1, width: '100%' }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 16,
                  marginBottom: 4,
                }}
              >
                {t('generateCard.chooseTemplate')}
              </Text>
              <Text
                style={{
                  color: '#bbb',
                  fontSize: 13,
                  marginLeft: 16,
                  marginBottom: 8,
                }}
              >
                {t('generateCard.unlockMoreStyles')}
              </Text>

              {/* Template picker */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.templateList}
              >
                {templateOptions
                  .sort((a, b) => a.rankRequired - b.rankRequired)
                  .map((tpl, i) => {
                    const isLocked = tpl.rankRequired > userRankIndex;
                    console.log(`GenerateCard: Template ${tpl.name} (Rank: ${tpl.rankRequired}) isLocked: ${isLocked}`);

                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => {
                          if (!isLocked) {
                            setSelectedTemplate(tpl);
                            console.log(`GenerateCard: Template selected: ${tpl.name}`);
                          } else {
                            Alert.alert("Locked Template", `You need to be rank ${tpl.rankRequired} to use this template.`);
                            console.log(`GenerateCard: Attempted to select locked template: ${tpl.name}`);
                          }
                        }}
                        style={{
                          opacity: isLocked ? 0.45 : 1,
                          marginRight: 6,
                          position: 'relative',
                        }}
                      >
                        <Image
                          source={{ uri: tpl.backgroundUrl }}
                          style={[
                            styles.templateThumb,
                            {
                              borderColor:
                                selectedTemplate?.id === tpl.id ? '#00c3ff' : '#333',
                              borderWidth: 2,
                            },
                          ]}
                        />
                        {isLocked && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.55)',
                              borderRadius: 8,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Ionicons name="lock-closed" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 10, marginTop: 2 }}>
                              {t('generateCard.tier')} {tpl.rankRequired}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>

              {/* Card preview */}


              <View style={[styles.cardWrapper, { backgroundColor: 'transparent' }]}>


                {selectedTemplate && (
                  <Animated.Image

                    source={{ uri: selectedTemplate.backgroundUrl }}

                    style={[styles.cardBackground, fadeStyle]}
                    resizeMode="cover"
                  />
                )}
                {/* 💡 Lock button fixed outside image */}
                {!hideFloatingUI && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      zIndex: 50,
                      alignItems: 'center',
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditingPhoto((prev) => !prev);
                        console.log(`GenerateCard: Toggle photo editing. isEditingPhoto now: ${!isEditingPhoto}`);
                      }}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: '#1e90ff22',
                        shadowColor: '#00c3ff',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.9,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                    >
                      <Ionicons
                        name={isEditingPhoto ? 'lock-open' : 'lock-closed'}
                        size={22}
                        color="#00c3ff"
                      />
                    </TouchableOpacity>

                    <View
                      style={{
                        marginTop: 6,
                        backgroundColor: '#1e90ff',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>
                        {t('generateCard.image')}{isEditingPhoto ? t('generateCard.free') : t('generateCard.locked')}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedNationEmoji !== '' && (
                  <Text
                    style={{
                      position: 'absolute',
                      bottom: CARD_HEIGHT * 0.10, // adjusts vertical placement
                      left: CARD_WIDTH * 0.35,    // center-ish alignment
                      fontSize: 26,
                      zIndex: 10,
                      backgroundColor: 'transparent',
                    }}
                  >
                    {selectedNationEmoji}
                  </Text>
                )}

                {selectedLeagueImage && (
                  <Image
                    source={selectedLeagueImage}
                    style={{
                      position: 'absolute',
                      bottom: CARD_HEIGHT * 0.105,
                      left: CARD_WIDTH * 0.49,
                      width: 26,
                      height: 26,
                      resizeMode: 'contain',
                      zIndex: 10,
                    }}
                  />
                )}

                {showClubLogo && (
                  <Image
                    source={require('../../assets/images/logo.png')}
                    style={{
                      position: 'absolute',
                      bottom: CARD_HEIGHT * 0.100,
                      left: CARD_WIDTH * 0.61,
                      width: 27,
                      height: 27,
                      resizeMode: 'contain',
                      zIndex: 10,
                    }}
                  />
                )}

                {/* Playstyle icons on the card (max 5) */}

                <View style={styles.playstylesContainer}>
                  {selectedPlaystyleWhiteIcons.map((SvgIcon, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.playstyleIconWrapper,
                        {
                          width: 48,
                          height: 48,
                          position: 'relative',
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                      ]}
                    >
                      {/* Background hexagon using SVG with dynamic accent color */}
                      <IconBg
                        width={36}
                        height={36}
                        fill="currentColor"
                        color={selectedTemplate.accentColor}
                        style={{
                          position: 'absolute',
                          top: 7,      // center it manually if needed
                          left: 7,
                        }}
                      />

                      {/* Foreground icon rendered in textColor */}
                      <SvgIcon
                        width={48}
                        height={48}
                        fill={selectedTemplate.textColor}
                      />
                    </View>
                  ))}
                </View>

                {chemstyle && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 240, // <-- use fixed offset instead of CARD_HEIGHT *
                      left: CARD_WIDTH * 0.14,
                      width: 42,
                      height: 42,
                      zIndex: 10,
                    }}
                  >
                    {React.createElement(
                      chemstyleOptions.find((c) => c.value === chemstyle)?.whiteIcon || View,
                      {
                        width: 42,
                        height: 42,
                        fill: selectedTemplate.textColor,
                      }
                    )}
                  </View>
                )}




                <View style={styles.topLeft}>
                  <Text
                    style={[
                      styles.ratingText,
                      { color: selectedTemplate.textColor },
                    ]}
                  >
                    {rating}
                  </Text>
                  <Text
                    style={[
                      styles.positionText,
                      { color: selectedTemplate.textColor },
                    ]}
                  >
                    {position}
                  </Text>
                </View>

                {/* Draggable / pinchable photo */}
                <GestureDetector
                  gesture={
                    isEditingPhoto
                      ? Gesture.Simultaneous(panGesture, pinchGesture)
                      : Gesture.Pan().onUpdate(() => { })
                  }
                >
                  <Animated.View
                    style={[styles.photoContainer, imageStyle]}
                  >
                    <TouchableOpacity
                      onPress={pickImage}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={
                          playerImage
                            ? { uri: playerImage }
                            : require('../../assets/images/avatar.png')
                        }
                        style={styles.playerPhoto}
                      />
                    </TouchableOpacity>


                  </Animated.View>
                </GestureDetector>

                {/* Static stat labels */}
                <View style={styles.statLabelsContainer}>
                  {stats.map((s) => (
                    <Text key={s.key} style={[styles.statLabel, { color: selectedTemplate.textColor }]}>
                      {s.key.toUpperCase().slice(0, 3)}
                    </Text>

                  ))}
                </View>

                {/* Editable stat values */}
                <View style={styles.statsContainer}>
                  {stats.map((s) => (
                    <View key={s.key} style={styles.statBox}>
                      <Text style={[styles.statText, { color: selectedTemplate.textColor }]}>
                        {s.value}
                      </Text>

                    </View>
                  ))}
                </View>

                {/* Name */}
                {/* Name with background blur */}
                <View style={styles.nameContainer}>

                  {editingField === 'playerName' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 1 }}>
                      <TextInput
                        style={[styles.nameInput, { color: selectedTemplate.textColor }]}
                        value={playerName}
                        onChangeText={(text) => {
                          setPlayerName(text);
                          console.log(`GenerateCard: Player name input changed to: ${text}`);
                        }}
                        autoFocus
                      />
                      <TouchableOpacity onPress={() => {
                        setEditingField(null);
                        console.log("GenerateCard: Player name editing finished.");
                      }}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#4CAF50"
                          style={{ marginLeft: 6 }}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => {
                      setEditingField('playerName');
                      console.log("GenerateCard: Player name editing started.");
                    }} style={{ zIndex: 1 }}>
                      <Text style={[styles.nameText, { color: selectedTemplate.textColor }]}>
                        {playerName}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

              </View>
              <TouchableOpacity
                onPress={() => {
                  Linking.openURL('https://www.remove.bg');
                  console.log("GenerateCard: Opened remove.bg link.");
                }}
                style={{
                  marginTop: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: '#1e90ff33',
                  borderRadius: 8,
                  shadowColor: '#00c3ff',
                  shadowOpacity: 0.6,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 1 },
                  elevation: 0,
                }}
              >
                <Ionicons name="cut" size={16} color="#00c3ff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#00c3ff', fontSize: 13, fontWeight: '600' }}>
                  {t('generateCard.removeBackgroundAI')}
                </Text>
              </TouchableOpacity>

              {/* Selectors */}
              {/* Selectors - Nation, League, Club always top row */}
              <View
                style={{ width: '90%', marginTop: 24, marginBottom: 8 }}
              >

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                  }}
                >
                  {[
                    { label: t('generateCard.nation'), value: nation },
                    { label: t('generateCard.league'), value: league },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={{
                        backgroundColor: '#0a1720',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        margin: 4,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: '#00c3ff88',
                        shadowColor: '#00c3ff',
                        shadowOpacity: 0.3,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 4,
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexGrow: 1,
                        justifyContent: 'center',
                      }}
                      onPress={() => {
                        setModalType(item.label.toLowerCase() as any);
                        console.log(`GenerateCard: Opened modal for type: ${item.label.toLowerCase()}`);
                      }}
                    >
                      {item.label === t('generateCard.nation') ? (
                        <>
                          <Text style={{ color: '#fff', fontWeight: '600', marginRight: 8 }}>
                            {selectedNationEmoji || '🌍'}
                          </Text>
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('generateCard.nation')}</Text>
                        </>
                      ) : (
                        <>
                          {selectedLeagueImage ? (
                            <Image
                              source={selectedLeagueImage}
                              style={{
                                width: 20,
                                height: 20,
                                resizeMode: 'contain',
                                marginRight: 8,
                              }}
                            />
                          ) : (
                            <Text style={{ color: '#fff', marginRight: 8 }}>🏅</Text>
                          )}
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('generateCard.league')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Club Logo toggle button */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowClubLogo(!showClubLogo);
                      console.log(`GenerateCard: Club logo visibility toggled to: ${!showClubLogo}`);
                    }}
                    style={{
                      backgroundColor: showClubLogo ? '#1b4d2f' : '#333',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      margin: 4,
                      borderRadius: 10,
                      flexGrow: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1.5,
                      borderColor: '#00ff88',
                      shadowColor: '#00ff88',
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 4,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                      {showClubLogo ? t('generateCard.hideClubLogo') : t('generateCard.showClubLogo')}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
              <View style={{ width: '90%', marginBottom: 6, alignSelf: 'center' }}>
                <Text
                  style={{
                    color: '#bbb',
                    fontSize: 14,
                    textAlign: 'center',
                  }}
                >
                  {t('generateCard.playstylesSelected')}:{" "}
                  <Text style={{
                    color: playstyles.length > maxPlaystylesAllowed ? '#ff5555' : '#00ff88',
                    fontWeight: 'bold'
                  }}>
                    {playstyles.length}
                  </Text>
                  /{maxPlaystylesAllowed}
                </Text>
              </View>

              {/* Playstyle selector always on its own row */}
              <View style={{ width: '90%', marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setModalType('playstyle');
                    console.log("GenerateCard: Opened modal for playstyle selection.");
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    backgroundColor: '#0a1720',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#00c3ff88',
                    shadowColor: '#00c3ff',
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 8 }}>{t('generateCard.playstyles')}:</Text>
                  {playstyles.length === 0 ? (
                    <Text style={{ color: '#999' }}>{t('generateCard.none')}</Text>
                  ) : (
                    playstyles.map((val) => {
                      const icon = playstyleOptions.find((ps) => ps.value === val)?.image;
                      return (
                        <Image
                          key={val}
                          source={icon}
                          style={{ width: 20, height: 20, marginRight: 4 }}
                          resizeMode="contain"
                        />
                      );
                    })
                  )}
                </TouchableOpacity>
              </View>

              {/* Chem Style selector (new block) */}
              <View style={{ width: '90%', marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setModalType('chemstyle');
                    console.log("GenerateCard: Opened modal for chemstyle selection.");
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#0a1720',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: '#00ffb488',
                    shadowColor: '#00ffb4',
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('generateCard.chemStyle')}:</Text>
                  {chemstyle ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {(() => {
                        const ChemIcon = chemstyleOptions.find((c) => c.value === chemstyle)?.whiteIcon;
                        return ChemIcon ? (
                          <ChemIcon
                            width={20}
                            height={20}
                            fill="#fff"
                            style={{ marginRight: 6 }}
                          />
                        ) : null;
                      })()}
                      <Text style={{ color: '#fff', fontWeight: '600' }}>
                        {chemstyle.charAt(0).toUpperCase() + chemstyle.slice(1)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ color: '#888', fontWeight: '600' }}>{t('generateCard.none')}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* 📊 OVR & POS Inputs */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  marginTop: 12,
                  marginBottom: 6,
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.statFormLabel}>{t('generateCard.ovr')}</Text>
                  <TextInput
                    style={styles.ratingPositionInput}
                    keyboardType="numeric"
                    value={rating}
                    onChangeText={(val) => {
                      const num = parseInt(val);
                      if (!isNaN(num) && num <= maxOvr) {
                        setRating(val);
                        console.log(`GenerateCard: OVR input changed to: ${val}`);
                      } else if (val === '') {
                        setRating(''); // Allow erasing
                      } else {
                        console.log(`GenerateCard: Invalid OVR input: ${val}`);
                      }
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: '#aaa',
                      fontStyle: 'italic',
                    }}
                  >
                    {t('generateCard.maxOVRInfo', { maxOvr: maxOvr })}
                  </Text>


                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statFormLabel}>{t('generateCard.pos')}</Text>
                  <TextInput
                    style={styles.ratingPositionInput}
                    value={position}
                    onChangeText={(t) => {
                      setPosition(t.toUpperCase().slice(0, 3));
                      console.log(`GenerateCard: Position input changed to: ${t.toUpperCase().slice(0, 3)}`);
                    }}
                  />

                </View>
              </View>


              <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 4,
                    color: '#00c3ff', // bright teal blue
                    textShadowColor: '#003B5B',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                >
                  {t('generateCard.distributeSkillPoints')}
                </Text>

                {totalUsedSkillPoints > totalSkillPoints ? (
                  <Text style={{ color: '#ff6961', fontSize: 13, fontWeight: 'bold' }}>
                    {t('generateCard.overusedPoints', { totalUsedSkillPoints: totalUsedSkillPoints, totalSkillPoints: totalSkillPoints })}
                  </Text>
                ) : (
                  <Text style={{ color: '#bbb', fontSize: 15 }}>
                    {t('generateCard.used')}:{' '}
                    <Text
                      style={{
                        fontWeight: 'bold',
                        color: totalUsedSkillPoints === totalSkillPoints ? '#00ff88' : '#fff',
                      }}
                    >
                      {totalUsedSkillPoints}
                    </Text>
                    /
                    <Text style={{ fontWeight: 'bold', color: '#fff' }}>
                      {totalSkillPoints}
                    </Text>{' '}
                    {t('generateCard.points')} 📊 {t('generateCard.maxOVR')}:{' '}
                    <Text style={{ color: '#00c3ff', fontWeight: '600' }}>{maxOvr}</Text>
                  </Text>
                )}

              </View>



              {/* 💡 Redesigned 3x2 Stats Grid */}
              <View style={styles.statsGridWrapper}>
                <View style={styles.statsGridContainer}>
                  {[0, 3].map((startIndex) => (
                    <View key={startIndex} style={styles.statsRow}>
                      {[stats[startIndex], stats[startIndex + 1], stats[startIndex + 2]].map((s) => (
                        <View key={s.key} style={styles.statCard}>
                          <Text style={styles.statLabelUI}>{s.key.toUpperCase().slice(0, 3)}</Text>
                          <TextInput
                            value={s.value}
                            onChangeText={(val) => {
                              if (val === '') {
                                s.setter(''); // 💡 allow erasing
                                console.log(`GenerateCard: Stat ${s.key} cleared.`);
                                return;
                              }

                              const num = parseInt(val);
                              if (!isNaN(num)) {
                                s.setter(Math.min(num, 99).toString());
                                console.log(`GenerateCard: Stat ${s.key} changed to: ${Math.min(num, 99)}`);
                              } else {
                                console.log(`GenerateCard: Invalid input for stat ${s.key}: ${val}`);
                              }
                            }}

                            keyboardType="numeric"
                            style={styles.statValueInput}
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>


              {/* Save */}
              <TouchableOpacity
                onPress={handleFinalSave}
                disabled={saving || !canSave}
                style={[
                  styles.saveButton,
                  (!canSave || saving) && styles.saveDisabled,
                ]}
              >
                <Text style={styles.saveText}>
                  {saving ? t('generateCard.saving') : t('generateCard.saveMyCard')}
                </Text>
              </TouchableOpacity>


            </SafeAreaView>
          </ScrollView>
        </TouchableWithoutFeedback>
        {modalType && (
          <View style={styles.overlayWrapper}>
            <TouchableOpacity
              style={styles.backdrop}
              onPress={() => {
                setModalType(null);
                console.log("GenerateCard: Modal closed via backdrop press.");
              }}
            />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '90%', maxHeight: '70%' }}>

              <View style={styles.overlayContainer}>

                {/* Title */}
                <Text style={styles.modalTitle}>
                  {modalType === 'playstyle'
                    ? t('generateCard.selectPlaystyles')
                    : t('generateCard.selectOption', { option: modalType.charAt(0).toUpperCase() + modalType.slice(1) })}
                </Text>

                {/* Stats summary - only for playstyle modal */}
                {/* Search input */}
                {modalType === 'nation' && (
                  <TextInput
                    style={{
                      backgroundColor: '#333',
                      color: 'white',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 12,
                      fontSize: 14,
                    }}
                    placeholder={t('generateCard.searchCountry')}
                    placeholderTextColor="#888"
                    value={searchText}
                    onChangeText={(text) => {
                      setSearchText(text);
                      console.log(`GenerateCard: Search text changed to: ${text}`);
                    }}
                  />
                )}

                {/* Scrollable options */}
                <ScrollView
                  style={{ flexGrow: 1 }}
                  contentContainerStyle={{ paddingBottom: 40, justifyContent: 'center' }}
                  keyboardShouldPersistTaps="always"
                  showsVerticalScrollIndicator={false}
                >


                  {modalData
                    .filter(({ name, label }) => {
                      const title = name || label;
                      return title.toLowerCase().includes(searchText.toLowerCase());
                    })
                    .map(({ name, label, code, value, image }) => {
                      console.log(`[Modal Option]`, { label, value });

                      const title = name || label;
                      const val = code || value || label;

                      const isSel =
                        modalType === 'playstyle'
                          ? playstyles.includes(value)

                          : (modalType === 'nation' && nation === title) ||
                          (modalType === 'club' && club === title) ||
                          (modalType === 'league' && league === title);

                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => {
                            handleSelect(val);
                            console.log(`GenerateCard: Modal option selected: ${val}`);
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            marginVertical: 4,
                            paddingHorizontal: 12,
                            backgroundColor: isSel ? '#1e90ff22' : '#0e1a25',
                            borderWidth: isSel ? 2 : 1,
                            borderColor: isSel ? '#00c3ff' : '#333',
                            borderRadius: 2,
                            shadowColor: isSel ? '#00c3ff' : 'transparent',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: isSel ? 0.8 : 0,
                            shadowRadius: 6,
                            elevation: isSel ? 1 : 0,
                          }}
                        >

                          {/* Show PNG image if available (e.g., for League) */}
                          {image && modalType !== 'chemstyle' && (
                            <Image
                              source={image}
                              style={{
                                width: 26,
                                height: 26,
                                marginRight: 12,
                                resizeMode: 'contain',
                              }}
                            />
                          )}


                          {/* Show Chem Style SVG icon */}
                          {modalType === 'chemstyle' && (() => {
                            const ChemIcon = chemstyleOptions.find((c) => c.value === value)?.whiteIcon;
                            return ChemIcon ? (
                              <ChemIcon
                                width={22}
                                height={22}
                                fill="#fff"
                                style={{ marginRight: 12 }}
                              />
                            ) : null;
                          })()}

                          <Text style={[styles.modalItemText, { flex: 1 }]}>{title}</Text>
                          {modalType === 'playstyle' && isSel && (
                            <Text style={{ color: '#1e90ff', fontWeight: 'bold' }}>✅</Text>
                          )}
                        </TouchableOpacity>

                      );
                    })}
                </ScrollView>

                {/* Done button for playstyles only */}
                {modalType === 'playstyle' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>

                    {/* Clear All Button */}
                    <TouchableOpacity
                      style={[
                        styles.modalDone,
                        { backgroundColor: '#444', flex: 1, marginRight: 8 },
                      ]}
                      onPress={() => {
                        setPlaystyles([]);
                        console.log("GenerateCard: All playstyles cleared.");
                      }}
                    >
                      <Text style={styles.modalDoneText}>{t('generateCard.clearAll')}</Text>
                    </TouchableOpacity>

                    {/* Done Button */}
                    <TouchableOpacity
                      style={[
                        styles.modalDone,
                        { flex: 1 },
                      ]}
                      onPress={() => {
                        setModalType(null);
                        console.log("GenerateCard: Playstyle modal 'Done' button pressed.");
                      }}
                    >
                      <Text style={styles.modalDoneText}>{t('generateCard.done')}</Text>
                    </TouchableOpacity>

                  </View>
                )}

              </View>

            </View>
          </View>
        )}
      </ImageBackground>

      {/* 💡 CLEAN SNAPSHOT ZONE */}
      <ViewShot
        ref={setCardRef}
        options={{ format: 'png', quality: 1 }}
        style={{
          width: 320,
          height: 410,
          position: 'absolute',
          top: -1000,
          left: -1000,
          opacity: 0,
          zIndex: -1,
          backgroundColor: 'fff',

        }}
      >
        <View style={[styles.cardWrapper, { backgroundColor: 'transparent' }]}>

          {/* 💡 Card background */}
          <Image
            source={{ uri: selectedTemplate?.backgroundUrl }}
            style={styles.cardBackground}
            resizeMode="cover"
          />

          {/* 💡 Player photo */}
          <Animated.View style={[styles.photoContainer, imageStyle]}>
            <Image
              source={
                playerImage
                  ? { uri: playerImage }
                  : require('../../assets/images/avatar.png')
              }
              style={styles.playerPhoto}
            />
          </Animated.View>

          {/* 💡 Name */}
          <View style={styles.nameContainer}>
            <Text style={[styles.nameText, { color: selectedTemplate?.textColor }]}>
              {playerName}
            </Text>
          </View>

          {/* 💡 OVR + POS */}
          <View style={styles.topLeft}>
            <Text style={[styles.ratingText, { color: selectedTemplate?.textColor }]}>
              {rating}
            </Text>
            <Text style={[styles.positionText, { color: selectedTemplate?.textColor }]}>
              {position}
            </Text>
          </View>

          {/* 💡 Stats */}
          <View style={styles.statLabelsContainer}>
            {stats.map((s) => (
              <Text key={s.key} style={[styles.statLabel, { color: selectedTemplate?.textColor }]}>
                {s.key.toUpperCase().slice(0, 3)}
              </Text>
            ))}
          </View>
          <View style={styles.statsContainer}>
            {stats.map((s) => (
              <View key={s.key} style={styles.statBox}>
                <Text style={[styles.statText, { color: selectedTemplate?.textColor }]}>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>

          {/* 💡 Nation flag emoji */}
          {selectedNationEmoji !== '' && (
            <Text
              style={{
                position: 'absolute',
                bottom: CARD_HEIGHT * 0.10,
                left: CARD_WIDTH * 0.35,
                fontSize: 28,
                zIndex: 10,
              }}
            >
              {selectedNationEmoji}
            </Text>
          )}

          {/* 💡 League logo */}
          {selectedLeagueImage && (
            <Image
              source={selectedLeagueImage}
              style={{
                position: 'absolute',
                bottom: CARD_HEIGHT * 0.10,
                left: CARD_WIDTH * 0.48,
                width: 28,
                height: 28,
                resizeMode: 'contain',
                zIndex: 10,
              }}
            />
          )}

          {/* 💡 Club logo */}
          {showClubLogo && (
            <Image
              source={require('../../assets/images/logo.png')}
              style={{
                position: 'absolute',
                bottom: CARD_HEIGHT * 0.10,
                left: CARD_WIDTH * 0.60,
                width: 28,
                height: 28,
                resizeMode: 'contain',
                zIndex: 10,
              }}
            />
          )}

          {/* 💡 Playstyles */}
          <View style={styles.playstylesContainer}>
            {selectedPlaystyleWhiteIcons.map((SvgIcon, idx) => (
              <View
                key={idx}
                style={styles.playstyleIconWrapper}
              >
                <IconBg
                  width={35}
                  height={35}
                  color={selectedTemplate?.accentColor}
                  style={{ position: 'absolute', top: 3, left: 3 }}
                />
                <SvgIcon width={46} height={46} fill={selectedTemplate?.textColor} />
              </View>
            ))}
          </View>

          {/* 💡 Chemstyle */}
          {chemstyle && (
            <View
              style={{
                position: 'absolute',
                bottom: 240,
                left: CARD_WIDTH * 0.14,
                width: 42,
                height: 42,
                zIndex: 10,
              }}
            >
              {React.createElement(
                chemstyleOptions.find((c) => c.value === chemstyle)?.whiteIcon || View,
                {
                  width: 42,
                  height: 42,
                  fill: selectedTemplate?.textColor,
                }
              )}
            </View>
          )}
        </View>


      </ViewShot>
    </ImageBackground>

  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    width: '100%',
  },

  scrollContent: {
    flexGrow: 1, // important to allow scrolling even when content is smaller than screen!
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 100,
  },

  // Playstyle icons

  playstylesContainer: {
    position: 'absolute',
    top: CARD_HEIGHT * 0.22, // 📍 more consistent placement
    left: CARD_WIDTH * 0.0,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },

  playstyleIconWrapper: {
    marginVertical: -5,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },

  iconBackgroundCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 0,
  },

  //...

  templateList: {
    height: 80,
    marginBottom: 20,
  },
  templateThumb: {
    width: 60,
    height: 75,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },

  cardWrapper: {
    width: 320,
    height: 420,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  cardBackground: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    position: 'absolute',
    backgroundColor: 'transparent', // force transparency here
  },


  topLeft: {
    position: 'absolute',
    top: 55,      // consistent across devices
    left: 40,
    alignItems: 'center',  // center-align RW and Chem style under OVR
  },


  ratingText: {
    fontSize: 44,
    fontWeight: '900',
    lineHeight: 48,
    textAlign: 'center',
  },
  positionText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,       // small overlap to tighten spacing
    letterSpacing: 1,
    textAlign: 'center',
  },




  photoContainer: {
    position: 'absolute',
    top: CARD_HEIGHT * 0.0,
    left: CARD_WIDTH * 0.25,
    width: CARD_WIDTH * 0.8,
    height: CARD_WIDTH * 0.8,
    overflow: 'hidden',
  },
  playerPhoto: {
    width: '100%',
    height: '100%',
    aspectRatio: 3 / 4, // or better: dynamically set based on original image
    resizeMode: 'contain', // 💡 maintains original look
  },
  editToggleButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#1e90ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 20,
  },
  editToggleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  statLabelsContainer: {
    position: 'absolute',
    bottom: CARD_HEIGHT * 0.25, // move up slightly (instead of fixed 90px)
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center', // tighter, center aligned
  },

  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 9, // << adds a little side space only
  },


  statsContainer: {
    position: 'absolute',
    bottom: CARD_HEIGHT * 0.18, // little closer to bottom
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center', // center align instead of space-around
    flexWrap: 'wrap',
  },


  statBox: {
    alignItems: 'center',
    marginHorizontal: 11, // space between each stat number
  },

  statText: {

    fontSize: 22,
    fontWeight: '700',
  },

  nameContainer: {
    position: 'absolute',
    bottom: CARD_HEIGHT * 0.32, // about 5% from bottom
    width: '100%',
    alignItems: 'center',
  },

  nameText: { color: '#fff', fontSize: 26, fontWeight: '800' },

  inlineInput: {
    backgroundColor: '#000a',
    color: '#fff',
    fontSize: 20,
    padding: 4,
    minWidth: 60,
    textAlign: 'center',
  },
  inlineInputSmall: {
    backgroundColor: '#000a',
    color: '#fff',
    fontSize: 14,
    padding: 2,
    minWidth: 40,
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: '#000a',
    color: '#fff',
    fontSize: 20,
    padding: 4,
    width: CARD_WIDTH * 0.6,
    textAlign: 'center',
  },

  selectors: {
    width: '90%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectorButton: {
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 6,
    margin: 4,
  },
  selectorText: { color: '#fff' },

  statsForm: {
    width: '90%',
    marginBottom: 20,
  },
  statFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statFormLabel: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
    color: '#fff',
  },

  statFormInput: {
    backgroundColor: '#000a',
    color: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },

  saveButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 14,
    paddingHorizontal: 60,
    borderRadius: 8,
    marginBottom: 20,
  },
  saveDisabled: { backgroundColor: '#555' },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // overlay modal
  overlayWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayContainer: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 16,
    backgroundColor: '#0a1720',
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#00c3ff55',
    shadowColor: '#00c3ff',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
    alignSelf: 'center', // 💡 Important for enforcing width
  },

  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },

  modalStatsSummary: {
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  modalStatLabel: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 40,
  },
  modalStatValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    width: 40,
  },

  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  modalItemSelected: { backgroundColor: '#1e90ff22' },
  modalItemText: { color: '#fff', fontSize: 16 },

  modalDone: {
    marginTop: 12,
    backgroundColor: '#1e90ff',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalDoneText: { color: '#fff', fontWeight: '700' },
  ratingPositionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#FFD700', // gold or accent border
    borderWidth: 1.5,
    borderRadius: 10,
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsGridWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },

  statsGridContainer: {
    width: 290, // fixed width helps consistent center alignment
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  statCard: {
    width: 88,
    paddingVertical: 10,
    borderRadius: 1,
    borderWidth: 1.4,
    borderColor: '#00c3ff99',
    backgroundColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#00c3ff',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 1,
    alignItems: 'center',
  },

  statLabelUI: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 2,
  },

  statValueInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 4,
  },
  overlayContainerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  }
});

export default GenerateCard;