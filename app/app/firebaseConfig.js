// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDn3bN0rEX-GA-Gt8Ai4lxqGFeOomMxuJo",
  authDomain: "fc25assistant.firebaseapp.com",
  projectId: "fc25assistant",
  storageBucket: "fc25assistant.firebasestorage.app",
  messagingSenderId: "313289431085",
  appId: "1:313289431085:web:03a2ee195f89a9a37900a4",
  measurementId: "G-WM6GFQ4P4E",
};

// Initialize the Firebase app once
const app = initializeApp(firebaseConfig);

// Initialize Firestore using the same app instance
const db = getFirestore(app);

export { app, db };
