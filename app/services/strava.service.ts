import { STRAVA_API_BASE } from "@/app/config/constants";

export async function getActivity(activityId: number, accessToken: string) {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Strava activity request failed (${response.status})`);
  }
  return response.json();
}

export async function updateActivityDescription(
  activityId: number,
  accessToken: string,
  description: string,
): Promise<void> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description }),
  });
  if (!response.ok) {
    throw new Error(`Strava description update failed (${response.status})`);
  }
}