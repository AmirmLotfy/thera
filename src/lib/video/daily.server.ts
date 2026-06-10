const DAILY_API = "https://api.daily.co/v1";

type CreateRoomOpts = {
  name?: string;
  expMinutes?: number;
  privacy?: "public" | "private";
};

type DailyRoom = {
  id: string;
  name: string;
  url: string;
  config?: Record<string, unknown>;
};

export async function createDailyRoom(opts: CreateRoomOpts = {}): Promise<DailyRoom | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    // Return a demo placeholder so callers don't need to branch on null.
    const name = opts.name ?? `thera-demo-${Math.random().toString(36).slice(2, 9)}`;
    return { id: name, name, url: `https://demo.daily.co/${name}`, config: { demo: true } };
  }
  const exp = Math.floor(Date.now() / 1000) + 60 * (opts.expMinutes ?? 90);
  const body = {
    name: opts.name,
    privacy: opts.privacy ?? "private",
    properties: {
      enable_chat: true,
      enable_knocking: true,
      enable_prejoin_ui: true,
      start_video_off: false,
      start_audio_off: false,
      exp,
    },
  };
  const res = await fetch(`${DAILY_API}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`daily room failed: ${res.status}`);
  return await res.json();
}

type MeetingTokenOpts = {
  roomName: string;
  userName?: string;
  userId?: string;
  isOwner?: boolean;
  expSeconds?: number;
};

export async function createDailyMeetingToken(opts: MeetingTokenOpts): Promise<string | null> {
  const key = process.env.DAILY_API_KEY;
  if (!key) return null;
  const body = {
    properties: {
      room_name: opts.roomName,
      user_name: opts.userName,
      user_id: opts.userId,
      is_owner: !!opts.isOwner,
      exp: Math.floor(Date.now() / 1000) + (opts.expSeconds ?? 2 * 60 * 60),
    },
  };
  const res = await fetch(`${DAILY_API}/meeting-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`daily token failed: ${res.status}`);
  const json = await res.json();
  return json?.token ?? null;
}
