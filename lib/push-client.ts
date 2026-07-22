import { supabase } from "@/lib/supabase";

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "dismissed" | "error"; message: string };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function enablePushNotifications(): Promise<PushEnableResult> {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported", message: "Push notifications aren't supported in this browser." };
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "denied") {
      return {
        ok: false,
        reason: "denied",
        message: "Notifications are blocked. Enable them for MoneyOS in your browser or device settings.",
      };
    }
    if (permission !== "granted") {
      return { ok: false, reason: "dismissed", message: "Notification prompt was dismissed." };
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
      return { ok: false, reason: "error", message: "Failed to set up notifications. Please try again." };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    const subscriptionJson = subscription.toJSON();
    const p256dhKey = subscription.getKey("p256dh");
    const authKey = subscription.getKey("auth");

    if (!p256dhKey || !authKey) {
      return { ok: false, reason: "error", message: "Failed to set up notifications. Please try again." };
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
        },
      }),
    });

    if (!response.ok) {
      return { ok: false, reason: "error", message: "Failed to save your subscription. Please try again." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ notifications_enabled: true }).eq("id", user.id);
    }

    return { ok: true };
  } catch (err) {
    console.error("[push] subscription failed:", err);
    return { ok: false, reason: "error", message: "Failed to set up notifications. Please try again." };
  }
}
