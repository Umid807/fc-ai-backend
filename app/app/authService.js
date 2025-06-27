import auth from "./firebaseAuth";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendEmailVerification,
  FacebookAuthProvider,
  signInWithPopup
  // If needed, you could also import signInWithRedirect for mobile flows:
  // signInWithRedirect 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig"; // Ensure you have your Firestore db instance exported here

/** 🔹 Register New User */
export const registerUser = async (email, password) => {
  try {
    // Create the user with email and password authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User registered:", userCredential.user);

    // Create a new user document in Firestore with default values
    await setDoc(doc(db, "users", userCredential.user.uid), {
      username: email.split('@')[0] || "NewUser", // default username derived from email
      email: email,
      profilePicture: "", // default empty string (replace with a default URL if needed)
      createdAt: serverTimestamp(),
      vipStatus: false,
      coins: 0,
      raffleTickets: 0,
      xpLevel: 1,
      dailyStreak: 0,
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisibility: "public",
        lastSeen: "private"
      }
    });

    return userCredential.user;
  } catch (error) {
    console.error("Registration Error:", error.message);
    return null;
  }
};

/** 🔹 Login User */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("User logged in:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Login Error:", error.message);
    return null;
  }
};

/** 🔹 Log Out User */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error) {
    console.error("Logout Error:", error.message);
  }
};

/** 🔹 Send Email Verification */
export const sendVerificationEmail = async () => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    alert("Verification email sent! Check your inbox.");
  }
};

/** 🔹 Login with Facebook */
export const signInWithFacebook = async () => {
  const facebookProvider = new FacebookAuthProvider();
  try {
    // Using signInWithPopup for a smoother desktop experience.
    // If you're working on mobile, you might consider signInWithRedirect.
    const result = await signInWithPopup(auth, facebookProvider);
    console.log("Facebook login successful:", result.user);
    
    // Optionally create or update the user document in Firestore
    const userDocRef = doc(db, "users", result.user.uid);
    await setDoc(userDocRef, {
      username: result.user.displayName || "FacebookUser",
      email: result.user.email,
      profilePicture: result.user.photoURL || "",
      createdAt: serverTimestamp(),
      vipStatus: false,
      coins: 0,
      raffleTickets: 0,
      xpLevel: 1,
      dailyStreak: 0,
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      privacy: {
        profileVisibility: "public",
        lastSeen: "private"
      }
    }, { merge: true });
    
    return result.user;
  } catch (error) {
    console.error("Facebook login error:", error.message);
    return null;
  }
};
