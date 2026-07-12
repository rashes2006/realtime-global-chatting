import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp as firestoreTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase, ref as rtdbRef, set, onValue, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9efFeqs9rsEUXCTYB080h2mKuTxIO7nk",
  authDomain: "realtime-chatting-a9cd8.firebaseapp.com",
  projectId: "realtime-chatting-a9cd8",
  storageBucket: "realtime-chatting-a9cd8.firebasestorage.app",
  messagingSenderId: "544260073424",
  appId: "1:544260073424:web:8b948b32f0b9c5b66cbbd5",
  measurementId: "G-C0S7R5H8HV",
  databaseURL: "https://realtime-chatting-a9cd8-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

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

/**
 * Upsert user profile to Firestore on sign-in.
 */
export const upsertUser = async (user) => {
  if (!user) return;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    displayName: user.displayName || "Anonymous",
    photoURL: user.photoURL || "",
    email: user.email || "",
    lastSeen: firestoreTimestamp(),
  }, { merge: true });
};

/**
 * Setup real-time presence using Firebase Realtime Database.
 * Writes online status and sets onDisconnect to mark offline.
 */
export const setupPresence = (uid) => {
  if (!uid) return () => {};

  try {
    const userStatusRef = rtdbRef(rtdb, `status/${uid}`);
    const connectedRef = rtdbRef(rtdb, ".info/connected");

    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) return;

      // When connected, set online status and register onDisconnect
      onDisconnect(userStatusRef).set({
        online: false,
        lastSeen: rtdbTimestamp(),
      }).then(() => {
        set(userStatusRef, {
          online: true,
          lastSeen: rtdbTimestamp(),
        });
      }).catch((err) => {
        console.warn("Presence onDisconnect setup error:", err);
      });
    }, (error) => {
      console.warn("Presence connection listener error:", error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn("Presence database setup failed:", err);
    return () => {};
  }
};

/**
 * Subscribe to a specific user's online status.
 * Returns an unsubscribe function.
 */
export const subscribeToUserStatus = (uid, callback) => {
  if (!uid) return () => {};

  try {
    const userStatusRef = rtdbRef(rtdb, `status/${uid}`);
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val();
      callback(data ? data.online === true : false);
    }, (error) => {
      console.warn("Presence status read error for user:", uid, error);
      callback(false);
    });
    return unsubscribe;
  } catch (err) {
    console.warn("Presence status subscription failed for user:", uid, err);
    callback(false);
    return () => {};
  }
};

/**
 * Get or create a conversation between two users.
 * Returns the conversation ID.
 */
export const getOrCreateConversation = async (currentUser, otherUser) => {
  // Query for existing conversation with both participants
  const convRef = collection(db, "conversations");

  // Check if a conversation already exists between these two users
  const q = query(convRef, where("participants", "array-contains", currentUser.uid));
  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.participants && data.participants.includes(otherUser.uid)) {
      return docSnap.id;
    }
  }

  // No existing conversation — create a new one with participantMap for security rules
  const newConv = await addDoc(convRef, {
    participants: [currentUser.uid, otherUser.uid],
    participantMap: {
      [currentUser.uid]: true,
      [otherUser.uid]: true
    },
    participantDetails: {
      [currentUser.uid]: {
        displayName: currentUser.displayName || "Anonymous",
        photoURL: currentUser.photoURL || "",
      },
      [otherUser.uid]: {
        displayName: otherUser.displayName || otherUser.name || "Anonymous",
        photoURL: otherUser.photoURL || "",
      },
    },
    lastMessage: "",
    lastMessageAt: firestoreTimestamp(),
    createdAt: firestoreTimestamp(),
  });

  return newConv.id;
};
