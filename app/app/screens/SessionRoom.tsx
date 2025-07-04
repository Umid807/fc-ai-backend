import i18n from '../i18n/i18n';
import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { router } from 'expo-router';
import { ImageBackground } from 'react-native';

const SessionRoom = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation(); // Add navigation hook
  const { sessionId } = route.params;

  const [session, setSession] = useState(null);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());
  const [expandedRule, setExpandedRule] = useState(null);

  const toggleRule = (index) => {
    setExpandedRule(prev => (prev === index ? null : index));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const db = getFirestore();
        const sessionRef = doc(db, 'academy_sessions', sessionId);
        
        // Set up real-time listener for session updates
        const unsubscribe = onSnapshot(sessionRef, async (sessionSnap) => {
          if (!sessionSnap.exists()) {
            setError(t('sessionRoom.sessionNotFound'));
            setLoading(false);
            return;
          }

          const sessionData = sessionSnap.data();
          
          // Check if session is cancelled
          if (sessionData.status === 'cancelled') {
            Alert.alert(
              t('sessionRoom.sessionCancelled'),
              t('sessionRoom.sessionCancelledMessage'),
              [{ text: t('common.ok'), onPress: () => router.back() }]
            );
            return;
          }

          setSession({ id: sessionSnap.id, ...sessionData });

          // Fetch coach data
          if (sessionData.coachId) {
            try {
              const coachRef = doc(db, 'coaches', sessionData.coachId);
              const coachSnap = await getDoc(coachRef);
              if (coachSnap.exists()) {
                setCoach(coachSnap.data());
              } else {
                setCoach({
                  coachName: t('sessionRoom.coachUnavailable'),
                  coachImage: null,
                  Nationality: t('common.unknown'),
                  timezone: t('common.unknown')
                });
              }
            } catch (coachError) {
              console.error('Error fetching coach:', coachError);
              setCoach({
                coachName: t('sessionRoom.coachUnavailable'),
                coachImage: null,
                Nationality: t('common.unknown'),
                timezone: t('common.unknown')
              });
            }
          }
          
          setLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();
        
      } catch (err) {
        console.error('Error setting up session listener:', err);
        setError(t('sessionRoom.failedToLoadSession'));
        setLoading(false);
      }
    };

    fetchData();
    
    // Update time every minute
    const interval = setInterval(() => setNow(new Date()), 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);

  // Error state
  if (error) {
    return (
      <ImageBackground
        source={require('../../assets/images/stream.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 20 
        }}>
          <Text style={{ 
            color: '#FF4444', 
            fontSize: 18, 
            textAlign: 'center',
            marginBottom: 20,
            fontWeight: 'bold'
          }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#39FF14',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#000', fontWeight: 'bold' }}>
              {t('sessionRoom.goBack')}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // Loading state
  if (loading || !session) {
    return (
      <ImageBackground
        source={require('../../assets/images/stream.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}>
          <ActivityIndicator color="#39FF14" size="large" />
          <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
            {t('sessionRoom.loadingSession')}
          </Text>
        </View>
      </ImageBackground>
    );
  }

  const timeLeft = (session.scheduleTime.toDate() - now) / (1000 * 60 * 60);
  const showLink = timeLeft <= 2 && timeLeft > -0.5; // Available 2 hours before, until 30 min after start
  const sessionStarted = timeLeft <= 0;
  const sessionEnded = timeLeft < -2; // Session ended if more than 2 hours past start time

  const formatCountdown = () => {
    const diff = session.scheduleTime.toDate() - now;
    if (diff <= 0) {
      if (sessionEnded) return t('sessionRoom.sessionEnded');
      return t('sessionRoom.sessionLive');
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    return t('sessionRoom.countdownFormat', { hours, minutes });
  };

  const formatDateTime = (timestamp) => {
    const date = timestamp.toDate();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    return date.toLocaleString(undefined, options);
  };

  const handleJoinSession = () => {
    const streamLink = session.streamLink || session.meetingLink || session.zoomLink;
    
    if (!streamLink) {
      Alert.alert(
        t('sessionRoom.noStreamLink'),
        t('sessionRoom.contactSupport'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('sessionRoom.contactCoach'), 
            onPress: () => {
              // You can implement coach contact here
              Alert.alert(t('sessionRoom.supportInfo'), coach?.email || t('sessionRoom.supportEmail'));
            }
          }
        ]
      );
      return;
    }

    // Attempt to open the link
    Linking.openURL(streamLink).catch((err) => {
      console.error('Failed to open link:', err);
      Alert.alert(
        t('sessionRoom.linkError'),
        t('sessionRoom.linkErrorMessage'),
        [
          { text: t('common.ok') },
          { 
            text: t('sessionRoom.copyLink'), 
            onPress: () => {
              // You could implement clipboard copy here if needed
              Alert.alert(t('sessionRoom.linkCopied'), streamLink);
            }
          }
        ]
      );
    });
  };

  const getPlatformName = () => {
    const streamLink = session.streamLink || session.meetingLink || session.zoomLink || '';
    if (streamLink.includes('zoom.us')) return 'Zoom';
    if (streamLink.includes('meet.google.com')) return 'Google Meet';
    if (streamLink.includes('teams.microsoft.com')) return 'Microsoft Teams';
    return t('sessionRoom.liveMeeting');
  };

  // Session ended state
  if (sessionEnded) {
    return (
      <ImageBackground
        source={require('../../assets/images/stream.png')}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <ScrollView 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}
          contentContainerStyle={{ padding: 20, paddingTop: 80, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ 
            borderColor: '#FF4444', 
            borderWidth: 1.5, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 20,
            backgroundColor: 'rgba(255, 68, 68, 0.1)'
          }}>
            <Text style={{ 
              color: '#FF4444', 
              fontSize: 20, 
              fontWeight: '700', 
              textAlign: 'center',
              marginBottom: 12
            }}>
              {t('sessionRoom.sessionEnded')}
            </Text>
            <Text style={{ color: '#ccc', textAlign: 'center', marginBottom: 16 }}>
              {t('sessionRoom.sessionEndedMessage')}
            </Text>
            
            {session.recordingLink && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#39FF14',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
                onPress={() => Linking.openURL(session.recordingLink)}
              >
                <Text style={{ color: '#000', fontWeight: 'bold', textAlign: 'center' }}>
                  {t('sessionRoom.watchRecording')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: 'transparent',
                borderColor: '#39FF14',
                borderWidth: 1.5,
                padding: 12,
                borderRadius: 8,
              }}
              onPress={() => {
                console.log('Back button pressed'); // Debug log
                navigation.goBack();
              }}
            >
              <Text style={{ color: '#39FF14', fontWeight: 'bold', textAlign: 'center' }}>
                {t('sessionRoom.backToAcademy')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/stream.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <ScrollView 
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}
        contentContainerStyle={{ padding: 20, paddingTop: 80, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Info Card */}
        <View style={{ 
          borderColor: sessionStarted ? '#39FF14' : '#00F0FF', 
          borderWidth: 1.5, 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 20,
          backgroundColor: 'rgba(0,0,0,0.8)'
        }}>
          {/* Coach Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            {coach?.coachImage ? (
              <Image 
                source={{ uri: coach.coachImage }} 
                style={{ width: 60, height: 60, borderRadius: 30, marginRight: 12 }} 
              />
            ) : (
              <View style={{ 
                width: 60, 
                height: 60, 
                borderRadius: 30, 
                backgroundColor: '#444',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Text style={{ color: '#fff', fontSize: 24 }}>👨‍🏫</Text>
              </View>
            )}
            <View>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {coach?.coachName || t('sessionRoom.coachUnavailable')}
              </Text>
              <Text style={{ color: '#9BE3FF' }}>
                {t('sessionRoom.coachDetails', { 
                  nationality: coach?.Nationality || t('common.unknown'), 
                  timezone: coach?.timezone || t('common.unknown')
                })}
              </Text>
            </View>
          </View>

          {/* Session Details */}
          <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
            {session.title}
          </Text>
          
          {session.description && (
            <Text style={{ color: '#ccc', marginBottom: 8 }}>
              {session.description}
            </Text>
          )}
          
          {/* Enhanced Date/Time Display */}
          <Text style={{ color: '#9BE3FF', fontSize: 14, marginBottom: 4 }}>
            🗓️ {formatDateTime(session.scheduleTime)}
          </Text>
          
          <Text style={{ color: '#FFEB3B', fontSize: 14, marginBottom: 4 }}>
            🌍 {t('sessionRoom.yourTimezone')}
          </Text>

          {/* Session Language */}
          {session.language && (
            <Text style={{ color: '#9BE3FF', fontSize: 14, marginBottom: 8 }}>
              🗣️ {t('sessionRoom.language')}: {session.language.toUpperCase()}
            </Text>
          )}

          {/* Countdown */}
          <Text style={{
            color: sessionStarted ? '#39FF14' : '#9BE3FF',
            fontSize: 16,
            fontWeight: 'bold',
            marginTop: 10,
            marginBottom: 16,
            textAlign: 'center',
          }}>
            {formatCountdown()}
          </Text>

          {/* Join Button */}
          <TouchableOpacity
            disabled={!showLink}
            onPress={handleJoinSession}
            style={{
              backgroundColor: showLink ? '#39FF14' : '#444',
              padding: 12,
              borderRadius: 8,
              borderColor: showLink ? '#39FF14' : '#666',
              borderWidth: 1.5,
            }}
          >
            <Text style={{
              fontWeight: 'bold',
              color: showLink ? '#000' : '#999',
              textAlign: 'center',
              fontSize: 16,
            }}>
              {showLink 
                ? `${t('sessionRoom.joinSession')} (${getPlatformName()})`
                : t('sessionRoom.availableBeforeStart')
              }
            </Text>
          </TouchableOpacity>

          {/* Session Recording Disclaimer */}
          <Text style={{
            color: '#FFEB3B',
            fontSize: 12,
            textAlign: 'center',
            marginTop: 12,
            fontStyle: 'italic',
          }}>
            ⚠️ {t('sessionRoom.recordingDisclaimer')}
          </Text>
        </View>

        {/* Guidelines & Support */}
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: '#39FF14', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            {t('sessionRoom.guidelinesSupport')}
          </Text>

          {[
            {
              q: t('sessionRoom.faq1.q'),
              a: t('sessionRoom.faq1.a'),
            },
            {
              q: t('sessionRoom.faq2.q'),
              a: t('sessionRoom.faq2.a'),
            },
            {
              q: t('sessionRoom.faq3.q'),
              a: t('sessionRoom.faq3.a'),
            },
            {
              q: t('sessionRoom.faq4.q'),
              a: t('sessionRoom.faq4.a'),
            },
            {
              q: t('sessionRoom.faq5.q'),
              a: t('sessionRoom.faq5.a'),
            },
            {
              q: t('sessionRoom.faq6.q'),
              a: t('sessionRoom.faq6.a'),
            },
          ].map((item, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <TouchableOpacity onPress={() => toggleRule(index)}>
                <Text style={{
                  color: '#FFEB3B',
                  fontWeight: 'bold',
                  fontSize: 15,
                }}>
                  {expandedRule === index ? '▼' : '▸'} {item.q}
                </Text>
              </TouchableOpacity>
              {expandedRule === index && (
                <Text style={{
                  color: '#ccc',
                  paddingLeft: 12,
                  paddingTop: 4,
                  lineHeight: 20,
                }}>
                  {item.a}
                </Text>
              )}
            </View>
          ))}

          {/* Technical Support */}
          <View style={{
            backgroundColor: 'rgba(57, 255, 20, 0.1)',
            borderColor: '#39FF14',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginTop: 16,
          }}>
            <Text style={{ color: '#39FF14', fontWeight: 'bold', marginBottom: 8 }}>
              🔧 {t('sessionRoom.technicalSupport')}
            </Text>
            <Text style={{ color: '#ccc', fontSize: 14 }}>
              {t('sessionRoom.technicalSupportText')}
            </Text>
          </View>

          {/* Navigation Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 }}>
            {/* Back Button */}
            <TouchableOpacity
              style={{
                flex: 1,
                marginRight: 8,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#666',
                backgroundColor: '#1c1c1c',
                shadowColor: '#0ff',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
                elevation: 5,
              }}
              onPress={() => router.back()}
            >
              <Text style={{ color: '#0ff', textAlign: 'center', fontWeight: 'bold', fontSize: 15 }}>
                {t('sessionRoom.backButton')}
              </Text>
            </TouchableOpacity>

            {/* Homepage Button */}
            <TouchableOpacity
              style={{
                flex: 1,
                marginLeft: 8,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: '#39FF14',
                backgroundColor: '#000',
                shadowColor: '#39FF14',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
                elevation: 5,
              }}
onPress={() => {
  console.log('Homepage button pressed');
  router.back(); // Go back once
  router.back(); // Go back again to clear the stack
}}
            >
              <Text style={{ color: '#39FF14', textAlign: 'center', fontWeight: 'bold', fontSize: 15 }}>
                {t('sessionRoom.homepageButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

export default SessionRoom;