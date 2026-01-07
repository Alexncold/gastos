// Firebase App (the core Firebase SDK) is always required
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Collections
const getExpensesCollection = (userId) => collection(db, `usuarios/${userId}/gastos`);
const getUserConfigDoc = (userId) => doc(db, `usuarios/${userId}/configuracion/config`);

// Export the services we'll need
const firebaseServices = {
  auth,
  db,
  // Firestore helpers
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
  // Custom collection references
  getExpensesCollection,
  getUserConfigDoc,
  // Timestamp
  Timestamp: {
    now: () => new Date().toISOString().split('T')[0]
  }
};

export default firebaseServices;
