import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!;

function pemToBinary(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getFirebaseAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToBinary(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function sendFCMNotification(
  accessToken: string,
  fcmToken: string,
  title: string,
  body: string
): Promise<{ ok: boolean; shouldDeactivate: boolean }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data: { click_action: "FLUTTER_NOTIFICATION_CLICK" },
        },
      }),
    }
  );

  if (res.ok) return { ok: true, shouldDeactivate: false };

  const errorBody = await res.json().catch(() => null);
  const errorStatus = errorBody?.error?.status;
  console.error(`FCM send failed for token ${fcmToken.slice(0, 12)}...: ${res.status} ${errorStatus ?? ""}`);

  const shouldDeactivate = errorStatus === "UNREGISTERED" || errorStatus === "INVALID_ARGUMENT" || errorStatus === "NOT_FOUND";
  return { ok: false, shouldDeactivate };
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("farm_tasks")
    .select("id, title, description, farmer_id:farms(farmer_id)")
    .eq("due_date", today)
    .eq("status", "pending");

  const { data: harvests } = await supabase
    .from("crops")
    .select("id, crop_type, variety, expected_harvest_date, farmer_id:farms(farmer_id)")
    .eq("expected_harvest_date", today);

  if ((!tasks || tasks.length === 0) && (!harvests || harvests.length === 0)) {
    return new Response(JSON.stringify({ message: "No notifications to send today" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = await getFirebaseAccessToken();

  const farmerNotifications: Record<string, { titles: string[]; bodies: string[] }> = {};

  for (const task of tasks ?? []) {
    const farmerId = task.farmer_id?.farmer_id;
    if (!farmerId) continue;
    if (!farmerNotifications[farmerId]) farmerNotifications[farmerId] = { titles: [], bodies: [] };
    farmerNotifications[farmerId].titles.push(task.title);
    farmerNotifications[farmerId].bodies.push(task.description ?? task.title);
  }

  for (const crop of harvests ?? []) {
    const farmerId = crop.farmer_id?.farmer_id;
    if (!farmerId) continue;
    if (!farmerNotifications[farmerId]) farmerNotifications[farmerId] = { titles: [], bodies: [] };
    farmerNotifications[farmerId].titles.push("Harvest Ready");
    farmerNotifications[farmerId].bodies.push(`Your ${crop.crop_type} (${crop.variety}) is ready for harvest today.`);
  }

  let sent = 0;
  let failed = 0;
  const tokensToDeactivate: string[] = [];

  for (const [farmerId, notif] of Object.entries(farmerNotifications)) {
    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("fcm_token")
      .eq("farmer_id", farmerId)
      .eq("is_active", true);

    if (!tokens || tokens.length === 0) continue;

    const title = notif.titles.length === 1 ? notif.titles[0] : `You have ${notif.titles.length} tasks today`;
    const body = notif.bodies.slice(0, 2).join(" | ");

    for (const { fcm_token } of tokens) {
      const result = await sendFCMNotification(accessToken, fcm_token, title, body);
      if (result.ok) {
        sent++;
      } else {
        failed++;
        if (result.shouldDeactivate) tokensToDeactivate.push(fcm_token);
      }
    }
  }

  if (tokensToDeactivate.length > 0) {
    await supabase
      .from("device_tokens")
      .update({ is_active: false })
      .in("fcm_token", tokensToDeactivate);
  }

  return new Response(JSON.stringify({ message: "Notifications processed", sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
