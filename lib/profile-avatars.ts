// lib/profile-avatars.ts

export const PRESET_AVATARS = [
  "/avatars/avatar-1.png",
  "/avatars/avatar-2.png",
  "/avatars/avatar-3.png",
] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export function getRandomPresetAvatar(): PresetAvatar {
  const idx = Math.floor(Math.random() * PRESET_AVATARS.length);
  return PRESET_AVATARS[idx];
}
