import React, { useState, useEffect, useContext, createContext, useCallback } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  updatePassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// Firebase config
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../app/firebaseConfig';

// ================================================================
// TYPES - SIMPLIFIED FOR FORUM USE
// ================================================================

interface UserProfile {
  uid: string;
  username: string;
  email: string;
  profileImage?: string;
  vip?: boolean;
  reputation?: number;
  rank?: string;
  joinedAt?: any;
  lastSeen?: any;
  isOnline?: boolean;
  totalPosts?: number;
  totalComments?: number;
  totalLikes?: number;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface SignupData {
  username: string;
  email: string;
  password: string;
}

interface AuthContextType extends AuthState {
  // Authentication
  login: (credentials: LoginCredentials) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => Promise<void>;
  
  // Password
  resetPassword: (email: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<boolean>;
  
  // Profile
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  
  // Utility
  clearError: () => void;
  refreshProfile: () => Promise<void>;
  
  // Computed values
  isAuthenticated: boolean;
  isVip: boolean;
  canPost: boolean;
  canComment: boolean;
}

// ================================================================
// CONTEXT SETUP
// ================================================================

const AuthContext = createContext<AuthContextType | null>(null);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

// ================================================================
// INITIAL STATE
// ================================================================

const initialState: AuthState = {
  user: null,
  profile: null,
  isLoading: true,
  error: null,
};

// ================================================================
// MAIN AUTH HOOK
// ================================================================

function useAuthState(): AuthContextType {
  const [state, setState] = useState<AuthState>(initialState);

  // ================================================================
  // HELPER FUNCTIONS
  // ================================================================

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setError = useCallback((error: string | null) => {
    updateState({ error, isLoading: false });
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const setLoading = useCallback((isLoading: boolean) => {
    updateState({ isLoading });
  }, [updateState]);

  // ================================================================
  // PROFILE MANAGEMENT
  // ================================================================

  const createUserProfile = useCallback(async (user: FirebaseUser, username?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const profileData: UserProfile = {
          uid: user.uid,
          username: username || user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          profileImage: user.photoURL || '',
          vip: false,
          reputation: 0,
          rank: 'member',
          joinedAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          isOnline: true,
          totalPosts: 0,
          totalComments: 0,
          totalLikes: 0,
        };

        await setDoc(userRef, profileData);
        return profileData;
      } else {
        return { uid: user.uid, ...userDoc.data() } as UserProfile;
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }, []);

  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return { uid, ...userDoc.data() } as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;

    try {
      const profile = await fetchUserProfile(state.user.uid);
      if (profile) {
        updateState({ profile });
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  }, [state.user, fetchUserProfile, updateState]);

  // ================================================================
  // AUTHENTICATION ACTIONS
  // ================================================================

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const profile = await fetchUserProfile(userCredential.user.uid);
      
      updateState({
        user: userCredential.user,
        profile,
        isLoading: false,
      });

      // Update online status
      if (profile) {
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });
      }

      return true;

    } catch (error: any) {
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
      }

      setError(errorMessage);
      return false;
    }
  }, [setLoading, clearError, fetchUserProfile, updateState, setError]);

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );

      // Update Firebase Auth profile
      await updateFirebaseProfile(userCredential.user, {
        displayName: data.username,
      });

      // Create Firestore profile
      const profile = await createUserProfile(userCredential.user, data.username);

      updateState({
        user: userCredential.user,
        profile,
        isLoading: false,
      });

      return true;

    } catch (error: any) {
      let errorMessage = 'Signup failed. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
      }

      setError(errorMessage);
      return false;
    }
  }, [setLoading, clearError, createUserProfile, updateState, setError]);

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      // Update online status before logout
      if (state.user) {
        await updateDoc(doc(db, 'users', state.user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        }).catch(() => {
          // Ignore errors during logout
        });
      }

      await signOut(auth);

      updateState({
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Logout error:', error);
      // Always clear state even if logout fails
      updateState({
        user: null,
        profile: null,
        isLoading: false,
        error: null,
      });
    }
  }, [setLoading, state.user, updateState]);

  // ================================================================
  // PASSWORD ACTIONS
  // ================================================================

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }

      setError(errorMessage);
      return false;
    }
  }, [setError]);

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    if (!state.user) return false;

    try {
      await updatePassword(state.user, newPassword);
      return true;
    } catch (error: any) {
      let errorMessage = 'Failed to change password.';
      
      switch (error.code) {
        case 'auth/requires-recent-login':
          errorMessage = 'Please log in again to change your password.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
      }

      setError(errorMessage);
      return false;
    }
  }, [state.user, setError]);

  // ================================================================
  // PROFILE ACTIONS
  // ================================================================

  const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
    if (!state.user || !state.profile) return false;

    try {
      const userRef = doc(db, 'users', state.user.uid);
      await updateDoc(userRef, {
        ...updates,
        lastSeen: serverTimestamp(),
      });

      // Update local state
      updateState({
        profile: { ...state.profile, ...updates }
      });

      // Update Firebase Auth profile if needed
      if (updates.username && updates.username !== state.user.displayName) {
        await updateFirebaseProfile(state.user, {
          displayName: updates.username,
        });
      }

      return true;

    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile.');
      return false;
    }
  }, [state.user, state.profile, updateState, setError]);

  // ================================================================
  // FIREBASE AUTH STATE LISTENER
  // ================================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in
        const profile = await fetchUserProfile(user.uid);
        updateState({
          user,
          profile,
          isLoading: false,
        });
      } else {
        // User is signed out
        updateState({
          user: null,
          profile: null,
          isLoading: false,
        });
      }
    });

    return unsubscribe;
  }, [fetchUserProfile, updateState]);

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const isAuthenticated = !!state.user;
  const isVip = state.profile?.vip || false;
  const canPost = isAuthenticated;
  const canComment = isAuthenticated;

  // ================================================================
  // RETURN CONTEXT VALUE
  // ================================================================

  return {
    // State
    ...state,
    
    // Actions
    login,
    signup,
    logout,
    resetPassword,
    changePassword,
    updateProfile,
    clearError,
    refreshProfile,
    
    // Computed
    isAuthenticated,
    isVip,
    canPost,
    canComment,
  };
}

// ================================================================
// AUTH PROVIDER COMPONENT
// ================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();

  return React.createElement(
    AuthContext.Provider,
    { value: auth },
    children
  );
}

// ================================================================
// MAIN HOOK EXPORT
// ================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// ================================================================
// UTILITY HOOKS
// ================================================================

/**
 * Hook to check authentication status
 */
export function useAuthStatus() {
  const { isAuthenticated, isLoading, user, profile } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    isLoggedIn: isAuthenticated && !!user,
    userId: user?.uid || null,
    username: profile?.username || user?.displayName || null,
  };
}

/**
 * Hook for user permissions
 */
export function useUserPermissions() {
  const { profile, isVip, canPost, canComment } = useAuth();
  
  return {
    isVip,
    canPost,
    canComment,
    canModerate: profile?.rank === 'moderator' || profile?.rank === 'admin',
    canAdmin: profile?.rank === 'admin',
    reputation: profile?.reputation || 0,
    rank: profile?.rank || 'member',
  };
}

// ================================================================
// TYPE EXPORTS
// ================================================================

export type { 
  UserProfile, 
  AuthState, 
  LoginCredentials, 
  SignupData, 
  AuthContextType 
};