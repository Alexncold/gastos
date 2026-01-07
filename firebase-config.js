// Firebase App (the core Firebase SDK)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC5oMo7ZrMUpXGLk39Z6iBC0Drbdlk_KeE",
  authDomain: "control-gastos-app-572be.firebaseapp.com",
  projectId: "control-gastos-app-572be",
  storageBucket: "control-gastos-app-572be.firebasestorage.app",
  messagingSenderId: "824585639306",
  appId: "1:824585639306:web:1a442674bb7ff55ca76473"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Helper functions
const getExpensesCollection = (userId) => collection(db, `usuarios/${userId}/gastos`);
const getUserConfigDoc = (userId) => doc(db, `usuarios/${userId}/configuracion/config`);

// Export everything needed
export {
  auth,
  db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
  getExpensesCollection,
  getUserConfigDoc
};