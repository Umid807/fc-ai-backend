import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  Platform,
  Dimensions,
  FlatList,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

// Types
interface EmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  recentEmojis?: string[];
  onUpdateRecents?: (emojis: string[]) => void;
}

interface EmojiItem {
  emoji: string;
  name: string;
  category: string;
  keywords: string[];
  supportsSkinTone?: boolean;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: EmojiItem[];
}

// Constants
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const EMOJI_SIZE = 44;
const EMOJIS_PER_ROW = Math.floor((SCREEN_WIDTH - 40) / EMOJI_SIZE);
const MAX_RECENT_EMOJIS = 24;
const SEARCH_DEBOUNCE_MS = 300;

// Quality curated emoji database (300-400 emojis)
const EMOJI_DATABASE: EmojiCategory[] = [
  {
    id: 'recent',
    name: 'Recently Used',
    icon: 'time-outline',
    emojis: [], // Will be populated dynamically
  },
  {
    id: 'people',
    name: 'People & Expressions',
    icon: 'happy-outline',
    emojis: [
      { emoji: '😀', name: 'grinning face', category: 'people', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😃', name: 'grinning face with big eyes', category: 'people', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😄', name: 'grinning face with smiling eyes', category: 'people', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😁', name: 'beaming face with smiling eyes', category: 'people', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😆', name: 'grinning squinting face', category: 'people', keywords: ['happy', 'laugh', 'smile'] },
      { emoji: '😅', name: 'grinning face with sweat', category: 'people', keywords: ['happy', 'laugh', 'nervous'] },
      { emoji: '🤣', name: 'rolling on the floor laughing', category: 'people', keywords: ['laugh', 'funny', 'lol'] },
      { emoji: '😂', name: 'face with tears of joy', category: 'people', keywords: ['laugh', 'funny', 'cry'] },
      { emoji: '🙂', name: 'slightly smiling face', category: 'people', keywords: ['smile', 'happy'] },
      { emoji: '🙃', name: 'upside-down face', category: 'people', keywords: ['silly', 'playful'] },
      { emoji: '😉', name: 'winking face', category: 'people', keywords: ['wink', 'flirt'] },
      { emoji: '😊', name: 'smiling face with smiling eyes', category: 'people', keywords: ['happy', 'blush'] },
      { emoji: '😇', name: 'smiling face with halo', category: 'people', keywords: ['angel', 'innocent'] },
      { emoji: '🥰', name: 'smiling face with hearts', category: 'people', keywords: ['love', 'crush', 'hearts'] },
      { emoji: '😍', name: 'smiling face with heart-eyes', category: 'people', keywords: ['love', 'crush', 'heart'] },
      { emoji: '🤩', name: 'star-struck', category: 'people', keywords: ['star', 'eyes', 'excited'] },
      { emoji: '😘', name: 'face blowing a kiss', category: 'people', keywords: ['kiss', 'love'] },
      { emoji: '😗', name: 'kissing face', category: 'people', keywords: ['kiss'] },
      { emoji: '🥲', name: 'smiling face with tear', category: 'people', keywords: ['emotional', 'tear'] },
      { emoji: '😋', name: 'face savoring food', category: 'people', keywords: ['tongue', 'delicious'] },
      { emoji: '😛', name: 'face with tongue', category: 'people', keywords: ['tongue', 'playful'] },
      { emoji: '😜', name: 'winking face with tongue', category: 'people', keywords: ['tongue', 'wink', 'playful'] },
      { emoji: '🤪', name: 'zany face', category: 'people', keywords: ['crazy', 'wild'] },
      { emoji: '😝', name: 'squinting face with tongue', category: 'people', keywords: ['tongue', 'playful'] },
      { emoji: '🤑', name: 'money-mouth face', category: 'people', keywords: ['money', 'dollar'] },
      { emoji: '🤗', name: 'hugging face', category: 'people', keywords: ['hug', 'embrace'] },
      { emoji: '🤭', name: 'face with hand over mouth', category: 'people', keywords: ['quiet', 'secret'] },
      { emoji: '🤫', name: 'shushing face', category: 'people', keywords: ['quiet', 'shh'] },
      { emoji: '🤔', name: 'thinking face', category: 'people', keywords: ['think', 'hmm'] },
      { emoji: '🤐', name: 'zipper-mouth face', category: 'people', keywords: ['quiet', 'zip'] },
      { emoji: '🤨', name: 'face with raised eyebrow', category: 'people', keywords: ['skeptical', 'suspicious'] },
      { emoji: '😐', name: 'neutral face', category: 'people', keywords: ['neutral', 'meh'] },
      { emoji: '😑', name: 'expressionless face', category: 'people', keywords: ['blank', 'meh'] },
      { emoji: '😶', name: 'face without mouth', category: 'people', keywords: ['quiet', 'speechless'] },
      { emoji: '😏', name: 'smirking face', category: 'people', keywords: ['smirk', 'smug'] },
      { emoji: '😒', name: 'unamused face', category: 'people', keywords: ['annoyed', 'meh'] },
      { emoji: '🙄', name: 'face with rolling eyes', category: 'people', keywords: ['eye roll', 'annoyed'] },
      { emoji: '😬', name: 'grimacing face', category: 'people', keywords: ['awkward', 'oops'] },
      { emoji: '🤥', name: 'lying face', category: 'people', keywords: ['lie', 'pinocchio'] },
      { emoji: '😔', name: 'pensive face', category: 'people', keywords: ['sad', 'thoughtful'] },
      { emoji: '😪', name: 'sleepy face', category: 'people', keywords: ['tired', 'sleepy'] },
      { emoji: '🤤', name: 'drooling face', category: 'people', keywords: ['drool', 'sleep'] },
      { emoji: '😴', name: 'sleeping face', category: 'people', keywords: ['sleep', 'tired'] },
      { emoji: '😷', name: 'face with medical mask', category: 'people', keywords: ['mask', 'sick', 'covid'] },
      { emoji: '🤒', name: 'face with thermometer', category: 'people', keywords: ['sick', 'fever'] },
      { emoji: '🤕', name: 'face with head-bandage', category: 'people', keywords: ['hurt', 'bandage'] },
      { emoji: '🤢', name: 'nauseated face', category: 'people', keywords: ['sick', 'nausea'] },
      { emoji: '🤮', name: 'face vomiting', category: 'people', keywords: ['sick', 'vomit'] },
      { emoji: '🤧', name: 'sneezing face', category: 'people', keywords: ['sneeze', 'sick'] },
      { emoji: '🥵', name: 'hot face', category: 'people', keywords: ['hot', 'heat'] },
      { emoji: '🥶', name: 'cold face', category: 'people', keywords: ['cold', 'freeze'] },
      { emoji: '🥴', name: 'woozy face', category: 'people', keywords: ['drunk', 'dizzy'] },
      { emoji: '😵', name: 'dizzy face', category: 'people', keywords: ['dizzy', 'dead'] },
      { emoji: '🤯', name: 'exploding head', category: 'people', keywords: ['mind blown', 'wow'] },
      { emoji: '🥱', name: 'yawning face', category: 'people', keywords: ['tired', 'yawn'] },
      { emoji: '😖', name: 'confounded face', category: 'people', keywords: ['confused', 'frustrated'] },
      { emoji: '😣', name: 'persevering face', category: 'people', keywords: ['struggling', 'persevere'] },
      { emoji: '😞', name: 'disappointed face', category: 'people', keywords: ['sad', 'disappointed'] },
      { emoji: '😟', name: 'worried face', category: 'people', keywords: ['worried', 'concerned'] },
      { emoji: '😤', name: 'face with steam from nose', category: 'people', keywords: ['angry', 'frustrated'] },
      { emoji: '😠', name: 'angry face', category: 'people', keywords: ['angry', 'mad'] },
      { emoji: '😡', name: 'pouting face', category: 'people', keywords: ['angry', 'rage'] },
      { emoji: '🤬', name: 'face with symbols on mouth', category: 'people', keywords: ['swearing', 'angry'] },
      { emoji: '😈', name: 'smiling face with horns', category: 'people', keywords: ['devil', 'evil'] },
      { emoji: '👿', name: 'angry face with horns', category: 'people', keywords: ['devil', 'angry'] },
      { emoji: '💀', name: 'skull', category: 'people', keywords: ['death', 'scary'] },
      { emoji: '☠️', name: 'skull and crossbones', category: 'people', keywords: ['death', 'danger'] },
      { emoji: '💩', name: 'pile of poo', category: 'people', keywords: ['poop', 'funny'] },
      { emoji: '🤡', name: 'clown face', category: 'people', keywords: ['clown', 'funny'] },
      { emoji: '👻', name: 'ghost', category: 'people', keywords: ['ghost', 'scary'] },
      { emoji: '👽', name: 'alien', category: 'people', keywords: ['alien', 'ufo'] },
      { emoji: '👾', name: 'alien monster', category: 'people', keywords: ['alien', 'game'] },
      { emoji: '🤖', name: 'robot', category: 'people', keywords: ['robot', 'ai'] },
      { emoji: '🎭', name: 'performing arts', category: 'people', keywords: ['theater', 'drama'] },
    ],
  },
  {
    id: 'gestures',
    name: 'Hand Gestures',
    icon: 'hand-left-outline',
    emojis: [
      { emoji: '👋', name: 'waving hand', category: 'gestures', keywords: ['wave', 'hello', 'goodbye'], supportsSkinTone: true },
      { emoji: '🤚', name: 'raised back of hand', category: 'gestures', keywords: ['stop', 'hand'], supportsSkinTone: true },
      { emoji: '🖐️', name: 'hand with fingers splayed', category: 'gestures', keywords: ['high five', 'hand'], supportsSkinTone: true },
      { emoji: '✋', name: 'raised hand', category: 'gestures', keywords: ['stop', 'high five'], supportsSkinTone: true },
      { emoji: '🖖', name: 'vulcan salute', category: 'gestures', keywords: ['spock', 'star trek'], supportsSkinTone: true },
      { emoji: '👌', name: 'ok hand', category: 'gestures', keywords: ['ok', 'good'], supportsSkinTone: true },
      { emoji: '🤌', name: 'pinched fingers', category: 'gestures', keywords: ['italian', 'chef kiss'], supportsSkinTone: true },
      { emoji: '🤏', name: 'pinching hand', category: 'gestures', keywords: ['small', 'tiny'], supportsSkinTone: true },
      { emoji: '✌️', name: 'victory hand', category: 'gestures', keywords: ['peace', 'victory'], supportsSkinTone: true },
      { emoji: '🤞', name: 'crossed fingers', category: 'gestures', keywords: ['luck', 'hope'], supportsSkinTone: true },
      { emoji: '🤟', name: 'love-you gesture', category: 'gestures', keywords: ['love', 'rock'], supportsSkinTone: true },
      { emoji: '🤘', name: 'sign of the horns', category: 'gestures', keywords: ['rock', 'metal'], supportsSkinTone: true },
      { emoji: '🤙', name: 'call me hand', category: 'gestures', keywords: ['call', 'phone'], supportsSkinTone: true },
      { emoji: '👈', name: 'backhand index pointing left', category: 'gestures', keywords: ['point', 'left'], supportsSkinTone: true },
      { emoji: '👉', name: 'backhand index pointing right', category: 'gestures', keywords: ['point', 'right'], supportsSkinTone: true },
      { emoji: '👆', name: 'backhand index pointing up', category: 'gestures', keywords: ['point', 'up'], supportsSkinTone: true },
      { emoji: '👇', name: 'backhand index pointing down', category: 'gestures', keywords: ['point', 'down'], supportsSkinTone: true },
      { emoji: '☝️', name: 'index pointing up', category: 'gestures', keywords: ['point', 'up', 'one'], supportsSkinTone: true },
      { emoji: '👍', name: 'thumbs up', category: 'gestures', keywords: ['good', 'yes', 'like'], supportsSkinTone: true },
      { emoji: '👎', name: 'thumbs down', category: 'gestures', keywords: ['bad', 'no', 'dislike'], supportsSkinTone: true },
      { emoji: '✊', name: 'raised fist', category: 'gestures', keywords: ['fist', 'power'], supportsSkinTone: true },
      { emoji: '👊', name: 'oncoming fist', category: 'gestures', keywords: ['punch', 'fist'], supportsSkinTone: true },
      { emoji: '🤛', name: 'left-facing fist', category: 'gestures', keywords: ['fist', 'bump'], supportsSkinTone: true },
      { emoji: '🤜', name: 'right-facing fist', category: 'gestures', keywords: ['fist', 'bump'], supportsSkinTone: true },
      { emoji: '👏', name: 'clapping hands', category: 'gestures', keywords: ['clap', 'applause'], supportsSkinTone: true },
      { emoji: '🙌', name: 'raising hands', category: 'gestures', keywords: ['celebrate', 'praise'], supportsSkinTone: true },
      { emoji: '👐', name: 'open hands', category: 'gestures', keywords: ['hug', 'open'], supportsSkinTone: true },
      { emoji: '🤲', name: 'palms up together', category: 'gestures', keywords: ['pray', 'please'], supportsSkinTone: true },
      { emoji: '🤝', name: 'handshake', category: 'gestures', keywords: ['deal', 'agreement'] },
      { emoji: '🙏', name: 'folded hands', category: 'gestures', keywords: ['pray', 'thanks', 'please'], supportsSkinTone: true },
      { emoji: '✍️', name: 'writing hand', category: 'gestures', keywords: ['write', 'pen'], supportsSkinTone: true },
      { emoji: '💅', name: 'nail polish', category: 'gestures', keywords: ['nails', 'beauty'], supportsSkinTone: true },
      { emoji: '🤳', name: 'selfie', category: 'gestures', keywords: ['selfie', 'phone'], supportsSkinTone: true },
    ],
  },
  {
    id: 'emotions',
    name: 'Hearts & Emotions',
    icon: 'heart-outline',
    emojis: [
      { emoji: '❤️', name: 'red heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '🧡', name: 'orange heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💛', name: 'yellow heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💚', name: 'green heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💙', name: 'blue heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💜', name: 'purple heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '🖤', name: 'black heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '🤍', name: 'white heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '🤎', name: 'brown heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💔', name: 'broken heart', category: 'emotions', keywords: ['sad', 'broken'] },
      { emoji: '❣️', name: 'heart exclamation', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💕', name: 'two hearts', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💞', name: 'revolving hearts', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💓', name: 'beating heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💗', name: 'growing heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💖', name: 'sparkling heart', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💘', name: 'heart with arrow', category: 'emotions', keywords: ['love', 'cupid'] },
      { emoji: '💝', name: 'heart with ribbon', category: 'emotions', keywords: ['love', 'gift'] },
      { emoji: '💟', name: 'heart decoration', category: 'emotions', keywords: ['love', 'heart'] },
      { emoji: '💋', name: 'kiss mark', category: 'emotions', keywords: ['kiss', 'lips'] },
      { emoji: '💯', name: 'hundred points', category: 'emotions', keywords: ['100', 'perfect'] },
      { emoji: '💢', name: 'anger symbol', category: 'emotions', keywords: ['anger', 'mad'] },
      { emoji: '💥', name: 'collision', category: 'emotions', keywords: ['boom', 'explosion'] },
      { emoji: '💫', name: 'dizzy', category: 'emotions', keywords: ['dizzy', 'star'] },
      { emoji: '💦', name: 'sweat droplets', category: 'emotions', keywords: ['sweat', 'water'] },
      { emoji: '💨', name: 'dashing away', category: 'emotions', keywords: ['fast', 'wind'] },
      { emoji: '🕳️', name: 'hole', category: 'emotions', keywords: ['hole', 'empty'] },
      { emoji: '💬', name: 'speech balloon', category: 'emotions', keywords: ['speech', 'talk'] },
      { emoji: '💭', name: 'thought balloon', category: 'emotions', keywords: ['thought', 'thinking'] },
      { emoji: '💤', name: 'zzz', category: 'emotions', keywords: ['sleep', 'tired'] },
    ],
  },
  {
    id: 'activities',
    name: 'Gaming & Activities',
    icon: 'game-controller-outline',
    emojis: [
      { emoji: '🎮', name: 'video game', category: 'activities', keywords: ['gaming', 'controller'] },
      { emoji: '🕹️', name: 'joystick', category: 'activities', keywords: ['gaming', 'arcade'] },
      { emoji: '🎲', name: 'game die', category: 'activities', keywords: ['dice', 'game'] },
      { emoji: '🎯', name: 'direct hit', category: 'activities', keywords: ['target', 'bullseye'] },
      { emoji: '🏆', name: 'trophy', category: 'activities', keywords: ['winner', 'award'] },
      { emoji: '🥇', name: 'first place medal', category: 'activities', keywords: ['gold', 'winner'] },
      { emoji: '🥈', name: 'second place medal', category: 'activities', keywords: ['silver', 'second'] },
      { emoji: '🥉', name: 'third place medal', category: 'activities', keywords: ['bronze', 'third'] },
      { emoji: '🏅', name: 'sports medal', category: 'activities', keywords: ['medal', 'award'] },
      { emoji: '🎖️', name: 'military medal', category: 'activities', keywords: ['medal', 'honor'] },
      { emoji: '⚽', name: 'soccer ball', category: 'activities', keywords: ['football', 'soccer', 'sport'] },
      { emoji: '🏀', name: 'basketball', category: 'activities', keywords: ['basketball', 'sport'] },
      { emoji: '🏈', name: 'american football', category: 'activities', keywords: ['football', 'american', 'sport'] },
      { emoji: '⚾', name: 'baseball', category: 'activities', keywords: ['baseball', 'sport'] },
      { emoji: '🎾', name: 'tennis', category: 'activities', keywords: ['tennis', 'sport'] },
      { emoji: '🏐', name: 'volleyball', category: 'activities', keywords: ['volleyball', 'sport'] },
      { emoji: '🏉', name: 'rugby football', category: 'activities', keywords: ['rugby', 'sport'] },
      { emoji: '🎱', name: 'pool 8 ball', category: 'activities', keywords: ['pool', 'billiards'] },
      { emoji: '🏓', name: 'ping pong', category: 'activities', keywords: ['ping pong', 'table tennis'] },
      { emoji: '🏸', name: 'badminton', category: 'activities', keywords: ['badminton', 'sport'] },
      { emoji: '🎪', name: 'circus tent', category: 'activities', keywords: ['circus', 'entertainment'] },
      { emoji: '🎨', name: 'artist palette', category: 'activities', keywords: ['art', 'painting'] },
      { emoji: '🎭', name: 'performing arts', category: 'activities', keywords: ['theater', 'drama'] },
      { emoji: '🎬', name: 'clapper board', category: 'activities', keywords: ['movie', 'film'] },
      { emoji: '🎤', name: 'microphone', category: 'activities', keywords: ['sing', 'music'] },
      { emoji: '🎧', name: 'headphone', category: 'activities', keywords: ['music', 'listen'] },
      { emoji: '🎵', name: 'musical note', category: 'activities', keywords: ['music', 'note'] },
      { emoji: '🎶', name: 'musical notes', category: 'activities', keywords: ['music', 'notes'] },
      { emoji: '🎼', name: 'musical score', category: 'activities', keywords: ['music', 'sheet'] },
      { emoji: '🎹', name: 'musical keyboard', category: 'activities', keywords: ['piano', 'music'] },
      { emoji: '🥁', name: 'drum', category: 'activities', keywords: ['drum', 'music'] },
      { emoji: '🎸', name: 'guitar', category: 'activities', keywords: ['guitar', 'music'] },
    ],
  },
  {
    id: 'nature',
    name: 'Nature (Essential)',
    icon: 'leaf-outline',
    emojis: [
      { emoji: '🐶', name: 'dog face', category: 'nature', keywords: ['dog', 'pet'] },
      { emoji: '🐱', name: 'cat face', category: 'nature', keywords: ['cat', 'pet'] },
      { emoji: '🐭', name: 'mouse face', category: 'nature', keywords: ['mouse', 'animal'] },
      { emoji: '🐰', name: 'rabbit face', category: 'nature', keywords: ['rabbit', 'bunny'] },
      { emoji: '🦊', name: 'fox', category: 'nature', keywords: ['fox', 'animal'] },
      { emoji: '🐻', name: 'bear', category: 'nature', keywords: ['bear', 'animal'] },
      { emoji: '🐼', name: 'panda', category: 'nature', keywords: ['panda', 'animal'] },
      { emoji: '🐨', name: 'koala', category: 'nature', keywords: ['koala', 'australia'] },
      { emoji: '🐯', name: 'tiger face', category: 'nature', keywords: ['tiger', 'animal'] },
      { emoji: '🦁', name: 'lion', category: 'nature', keywords: ['lion', 'animal'] },
      { emoji: '🐸', name: 'frog', category: 'nature', keywords: ['frog', 'animal'] },
      { emoji: '🐵', name: 'monkey face', category: 'nature', keywords: ['monkey', 'animal'] },
      { emoji: '🙈', name: 'see-no-evil monkey', category: 'nature', keywords: ['monkey', 'see no evil'] },
      { emoji: '🙉', name: 'hear-no-evil monkey', category: 'nature', keywords: ['monkey', 'hear no evil'] },
      { emoji: '🙊', name: 'speak-no-evil monkey', category: 'nature', keywords: ['monkey', 'speak no evil'] },
      { emoji: '🐔', name: 'chicken', category: 'nature', keywords: ['chicken', 'bird'] },
      { emoji: '🐧', name: 'penguin', category: 'nature', keywords: ['penguin', 'bird'] },
      { emoji: '🐦', name: 'bird', category: 'nature', keywords: ['bird', 'animal'] },
      { emoji: '🦅', name: 'eagle', category: 'nature', keywords: ['eagle', 'bird'] },
      { emoji: '🦉', name: 'owl', category: 'nature', keywords: ['owl', 'bird'] },
      { emoji: '🦄', name: 'unicorn', category: 'nature', keywords: ['unicorn', 'fantasy'] },
      { emoji: '🐝', name: 'honeybee', category: 'nature', keywords: ['bee', 'honey'] },
      { emoji: '🦋', name: 'butterfly', category: 'nature', keywords: ['butterfly', 'beautiful'] },
      { emoji: '🐌', name: 'snail', category: 'nature', keywords: ['snail', 'slow'] },
      { emoji: '🐞', name: 'lady beetle', category: 'nature', keywords: ['ladybug', 'bug'] },
      { emoji: '🐢', name: 'turtle', category: 'nature', keywords: ['turtle', 'slow'] },
      { emoji: '🐍', name: 'snake', category: 'nature', keywords: ['snake', 'animal'] },
      { emoji: '🐙', name: 'octopus', category: 'nature', keywords: ['octopus', 'sea'] },
      { emoji: '🦈', name: 'shark', category: 'nature', keywords: ['shark', 'dangerous'] },
      { emoji: '🐬', name: 'dolphin', category: 'nature', keywords: ['dolphin', 'sea'] },
      { emoji: '🐳', name: 'spouting whale', category: 'nature', keywords: ['whale', 'sea'] },
      { emoji: '🐉', name: 'dragon', category: 'nature', keywords: ['dragon', 'fantasy'] },
      { emoji: '🌵', name: 'cactus', category: 'nature', keywords: ['cactus', 'desert'] },
      { emoji: '🎄', name: 'christmas tree', category: 'nature', keywords: ['christmas', 'tree'] },
      { emoji: '🌲', name: 'evergreen tree', category: 'nature', keywords: ['tree', 'forest'] },
      { emoji: '🌳', name: 'deciduous tree', category: 'nature', keywords: ['tree', 'forest'] },
      { emoji: '🌴', name: 'palm tree', category: 'nature', keywords: ['palm', 'tropical'] },
      { emoji: '🌱', name: 'seedling', category: 'nature', keywords: ['plant', 'growing'] },
      { emoji: '🍀', name: 'four leaf clover', category: 'nature', keywords: ['luck', 'clover'] },
      { emoji: '🌹', name: 'rose', category: 'nature', keywords: ['rose', 'love'] },
      { emoji: '🌻', name: 'sunflower', category: 'nature', keywords: ['sunflower', 'yellow'] },
      { emoji: '🌸', name: 'cherry blossom', category: 'nature', keywords: ['sakura', 'spring'] },
    ],
  },
  {
    id: 'food',
    name: 'Food (Popular)',
    icon: 'pizza-outline',
    emojis: [
      { emoji: '🍎', name: 'red apple', category: 'food', keywords: ['apple', 'fruit'] },
      { emoji: '🍊', name: 'tangerine', category: 'food', keywords: ['orange', 'fruit'] },
      { emoji: '🍌', name: 'banana', category: 'food', keywords: ['banana', 'fruit'] },
      { emoji: '🍉', name: 'watermelon', category: 'food', keywords: ['watermelon', 'fruit'] },
      { emoji: '🍇', name: 'grapes', category: 'food', keywords: ['grapes', 'fruit'] },
      { emoji: '🍓', name: 'strawberry', category: 'food', keywords: ['strawberry', 'fruit'] },
      { emoji: '🥑', name: 'avocado', category: 'food', keywords: ['avocado', 'fruit'] },
      { emoji: '🌽', name: 'ear of corn', category: 'food', keywords: ['corn', 'vegetable'] },
      { emoji: '🥕', name: 'carrot', category: 'food', keywords: ['carrot', 'vegetable'] },
      { emoji: '🍔', name: 'hamburger', category: 'food', keywords: ['burger', 'fast food'] },
      { emoji: '🍟', name: 'french fries', category: 'food', keywords: ['fries', 'fast food'] },
      { emoji: '🍕', name: 'pizza', category: 'food', keywords: ['pizza', 'italian'] },
      { emoji: '🌭', name: 'hot dog', category: 'food', keywords: ['hot dog', 'fast food'] },
      { emoji: '🌮', name: 'taco', category: 'food', keywords: ['taco', 'mexican'] },
      { emoji: '🌯', name: 'burrito', category: 'food', keywords: ['burrito', 'mexican'] },
      { emoji: '🍜', name: 'steaming bowl', category: 'food', keywords: ['ramen', 'noodles'] },
      { emoji: '🍝', name: 'spaghetti', category: 'food', keywords: ['pasta', 'italian'] },
      { emoji: '🍣', name: 'sushi', category: 'food', keywords: ['sushi', 'japanese'] },
      { emoji: '🍦', name: 'soft ice cream', category: 'food', keywords: ['ice cream', 'dessert'] },
      { emoji: '🍩', name: 'doughnut', category: 'food', keywords: ['donut', 'dessert'] },
      { emoji: '🍪', name: 'cookie', category: 'food', keywords: ['cookie', 'dessert'] },
      { emoji: '🎂', name: 'birthday cake', category: 'food', keywords: ['cake', 'birthday'] },
      { emoji: '🍰', name: 'shortcake', category: 'food', keywords: ['cake', 'dessert'] },
      { emoji: '🍫', name: 'chocolate bar', category: 'food', keywords: ['chocolate', 'dessert'] },
      { emoji: '🍬', name: 'candy', category: 'food', keywords: ['candy', 'sweet'] },
      { emoji: '🍯', name: 'honey pot', category: 'food', keywords: ['honey', 'sweet'] },
      { emoji: '☕', name: 'hot beverage', category: 'food', keywords: ['coffee', 'tea'] },
      { emoji: '🍵', name: 'teacup without handle', category: 'food', keywords: ['tea', 'green tea'] },
      { emoji: '🍺', name: 'beer mug', category: 'food', keywords: ['beer', 'alcohol'] },
      { emoji: '🍻', name: 'clinking beer mugs', category: 'food', keywords: ['cheers', 'beer'] },
      { emoji: '🥂', name: 'clinking glasses', category: 'food', keywords: ['cheers', 'champagne'] },
      { emoji: '🍷', name: 'wine glass', category: 'food', keywords: ['wine', 'alcohol'] },
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols & Objects',
    icon: 'star-outline',
    emojis: [
      { emoji: '⭐', name: 'star', category: 'symbols', keywords: ['star', 'favorite'] },
      { emoji: '🌟', name: 'glowing star', category: 'symbols', keywords: ['star', 'sparkle'] },
      { emoji: '✨', name: 'sparkles', category: 'symbols', keywords: ['sparkle', 'magic'] },
      { emoji: '⚡', name: 'high voltage', category: 'symbols', keywords: ['lightning', 'electric'] },
      { emoji: '🔥', name: 'fire', category: 'symbols', keywords: ['fire', 'hot'] },
      { emoji: '🌈', name: 'rainbow', category: 'symbols', keywords: ['rainbow', 'colorful'] },
      { emoji: '☀️', name: 'sun', category: 'symbols', keywords: ['sun', 'bright'] },
      { emoji: '🌙', name: 'crescent moon', category: 'symbols', keywords: ['moon', 'night'] },
      { emoji: '❄️', name: 'snowflake', category: 'symbols', keywords: ['snow', 'cold'] },
      { emoji: '☃️', name: 'snowman', category: 'symbols', keywords: ['snowman', 'winter'] },
      { emoji: '🌊', name: 'water wave', category: 'symbols', keywords: ['wave', 'ocean'] },
      { emoji: '📱', name: 'mobile phone', category: 'symbols', keywords: ['phone', 'mobile'] },
      { emoji: '💻', name: 'laptop', category: 'symbols', keywords: ['computer', 'laptop'] },
      { emoji: '🎥', name: 'movie camera', category: 'symbols', keywords: ['camera', 'movie'] },
      { emoji: '📷', name: 'camera', category: 'symbols', keywords: ['camera', 'photo'] },
      { emoji: '📺', name: 'television', category: 'symbols', keywords: ['tv', 'television'] },
      { emoji: '🔍', name: 'magnifying glass tilted left', category: 'symbols', keywords: ['search', 'zoom'] },
      { emoji: '💡', name: 'light bulb', category: 'symbols', keywords: ['idea', 'light'] },
      { emoji: '📚', name: 'books', category: 'symbols', keywords: ['books', 'library'] },
      { emoji: '💰', name: 'money bag', category: 'symbols', keywords: ['money', 'bag'] },
      { emoji: '💳', name: 'credit card', category: 'symbols', keywords: ['card', 'credit'] },
      { emoji: '🚗', name: 'automobile', category: 'symbols', keywords: ['car', 'vehicle'] },
      { emoji: '✈️', name: 'airplane', category: 'symbols', keywords: ['plane', 'aircraft'] },
      { emoji: '🚀', name: 'rocket', category: 'symbols', keywords: ['rocket', 'space'] },
      { emoji: '🎁', name: 'wrapped gift', category: 'symbols', keywords: ['gift', 'present'] },
      { emoji: '🎉', name: 'party popper', category: 'symbols', keywords: ['party', 'celebrate'] },
      { emoji: '🎊', name: 'confetti ball', category: 'symbols', keywords: ['party', 'confetti'] },
      { emoji: '🎈', name: 'balloon', category: 'symbols', keywords: ['balloon', 'party'] },
      { emoji: '🔑', name: 'key', category: 'symbols', keywords: ['key', 'unlock'] },
      { emoji: '🔒', name: 'locked', category: 'symbols', keywords: ['lock', 'secure'] },
      { emoji: '🔓', name: 'unlocked', category: 'symbols', keywords: ['unlock', 'open'] },
      { emoji: '⚠️', name: 'warning', category: 'symbols', keywords: ['warning', 'caution'] },
      { emoji: '❌', name: 'cross mark', category: 'symbols', keywords: ['x', 'no'] },
      { emoji: '✅', name: 'check mark button', category: 'symbols', keywords: ['check', 'yes'] },
      { emoji: '❓', name: 'question mark', category: 'symbols', keywords: ['question', 'help'] },
      { emoji: '❕', name: 'exclamation mark', category: 'symbols', keywords: ['exclamation', 'important'] },
      { emoji: '🆕', name: 'NEW button', category: 'symbols', keywords: ['new', 'fresh'] },
      { emoji: '🔞', name: 'no one under eighteen', category: 'symbols', keywords: ['18+', 'adult'] },
      { emoji: '📍', name: 'round pushpin', category: 'symbols', keywords: ['location', 'pin'] },
      { emoji: '🏠', name: 'house', category: 'symbols', keywords: ['home', 'house'] },
    ],
  },
  {
    id: 'flags',
    name: 'Popular Flags',
    icon: 'flag-outline',
    emojis: [
      { emoji: '🏁', name: 'chequered flag', category: 'flags', keywords: ['race', 'finish'] },
      { emoji: '🚩', name: 'triangular flag', category: 'flags', keywords: ['flag', 'warning'] },
      { emoji: '🏳️‍🌈', name: 'rainbow flag', category: 'flags', keywords: ['pride', 'lgbt'] },
      { emoji: '🏳️‍⚧️', name: 'transgender flag', category: 'flags', keywords: ['transgender', 'pride'] },
      { emoji: '🏴‍☠️', name: 'pirate flag', category: 'flags', keywords: ['pirate', 'skull'] },
      { emoji: '🇺🇸', name: 'flag: united states', category: 'flags', keywords: ['usa', 'america'] },
      { emoji: '🇬🇧', name: 'flag: united kingdom', category: 'flags', keywords: ['uk', 'britain'] },
      { emoji: '🇨🇦', name: 'flag: canada', category: 'flags', keywords: ['canada', 'maple'] },
      { emoji: '🇦🇺', name: 'flag: australia', category: 'flags', keywords: ['australia', 'aussie'] },
      { emoji: '🇩🇪', name: 'flag: germany', category: 'flags', keywords: ['germany', 'german'] },
      { emoji: '🇫🇷', name: 'flag: france', category: 'flags', keywords: ['france', 'french'] },
      { emoji: '🇪🇸', name: 'flag: spain', category: 'flags', keywords: ['spain', 'spanish'] },
      { emoji: '🇮🇹', name: 'flag: italy', category: 'flags', keywords: ['italy', 'italian'] },
      { emoji: '🇯🇵', name: 'flag: japan', category: 'flags', keywords: ['japan', 'japanese'] },
      { emoji: '🇰🇷', name: 'flag: south korea', category: 'flags', keywords: ['korea', 'korean'] },
      { emoji: '🇨🇳', name: 'flag: china', category: 'flags', keywords: ['china', 'chinese'] },
      { emoji: '🇮🇳', name: 'flag: india', category: 'flags', keywords: ['india', 'indian'] },
      { emoji: '🇧🇷', name: 'flag: brazil', category: 'flags', keywords: ['brazil', 'brazilian'] },
      { emoji: '🇲🇽', name: 'flag: mexico', category: 'flags', keywords: ['mexico', 'mexican'] },
      { emoji: '🇷🇺', name: 'flag: russia', category: 'flags', keywords: ['russia', 'russian'] },
    ],
  },
];

// Skin tone modifiers
const SKIN_TONES = {
  light: '🏻',
  mediumLight: '🏼',
  medium: '🏽',
  mediumDark: '🏾',
  dark: '🏿',
};

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  visible,
  onSelect,
  onClose,
  recentEmojis = [],
  onUpdateRecents,
}) => {
  // State
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmojis, setFilteredEmojis] = useState<EmojiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [skinTone, setSkinTone] = useState<keyof typeof SKIN_TONES | ''>('');

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const selectedEmojiAnimation = useRef(new Animated.Value(0)).current;
  const selectedEmojiOpacity = useRef(new Animated.Value(0)).current;
  const selectedEmojiScale = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const [selectedEmojiForAnimation, setSelectedEmojiForAnimation] = useState('');

  // ================================================================
  // PERFORMANCE OPTIMIZATIONS
  // ================================================================

  // Memoized emoji categories with recent emojis
  const emojiCategories = useMemo(() => {
    const categories = [...EMOJI_DATABASE];
    
    // Update recent category with actual recent emojis
    if (recentEmojis.length > 0) {
      const recentEmojiItems: EmojiItem[] = recentEmojis.map(emoji => {
        // Find emoji in database
        for (const category of EMOJI_DATABASE) {
          const found = category.emojis.find(item => item.emoji === emoji);
          if (found) return found;
        }
        // Fallback for emojis not in database
        return {
          emoji,
          name: 'recent emoji',
          category: 'recent',
          keywords: ['recent'],
        };
      });
      
      categories[0] = {
        ...categories[0],
        emojis: recentEmojiItems,
      };
    }
    
    return categories;
  }, [recentEmojis]);

  // Get all emojis for current category or search results
  const currentEmojis = useMemo(() => {
    if (searchQuery && filteredEmojis.length > 0) {
      return filteredEmojis;
    }
    
    if (selectedCategory === 'recent' && recentEmojis.length === 0) {
      // Show popular emojis when no recent emojis
      return EMOJI_DATABASE[1].emojis.slice(0, 20); // Show first 20 people emojis
    }
    
    const category = emojiCategories.find(cat => cat.id === selectedCategory);
    return category?.emojis || [];
  }, [searchQuery, filteredEmojis, selectedCategory, emojiCategories, recentEmojis]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (!query.trim()) {
        setFilteredEmojis([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const searchTerm = query.toLowerCase().trim();
      const results: EmojiItem[] = [];

      // Search through all emojis
      for (const category of EMOJI_DATABASE) {
        for (const emoji of category.emojis) {
          const searchableText = [
            emoji.name,
            emoji.category,
            ...emoji.keywords,
          ].join(' ').toLowerCase();

          if (searchableText.includes(searchTerm)) {
            results.push(emoji);
          }

          // Limit results for performance
          if (results.length >= 60) break;
        }
        if (results.length >= 60) break;
      }

      if (isMountedRef.current) {
        setFilteredEmojis(results);
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS),
    []
  );

  // ================================================================
  // SKIN TONE FUNCTIONALITY
  // ================================================================

  // Apply skin tone to emoji
  const applySkintone = useCallback((emoji: string, tone: keyof typeof SKIN_TONES | '') => {
    if (!tone || !SKIN_TONES[tone]) return emoji;
    
    const toneModifier = SKIN_TONES[tone];
    
    // List of emojis that support skin tones
    const skinToneEmojis = [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌',
      '👐', '🤲', '🙏', '✍️', '💅', '🤳', '💪', '🦵', '🦶', '👂', '🦻', '👃', '👶',
      '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '👩', '🧓', '👴', '👵', '🙍', '🙎',
      '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷', '👮', '🕵️', '💂', '👷', '🤴',
      '👸', '👳', '👲', '🧕', '🤵', '👰', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹',
      '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃',
      '💃', '🕺', '🕴️', '👯', '🧖', '🧗', '🏌️', '🏄', '🚣', '🏊', '⛹️', '🏋️', '🚴',
      '🚵', '🤸', '🤼', '🤽', '🤾', '🤹', '🧘', '🛀', '🛌'
    ];
    
    // Check if emoji supports skin tone
    const baseEmoji = emoji.split('🏻')[0].split('🏼')[0].split('🏽')[0].split('🏾')[0].split('🏿')[0];
    
    if (skinToneEmojis.includes(baseEmoji)) {
      return baseEmoji + toneModifier;
    }
    
    return emoji;
  }, []);

  // ================================================================
  // VISUAL FEEDBACK ANIMATION
  // ================================================================

  const triggerEmojiAnimation = useCallback((emoji: string) => {
    setSelectedEmojiForAnimation(emoji);
    
    // Reset animations
    selectedEmojiScale.setValue(0);
    selectedEmojiOpacity.setValue(1);
    
    // Start animations
    Animated.parallel([
      Animated.spring(selectedEmojiScale, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.timing(selectedEmojiOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Reset after animation
      setSelectedEmojiForAnimation('');
      selectedEmojiScale.setValue(0);
      selectedEmojiOpacity.setValue(0);
    });
  }, [selectedEmojiScale, selectedEmojiOpacity]);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleEmojiSelect = useCallback((emojiItem: EmojiItem) => {
    const finalEmoji = emojiItem.supportsSkinTone ? 
      applySkintone(emojiItem.emoji, skinTone) : 
      emojiItem.emoji;
    
    // Trigger visual feedback
    triggerEmojiAnimation(finalEmoji);
    
    onSelect(finalEmoji);

    // Update recent emojis
    if (onUpdateRecents) {
      const newRecents = [finalEmoji, ...recentEmojis.filter(e => e !== finalEmoji)].slice(0, MAX_RECENT_EMOJIS);
      onUpdateRecents(newRecents);
    }

    // Don't close the picker to allow multiple selections
  }, [skinTone, applySkintone, triggerEmojiAnimation, onSelect, onUpdateRecents, recentEmojis]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    setFilteredEmojis([]);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    debouncedSearch(text);
  }, [debouncedSearch]);

  const handleClose = useCallback(() => {
    setSearchQuery('');
    setFilteredEmojis([]);
    onClose();
  }, [onClose]);

  const handleSkinToneSelect = useCallback((tone: keyof typeof SKIN_TONES | '') => {
    setSkinTone(tone === skinTone ? '' : tone);
  }, [skinTone]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Animation effect
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnimation]);

// ================================================================
  // RENDER COMPONENTS - SMART RENDERING WITH FLATLIST
  // ================================================================

  const renderEmojiItem = useCallback(({ item, index }: { item: EmojiItem; index: number }) => {
    const finalEmoji = item.supportsSkinTone ? 
      applySkintone(item.emoji, skinTone) : 
      item.emoji;

    return (
      <TouchableOpacity
        style={styles.emojiButton}
        onPress={() => handleEmojiSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        activeOpacity={0.7}
      >
        <Text style={styles.emoji}>{finalEmoji}</Text>
      </TouchableOpacity>
    );
  }, [handleEmojiSelect, applySkintone, skinTone]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: EMOJI_SIZE,
    offset: Math.floor(index / EMOJIS_PER_ROW) * EMOJI_SIZE,
    index,
  }), []);

  const keyExtractor = useCallback((item: EmojiItem, index: number) => `${item.emoji}-${index}`, []);

  const renderCategoryTabs = () => (
    <View style={styles.categoryTabsContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryTabs}
        data={emojiCategories}
        keyExtractor={(item) => item.id}
        renderItem={({ item: category }) => (
          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === category.id && styles.categoryTabActive,
            ]}
            onPress={() => handleCategorySelect(category.id)}
            accessibilityRole="tab"
            accessibilityLabel={category.name}
            accessibilityState={{ selected: selectedCategory === category.id }}
          >
            <Ionicons
              name={category.icon as any}
              size={20}
              color={selectedCategory === category.id ? '#000' : '#00FFFF'}
            />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={16} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search emojis..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          accessibilityLabel="Search emojis"
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#00FFFF" style={styles.searchLoading} />
        )}
        {searchQuery !== '' && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setFilteredEmojis([]);
            }}
            style={styles.searchClear}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close" size={16} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderSkinTonePicker = () => (
    <View style={styles.skinToneContainer}>
      <Text style={styles.skinToneLabel}>Skin Tone:</Text>
      <View style={styles.skinToneOptions}>
        {[
          { key: '', emoji: '👋', name: 'Default' },
          { key: 'light', emoji: '👋🏻', name: 'Light' },
          { key: 'mediumLight', emoji: '👋🏼', name: 'Medium Light' },
          { key: 'medium', emoji: '👋🏽', name: 'Medium' },
          { key: 'mediumDark', emoji: '👋🏾', name: 'Medium Dark' },
          { key: 'dark', emoji: '👋🏿', name: 'Dark' },
        ].map((tone) => (
          <TouchableOpacity
            key={tone.key}
            style={[
              styles.skinToneOption,
              skinTone === tone.key && styles.skinToneOptionActive,
            ]}
            onPress={() => handleSkinToneSelect(tone.key as keyof typeof SKIN_TONES | '')}
            accessibilityRole="button"
            accessibilityLabel={`Select ${tone.name} skin tone`}
            accessibilityState={{ selected: skinTone === tone.key }}
          >
            <Text style={styles.skinToneEmoji}>{tone.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmojiContent = () => {
    if (searchQuery && filteredEmojis.length === 0 && !isSearching) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color="#666" />
          <Text style={styles.emptyStateTitle}>No emojis found</Text>
          <Text style={styles.emptyStateSubtitle}>
            Try a different search term
          </Text>
        </View>
      );
    }

    if (currentEmojis.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="happy-outline" size={48} color="#666" />
          <Text style={styles.emptyStateTitle}>No recent emojis</Text>
          <Text style={styles.emptyStateSubtitle}>
            Start using emojis to see them here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emojiContainer}>
        <FlatList
          data={currentEmojis}
          renderItem={renderEmojiItem}
          keyExtractor={keyExtractor}
          numColumns={EMOJIS_PER_ROW}
          contentContainerStyle={styles.emojiGrid}
          showsVerticalScrollIndicator={false}
          initialNumToRender={40}
          maxToRenderPerBatch={20}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  };

  // ================================================================
  // MAIN RENDER
  // ================================================================

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      >
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      </TouchableOpacity>

      {/* Emoji Picker Container */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.9)']}
          style={styles.pickerContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Choose Emoji</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close emoji picker"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {renderSearchBar()}

          {/* Skin Tone Picker */}
          {renderSkinTonePicker()}

          {/* Category Tabs */}
          {!searchQuery && renderCategoryTabs()}

          {/* Emoji Content */}
          {renderEmojiContent()}

          {/* Selected Emoji Animation Overlay */}
          {selectedEmojiForAnimation && (
            <View style={styles.animationOverlay} pointerEvents="none">
              <Animated.Text
                style={[
                  styles.selectedEmojiAnimation,
                  {
                    opacity: selectedEmojiOpacity,
                    transform: [
                      {
                        scale: selectedEmojiScale.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.5, 2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {selectedEmojiForAnimation}
              </Animated.Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
};

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

// ================================================================
// STYLES
// ================================================================

const styles = StyleSheet.create({
  // Modal & Container
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.7,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  pickerContainer: {
    flex: 1,
    paddingTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  searchLoading: {
    marginLeft: 8,
  },
  searchClear: {
    marginLeft: 8,
    padding: 4,
  },

  // Skin Tone
  skinToneContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  skinToneLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  skinToneOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  skinToneOption: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skinToneOptionActive: {
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: '#00FFFF',
  },
  skinToneEmoji: {
    fontSize: 20,
  },

  // Category Tabs
  categoryTabsContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 255, 0.2)',
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    width: 50,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#00FFFF',
  },

  // Emoji Content
  emojiContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emojiGrid: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emojiButton: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  emoji: {
    fontSize: 32,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },

  // Animation Overlay
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectedEmojiAnimation: {
    fontSize: 80,
    textAlign: 'center',
  },
});

export default memo(EmojiPicker);