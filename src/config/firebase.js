const admin = require("firebase-admin");
require("dotenv").config();

let isFirebaseInitialized = false;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private key needs to replace escaped \n with actual newlines
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : null;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    isFirebaseInitialized = true;
    console.log("Firebase Admin SDK initialized successfully.");
  } else {
    console.warn(
      "Firebase environment variables are missing (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications will run in Mock/Fallback mode."
    );
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error);
}

/**
 * Sends a push notification to a device token via FCM.
 * Falls back to console log if Firebase is not configured.
 * @param {string} fcmToken The recipient's FCM registration token.
 * @param {string} title The notification title.
 * @param {string} body The notification body.
 * @param {object} [data] Optional key-value payload.
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return;

  const payload = {
    notification: {
      title,
      body,
    },
    data: data ? Object.entries(data).reduce((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {}) : {},
    token: fcmToken,
  };

  if (isFirebaseInitialized) {
    try {
      const response = await admin.messaging().send(payload);
      console.log("Push notification sent successfully:", response);
      return response;
    } catch (error) {
      console.error("Error sending push notification via Firebase:", error);
    }
  } else {
    console.log(
      `[Mock FCM Push Notification]
To: ${fcmToken}
Title: ${title}
Body: ${body}
Data: ${JSON.stringify(data)}`
    );
  }
};

module.exports = {
  sendPushNotification,
};
