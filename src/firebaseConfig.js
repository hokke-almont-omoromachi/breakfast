// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyA8_hmMV9Glpi63NFNLHiTwi34j6qnDVxs",
    authDomain: "almont-omoromachi.firebaseapp.com",
    projectId: "almont-omoromachi",
    storageBucket: "almont-omoromachi.firebasestorage.app",
    messagingSenderId: "535809315782",
    appId: "1:535809315782:web:060c88ef6b4b0c2c7d58c7",
    measurementId: "G-7JB96TN60D"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
