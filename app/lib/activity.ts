export type ActivityForDescription = {
  name?: string;
  type?: string;
  sport_type?: string;
  distance?: number;
  moving_time?: number;
  average_speed?: number;
  total_elevation_gain?: number;
  average_watts?: number;
  average_heartrate?: number;
};

function readText(value: unknown, maximumLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, maximumLength);
  return text || undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

export function parseActivityForDescription(
  input: unknown,
): ActivityForDescription | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const value = input as Record<string, unknown>;
  const type = readText(value.type, 40);
  const sportType = readText(value.sport_type, 40);
  if (!type && !sportType) return null;

  return {
    name: readText(value.name, 100),
    type,
    sport_type: sportType,
    distance: readNumber(value.distance),
    moving_time: readNumber(value.moving_time),
    average_speed: readNumber(value.average_speed),
    total_elevation_gain: readNumber(value.total_elevation_gain),
    average_watts: readNumber(value.average_watts),
    average_heartrate: readNumber(value.average_heartrate),
  };
}