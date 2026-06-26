import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'citizen' | 'admin' | null;

interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  trustScore: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // Create default citizen profile
            const newProfile: UserProfile = {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Citizen',
              role: 'citizen',
              trustScore: 100
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Firestore user profile error:", error);
          // Fallback basic profile
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Citizen',
            role: 'citizen',
            trustScore: 100
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const updateProfileContext = async (newProfileData: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await setDoc(docRef, newProfileData, { merge: true });
    } catch (error) {
      console.error("Firestore update profile error:", error);
    }
    setProfile(prev => prev ? { ...prev, ...newProfileData } : null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, updateProfile: updateProfileContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
