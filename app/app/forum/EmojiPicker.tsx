// components/EmojiPicker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EmojiPicker = ({ visible, onSelect, onClose }: any) => {
  const shortList = ['😊', '😂', '🤔', '😏','👍', '🔥'];
  const fullList = [
    '😊','😂','😍','👍','🔥','😎','❤️','🎉','🙌','🤔','😜','😢','👏','🎶',
    '🚀','✨','🥳','😇','😏','🤩','😱','😭','🤠','🌟','🎂','🍕'
  ];
  const [showFull, setShowFull] = useState(false);
  const displayedEmojis = showFull ? fullList : shortList;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={emojiPickerStyles.emojiPickerModalOverlay}>
          <TouchableWithoutFeedback>
            <LinearGradient
              colors={['#024545', '#1c2433']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={emojiPickerStyles.emojiPickerBox}
            >
              <View style={emojiPickerStyles.emojiRow}>
                {displayedEmojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => onSelect(emoji)}
                    style={emojiPickerStyles.emojiButton}
                  >
                    <Text style={emojiPickerStyles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setShowFull(!showFull)}
                  style={[emojiPickerStyles.emojiButton, { backgroundColor: '#333' }]}
                >
                  <Text style={emojiPickerStyles.emojiText}>➕</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{ marginTop: 12, alignSelf: 'center' }}
              >
                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: 'bold' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const emojiPickerStyles = StyleSheet.create({
  emojiPickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiPickerBox: {
    width: 320,
    padding: 12,
    borderRadius: 12,
    elevation: 5,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emojiButton: {
    padding: 6,
    margin: 4,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  emojiText: {
    fontSize: 22,
  },
});

export default EmojiPicker;