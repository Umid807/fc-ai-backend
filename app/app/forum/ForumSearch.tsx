// app/forum/ForumSearch.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ImageBackground,
  TouchableOpacity,
} from 'react-native';
import algoliasearch from 'algoliasearch';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PostCard from '../../components/PostCard';
import { LinearGradient } from 'expo-linear-gradient';

// ✅ Algolia credentials
const ALGOLIA_APP_ID = '6HO3G4QKM3';
const ALGOLIA_SEARCH_KEY = 'be88d66f064aefa9b06722576482a72c';
const ALGOLIA_INDEX_NAME = 'posts';

// ✅ Native Algolia client (no custom host override)
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const index = searchClient.initIndex(ALGOLIA_INDEX_NAME);

export default function ForumSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text) => {
    setQuery(text);

    if (text.trim() === '') {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await index.search(text, {
        hitsPerPage: 20,
      });
      setResults(res.hits);
    } catch (err) {
      console.error('🔥 Algolia search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/search.png')}
      style={{ flex: 1 }}
    >
      <LinearGradient colors={['transparent', 'transparent']} style={styles.overlay}>
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search forum..."
              placeholderTextColor="#888"
              style={styles.input}
              value={query}
              onChangeText={handleSearch}
              autoFocus
            />
            {query !== '' && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          {loading ? (
            <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 40 }} />
          ) : results.length === 0 && query !== '' ? (
            <Text style={styles.noResults}>No posts found.</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.objectID}
              renderItem={({ item }) => (
                <PostCard
                  post={{ ...item, id: item.objectID }}
                  currentUser={null}
                  router={router}
                  hotTopic={false}
                />
              )}
              contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  container: {
    paddingTop: 80,
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // translucent for depth
    borderRadius: 5,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    height: 44,
    borderWidth: 1.2,
    borderColor: '#00ffff88',
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  noResults: {
    color: '#ccc',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
});