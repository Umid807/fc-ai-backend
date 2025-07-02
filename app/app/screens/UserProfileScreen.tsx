```
// REWRITTEN FILE: app/app/screens/UserProfileScreen.tsx
// TOTAL_LOGS_INSERTED: 80
// COMPONENT_NAME: UserProfileScreen

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next'; // Import useTranslation
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Button,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { signOut, updateProfile } from "firebase/auth";
import auth from "../firebaseAuth";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system";
import CardScanEffect from "../../components/CardScanEffect";
import MaskedView from '@react-native-masked-view/masked-view';
import { InteractionManager } from "react-native";
import {   useLayoutEffect } from "react";

// Helper to get a random integer between min and max (inclusive).
const getRandomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

const UserProfileScreen = () => {
  console.log("UserProfileScreen: Component mounted successfully");
  const router = useRouter();
  const db = getFirestore();
  const storage = getStorage();
  const { t } = useTranslation(); // Initialize useTranslation hook
  console.log("UserProfileScreen: Translation hook initialized.");

  const [cardScale, setCardScale] = useState(1);
  const handleCardLayout = (e) => {
    console.log("UserProfileScreen: Card layout event triggered.");
    const { width } = e.nativeEvent.layout;
    const scale = width / TEMPLATE_WIDTH;
    setCardScale(scale);
    console.log(`UserProfileScreen: Card scale updated to: ${scale}`);
  };

  // ------------------------------------
  // User / Profile states
  // ------------------------------------
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  console.log(`UserProfileScreen: Current user state initialized. UID: ${auth.currentUser?.uid}`);
  const [username, setUsername] = useState(t('userProfile.defaultUsername')); // i18n change
  console.log(`UserProfileScreen: Username state initialized to: ${username}`);
  const [profileImage, setProfileImage] = useState(null);
  console.log(`UserProfileScreen: Profile image state initialized to: ${profileImage}`);
  const [userID, setUserID] = useState("");
  console.log(`UserProfileScreen: User ID state initialized to: ${userID}`);
  const [balance, setBalance] = useState(0);
  console.log(`UserProfileScreen: Balance state initialized to: ${balance}`);
  const [rank, setRank] = useState(t('userProfile.rankUnranked')); // i18n change
  console.log(`UserProfileScreen: Rank state initialized to: ${rank}`);
  const [favoriteFormation, setFavoriteFormation] = useState(t('userProfile.favoriteFormationUnknown')); // i18n change
  console.log(`UserProfileScreen: Favorite formation state initialized to: ${favoriteFormation}`);

  const [previousUsernames, setPreviousUsernames] = useState([]);
  console.log(`UserProfileScreen: Previous usernames state initialized.`);
  const [isVIP, setIsVIP] = useState(false);
  console.log(`UserProfileScreen: IsVIP state initialized to: ${isVIP}`);
  const [lastClaimedRank, setLastClaimedRank] = useState(null);
  console.log(`UserProfileScreen: Last claimed rank state initialized to: ${lastClaimedRank}`);
  const [maskImageLoaded, setMaskImageLoaded] = useState(false);
  console.log(`UserProfileScreen: Mask image loaded state initialized to: ${maskImageLoaded}`);
  const [animateCard, setAnimateCard] = useState(false);
  console.log(`UserProfileScreen: Animate card state initialized to: ${animateCard}`);
  const [cardImageReady, setCardImageReady] = useState(false);
  console.log(`UserProfileScreen: Card image ready state initialized to: ${cardImageReady}`);
  const [maskedViewKey, setMaskedViewKey] = useState("initial");
  console.log(`UserProfileScreen: Masked view key initialized to: ${maskedViewKey}`);
  const [lastSeenCardURL, setLastSeenCardURL] = useState(null);
  console.log(`UserProfileScreen: Last seen card URL initialized to: ${lastSeenCardURL}`);


  // Additional user fields:
  const [country, setCountry] = useState(t('userProfile.countryUnknown')); // i18n change
  console.log(`UserProfileScreen: Country state initialized to: ${country}`);
  const [preferredFoot, setPreferredFoot] = useState(t('userProfile.preferredFootUnknown')); // i18n change
  console.log(`UserProfileScreen: Preferred foot state initialized to: ${preferredFoot}`);
  const [jerseyNumber, setJerseyNumber] = useState("");
  console.log(`UserProfileScreen: Jersey number state initialized to: ${jerseyNumber}`);
  const [position, setPosition] = useState(t('userProfile.positionUnknown')); // i18n change
  console.log(`UserProfileScreen: Position state initialized to: ${position}`);
  const TEMPLATE_WIDTH = 985;
  const TEMPLATE_HEIGHT = 985;

  const COORDS = {
    displayName: { x: 580.75, y: 615.13, width: 500 },
    ovrRating: { x: 280.55, y: 190.58, width: 200 },
    position: { x: 300.75, y: 290.29, width: 200 },
    jerseyNumber: { x: 180, y: 380.6, width: 100 },
    preferredFoot: { x: 200.5, y: 560.41, width: 100 },
    countryFlag: { x: 290, y: 450, width: 300 },
    profileImage: { x: 420, y: 225, width: 380, height: 380 },
    stat1: { x: 210, y: 836.59, width: 100 },
    stat2: { x: 340, y: 836.59, width: 100 },
    stat3: { x: 470, y: 836.59, width: 100 },
    stat4: { x: 600, y: 836.59, width: 100 },
    stat5: { x: 720, y: 835.59, width: 100 },
  };

  // ------------------------------------
  // XP-related states
  // ------------------------------------
  const [xp, setXp] = useState(0);
  console.log(`UserProfileScreen: XP state initialized to: ${xp}`);
  const [nextLevelXp, setNextLevelXp] = useState(1000);
  console.log(`UserProfileScreen: Next level XP state initialized to: ${nextLevelXp}`);
  const xpThresholds = [
    0,
    1000,
    3000,
    6000,
    10000,
    14000,
    18000,
    20000,
    22500,
    25500,
    29000,
    33000,
  ];

  useEffect(() => {
    console.log("UserProfileScreen: XP update effect triggered.");
    const nextThreshold =
      xpThresholds.find((t) => t > xp) ||
      xpThresholds[xpThresholds.length - 1];
    setNextLevelXp(nextThreshold);
    console.log(`UserProfileScreen: Next level XP set to: ${nextThreshold}`);
  }, [xp]);

  // ------------------------------------
  // Rank logic
  // ------------------------------------
  const rankNames = [
    t('userProfile.rankAcademyProspect'), // i18n change
    t('userProfile.rankYouthTalent'), // i18n change
    t('userProfile.rankRisingStar'), // i18n change
    t('userProfile.rankStartingXI'), // i18n change
    t('userProfile.rankKeyPlayer'), // i18n change
    t('userProfile.rankFanFavorite'), // i18n change
    t('userProfile.rankTeamCaptain'), // i18n change
    t('userProfile.rankClubIcon'), // i18n change
    t('userProfile.rankLeagueLegend'), // i18n change
    t('userProfile.rankWorldClass'), // i18n change
    t('userProfile.rankHallOfFame'), // i18n change
    t('userProfile.rankGOAT'), // i18n change
  ];

  useEffect(() => {
    console.log("UserProfileScreen: Rank calculation effect triggered.");
    let computedRank = rankNames[0];
    for (let i = 0; i < xpThresholds.length; i++) {
      if (xp >= xpThresholds[i]) {
        computedRank = rankNames[i];
      }
    }

    // Only trigger rank update if Firestore and local are out of sync
    const updateRankIfNeeded = async () => {
      console.log("UserProfileScreen: Checking if rank update is needed.");
      const userRef = doc(db, "users", userID);
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const stored = snap.data()?.rank;
          console.log(`UserProfileScreen: Stored rank: ${stored}, Computed rank: ${computedRank}`);
          if (stored !== computedRank) {
            console.log("UserProfileScreen: 🔄 Updating Firestore rank to:", computedRank);
            await updateDoc(userRef, { rank: computedRank });
            console.log("UserProfileScreen: Firestore rank updated successfully.");
          }
        } else {
          console.log("UserProfileScreen: User document does not exist when checking rank. Skipping update.");
        }
      } catch (e) {
        console.error("UserProfileScreen: ❌ Rank sync error:", e);
      }
    };

    setRank(computedRank); // State Change
    console.log(`UserProfileScreen: Local rank set to: ${computedRank}`);
    updateRankIfNeeded();
  }, [xp, userID, rankNames, db]); // Added rankNames to dependencies

  // ------------------------------------
  // Player Card data from Firestore
  // ------------------------------------
  const [playerCardData, setPlayerCardData] = useState({
    cardURL: null,
    displayName: "",
    jerseyNumber: "",
    position: "",
    preferredFoot: "",
    country: "",
    ovr: 60,
    stat1: 60,
    stat2: 60,
    stat3: 60,
    stat4: 60,
    stat5: 60,
    profilePhoto: null,
  });
  console.log("UserProfileScreen: Player card data state initialized.");

  const [showClaimNewCardButton, setShowClaimNewCardButton] = useState(false);
  console.log(`UserProfileScreen: Show claim new card button state initialized to: ${showClaimNewCardButton}`);
  const [isCardConfirmed, setIsCardConfirmed] = useState(false);
  console.log(`UserProfileScreen: Is card confirmed state initialized to: ${isCardConfirmed}`);
  const [isUpgradeInfoVisible, setIsUpgradeInfoVisible] = useState(false);
  console.log(`UserProfileScreen: Is upgrade info modal visible state initialized to: ${isUpgradeInfoVisible}`);

  // ------------------------------------
  // For the "Claim Card" modal logic
  // ------------------------------------
  const [isClaimModalVisible, setIsClaimModalVisible] = useState(false);
  console.log(`UserProfileScreen: Is claim modal visible state initialized to: ${isClaimModalVisible}`);
  // We'll store the new OVR/stats and the new rank template in these states
  const [pendingCardData, setPendingCardData] = useState(null);
  console.log(`UserProfileScreen: Pending card data state initialized to: ${pendingCardData}`);
  const [templateBackground, setTemplateBackground] = useState(null);
  console.log(`UserProfileScreen: Template background state initialized to: ${templateBackground}`);

  // If we want a loading spinner in the modal, we can track it
  const [isProcessing, setIsProcessing] = useState(false);
  console.log(`UserProfileScreen: Is processing state initialized to: ${isProcessing}`);

  // ------------------------------------
  // Firestore watchers
  // ------------------------------------
  useEffect(() => {
    console.log("UserProfileScreen: User data Firestore watcher effect triggered.");
    if (currentUser) {
      setUserID(currentUser.uid);
      console.log(`UserProfileScreen: User ID set to: ${currentUser.uid}`);
      if (currentUser.displayName) {
        setUsername(currentUser.displayName);
        console.log(`UserProfileScreen: Username set from current user: ${currentUser.displayName}`);
      }

      // Listen to user doc
      const userDocRef = doc(db, "users", currentUser.uid);
      const unsubscribeUser = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          console.log("UserProfileScreen: User document snapshot received.");
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            console.log("UserProfileScreen: User data retrieved:", data);
            if (data.username) {
              setUsername(data.username);
              console.log(`UserProfileScreen: Username updated to: ${data.username}`);
            }
            if (data.profileImage) {
              setProfileImage(data.profileImage);
              console.log(`UserProfileScreen: Profile image updated to: ${data.profileImage}`);
            }
            if (data.XP !== undefined) {
              setXp(data.XP);
              console.log(`UserProfileScreen: XP updated to: ${data.XP}`);
            }
            if (data.coins !== undefined) {
              setBalance(data.coins);
              console.log(`UserProfileScreen: Balance updated to: ${data.coins}`);
            }
            if (data.rank) {
              console.log("UserProfileScreen: 🔄 Firestore says rank is:", data.rank);
              setRank(data.rank); // State Change
            }
            if (data.playerCard) {
              setPlayerCardData((prev) => ({
                ...prev,
                cardURL: data.playerCard,
              }));
              console.log(`UserProfileScreen: Player card URL updated to: ${data.playerCard}`);

              // If it's the first time loading
              if (!lastSeenCardURL) {
                setLastSeenCardURL(data.playerCard);
                console.log(`UserProfileScreen: Initial last seen card URL set to: ${data.playerCard}`);
              }

              // Detect a new card was generated (after a rank up)
              if (lastSeenCardURL && data.playerCard !== lastSeenCardURL) {
                console.log("UserProfileScreen: New player card detected! Triggering lastClaimedRank update.");
                setLastSeenCardURL(data.playerCard);

                // User claimed a new card, update lastClaimedRank
                const userDocRef = doc(db, "users", currentUser.uid);
                updateDoc(userDocRef, { lastClaimedRank: rank })
                  .then(() => console.log("UserProfileScreen: Updated lastClaimedRank to:", rank))
                  .catch((err) =>
                    console.error("UserProfileScreen: Error updating lastClaimedRank:", err)
                  );
              }
            }

            if (data.previousUsernames) {
              setPreviousUsernames(data.previousUsernames);
              console.log(`UserProfileScreen: Previous usernames updated to: ${data.previousUsernames.length} items`);
            }
            if (data.vip !== undefined) {
              setIsVIP(data.vip);
              console.log(`UserProfileScreen: Is VIP status updated to: ${data.vip}`);
            }
            if (data.isCardConfirmed !== undefined) {
              setIsCardConfirmed(data.isCardConfirmed);
              console.log(`UserProfileScreen: Card confirmed status updated to: ${data.isCardConfirmed}`);
            }

            // Additional fields
            if (data.country) {
              setCountry(data.country);
              console.log(`UserProfileScreen: Country updated to: ${data.country}`);
            }
            if (data.preferredFoot) {
              setPreferredFoot(data.preferredFoot);
              console.log(`UserProfileScreen: Preferred foot updated to: ${data.preferredFoot}`);
            }
            if (data.jerseyNumber) {
              setJerseyNumber(data.jerseyNumber);
              console.log(`UserProfileScreen: Jersey number updated to: ${data.jerseyNumber}`);
            }
            if (data.position) {
              setPosition(data.position);
              console.log(`UserProfileScreen: Position updated to: ${data.position}`);
            }

            // lastClaimedRank
            if (data.lastClaimedRank) {
              setLastClaimedRank(data.lastClaimedRank);
              console.log(`UserProfileScreen: Last claimed rank updated to: ${data.lastClaimedRank}`);
            }
          } else {
            console.log("UserProfileScreen: User document does not exist.");
          }
        },
        (error) => console.error("UserProfileScreen: Error fetching user data:", error)
      );

      return () => {
        console.log("UserProfileScreen: Unsubscribing from user data Firestore watcher.");
        unsubscribeUser();
      };
    } else {
      console.log("UserProfileScreen: No current user to set up Firestore listener.");
    }
  }, [currentUser, db, rank, lastSeenCardURL]); // Added rank and lastSeenCardURL to dependencies


  // If a cardURL is available and not confirmed yet, set isCardConfirmed
  useEffect(() => {
    console.log("UserProfileScreen: Player card image prefetch effect triggered.");
    const currentURL = playerCardData?.cardURL;

    if (!currentURL) {
      console.log("UserProfileScreen: 🚫 No card URL provided for prefetch.");
      return;
    }

    console.log("UserProfileScreen: 🖼️ Prefetch triggered for URL:", currentURL);

    setCardImageReady(false); // always reset first
    console.log("UserProfileScreen: Card image ready state reset to false.");

    Image.prefetch(currentURL)
      .then(() => {
        console.log("UserProfileScreen: ✅ Image preloaded successfully.");
        setCardImageReady(true);
        console.log("UserProfileScreen: Card image ready state set to true.");
        setMaskedViewKey(`masked_${Date.now()}`); // Force re-render of MaskedView
        console.log(`UserProfileScreen: MaskedView key updated to: ${maskedViewKey}`);
      })
      .catch((e) => {
        console.error("UserProfileScreen: ❌ Image prefetch failed:", e.message || e);
        // Optional fallback: still try to show the card even if prefetch fails
        setCardImageReady(true);
        console.log("UserProfileScreen: Card image ready state set to true (fallback).");
      });
  }, [playerCardData.cardURL]);

  // Show claim button if current rank > lastClaimedRank AND card is confirmed
  useEffect(() => {
    console.log("UserProfileScreen: Checking claim eligibility...");
    console.log("UserProfileScreen: 🎯 Current rank:", rank);
    console.log("UserProfileScreen: 🎯 Last claimed rank:", lastClaimedRank);
    console.log("UserProfileScreen: 🎯 Is card confirmed:", isCardConfirmed);

    if (isCardConfirmed && lastClaimedRank) {
      const currentIndex = rankNames.indexOf(rank);
      const lastClaimedIndex = rankNames.indexOf(lastClaimedRank);
      console.log(`UserProfileScreen: Rank index comparison: Current: ${currentIndex}, > Last Claimed: ${lastClaimedIndex}`);
      if (currentIndex > lastClaimedIndex) {
        setShowClaimNewCardButton(true);
        console.log("UserProfileScreen: Show claim new card button set to true.");
      } else {
        setShowClaimNewCardButton(false);
        console.log("UserProfileScreen: Show claim new card button set to false.");
      }
    } else {
      setShowClaimNewCardButton(false);
      console.log("UserProfileScreen: Show claim new card button set to false (conditions not met).");
    }
  }, [rank, lastClaimedRank, isCardConfirmed, rankNames]); // Added rankNames to dependencies


  // handleClaimNewCard: compute new data, store it, show modal
  const handleClaimNewCard = async () => {
    console.log("UserProfileScreen: Handle claim new card initiated.");
    try {
      console.log("UserProfileScreen: Fetching old player card data for upgrade calculation.");
      const playerCardRef = doc(db, "playerCards", userID);
      const oldCardSnap = await getDoc(playerCardRef);
      if (!oldCardSnap.exists()) {
        Alert.alert(t('userProfile.errorTitle'), t('userProfile.claimCardNoExistingCardError'));
        console.warn("UserProfileScreen: No existing player card found for user ID:", userID);
        return;
      }
      const oldData = oldCardSnap.data();
      console.log("UserProfileScreen: Old card data fetched successfully.", oldData);

      // OVR upgrade rules
      let oldOVR = parseInt(oldData.ovr || 60, 10);
      let newOVR = oldOVR;
      console.log(`UserProfileScreen: Calculating new OVR. Old OVR: ${oldOVR}`);
      if (newOVR < 90) {
        newOVR = Math.min(newOVR + 5, 90);
        console.log(`UserProfileScreen: OVR increased by 5 (to max 90). New OVR: ${newOVR}`);
      } else if (newOVR < 96) {
        newOVR = Math.min(newOVR + 2, 96);
        console.log(`UserProfileScreen: OVR increased by 2 (to max 96). New OVR: ${newOVR}`);
      } else if (newOVR < 99) {
        newOVR = Math.min(newOVR + 1, 99);
        console.log(`UserProfileScreen: OVR increased by 1 (to max 99). New OVR: ${newOVR}`);
      }
      console.log(`UserProfileScreen: Final new OVR: ${newOVR}`);

      // Five stats each +2-5 random
      const newStat1 = (oldData.stat1 || 60) + getRandomBetween(2, 5);
      const newStat2 = (oldData.stat2 || 60) + getRandomBetween(2, 5);
      const newStat3 = (oldData.stat3 || 60) + getRandomBetween(2, 5);
      const newStat4 = (oldData.stat4 || 60) + getRandomBetween(2, 5);
      const newStat5 = (oldData.stat5 || 60) + getRandomBetween(2, 5);
      console.log(`UserProfileScreen: New stats calculated: S1:${newStat1}, S2:${newStat2}, S3:${newStat3}, S4:${newStat4}, S5:${newStat5}`);

      // Get the rank-based template
      console.log(`UserProfileScreen: Fetching new template for rank: ${rank}`);
      const templateRef = ref(storage, `player card templates/${rank}.png`);
      const newTemplateURL = await getDownloadURL(templateRef);
      console.log("UserProfileScreen: New template URL fetched successfully:", newTemplateURL);

      // Save the new data so we can show it in the modal
      setPendingCardData({
        ...oldData, // keep old name, country, foot, etc.
        ovr: newOVR,
        stat1: newStat1,
        stat2: newStat2,
        stat3: newStat3,
        stat4: newStat4,
        stat5: newStat5,
      });
      console.log("UserProfileScreen: Pending card data set for modal display.");
      setTemplateBackground(newTemplateURL);
      console.log("UserProfileScreen: Template background set for modal display.");

      // Open the modal
      setIsClaimModalVisible(true);
      console.log("UserProfileScreen: Claim modal opened.");
    } catch (error) {
      console.error("UserProfileScreen: handleClaimNewCard error:", error);
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.claimCardErrorOccurred'));
    }
  };

  // ------------------------------------
  // In the modal, we do the actual capture & upload
  // ------------------------------------
  const modalViewShotRef = useRef(null);

  const handleConfirmClaim = async () => {
    console.log("UserProfileScreen: Handle confirm claim initiated.");
    if (!pendingCardData) {
      console.warn("UserProfileScreen: No pending card data to confirm.");
      return;
    }
    setIsProcessing(true);
    console.log("UserProfileScreen: Set isProcessing to true.");

    try {
      // Wait a moment for layout
      await new Promise((resolve) => setTimeout(resolve, 300));
      console.log("UserProfileScreen: Waited for layout before capturing.");

      // Capture the card in the modal
      const uri = await modalViewShotRef.current?.capture();
      console.log(`UserProfileScreen: Card captured. URI: ${uri}`);
      if (!uri) {
        throw new Error(t('userProfile.captureCardFailedError'));
      }

      // Upload to Firebase
      console.log("UserProfileScreen: Uploading captured card to Firebase Storage...");
      const uploadedURL = await uploadCardToFirebase(uri);
      console.log("UserProfileScreen: Card uploaded to Firebase Storage. URL:", uploadedURL);

      // make sure THIS URL is the one saved to Firestore
      const playerCardRef = doc(db, "playerCards", userID); // Define playerCardRef here
      await updateDoc(playerCardRef, { // Corrected this line
        ...pendingCardData,
        cardURL: uploadedURL,
        isCardConfirmed: true, // Mark card as confirmed after upload
      });
      console.log("UserProfileScreen: Player card data updated in Firestore with new URL and confirmed status.");

      // Update lastClaimedRank in user document
      const userDocRef = doc(db, "users", userID);
      await updateDoc(userDocRef, { lastClaimedRank: rank });
      console.log(`UserProfileScreen: lastClaimedRank updated in user document to: ${rank}`);

      Alert.alert(t('userProfile.successTitle'), t('userProfile.claimCardSuccessMessage'));
      console.log("UserProfileScreen: Claim success alert shown.");

      // Close the modal
      setIsClaimModalVisible(false);
      console.log("UserProfileScreen: Claim modal closed.");
      setPendingCardData(null);
      console.log("UserProfileScreen: Pending card data cleared.");
    } catch (error) {
      console.error("UserProfileScreen: Error in handleConfirmClaim:", error);
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.finalizeCardErrorOccurred'));
    } finally {
      setIsProcessing(false);
      console.log("UserProfileScreen: Set isProcessing to false (finally block).");
    }
  };

  // Helper for uploading
  const uploadCardToFirebase = async (cardURI) => {
    console.log("UserProfileScreen: Starting upload of card to Firebase.", cardURI);
    try {
      const response = await fetch(cardURI);
      const blob = await response.blob();
      const fileName = `playerCard_${userID}_${Date.now()}.png`;
      const storageRef = ref(storage, `player_cards/${fileName}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log("UserProfileScreen: ✅ Uploaded and got URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("UserProfileScreen: Error uploading card:", error);
      return null;
    }
  };

  // ------------------------------------
  // IMAGE HANDLERS
  // ------------------------------------
  const handleChangeProfilePic = async () => {
    console.log("UserProfileScreen: Change profile picture initiated.");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log(`UserProfileScreen: Media library permission status: ${status}`);
    if (status !== "granted") {
      Alert.alert(t('userProfile.permissionDeniedTitle'), t('userProfile.photoPermissionRequiredMessage'));
      console.warn("UserProfileScreen: Media library permission denied.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    console.log("UserProfileScreen: Image picker result:", result);
    if (!result.canceled) {
      const asset = result.assets[0];
      console.log("UserProfileScreen: Image selected, uploading profile image.");
      uploadProfileImage(asset.uri);
    } else {
      console.log("UserProfileScreen: Image picking cancelled.");
    }
  };

  const uploadProfileImage = async (uri) => {
    console.log("UserProfileScreen: Uploading profile image from URI:", uri);
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profile_pictures/${currentUser.uid}.png`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await Promise.all([
        updateDoc(userDocRef, { profileImage: downloadURL }),
        updateProfile(currentUser, { photoURL: downloadURL }),
      ]);
      setProfileImage(downloadURL);
      console.log("UserProfileScreen: Profile image updated successfully. URL:", downloadURL);
      Alert.alert(t('userProfile.successTitle'), t('userProfile.profilePicUpdatedMessage'));
    } catch (error) {
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.profilePicUpdateErrorMessage'));
      console.error("UserProfileScreen: Profile Pic Update Error:", error);
    }
  };

  // ------------------------------------
  const showCardUpgradeGlow = useMemo(() => {
    console.log("UserProfileScreen: showCardUpgradeGlow memo re-evaluated.");
    // if we've never recorded a claimed rank, no upgrade to show
    if (!lastClaimedRank) {
      console.log("UserProfileScreen: No last claimed rank, glow is false.");
      return false;
    }

    const currentIndex = rankNames.indexOf(rank);
    const lastClaimedIndex = rankNames.indexOf(lastClaimedRank);
    console.log(`UserProfileScreen: Glow logic - Current rank index: ${currentIndex}, Last claimed rank index: ${lastClaimedIndex}`);
    // glow as soon as current rank > last claimed rank
    return currentIndex > lastClaimedIndex;
  }, [rank, lastClaimedRank, rankNames]); // Added rankNames to dependencies

  // Username & Formation Editing
  // ------------------------------------
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  console.log(`UserProfileScreen: Is editing username state initialized to: ${isEditingUsername}`);
  const [tempUsername, setTempUsername] = useState(username);
  console.log(`UserProfileScreen: Temp username state initialized to: ${tempUsername}`);
  const [isEditingFormation, setIsEditingFormation] = useState(false);
  console.log(`UserProfileScreen: Is editing formation state initialized to: ${isEditingFormation}`);
  const [tempFormation, setTempFormation] = useState(favoriteFormation);
  console.log(`UserProfileScreen: Temp formation state initialized to: ${tempFormation}`);
  const [toastVisible, setToastVisible] = useState(false);
  console.log(`UserProfileScreen: Toast visible state initialized to: ${toastVisible}`);

  const handleEditUsername = () => {
    console.log("UserProfileScreen: Edit username initiated.");
    setTempUsername(username);
    console.log(`UserProfileScreen: Temp username set to current username: ${username}`);
    setIsEditingUsername(true);
    console.log("UserProfileScreen: Is editing username set to true.");
  };

  const handleSaveUsername = async () => {
    console.log("UserProfileScreen: Save username initiated.");
    const regex = /^[a-zA-Z0-9 ]+$/;
    if (!regex.test(tempUsername)) {
      Alert.alert(t('userProfile.invalidUsernameTitle'), t('userProfile.invalidUsernameMessage'));
      console.warn("UserProfileScreen: Invalid username format.");
      return;
    }

    if (tempUsername === username) {
      Alert.alert(t('userProfile.noChangeTitle'), t('userProfile.noChangeMessage'));
      console.log("UserProfileScreen: Username not changed.");
      return;
    }

    try {
      // Step 1: Check for duplicates in Firestore
      console.log("UserProfileScreen: Checking for duplicate username in Firestore.");
      const db = getFirestore();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", tempUsername));
      const snapshot = await getDocs(q);

      // If username already exists and isn't owned by this user
      if (!snapshot.empty && snapshot.docs[0].id !== currentUser.uid) {
        Alert.alert(t('userProfile.usernameTakenTitle'), t('userProfile.usernameTakenMessage'));
        console.warn("UserProfileScreen: Username already taken by another user.");
        return;
      }
      console.log("UserProfileScreen: Username available.");

      // Step 2: Update Firestore & Firebase Auth displayName
      console.log("UserProfileScreen: Updating username in Firestore and Firebase Auth.");
      const userDocRef = doc(db, "users", currentUser.uid);
      const updatedData: any = { username: tempUsername };

      if (tempUsername !== username) {
        const updatedPrevious = previousUsernames ? [...previousUsernames, username] : [username];
        updatedData.previousUsernames = updatedPrevious;
        console.log(`UserProfileScreen: Previous usernames updated to: ${updatedPrevious}`);
      }

      await Promise.all([
        updateDoc(userDocRef, updatedData),
        updateProfile(currentUser, { displayName: tempUsername }),
      ]);
      console.log("UserProfileScreen: Firestore and Firebase Auth updated successfully.");

      setUsername(tempUsername); // State Change
      setIsEditingUsername(false); // State Change
      console.log("UserProfileScreen: Is editing username set to false.");
      Alert.alert(t('userProfile.successTitle'), t('userProfile.usernameUpdatedMessage'));
      console.log("UserProfileScreen: Username update success alert shown.");
    } catch (error) {
      console.error("UserProfileScreen: handleSaveUsername error:", error);
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.usernameUpdateErrorMessage'));
    }
  };

  const handleEditFormation = () => {
    console.log("UserProfileScreen: Edit formation initiated.");
    setTempFormation(favoriteFormation);
    console.log(`UserProfileScreen: Temp formation set to current formation: ${favoriteFormation}`);
    setIsEditingFormation(true);
    console.log("UserProfileScreen: Is editing formation set to true.");
  };

  const handleSaveFormation = async () => {
    console.log("UserProfileScreen: Save formation initiated.");
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      console.log("UserProfileScreen: Updating favorite formation in Firestore.");
      await updateDoc(userDocRef, { favoriteFormation: tempFormation });
      setFavoriteFormation(tempFormation); // State Change
      setIsEditingFormation(false); // State Change
      console.log("UserProfileScreen: Is editing formation set to false.");
      Alert.alert(t('userProfile.successTitle'), t('userProfile.favoriteFormationUpdatedMessage'));
      console.log("UserProfileScreen: Favorite formation update success alert shown.");
    } catch (error: any) {
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.favoriteFormationUpdateErrorMessage', { errorMessage: error.message }));
      console.error("UserProfileScreen: Error saving formation:", error);
    }
  };

  // ------------------------------------
  // MISC. HANDLERS
  // ------------------------------------
  const handleLogout = async () => {
    console.log("UserProfileScreen: Logout initiated.");
    try {
      await signOut(auth);
      console.log("UserProfileScreen: User signed out successfully.");
      Alert.alert(t('userProfile.loggedOutTitle'), t('userProfile.loggedOutMessage'));
      router.replace("/screens/LoginScreen"); // Navigation Action
      console.log("UserProfileScreen: Navigated to LoginScreen.");
    } catch (error) {
      Alert.alert(
        t('userProfile.logoutFailedTitle'), // i18n change
        t('userProfile.logoutFailedMessage') // i18n change
      );
      console.error("UserProfileScreen: Logout failed:", error);
    }
  };

  const handleGeneratePlayerCard = () => {
    console.log("UserProfileScreen: Generate player card button pressed.");
    router.push("/screens/GenerateCard"); // Navigation Action
    console.log("UserProfileScreen: Navigated to GenerateCard screen.");
  };

  const handleDownloadPlayerCard = async () => {
    console.log("UserProfileScreen: Download player card initiated.");
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log(`UserProfileScreen: Media library permission status for download: ${status}`);
      if (status !== "granted") {
        Alert.alert(t('userProfile.permissionDeniedTitle'), t('userProfile.mediaLibraryPermissionRequiredMessage'));
        console.warn("UserProfileScreen: Media library permission denied for download.");
        return;
      }

      if (!playerCardData.cardURL) {
        Alert.alert(t('userProfile.noImageTitle'), t('userProfile.noPlayerCardToDownloadMessage'));
        console.warn("UserProfileScreen: No player card URL available for download.");
        return;
      }

      // Step 1: Download file locally
      console.log(`UserProfileScreen: Downloading card from URL: ${playerCardData.cardURL}`);
      const fileUri = FileSystem.documentDirectory + `player_card_${Date.now()}.png`;
      const downloadResult = await FileSystem.downloadAsync(playerCardData.cardURL, fileUri);
      console.log("UserProfileScreen: Card downloaded locally to:", downloadResult.uri);

      // Step 2: Save to media library
      console.log("UserProfileScreen: Saving card to media library.");
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      await MediaLibrary.createAlbumAsync(t('userProfile.downloadAlbumName'), asset, false); // i18n change
      console.log("UserProfileScreen: Card saved to media library successfully.");

      setToastVisible(true);
      console.log("UserProfileScreen: Toast visibility set to true.");
      setTimeout(() => setToastVisible(false), 2000); // UI Operation
      console.log("UserProfileScreen: Toast will disappear in 2 seconds.");

    } catch (error) {
      console.error("UserProfileScreen: Download Error:", error);
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.downloadPlayerCardErrorMessage'));
    }
  };

  // ------------------------------------
  // XP Bar Animation
  // ------------------------------------
  const xpBarWidth = useRef(new Animated.Value(xp)).current;
  useEffect(() => {
    console.log("UserProfileScreen: XP bar animation effect triggered.");
    const xpProgress = Math.min((xp / nextLevelXp) * 100, 100);
    console.log(`UserProfileScreen: XP progress calculated: ${xpProgress}% (XP: ${xp}, Next Level XP: ${nextLevelXp})`);
    Animated.timing(xpBarWidth, {
      toValue: xpProgress,
      duration: 500,
      useNativeDriver: false,
    }).start(() => console.log("UserProfileScreen: XP bar animation completed."));
  }, [xp, nextLevelXp]);

  // ------------------------------------
  // Card Glow / Shine Animation
  // ------------------------------------
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log("UserProfileScreen: Card pulse animation effect triggered.");
    if (showCardUpgradeGlow) {
      console.log("UserProfileScreen: Starting card pulse animation.");
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start(() => console.log("UserProfileScreen: Card pulse animation loop started."));
    } else {
      pulseAnim.setValue(1);
      console.log("UserProfileScreen: Card pulse animation stopped, value reset.");
    }
  }, [showCardUpgradeGlow, pulseAnim]);

  // Card Glow / Shine Animation
  // ------------------------------------
  const cardGlowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    console.log("UserProfileScreen: Card glow animation effect triggered.");
    console.log("UserProfileScreen: Starting card glow animation loop.");
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardGlowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(cardGlowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start(() => console.log("UserProfileScreen: Card glow animation loop started."));
  }, [cardGlowAnim]); // Added cardGlowAnim to dependencies
  const animatedGlowStyle = {
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: cardGlowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [5, 15],
    }),
  };

  // ------------------------------------
  // Additional states for modals
  // ------------------------------------
  const [isImageOptionsModalVisible, setIsImageOptionsModalVisible] =
    useState(false);
  console.log(`UserProfileScreen: Is image options modal visible state initialized to: ${isImageOptionsModalVisible}`);
  const [selectedImage, setSelectedImage] = useState(null);
  console.log(`UserProfileScreen: Selected image state initialized to: ${selectedImage}`);
  const [isPlayerCardModalVisible, setIsPlayerCardModalVisible] =
    useState(false);
  console.log(`UserProfileScreen: Is player card modal visible state initialized to: ${isPlayerCardModalVisible}`);

  const handleRemoveProfilePic = async () => {
    console.log("UserProfileScreen: Remove profile picture initiated.");
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      console.log("UserProfileScreen: Removing profile image from Firestore and Firebase Auth.");
      await Promise.all([
        updateDoc(userDocRef, { profileImage: null }),
        updateProfile(currentUser, { photoURL: null }),
      ]);
      setProfileImage(null);
      console.log("UserProfileScreen: Profile image removed successfully.");
      Alert.alert(t('userProfile.successTitle'), t('userProfile.profileImageRemovedMessage'));
    } catch (error) {
      Alert.alert(t('userProfile.errorTitle'), t('userProfile.profileImageRemoveErrorMessage', { errorMessage: error.message }));
      console.error("UserProfileScreen: Profile Image Remove Error:", error);
    }
    setIsImageOptionsModalVisible(false);
    console.log("UserProfileScreen: Image options modal closed after remove.");
  };

  // The displayed card in the main screen
  const displayedCardSource =
    (isCardConfirmed && playerCardData.cardURL)
      ? { uri: playerCardData.cardURL }
      : require("../../assets/images/Bronze placeholder.png");
  console.log(`UserProfileScreen: Displayed card source determined: ${displayedCardSource.uri ? 'URI' : 'Placeholder'}`);

  // Dimensions for the main stage card
  const CARD_WIDTH = 320;
  const CARD_HEIGHT = 420;
  // Array Images for the card tiers
  const cardTiers = [
    {
      label: t('userProfile.cardTierBronze'), // i18n change
      image: require("../../assets/images/card templates/Icon.png"),
    },
    {
      label: t('userProfile.cardTierSilver'), // i18n change
      image: require("../../assets/images/card templates/Icon.png"),
    },
    {
      label: t('userProfile.cardTierGold'), // i18n change
      image: require("../../assets/images/card templates/Icon.png"),
    },
    {
      label: t('userProfile.cardTierICON'), // i18n change
      image: require("../../assets/images/card templates/Icon.png"),
    },
    {
      label: t('userProfile.cardTierMysteryTier'), // i18n change
      image: require("../../assets/images/card templates/Icon.png"),
    },
  ];

  console.log("UserProfileScreen: Render: cardImageReady =", cardImageReady);
  console.log("UserProfileScreen: Render: cardURL =", playerCardData?.cardURL);

  return (
    <ImageBackground
      source={require("../../assets/images/Article bk.png")}
      style={styles.backgroundImage}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          {/* HEADER CONTAINER */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={[styles.rankText, styles.neonText]}>{rank}</Text>
            </View>
            <View style={styles.headerCenter}>
              <TouchableOpacity onPress={() => {
                console.log("UserProfileScreen: Avatar tapped, opening image options modal.");
                handleChangeProfilePic();
              }} style={styles.avatarTapWrapper}>
                <Image
                  source={profileImage ? { uri: profileImage } : require("../../assets/images/avatar.png")}
                  style={styles.profileAvatar}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleEditUsername}
                style={styles.usernameTapWrapper}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.username,
                    styles.neonText,
                    isVIP && styles.usernameVIP,
                  ]}
                >
                  {username}
                </Text>
                <Text style={styles.editHintText}>{t('userProfile.tapToEditLabel')}</Text>
              </TouchableOpacity>


            </View>
            <View style={styles.headerRight}>
              <Text style={[styles.coinsText, styles.neonText]}>
                {t('userProfile.myCoinsLabel', { balance: balance.toLocaleString() })}
              </Text>
            </View>
          </View>


          {/* DIGITAL STAGE + CURRENT CARD (FIXED) */}
          <View style={styles.playerCardWrapper}>
            <AnimatedImageBackground
              source={require("../../assets/images/bk3.png")}
              style={[styles.playerCardContainer, animatedGlowStyle]}
              imageStyle={{ borderRadius: 20, resizeMode: "contain" }}
            >
              <TouchableOpacity onPress={() => {
                console.log("UserProfileScreen: Player card tapped, opening player card modal.");
                setIsPlayerCardModalVisible(true)
              }}>
                {isCardConfirmed ? (
                  <>
                    {/* Preload real card */}
                    {playerCardData?.cardURL && (
                      <Image
                        source={{ uri: playerCardData.cardURL }}
                        style={{ width: 1, height: 1, opacity: 0 }}
                        onLoadEnd={() => {
                          console.log("UserProfileScreen: Real card onLoadEnd fired.");
                          setCardImageReady(true);
                          setMaskedViewKey(`masked_${Date.now()}`);
                        }}
                      />
                    )}

                    {/* Only show real card if preloaded */}
                    {playerCardData?.cardURL && cardImageReady && (
                      <MaskedView
                        key={maskedViewKey}
                        style={styles.cardClipper}
                        maskElement={
                          <Image
                            source={{ uri: playerCardData.cardURL }}
                            style={styles.cardImage}
                          />
                        }
                      >
                        <Image
                          source={{ uri: playerCardData.cardURL }}
                          style={styles.cardImage}
                        />
                        {animateCard && (
                          <CardScanEffect
                            containerWidth={230}
                            containerHeight={288}
                            beamWidth={150}
                            beamColor="rgba(255, 255, 255, 0.1)"
                            beamAngle={0}
                            duration={5000}
                          />
                        )}
                      </MaskedView>
                    )}
                  </>
                ) : (
                  // When no card is confirmed yet, show simple placeholder
                  <Image
                    source={require("../../assets/images/Bronze placeholder.png")}
                    style={styles.placeholderCardImage}
                  />
                )}
              </TouchableOpacity>
            </AnimatedImageBackground>
          </View>


          {/* Player Card Modal (just to view or download) */}
          <Modal
            visible={isPlayerCardModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              console.log("UserProfileScreen: Player card modal close requested by user.");
              setIsPlayerCardModalVisible(false);
            }}
          >
            <View style={styles.modalOverlay}>
              <ImageBackground
                source={require("../../assets/images/bk17.png")}
                style={{
                  width: Dimensions.get("window").width * 0.9,
                  borderRadius: 20,
                  overflow: "hidden",
                  padding: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#111", // Fallback if image fails
                }}
                imageStyle={{
                  resizeMode: "cover",
                  borderRadius: 20,
                }}
              >
                {/* 🏆 Title */}
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "bold",
                    color: "#FFD700",
                    marginBottom: 18,
                    textAlign: "center",
                    textShadowColor: "#000",
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 4,
                  }}
                >
                  {t('userProfile.playerCardModalTitle')}
                </Text>

                {/* 🖼️ Player Card Image */}
                <Image
                  source={displayedCardSource}
                  style={{
                    width: "100%",
                    height: Dimensions.get("window").width * 0.8,
                    resizeMode: "contain",
                    borderRadius: 16,
                    marginBottom: 30,
                  }}
                />

                {/* 💾 Download Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#1e90ff",
                    paddingVertical: 14,
                    paddingHorizontal: 30,
                    borderRadius: 12,
                    marginBottom: 14,
                    shadowColor: "#00f0ff",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => {
                    console.log("UserProfileScreen: Download button pressed in player card modal.");
                    handleDownloadPlayerCard()
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: 16,
                    }}
                  >
                    {t('userProfile.downloadButton')}
                  </Text>
                </TouchableOpacity>

                {/* 🚫 Close Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#ff3b30",
                    paddingVertical: 14,
                    paddingHorizontal: 30,
                    borderRadius: 12,
                  }}
                  onPress={() => {
                    console.log("UserProfileScreen: Close button pressed in player card modal.");
                    setIsPlayerCardModalVisible(false)
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: 16,
                    }}
                  >
                    {t('common.close')}
                  </Text>
                </TouchableOpacity>

                {/* 💫 Toast Inside Modal */}
                {toastVisible && (
                  <Animated.View style={{
                    position: "absolute",
                    top: "45%",
                    alignSelf: "center",
                    backgroundColor: "#1e90ff",
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 20,
                    zIndex: 9999,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 6,
                    elevation: 8,
                  }}>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 16,
                        textAlign: "center",
                      }}
                    >
                      {t('userProfile.playerCardDownloadedToast')}
                    </Text>
                  </Animated.View>
                )}

              </ImageBackground>
            </View>
          </Modal>


          {/* Username Edit Modal */}
          <Modal
            visible={isEditingUsername}
            animationType="slide"
            transparent={true}
            onRequestClose={() => {
              console.log("UserProfileScreen: Username edit modal close requested by user.");
              setIsEditingUsername(false)
            }}
          >
            <View style={styles.modalOverlay}>
              <ImageBackground
                source={require("../../assets/images/bk3.png")}
                style={styles.usernameModalImageBg}
                imageStyle={{ borderRadius: 20, resizeMode: "cover" }}
              >
                <View style={styles.modalInnerOverlay}>
                  <Text style={styles.modalTitle}>{t('userProfile.editUsernameModalTitle')}</Text>

                  <TextInput
                    style={styles.modalInput}
                    value={tempUsername}
                    onChangeText={(text) => {
                      console.log(`UserProfileScreen: Username input changed to: ${text}`);
                      setTempUsername(text)
                    }}
                    placeholder={t('userProfile.enterNewUsernamePlaceholder')}
                    placeholderTextColor="#999"
                  />

                  {previousUsernames.length > 0 && (
                    <View style={styles.previousUsernamesContainer}>
                      <Text style={styles.previousUsernamesTitle}>{t('userProfile.previousUsernamesLabel')}</Text>
                      {previousUsernames.map((name, index) => (
                        <Text key={index} style={styles.previousUsernames}>
                          {name}
                        </Text>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalButtonCancel} onPress={() => {
                      console.log("UserProfileScreen: Cancel username edit button pressed.");
                      setIsEditingUsername(false)
                    }}>
                      <Text style={styles.modalButtonText}>{t('common.cancelButton')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalButtonSave} onPress={() => {
                      console.log("UserProfileScreen: Save username button pressed.");
                      handleSaveUsername()
                    }}>
                      <Text style={styles.modalButtonText}>{t('common.saveButton')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ImageBackground>
            </View>
          </Modal>


          {/* CTA Button Section */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              onPress={() => {
                console.log(`UserProfileScreen: Generate card/Upgrade available button pressed. Show claim button: ${showClaimNewCardButton}`);
                if (showClaimNewCardButton) {
                  handleClaimNewCard();
                } else {
                  handleGeneratePlayerCard();
                }
              }}
              style={[
                styles.generateCardButton,
                showCardUpgradeGlow && styles.glowButton
              ]}
            >
              <Text
                style={[
                  styles.generateCardText,
                  showCardUpgradeGlow && styles.glowButtonText
                ]}
              >
                {showCardUpgradeGlow ? t('userProfile.cardUpgradeAvailable') : t('userProfile.generatePlayerCardButton')}
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={[styles.actionButton, { width: "100%" }]}
              onPress={() => {
                console.log("UserProfileScreen: Manage My Account button pressed.");
                router.push("/screens/ManageMyAccount")
              }}
            >
              <Text style={[styles.activityButtonText, styles.neonText, { textAlign: "center" }]}>
                {t('userProfile.manageMyAccountButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { width: "100%" }]}
              onPress={() => {
                console.log("UserProfileScreen: View My Activity button pressed.");
                router.push("/screens/MyActivity")
              }}
            >
              <Text style={[styles.activityButtonText, styles.neonText, { textAlign: "center" }]}>
                {t('userProfile.viewMyActivityButton')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { width: "100%" }]}
              onPress={() => {
                console.log("UserProfileScreen: Logout button pressed.");
                handleLogout()
              }}
            >
              <Text style={[styles.logoutButtonText, styles.neonText, { textAlign: "center" }]}>
                {t('userProfile.logOutButton')}
              </Text>
            </TouchableOpacity>
          </View>


          {/* XP Progress Bar */}
          <View style={styles.xpBarContainer}>
            <View style={styles.xpBarBackground}>
              <Animated.View
                style={{
                  width: xpBarWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  height: "100%",
                }}
              >
                <LinearGradient
                  colors={["#ffd800", "#ff4200"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.xpBarFill}
                />
              </Animated.View>
            </View>
            <Text
              style={[styles.xpText, styles.neonText, { textAlign: "center" }]}
            >
              {t('userProfile.xpProgressLabel', { xp: xp, nextLevelXp: nextLevelXp })}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Image Options Modal */}
      <Modal
        visible={isImageOptionsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          console.log("UserProfileScreen: Image options modal close requested by user.");
          setIsImageOptionsModalVisible(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContainer}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.selectedImagePreview}
              />
            )}
            <View style={styles.imageModalButtons}>
              <Button
                title={t('userProfile.useImageButton')}
                onPress={() => {
                  console.log("UserProfileScreen: Use image button pressed.");
                  if (selectedImage?.uri) {
                    uploadProfileImage(selectedImage.uri);
                  }
                  setIsImageOptionsModalVisible(false);
                }}
              />
              <Button title={t('userProfile.removeButton')} onPress={() => {
                console.log("UserProfileScreen: Remove image button pressed.");
                handleRemoveProfilePic()
              }} />
              <Button
                title={t('common.cancelButton')}
                onPress={() => {
                  console.log("UserProfileScreen: Cancel image options button pressed.");
                  setIsImageOptionsModalVisible(false)
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CLAIM NEW CARD MODAL: only for capturing the new card snapshot */}
      <Modal
        visible={isClaimModalVisible}
        transparent={true}
        onRequestClose={() => {
          console.log("UserProfileScreen: Claim new card modal close requested by user.");
          setIsClaimModalVisible(false)
        }}
      >
        <View style={styles.claimModalOverlay}>
          <View style={styles.claimModalContainer}>
            {pendingCardData && (
              <ViewShot
                ref={modalViewShotRef}
                options={{ format: "png", quality: 1.0 }}
                style={styles.claimCardSnapshotArea}
                onLayout={handleCardLayout}
              >
                <ImageBackground
                  source={{ uri: templateBackground }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                >
                  {/* OVR */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.ovrRating.x * cardScale,
                      top: COORDS.ovrRating.y * cardScale,
                      width: COORDS.ovrRating.width * cardScale,
                    }}
                  >
                    <Text style={styles.modalOVRText}>
                      {pendingCardData.ovr}
                    </Text>
                  </View>

                  {/* Display Name */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.displayName.x * cardScale,
                      top: COORDS.displayName.y * cardScale,
                      width: COORDS.displayName.width * cardScale,
                      transform: [{ translateX: -(COORDS.displayName.width * cardScale) / 2 }],
                    }}
                  >
                    <Text style={styles.modalDisplayNameText}>
                      {pendingCardData.displayName}
                    </Text>
                  </View>

                  {/* Position */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.position.x * cardScale,
                      top: COORDS.position.y * cardScale,
                      width: COORDS.position.width * cardScale,
                    }}
                  >
                    <Text style={styles.modalPositionText}>
                      {pendingCardData.position}
                    </Text>
                  </View>

                  {/* Jersey Number */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.jerseyNumber.x * cardScale,
                      top: COORDS.jerseyNumber.y * cardScale,
                      width: COORDS.jerseyNumber.width * cardScale,
                    }}
                  >
                    <Text style={styles.modalJerseyNumberText}>
                      {pendingCardData.jerseyNumber}
                    </Text>
                  </View>

                  {/* Preferred Foot */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.preferredFoot.x * cardScale,
                      top: COORDS.preferredFoot.y * cardScale,
                      width: COORDS.preferredFoot.width * cardScale,
                    }}
                  >
                    <Text style={styles.modalPreferredFootText}>
                      {pendingCardData.preferredFoot}
                    </Text>
                  </View>

                  {/* Country Flag */}
                  <View
                    style={{
                      position: "absolute",
                      left: COORDS.countryFlag.x * cardScale,
                      top: COORDS.countryFlag.y * cardScale,
                      width: COORDS.countryFlag.width * cardScale,
                    }}
                  >
                    <Text style={styles.modalCountryFlagText}>
                      {pendingCardData.country}
                    </Text>
                  </View>

                  {/* Profile Image */}
                  {pendingCardData.profilePhoto && (
                    <Image
                      source={{ uri: pendingCardData.profilePhoto }}
                      style={{
                        position: "absolute",
                        left: COORDS.profileImage.x * cardScale,
                        top: COORDS.profileImage.y * cardScale,
                        width: COORDS.profileImage.width * cardScale,
                        height: COORDS.profileImage.height * cardScale,
                        resizeMode: "cover",
                      }}
                    />
                  )}

                  {/* Stats */}
                  {[1, 2, 3, 4, 5].map((i) => {
                    const key = `stat${i}`;
                    return (
                      <View
                        key={key}
                        style={{
                          position: "absolute",
                          left: COORDS[key].x * cardScale,
                          top: COORDS[key].y * cardScale,
                          width: COORDS[key].width * cardScale,
                        }}
                      >
                        <Text style={styles.modalStatText}>
                          {pendingCardData[key]}
                        </Text>
                      </View>
                    );
                  })}
                </ImageBackground>
              </ViewShot>
            )}

            {/* Buttons */}
            <View style={styles.claimModalButtons}>
              {isProcessing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    console.log("UserProfileScreen: Confirm and claim button pressed.");
                    handleConfirmClaim()
                  }}
                >
                  <Text style={styles.confirmButtonText}>{t('userProfile.confirmAndClaimButton')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  console.log("UserProfileScreen: Cancel button pressed in claim modal.");
                  setIsClaimModalVisible(false);
                  setPendingCardData(null);
                }}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancelButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isUpgradeInfoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          console.log("UserProfileScreen: Upgrade info modal close requested by user.");
          setIsUpgradeInfoVisible(false)
        }}
      >
        <View style={styles.modalOverlay}>
          <ImageBackground
            source={require("../../assets/images/bk18.png")}
            style={styles.upgradeInfoModal}
            imageStyle={{ borderRadius: 20 }}
          >
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.modalMainTitle}>{t('userProfile.upgradePlayerCardModalTitle')}</Text>
              <Text style={styles.modalSubtitleText}>{t('userProfile.upgradePlayerCardModalSubtitle')}</Text>

              {/* Tier Scroll Preview */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tierScrollContainer}
              >
                {cardTiers.map((tier, index) => (
                  <View key={index} style={styles.tierCard}>
                    <Image source={tier.image} style={styles.tierCardImage} resizeMode="cover" />
                    <Text style={styles.tierCardName}>{tier.label}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Creator Section */}
              <View style={styles.section}>
                <Text style={styles.creatorTitle}>{t('userProfile.creatorSectionTitle')}</Text>
                <Text style={styles.sectionText}>
                  {t('userProfile.creatorSectionText1')}
                </Text>
                <Text style={styles.sectionText}>
                  {t('userProfile.creatorSectionText2')}
                </Text>
                <TouchableOpacity
                  style={styles.submitDesignButton}
                  onPress={() => {
                    console.log("UserProfileScreen: Learn how to submit design button pressed.");
                    Alert.alert(t('userProfile.comingSoonTitle'), t('userProfile.cardDesignSubmissionMessage'))
                  }}
                >
                  <Text style={styles.submitDesignText}>{t('userProfile.learnHowToSubmitDesignButton')}</Text>
                </TouchableOpacity>
              </View>

              {/* How Upgrading Works */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('userProfile.howUpgradingWorksTitle')}</Text>
                <Text style={styles.sectionText}>
                  {t('userProfile.howUpgradingWorksText')}
                </Text>
              </View>

              {/* XP Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('userProfile.howToEarnXPTitle')}</Text>
                <Text style={styles.sectionText}>{t('userProfile.howToEarnXpText1')}</Text>
                <Text style={styles.sectionText}>{t('userProfile.howToEarnXpText2')}</Text>
                <Text style={styles.sectionText}>{t('userProfile.howToEarnXpText3')}</Text>
              </View>

              {/* VIP Perks */}
              <View style={styles.section}>
                <Text style={styles.vipTitle}>{t('userProfile.vipPerksTitle')}</Text>
                <Text style={styles.sectionText}>
                  {t('userProfile.vipPerksText')}
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity style={styles.confirmButton} onPress={() => {
                console.log("UserProfileScreen: Got it, let's rank up button pressed.");
                setIsUpgradeInfoVisible(false)
              }}>
                <Text style={styles.confirmButtonText}>{t('userProfile.gotItLetsRankUpButton')}</Text>
              </TouchableOpacity>
            </ScrollView>

          </ImageBackground>

        </View>
      </Modal>

    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 80,
  },
  innerContainer: { width: "100%", alignItems: "center" },
  /* Header / Profile */
  headerContainer: {
    width: "90%",
    left: -20,
    top: -10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerLeft: { flex: 1, alignItems: "flex-start", left: 20, top: 55, width: 200 },
  headerCenter: {
    flex: 2,
    left: -40,
    bottom: -10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: { flex: 1, alignItems: "flex-end", right: -20, top: 20 },
  rankText: { fontSize: 12, fontWeight: "bold", color: "#face00", width: 200 },



  username: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    transform: [{ translateX: 30 }, { translateY: -10 }],
  },

  editHintText: {
    fontSize: 8,
    color: "#ccc",
    opacity: 0.8,
    textAlign: "center",
    transform: [{ translateX: 30 }, { translateY: -12 }],
  },
  usernameTapWrapper: {
    position: "absolute",
    transform: [{ translateX: 30 }, { translateY: 100 }],
    width: 200, // same as usernameContainer for safe coverage
    paddingVertical: 10,
    zIndex: 10,
  },

  avatarTapWrapper: {
    transform: [{ translateX: -85 }],
    width: 55,
    height: 55,
    borderRadius: 27.5,
    overflow: "hidden",
    position: "relative", // or "absolute" if needed
    zIndex: 10,
  },

  profileAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 27.5,
    borderWidth: 2,
    borderColor: "#FFD700",
  },



  usernameVIP: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD700",
    textShadowColor: "#FFD700",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },


  coinsText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2fff96", // soft neon lime
    textAlign: "center",
    textShadowColor: "#00FF00",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    transform: [{ translateX: -20 }, { translateY: 0 }],
  },

  /* Player Card (Main Stage) */
  playerCardWrapper: { width: "90%", alignItems: "center", marginVertical: 20 },
  playerCardContainer: {
    width: 450,
    height: 480,
    top: -60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    overflow: "hidden",
  },
  playerCardImage: { width: 230, height: 230, resizeMode: "contain" },
  claimNewCardButton: {
    position: "absolute",
    bottom: 500,
    left: "50%",
    transform: [{ translateX: -110 }],
    width: 220,
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: "#FFD700",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,

    elevation: 6, // for Android
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 2,
    borderColor: "#fff",
  },


  claimNewCardButtonText: { fontSize: 16, fontWeight: "700", color: "#000" },
  /* Generate Card Button */
  generateCardButton: {
    backgroundColor: "#1e90ff",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    bottom: 100,
    marginVertical: 10,
    width: "90%",
    alignItems: "center",
  },
  generateCardText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  /* XP Progress Bar */
  xpBarContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 300, // fixed width for better control
    transform: [{ translateY: -440 }],
  },

  xpBarBackground: {
    width: "100%",
    height: 18,
    backgroundColor: "#444",
    borderRadius: 8,
    overflow: "hidden",
  },

  xpBarFill: {
    height: "100%",
  },

  xpText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginTop: 6,
    transform: [{ translateY: 6 }],
  },

  /* Actions Section */
  actionsSection: { width: "90%", marginTop: 10, alignItems: "center" },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  activityButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  logoutButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  /* Modals (General) */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  playerCardModalContainer: {
    width: "90%",
    backgroundColor: "#1c1c1e",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  playerCardModalImage: {
    width: "100%",
    height: Dimensions.get("window").width * 0.8,
    resizeMode: "contain",
    marginBottom: 10,
  },
  modalContainer: {
    width: "85%",
    borderRadius: 16,
    overflow: "hidden",
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  modalInnerOverlay: {
    width: "100%",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 16,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#39ff14",
    textAlign: "center",
    marginBottom: 15,
    textShadowColor: "#39ff14",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  modalInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "#39ff14",
    borderWidth: 1,
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    width: "100%",
    paddingHorizontal: 10,
  },

  modalButtonCancel: {
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginRight: 8,
  },

  modalButtonSave: {
    backgroundColor: "#1e90ff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
    marginLeft: 8,
  },

  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },


  buttonWrapper: {
    flex: 1,
    paddingHorizontal: 4, // Adds spacing between buttons
  },


  previousUsernamesTitle: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 6,
    textAlign: "center",
    fontWeight: "600",
  },

  previousUsernames: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },

  /* Image Options Modal */
  imageModalContainer: {
    width: "80%",
    backgroundColor: "#1c1c1e",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  selectedImagePreview: {
    width: Dimensions.get("window").width * 0.6,
    height: Dimensions.get("window").width * 0.6,
    borderRadius: 10,
    marginBottom: 15,
  },
  imageModalButtons: { width: "100%" },
  /* Neon Text */
  neonText: {
    textShadowColor: "#39ff14",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  /* Upgrading Overlay */
  cardGlow: {
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  /* Claim Card Modal */
  claimModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  claimModalContainer: {
    width: "85%",
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  claimCardSnapshotArea: {
    width: 300,
    height: 400,
    backgroundColor: "transparent",
    borderRadius: 10,
    overflow: "hidden", // crucial
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTemplate: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  modalCardOverlay: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  /* Individual Styles for Claim Modal Text Elements */
  modalOVRText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ebe2b3",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalDisplayNameText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 1.5, height: 1 },
    textShadowRadius: 2,
  },
  modalPositionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalJerseyNumberText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalPreferredFootText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalCountryFlagText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalStatText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#fff",
    textShadowColor: "#000",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  /* Styles for Modal Buttons */
  confirmButton: {
    backgroundColor: "#1e90ff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: "center",
    width: "100%",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: "center",
    width: "100%",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  upgradeInfoModal: {
    width: 320,
    height: 500,
    maxHeight: Dimensions.get("window").height * 0.85,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
    backgroundColor: "transparent", // because of ImageBackground
  },



  modalText: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
    textAlign: "left",
    lineHeight: 22,
    padding: 5,
    top: 10,
  },
  tierScrollContainer: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 5,
    justifyContent: "center",
  },

  tierCard: {
    alignItems: "center",
    marginRight: 15,
    top: -10,
    width: 100,
    height: 130,
  },

  tierCardContent: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  tierCardImage: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
  },

  tierCardName: {
    marginTop: 5,
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },
  modalHeaderText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#39ff14",
    textAlign: "center",
    marginBottom: 10,
    textShadowColor: "#39ff14",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  modalSubtitleText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#aaffaa",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 20,
  },

  modalMainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    textShadowColor: "#222",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 6,
    marginBottom: 8,
  },

  section: {
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    width: "100%",
  },

  creatorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#00eaff",
    textAlign: "left",
    marginBottom: 6,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  sectionTitle: {
    fontSize: 17,
    top: 10,
    fontWeight: "600",
    color: "#FF8C00",
    marginBottom: 8,
    textAlign: "left",
  },

  vipTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#ff00ff",
    marginBottom: 8,
    textAlign: "left",
  },

  sectionText: {
    fontSize: 15,
    color: "#fff",
    marginBottom: 6,
    lineHeight: 22,
    paddingRight: 10,
  },

  submitDesignButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "center",
  },

  submitDesignText: {
    fontWeight: "600",
    color: "#000",
    fontSize: 14,
  },
  scanWrapper: {
    width: 230,
    height: 288,
    borderRadius: 16,       // still nice to have
    overflow: "hidden",     // fallback on iOS
  },
  cardClipper: {
    width: 230,
    height: 300,
    borderRadius: 16,       // still nice to have
    overflow: "hidden",     // fallback on iOS
  },
  cardImage: {
    width: "80%",
    height: "80%",
    left: 20,
    borderRadius: 16,
    resizeMode: "cover",

  },

  cardToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40,
    marginBottom: 20,
  },

  toggleLabel: {
    fontSize: 16,
    color: "#fff",
    marginRight: 12,
    fontWeight: "600",
  },

  toggleButton: {
    backgroundColor: "#444",
    top: -150,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },

  toggleButtonActive: {
    backgroundColor: "#1e90ff",
  },

  toggleButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  placeholderCardImage: {
    width: 230,
    height: 288,
    resizeMode: "contain",
    borderRadius: 20,
  },

  glowButton: {
    borderColor: "#FFD700",
    borderWidth: 2,
    backgroundColor: "#fff9cc",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  glowButtonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  }


});

export default UserProfileScreen;