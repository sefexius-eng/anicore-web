export interface AchievementDefinition {
  id: string;
  emoji: string;
  title: string;
  description: string;
  toneClass: string;
}

export interface UserAchievementView extends AchievementDefinition {
  unlockedAt: Date;
}

export const MARATHONER_ACHIEVEMENT_ID = "marathoner";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: MARATHONER_ACHIEVEMENT_ID,
    emoji: "🏃‍♂️",
    title: "Марафонец",
    description: "Открыл и начал смотреть больше 10 тайтлов в AniMirok.",
    toneClass:
      "from-amber-300/20 via-orange-400/10 to-red-500/20 border-amber-300/20",
  },
  {
    id: "romantic",
    emoji: "🌸",
    title: "Романтик",
    description: "Оставляйте душевные оценки и собирайте романтическую коллекцию.",
    toneClass:
      "from-pink-300/20 via-rose-400/10 to-fuchsia-500/20 border-pink-300/20",
  },
  {
    id: "oldfag",
    emoji: "📺",
    title: "Олдфаг",
    description: "Для тех, кто доберётся до классики и старой школы аниме.",
    toneClass:
      "from-sky-300/20 via-cyan-400/10 to-indigo-500/20 border-sky-300/20",
  },
];

const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]),
);

export function getAchievementDefinition(id: string): AchievementDefinition {
  return (
    ACHIEVEMENT_MAP.get(id) ?? {
      id,
      emoji: "🏆",
      title: "Секретная награда",
      description: "Редкое достижение сообщества AniMirok.",
      toneClass:
        "from-slate-200/10 via-slate-300/5 to-slate-500/10 border-white/10",
    }
  );
}

export function toUserAchievementView(
  achievementId: string,
  unlockedAt: Date,
): UserAchievementView {
  return {
    ...getAchievementDefinition(achievementId),
    unlockedAt,
  };
}
