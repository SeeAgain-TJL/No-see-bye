/** Canonical text values keep existing memories and exports compatible. */
export const moods = [
  { value: "开心", emoji: "🥳" },
  { value: "平静", emoji: "😌" },
  { value: "感动", emoji: "🥹" },
  { value: "疲惫", emoji: "😴" },
  { value: "想念", emoji: "🥺" },
  { value: "雀跃", emoji: "🤩" },
  { value: "治愈", emoji: "🌷" },
  { value: "委屈", emoji: "🥲" },
  { value: "元气", emoji: "🐣" },
] as const;
export const moodValues = ["", ...moods.map(m => m.value)] as const;
export function moodLabel(value: string) {
  const mood = moods.find(m => m.value === value);
  return mood ? mood.emoji + " " + mood.value : value;
}
