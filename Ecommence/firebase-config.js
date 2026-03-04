import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDkhgbN8hub3bCPD_lulMjRf2Wn401ZuX4",
    authDomain: "flu-project-5f105.firebaseapp.com",
    projectId: "flu-project-5f105",
    storageBucket: "flu-project-5f105.firebasestorage.app",
    messagingSenderId: "822598503905",
    appId: "1:822598503905:web:03204330d4fd9acdb996a0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;