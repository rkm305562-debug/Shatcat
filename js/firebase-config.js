// استيراد خدمات Firebase الأساسية عبر شبكة CDN مخصصة للمتصفح
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// !!! استبدل هذه الإعدادات بمعلومات مشروعك من موقع Firebase Console !!!
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// تهيئة التطبيق
const app = initializeApp(firebaseConfig);

// تصدير الخدمات لاستخدامها في الملفات الأخرى
export const auth = getAuth(app);
export const db = getFirestore(app);
