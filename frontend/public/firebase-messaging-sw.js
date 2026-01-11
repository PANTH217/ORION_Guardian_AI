importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
    // We can't easily inject env vars here without a build step, 
    // so we'll use a generic handler. The critical part is the event listener.
    // Actually, for the SW to work, it needs to be initialized.
    // Since we are troubleshooting, let's just use the basic logic.
    apiKey: "TODO_IF_NEEDED",
    projectId: "fall-detection-app",
    messagingSenderId: "172481016863",
    appId: "1:172481016863:web:0cf0113296061386760ef1"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/firebase-logo.png' // Optional icon
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
