import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { supabase } from "../lib/supabase";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      try {
        const swParams = new URLSearchParams({
          apiKey: firebaseConfig.apiKey ?? "",
          authDomain: firebaseConfig.authDomain ?? "",
          projectId: firebaseConfig.projectId ?? "",
          storageBucket: firebaseConfig.storageBucket ?? "",
          messagingSenderId: firebaseConfig.messagingSenderId ?? "",
          appId: firebaseConfig.appId ?? "",
        });

        const swRegistration = await navigator.serviceWorker.register(
          `/firebase-messaging-sw.js?${swParams.toString()}`
        );

        const messaging = getMessaging(app);

        const fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (!fcmToken) return;
        setToken(fcmToken);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/device-tokens`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fcm_token: fcmToken, device_type: "web" }),
        });

        if (!res.ok) {
          console.error("Failed to register device token with backend:", res.status);
        }

        unsubscribe = onMessage(messaging, (payload) => {
          if (payload.notification) {
            new Notification(payload.notification.title ?? "AgroNavis", {
              body: payload.notification.body,
              icon: "/images/icon.png",
            });
          }
        });
      } catch (err) {
        setError("Failed to register for push notifications.");
        console.error(err);
      }
    };

    setup();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return { token, error };
}
