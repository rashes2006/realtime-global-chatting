import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9efFeqs9rsEUXCTYB080h2mKuTxIO7nk",
  authDomain: "realtime-chatting-a9cd8.firebaseapp.com",
  projectId: "realtime-chatting-a9cd8",
  storageBucket: "realtime-chatting-a9cd8.firebasestorage.app",
  messagingSenderId: "544260073424",
  appId: "1:544260073424:web:8b948b32f0b9c5b66cbbd5",
  measurementId: "G-C0S7R5H8HV"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
    throw error;
  }
};
