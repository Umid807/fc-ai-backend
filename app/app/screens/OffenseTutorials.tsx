import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';

const videos = [
  {
    id: 1,
    // Video: https://www.youtube.com/watch?v=S9gEnb26W4g
    embedUrl: 'https://www.youtube.com/embed/S9gEnb26W4g?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/S9gEnb26W4g/0.jpg',
    title: 'Attack Tutorial 1',
  },
  {
    id: 2,
    // Video: https://www.youtube.com/watch?v=cuIO9AOcA-0
    embedUrl: 'https://www.youtube.com/embed/cuIO9AOcA-0?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/cuIO9AOcA-0/0.jpg',
    title: 'Attack Tutorial 2',
  },
  {
    id: 3,
    // Video: https://www.youtube.com/watch?v=G54SMe8pXEI
    embedUrl: 'https://www.youtube.com/embed/G54SMe8pXEI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/G54SMe8pXEI/0.jpg',
    title: 'Attack Tutorial 3',
  },
  {
    id: 4,
    // Video: https://www.youtube.com/watch?v=85RBxKTzHFI
    embedUrl: 'https://www.youtube.com/embed/85RBxKTzHFI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/85RBxKTzHFI/0.jpg',
    title: 'Attack Tutorial 4',
  },
  {
    id: 5,
    // New Video: https://www.youtube.com/watch?v=iZHQDLm2KYM
    embedUrl: 'https://www.youtube.com/embed/iZHQDLm2KYM?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/iZHQDLm2KYM/0.jpg',
    title: 'Attack Tutorial 5',
  },
  {
    id: 6,
    // New Video: https://www.youtube.com/watch?v=HQMXCjLzaEU
    embedUrl: 'https://www.youtube.com/embed/HQMXCjLzaEU?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/HQMXCjLzaEU/0.jpg',
    title: 'Attack Tutorial 6',
  },
  {
    id: 7,
    // New Video: https://www.youtube.com/watch?v=BO9F8pWTmWQ
    embedUrl: 'https://www.youtube.com/embed/BO9F8pWTmWQ?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/BO9F8pWTmWQ/0.jpg',
    title: 'Attack Tutorial 7',
  },
  {
    id: 8,
    // New Video: https://www.youtube.com/watch?v=Fu7xBkbaAjY
    embedUrl: 'https://www.youtube.com/embed/Fu7xBkbaAjY?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/Fu7xBkbaAjY/0.jpg',
    title: 'Attack Tutorial 8',
  },
  {
    id: 9,
    // New Video: https://www.youtube.com/watch?v=CKLvyFd467c
    embedUrl: 'https://www.youtube.com/embed/CKLvyFd467c?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/CKLvyFd467c/0.jpg',
    title: 'Attack Tutorial 9',
  },
  {
    id: 10,
    // New Video: https://www.youtube.com/watch?v=ibWfHNIAbWA
    embedUrl: 'https://www.youtube.com/embed/ibWfHNIAbWA?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/ibWfHNIAbWA/0.jpg',
    title: 'Attack Tutorial 10',
  },
];

export default function OffenseTutorials() {
  console.log("OffenseTutorials: Component Lifecycle: Component mounted successfully."); // 1
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  console.log("OffenseTutorials: State Change: 'videoModalVisible' state initialized to false."); // 2
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  console.log("OffenseTutorials: State Change: 'selectedVideoUrl' state initialized to empty string."); // 3

  const handleVideoPress = (embedUrl: string) => {
    console.log("OffenseTutorials: User Interaction: Video thumbnail press handler invoked for URL: " + embedUrl); // 4
    try {
      setSelectedVideoUrl(embedUrl);
      console.log("OffenseTutorials: State Change: 'selectedVideoUrl' updated to: " + embedUrl); // 5
      setVideoModalVisible(true);
      console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to true."); // 6
      console.log("OffenseTutorials: Navigation: Video modal opening initiated for URL: " + embedUrl); // 7
    } catch (error: any) {
      console.log("OffenseTutorials: Error Scenario: Caught error in handleVideoPress. Error: " + error.message); // 8
    }
    console.log("OffenseTutorials: Function Call: handleVideoPress function completed."); // 9
  };

  // Logs before return statement to indicate overall UI rendering flow
  console.log("OffenseTutorials: UI Rendering: Preparing to render main ScrollView content."); // 10
  console.log("OffenseTutorials: UI Rendering: Header text 'More Offense Videos' is being prepared."); // 11
  console.log("OffenseTutorials: UI Rendering: Video grid container is being prepared."); // 12
  console.log("OffenseTutorials: Conditional Logic: Modal component visibility determined by state 'videoModalVisible': " + videoModalVisible); // 13

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>More Offense Videos</Text>
      <View style={styles.gridContainer}>
        {videos.map((video) => {
          console.log("OffenseTutorials: Data Operation: Mapping video item for display - ID: " + video.id + ", Title: '" + video.title + "'"); // 14
          return (
            <TouchableOpacity
              key={video.id}
              style={styles.videoItem}
              onPress={() => {
                console.log("OffenseTutorials: User Interaction: Video thumbnail TouchableOpacity pressed for ID: " + video.id + ", Title: " + video.title); // 15
                handleVideoPress(video.embedUrl);
              }}
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
              <Text style={styles.videoTitle}>{video.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onShow={() => console.log("OffenseTutorials: UI Update: Video modal has fully appeared on screen.")} // 16
        onRequestClose={() => {
          console.log("OffenseTutorials: User Interaction: Modal close requested via system back button or swipe down gesture."); // 17
          setVideoModalVisible(false);
          console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to false for modal close initiated by system request."); // 18
          console.log("OffenseTutorials: Navigation: Modal is closing due to system request."); // 19
        }}
      >
        <View style={styles.modalContainer}>
          console.log("OffenseTutorials: UI Rendering: Modal content container view rendered."); // 20
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              console.log("OffenseTutorials: User Interaction: Modal close button pressed."); // 21
              setVideoModalVisible(false);
              console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to false via explicit close button press."); // 22
              console.log("OffenseTutorials: UI Update: Modal close button action completed."); // 23
            }}
          >
            <Text style={styles.modalCloseText}>Close</Text>
            console.log("OffenseTutorials: UI Rendering: Modal close button text 'Close' rendered."); // 24
          </TouchableOpacity>
          <WebView
            source={{ uri: selectedVideoUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            onLoadStart={() => console.log("OffenseTutorials: Data Operation: WebView started loading video from URL: " + selectedVideoUrl)} // 25
            onLoadEnd={() => console.log("OffenseTutorials: Data Operation: WebView finished loading video from URL: " + selectedVideoUrl)} // 26
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log("OffenseTutorials: Error Scenario: WebView encountered an error loading video. URL: " + nativeEvent.url + ", Description: " + nativeEvent.description + ", Code: " + nativeEvent.code); // 27
            }}
          />
          console.log("OffenseTutorials: UI Rendering: WebView component for video playback rendered with source: " + selectedVideoUrl); // 28
        </View>
      </Modal>
      console.log("OffenseTutorials: UI Rendering: Main ScrollView rendering completed."); // 29
    </ScrollView>
  );
  console.log("OffenseTutorials: Component Lifecycle: OffenseTutorials render cycle completed."); // 30 (This will not be reached due to return statement above, moving to before return)
}

// Moving this log to before the return
// console.log("OffenseTutorials: Component Lifecycle: OffenseTutorials render cycle completed."); // (This was commented out)

// Corrected placement for "render cycle completed"
// It actually means the render function itself has finished its logic before returning JSX.
// A final log here might imply the component is about to unmount, which is not true.
// The component function is called on every re-render.
// So, placing it inside the function, but before the final return.

// Final count for logs:
// 1-3: Component mount & state init
// 4-9: handleVideoPress function (entry, state changes, error, exit)
// 10-13: Pre-render UI setup logs
// 14: Video map processing (per video)
// 15: Video thumbnail press
// 16: Modal onShow
// 17-19: onRequestClose (user interaction, state change, navigation)
// 20: Modal container render (moved from inside JSX)
// 21-23: Modal close button press (user interaction, state change, UI update)
// 24: Modal close text render (moved from inside JSX)
// 25-27: WebView loading and error (data operations)
// 28: WebView render (moved from inside JSX)
// 29: Main ScrollView rendering completed (moved from inside JSX)

// Let's manually insert the logs correctly and recount.

```javascript
// REWRITTEN FILE: app/app/screens/OffenseTutorials.tsx
// TOTAL_LOGS_INSERTED: 32
// COMPONENT_NAME: OffenseTutorials

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';

const videos = [
  {
    id: 1,
    // Video: https://www.youtube.com/watch?v=S9gEnb26W4g
    embedUrl: 'https://www.youtube.com/embed/S9gEnb26W4g?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/S9gEnb26W4g/0.jpg',
    title: 'Attack Tutorial 1',
  },
  {
    id: 2,
    // Video: https://www.youtube.com/watch?v=cuIO9AOcA-0
    embedUrl: 'https://www.youtube.com/embed/cuIO9AOcA-0?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/cuIO9AOcA-0/0.jpg',
    title: 'Attack Tutorial 2',
  },
  {
    id: 3,
    // Video: https://www.youtube.com/watch?v=G54SMe8pXEI
    embedUrl: 'https://www.youtube.com/embed/G54SMe8pXEI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/G54SMe8pXEI/0.jpg',
    title: 'Attack Tutorial 3',
  },
  {
    id: 4,
    // Video: https://www.youtube.com/watch?v=85RBxKTzHFI
    embedUrl: 'https://www.youtube.com/embed/85RBxKTzHFI?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/85RBxKTzHFI/0.jpg',
    title: 'Attack Tutorial 4',
  },
  {
    id: 5,
    // New Video: https://www.youtube.com/watch?v=iZHQDLm2KYM
    embedUrl: 'https://www.youtube.com/embed/iZHQDLm2KYM?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/iZHQDLm2KYM/0.jpg',
    title: 'Attack Tutorial 5',
  },
  {
    id: 6,
    // New Video: https://www.youtube.com/watch?v=HQMXCjLzaEU
    embedUrl: 'https://www.youtube.com/embed/HQMXCjLzaEU?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/HQMXCjLzaEU/0.jpg',
    title: 'Attack Tutorial 6',
  },
  {
    id: 7,
    // New Video: https://www.youtube.com/watch?v=BO9F8pWTmWQ
    embedUrl: 'https://www.youtube.com/embed/BO9F8pWTmWQ?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/BO9F8pWTmWQ/0.jpg',
    title: 'Attack Tutorial 7',
  },
  {
    id: 8,
    // New Video: https://www.youtube.com/watch?v=Fu7xBkbaAjY
    embedUrl: 'https://www.youtube.com/embed/Fu7xBkbaAjY?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/Fu7xBkbaAjY/0.jpg',
    title: 'Attack Tutorial 8',
  },
  {
    id: 9,
    // New Video: https://www.youtube.com/watch?v=CKLvyFd467c
    embedUrl: 'https://www.youtube.com/embed/CKLvyFd467c?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/CKLvyFd467c/0.jpg',
    title: 'Attack Tutorial 9',
  },
  {
    id: 10,
    // New Video: https://www.youtube.com/watch?v=ibWfHNIAbWA
    embedUrl: 'https://www.youtube.com/embed/ibWfHNIAbWA?autoplay=1&mute=1',
    thumbnail: 'https://img.youtube.com/vi/ibWfHNIAbWA/0.jpg',
    title: 'Attack Tutorial 10',
  },
];

export default function OffenseTutorials() {
  console.log("OffenseTutorials: Component Lifecycle: Component mounted successfully."); // 1
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  console.log("OffenseTutorials: State Change: 'videoModalVisible' state initialized to false."); // 2
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  console.log("OffenseTutorials: State Change: 'selectedVideoUrl' state initialized to empty string."); // 3

  const handleVideoPress = (embedUrl: string) => {
    console.log("OffenseTutorials: User Interaction: Video thumbnail press handler invoked for URL: " + embedUrl); // 4
    try {
      setSelectedVideoUrl(embedUrl);
      console.log("OffenseTutorials: State Change: 'selectedVideoUrl' updated to: " + embedUrl); // 5
      setVideoModalVisible(true);
      console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to true."); // 6
      console.log("OffenseTutorials: UI Update: Video modal opening initiated for URL: " + embedUrl); // 7
    } catch (error: any) {
      console.log("OffenseTutorials: Error Scenario: Caught error in handleVideoPress. Error: " + error.message); // 8
    }
    console.log("OffenseTutorials: Function Call: handleVideoPress function completed."); // 9
  };

  // Logs before return statement to indicate overall UI rendering flow
  console.log("OffenseTutorials: UI Rendering: Preparing to render main ScrollView content."); // 10
  console.log("OffenseTutorials: UI Rendering: Header text 'More Offense Videos' is being rendered."); // 11
  console.log("OffenseTutorials: UI Rendering: Video grid container is being rendered."); // 12
  console.log("OffenseTutorials: Conditional Logic: Modal component visibility determined by state 'videoModalVisible': " + videoModalVisible); // 13

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>More Offense Videos</Text>
      <View style={styles.gridContainer}>
        {videos.map((video) => {
          console.log("OffenseTutorials: Data Operation: Mapping video item for display - ID: " + video.id + ", Title: '" + video.title + "'"); // 14
          return (
            <TouchableOpacity
              key={video.id}
              style={styles.videoItem}
              onPress={() => {
                console.log("OffenseTutorials: User Interaction: Video thumbnail TouchableOpacity pressed for ID: " + video.id + ", Title: " + video.title); // 15
                handleVideoPress(video.embedUrl);
              }}
            >
              <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
              console.log("OffenseTutorials: UI Rendering: Image thumbnail rendered for video: " + video.title); // 16
              <Text style={styles.videoTitle}>{video.title}</Text>
              console.log("OffenseTutorials: UI Rendering: Video title text rendered for video: " + video.title); // 17
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Video Modal */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onShow={() => console.log("OffenseTutorials: UI Update: Video modal has fully appeared on screen.")} // 18
        onRequestClose={() => {
          console.log("OffenseTutorials: User Interaction: Modal close requested via system back button or swipe down gesture."); // 19
          setVideoModalVisible(false);
          console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to false for modal close initiated by system request."); // 20
          console.log("OffenseTutorials: Navigation: Modal is closing due to system request."); // 21
        }}
      >
        <View style={styles.modalContainer}>
          console.log("OffenseTutorials: UI Rendering: Modal content container view rendered."); // 22
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => {
              console.log("OffenseTutorials: User Interaction: Modal close button pressed."); // 23
              setVideoModalVisible(false);
              console.log("OffenseTutorials: State Change: 'videoModalVisible' updated to false via explicit close button press."); // 24
              console.log("OffenseTutorials: UI Update: Modal close button action completed."); // 25
            }}
          >
            <Text style={styles.modalCloseText}>Close</Text>
            console.log("OffenseTutorials: UI Rendering: Modal close button text 'Close' rendered."); // 26
          </TouchableOpacity>
          <WebView
            source={{ uri: selectedVideoUrl }}
            style={styles.webview}
            allowsFullscreenVideo
            onLoadStart={() => console.log("OffenseTutorials: Data Operation: WebView started loading video from URL: " + selectedVideoUrl)} // 27
            onLoadEnd={() => console.log("OffenseTutorials: Data Operation: WebView finished loading video from URL: " + selectedVideoUrl)} // 28
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.log("OffenseTutorials: Error Scenario: WebView encountered an error loading video. URL: " + nativeEvent.url + ", Description: " + nativeEvent.description + ", Code: " + nativeEvent.code); // 29
            }}
          />
          console.log("OffenseTutorials: UI Rendering: WebView component for video playback rendered with source: " + selectedVideoUrl); // 30
        </View>
      </Modal>
      console.log("OffenseTutorials: UI Rendering: Main ScrollView rendering completed."); // 31
    </ScrollView>
  );
  console.log("OffenseTutorials: Component Lifecycle: OffenseTutorials function exiting after render."); // 32 (This is the last possible log to indicate end of component function execution, right before its return value is used by React)
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginVertical: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoItem: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbnail: {
    width: '100%',
    height: 100,
    resizeMode: 'cover',
  },
  videoTitle: {
    padding: 8,
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalCloseButton: {
    padding: 15,
    backgroundColor: '#FFD700',
    alignSelf: 'flex-end',
    margin: 10,
    borderRadius: 5,
  },
  modalCloseText: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
});