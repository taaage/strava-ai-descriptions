import { after, NextRequest, NextResponse } from "next/server";
import { parseActivityForDescription } from "@/app/lib/activity";
import { generateDescription } from "@/app/lib/generate-description";
import { getStravaAccessToken } from "@/app/services/strava-auth.service";
import {
  getActivity,
  updateActivityDescription,
} from "@/app/services/strava.service";

export const runtime = "nodejs";
export const maxDuration = 60;

type StravaEvent = {
  aspect_type?: unknown;
  object_id?: unknown;
  object_type?: unknown;
  owner_id?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function processActivityCreate(activityId: number): Promise<void> {
  const accessToken = getStravaAccessToken();

  const activity = await getActivity(activityId, accessToken);
  const overwrite = process.env.OVERWRITE_EXISTING_DESCRIPTIONS === "true";
  if (!overwrite && typeof activity.description === "string" && activity.description.trim()) {
    return;
  }

  const descriptionInput = parseActivityForDescription(activity);
  if (!descriptionInput) {
    throw new Error("Strava activity did not contain supported activity metrics");
  }

  const description = await generateDescription(descriptionInput);
  await updateActivityDescription(activityId, accessToken, description);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const isSubscriptionCheck =
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === process.env.STRAVA_VERIFY_TOKEN;
  if (!isSubscriptionCheck || !process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ "hub.challenge": params.get("hub.challenge") });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return NextResponse.json({ error: "Invalid Strava event" }, { status: 400 });
  }

  const event = payload as StravaEvent;
  const athleteId = process.env.STRAVA_ATHLETE_ID;
  if (!athleteId) {
    return NextResponse.json({ error: "STRAVA_ATHLETE_ID is not configured" }, { status: 503 });
  }

  if (String(event.owner_id) !== athleteId) {
    return NextResponse.json({ success: true, ignored: true });
  }

  const activityId = Number(event.object_id);
  if (
    event.object_type !== "activity" ||
    event.aspect_type !== "create" ||
    !Number.isSafeInteger(activityId) ||
    activityId <= 0
  ) {
    return NextResponse.json({ success: true, ignored: true });
  }

  after(async () => {
    try {
      await processActivityCreate(activityId);
      console.info("[WEBHOOK] Activity description updated", activityId);
    } catch (error) {
      const name = error instanceof Error ? error.name : "UnknownError";
      console.error("[WEBHOOK] Activity description failed", activityId, name);
    }
  });

  return NextResponse.json({ success: true, accepted: true });
}