import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
// File: app/ManageMyAccount.js

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ImageBackground,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from '../firebaseConfig';
import Collapsible from 'react-native-collapsible';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomHeader } from '../../components/CustomHeader'; // Adjust path if needed


const dummyNotifications = []; // You can replace this with real ones if available
const markNotificationAsRead = async (notifId: string) => {
  console.log(`Marking ${notifId} as read`);
};


if (!getApps().length) {
  initializeApp(firebaseConfig);
}
const auth = getAuth();
const firestore = getFirestore();
const vipProductId = 'vip_monthly'; // 

// Custom hook to pull user data from Firestore (including VIP status, subscription info, etc.)
const useUserData = () => {
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const unsubscribe = onSnapshot(doc(firestore, 'users', currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });
      return () => unsubscribe();
    }
  }, []);
  return userData;
};

const ManageMyAccount = () => {
  const router = useRouter();
  const userData = useUserData();
  const [promoModalVisible, setPromoModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [openFAQIndex, setOpenFAQIndex] = useState(null);
  const [user, setUser] = useState(null);
  const [isFaqVisible, setIsFaqVisible] = useState(false);
  const [faqVisible, setFAQVisible] = useState(false);
  const { t } = useTranslation(); // Initialize useTranslation

  const faqData = [
    {
      question: t('faq.question1'),
      answer: t('faq.answer1'),
    },
    {
      question: t('faq.question2'),
      answer: t('faq.answer2'),
    },
    {
      question: t('faq.question3'),
      answer: t('faq.answer3'),
    },
    {
      question: t('faq.question4'),
      answer: t('faq.answer4'),
    },
    {
      question: t('faq.question5'),
      answer: t('faq.answer5'),
    },
    {
      question: t('faq.question6'),
      answer: t('faq.answer6'),
    },
    {
      question: t('faq.question7'),
      answer: t('faq.answer7'),
    },
    {
      question: t('faq.question8'),
      answer: t('faq.answer8'),
    },
    {
      question: t('faq.question9'),
      answer: t('faq.answer9'),
    },
    {
      question: t('faq.question10'),
      answer: t('faq.answer10'),
    },
  ];

  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    setUser(currentUser);
  }, []);


  // While waiting for user data, display a loading view.
  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('manageMyAccount.loadingAccountInfo')}</Text>
      </View>
    );
  }

  return (
      <>
    <CustomHeader
      router={router}
      route={{ name: 'Manage Account' }}
      options={{ headerTitle: t('manageMyAccount.headerTitle') }}
      back={true}
      notifications={dummyNotifications}
      markNotificationAsRead={markNotificationAsRead}
      userId={user?.uid}
    />
    <ImageBackground 
      source={require('../../assets/images/account.png')} // Replace with a luxurious background image.
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Section: Profile Image, Username & VIP Badge */}
        <View style={styles.header}>
          <Image 
            source={
              userData.profileImage
                ? { uri: userData.profileImage }
                : require('../../assets/images/bk.png')
            }
            style={styles.profileImage}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{userData.username || t('manageMyAccount.defaultUser')}</Text>
            {userData.vip && (
              <View style={styles.vipBadge}>
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
            )}
          </View>
        </View>
        {/* Launch Offer Box */}
{(!userData?.vip) && (

  <View style={styles.offerBox}>
    <Text style={styles.offerText}>
      {t('manageMyAccount.vipOfferText')}
    </Text>

    <Text style={[styles.offerSubText, { marginTop: 4 }]}>
      {t('manageMyAccount.vipOfferSubText1')}
    </Text>

    <Text style={[styles.offerSubText, { marginTop: 2 }]}>
      {t('manageMyAccount.vipOfferSubText2')}
    </Text>

    <Text style={[styles.offerSubText, { fontSize: 12, marginTop: 6, opacity: 0.6 }]}>
      {t('manageMyAccount.vipOfferNote')}
    </Text>
  </View>
)}

        {/* Your Plan Section */}
<View style={styles.planSection}>
  <Text style={styles.sectionTitle}>{t('manageMyAccount.yourPlanTitle')}</Text>

  {userData.vip ? (
    <>
      <Text style={styles.planText}>{t('manageMyAccount.planLabel', { planType: userData.vipSubscriptionType || 'VIP' })}</Text>
      <Text style={styles.planText}>
        {t('manageMyAccount.pricePaidLabel', { price: userData.pricePaid ? `$${userData.pricePaid}` : t('common.notApplicable') })}
      </Text>
      <Text style={styles.planText}>
        {userData.nextRenewalDate
          ? t('manageMyAccount.nextRenewalLabel', { date: new Date(
              userData.nextRenewalDate.seconds * 1000
            ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) })
          : t('manageMyAccount.notSubscribed')}
      </Text>

      {userData.vipSubscriptionType === 'Monthly' && (
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => console.log("Upgrade to Yearly")}
        >
          <Text style={styles.upgradeButtonText}>{t('manageMyAccount.upgradeToYearlyButton')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={() => console.log("Cancel/Pause Subscription")}
      >
        <Text style={styles.cancelButtonText}>{t('manageMyAccount.cancelPauseSubscriptionButton')}</Text>
      </TouchableOpacity>
    </>
  ) : (
    <>
      <Text style={styles.planText}>{t('manageMyAccount.freePlanMessage1')}</Text>
      <Text style={[styles.planText, { opacity: 0.7 }]}>
        {t('manageMyAccount.freePlanMessage2')}
      </Text>
    </>
  )}
</View>

{!user?.vip && (
  <TouchableOpacity 
    style={styles.subscribeButton} 
    onPress={() => Alert.alert(t('manageMyAccount.vipSubscriptionTitle'), t('manageMyAccount.purchasingFlowComingSoon'))}
  >
    <LinearGradient
      colors={['#00c6ff', '#0072ff']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.subscribeGradient}
    >
      <Text style={styles.subscribeButtonText}>{t('manageMyAccount.subscribeToVIPButton')}</Text>
    </LinearGradient>
  </TouchableOpacity>
)}

        {/* VIP Perks Section */}
        <ImageBackground 
  source={require('../../assets/images/vip.png')} // ← Replace with your actual image path
  style={styles.perksSection}
  imageStyle={{ borderRadius: 15 }} // Keeps the rounded corners clean
>
  <Text style={styles.sectionTitle}>{t('manageMyAccount.vipPerksTitle')}</Text>
  <View style={styles.perksList}>
            {[
  t('manageMyAccount.perk1'),
  t('manageMyAccount.perk2'),
  t('manageMyAccount.perk3'),
  t('manageMyAccount.perk4'),
  t('manageMyAccount.perk5'),
  t('manageMyAccount.perk6')
]
.map((perk, index) => (
              <View key={index} style={styles.perkItem}>
              <Text style={styles.perkBullet}>•</Text>
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
          <Modal
  visible={isFaqVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setIsFaqVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <ScrollView>
        <Text style={styles.modalTitle}>{t('faq.modalTitle')}</Text>
        {faqData.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
            </View>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}
        <TouchableOpacity onPress={() => setIsFaqVisible(false)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>{t('common.closeButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>

        </View>
      </ImageBackground>


<TouchableOpacity
  onPress={() => setIsFaqVisible(true)}

  style={{
    marginTop: 24,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: '#0ff',
    borderWidth: 1,
    borderColor: '#00e0ff',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  }}
>
  <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>
    {t('manageMyAccount.faqButton')}
  </Text>
</TouchableOpacity>



      </ScrollView>
    </ImageBackground>
    </>
  );
};

export default ManageMyAccount;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
container: {
  padding: 20,
  paddingTop: 100, // 👈 Add this line to shift everything down
  paddingBottom: 40,
},

  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  userInfo: {
    marginLeft: 15,
  },
  username: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  vipBadge: {
    marginTop: 5,
    backgroundColor: 'rgba(255,215,0,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  vipBadgeText: {
    color: '#000',
    fontWeight: 'bold',
  },
  planSection: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#ffd700',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  upgradeButton: {
    backgroundColor: '#ffd700',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  upgradeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
perksSection: {
  backgroundColor: 'rgba(0,0,0,0.65)',
  borderRadius: 20,
  padding: 20,
  marginBottom: 30,
  top:20,
  shadowColor: '#ffd700',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  borderWidth: 1,
  borderColor: '#ffd700',
},

  perksList: {
    marginTop: 10,
  },
perkItem: {
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ffd700',
  padding: 14,
  marginBottom: 14,
  flexDirection: 'row',
  alignItems: 'flex-start',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.5,
  shadowRadius: 6,
},
perkText: {
  fontSize: 15,
  color: '#fceca2',
  flex: 1,
  lineHeight: 22,
  fontWeight: '500',
},
perkBullet: {
  fontSize: 20,
  color: '#ffd700',
  marginRight: 10,
  lineHeight: 24,
},


offerBox: {
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  padding: 16,
  marginVertical: 12,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.2)',
},

offerText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#ffffff',
  textAlign: 'center',
},

offerSubText: {
  fontSize: 14,
  color: '#e0e0e0',
  textAlign: 'center',
},

  promoButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 25,
  },
  promoButtonText: {
    fontSize: 16,
    color: '#ffd700',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  faqLink: {
    marginBottom: 25,
    alignSelf: 'center',
  },
  faqText: {
    fontSize: 16,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
  },
modalContent: {
  backgroundColor: '#0f1115',
  borderRadius: 20,
  padding: 24,
  width: '100%',
  maxHeight: '90%',
  shadowColor: '#00ffff',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 10,
  borderWidth: 1,
  borderColor: '#00e0ff',
},

modalTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#00f0ff',
  marginBottom: 20,
  textAlign: 'center',
  textShadowColor: '#000',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
},

  promoInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    color: '#000',
  },
  modalButton: {
    backgroundColor: '#ffd700',
    padding: 12,
    borderRadius: 10,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  modalCancel: {
    marginTop: 10,
    textAlign: 'center',
    color: '#ff4444',
    fontWeight: 'bold',
  },
topButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 20,
  paddingHorizontal: 10,
},

navButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  paddingVertical: 8,
  paddingHorizontal: 16,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.3)',
  shadowColor: '#00ffc8',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.6,
  shadowRadius: 8,
  top:20
  
},

navButtonText: {
  color: '#ffffff',
  marginLeft: 8,
  fontSize: 16,
  fontWeight: '600',
  letterSpacing: 0.3,
},
faqSection: {
  marginTop: 24,
  padding: 18,
  backgroundColor: 'rgba(10, 25, 47, 0.85)', // deep blue tint
  borderRadius: 18,
  borderWidth: 1,
  borderColor: '#00f0ff',
  shadowColor: '#00f0ff',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  marginHorizontal: 12,
},

faqItem: {
  marginBottom: 16,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.08)',
},

faqHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 4,
},

faqQuestion: {
  fontSize: 16,
  color: '#fff',
  fontWeight: '700',
  marginBottom: 6,
  textShadowColor: '#005',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 2,
},

faqAnswer: {
  fontSize: 14,
  color: '#cceeff',
  lineHeight: 22,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.08)',
},


subscribeButton: {
  marginTop: 24,
  borderRadius: 24,
  overflow: 'hidden',
  shadowColor: '#00f5ff',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 5,
},

subscribeGradient: {
  paddingVertical: 16,
  paddingHorizontal: 24,
  alignItems: 'center',
  borderRadius: 24,
},

subscribeButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  textShadowColor: 'rgba(0, 0, 0, 0.5)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 3,
},
modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.8)', // stronger dark overlay
  padding: 20,
},
closeButton: {
  marginTop: 24,
  alignSelf: 'center',
  backgroundColor: '#00e0ff',
  paddingVertical: 10,
  paddingHorizontal: 28,
  borderRadius: 30,
  shadowColor: '#00ffff',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.5,
  shadowRadius: 6,
  elevation: 5,
},

closeButtonText: {
  color: '#000',
  fontWeight: 'bold',
  fontSize: 16,
},


});