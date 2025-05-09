// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDYogtaH0t6VToGzcKrcq_I5b1QW7K60KA",
    authDomain: "almont-omoromachi-bf.firebaseapp.com",
    projectId: "almont-omoromachi-bf",
    storageBucket: "almont-omoromachi-bf.firebasestorage.app",
    messagingSenderId: "506342622632",
    appId: "1:506342622632:web:6e3a15454535061380499d",
    measurementId: "G-6ZLP3K4FPK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
