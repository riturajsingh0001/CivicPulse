import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAiHi60Y5KaHANNjERCiUj6eQfDWxNIk4U",
  authDomain: "civicpulse-6f357.firebaseapp.com",
  projectId: "civicpulse-6f357",
  storageBucket: "civicpulse-6f357.firebasestorage.app",
  messagingSenderId: "5341707399",
  appId: "1:5341707399:web:26a0e81eb15e25cf6f0c22"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
