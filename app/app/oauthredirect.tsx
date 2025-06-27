import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function OAuthRedirect() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    // Small delay to show the loading screen, then redirect to home
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={['#0D0D0D', '#222222']} style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#FFD700" style={styles.spinner} />
        <Text style={styles.title}>{t('oauth_redirect.title')}</Text>
        <Text style={styles.subtitle}>{t('oauth_redirect.subtitle')}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 20,
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#00FFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});