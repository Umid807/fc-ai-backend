import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseApp } from '../firebaseConfig';

const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

const EditPost = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setPost(data);
          setTitle(data.title || '');
          setContent(data.content || '');
          setImageUrl(data.images?.[0] || null);
        }
      } catch (err) {
        console.error('Failed to load post:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const pickedImage = result.assets[0];
      setUploading(true);
      try {
        const response = await fetch(pickedImage.uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `posts/${id}_${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        setImageUrl(url);
      } catch (err) {
        console.error('Image upload failed:', err);
        Alert.alert('Error', 'Image upload failed.');
      } finally {
        setUploading(false);
      }
    }
  };

  const saveChanges = async () => {
    if (!id) return;
    try {
      const postRef = doc(db, 'posts', id);
      await updateDoc(postRef, {
        title,
        content,
        images: imageUrl ? [imageUrl] : [],
      });
      Alert.alert('Saved', 'Post updated successfully.');
      router.back();
    } catch (err) {
      console.error('Error updating post:', err);
      Alert.alert('Error', 'Failed to update post.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Edit Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        placeholder="Post title"
        placeholderTextColor="#888"
      />

      <Text style={styles.label}>Edit Content</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        style={[styles.input, styles.textArea]}
        placeholder="Post content"
        placeholderTextColor="#888"
        multiline
      />

      <Text style={styles.label}>Image Preview</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <Text style={styles.placeholder}>No image</Text>
      )}

      <TouchableOpacity style={styles.imageButton} onPress={pickImage} disabled={uploading}>
        <Text style={styles.imageButtonText}>{uploading ? 'Uploading...' : 'Replace Image'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#121212',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  label: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  placeholder: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  imageButton: {
    backgroundColor: '#FFD700',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  imageButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#00CED1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EditPost;
