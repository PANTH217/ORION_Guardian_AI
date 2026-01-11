import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

// TODO: Replace with your actual Firebase project configuration
// You can get this from https://console.firebase.google.com/
const firebaseConfig = {
    apiKey: "AIzaSyChCrmiLGl-zWxJp9mKWn9ybSZVZCbb3d4",
    authDomain: "fall-detection123.firebaseapp.com",
    projectId: "fall-detection123",
    storageBucket: "fall-detection123.firebasestorage.app",
    messagingSenderId: "607959282408",
    appId: "1:607959282408:web:0905d8c59df36bad4acf5d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const messaging = getMessaging(app);
