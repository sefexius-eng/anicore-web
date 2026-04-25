/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import {
  Award,
  Clock3,
  Tv2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import { AnimeCard } from "@/components/shared/anime-card";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import type { UserAchievementView } from "@/lib/achievements";
import type { ProfileAnimeCardItem, ProfileViewData } from "@/lib/profile-data";

function ProfileMetricCard({
  Icon,
  label,
  value,
  toneClass,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  toneClass: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827]/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-transform duration-300 hover:-translate-y-1 hover:border-sky-400/30">
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass}`}
      >
        <Icon className="size-5" />
      </div>

      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function buildPosterOverlay(label: string | undefined) {
  if (!label) {
    return null;
  }

  return (
    <span className="inline-flex rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm sm:text-sm">
      {label}
    </span>
  );
}

function ProfileShelf({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: ProfileAnimeCardItem[];
}) {
  return (
    <section className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <AnimeCard
              key={`${title}-${item.id}`}
              id={item.id}
              title={item.title}
              titles={item.titles}
              image_url={item.image_url}
              score={item.score}
              posterOverlay={buildPosterOverlay(item.overlayLabel)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-slate-400">
          Пока пусто.
        </div>
      )}
    </section>
  );
}

function formatAchievementDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
  }).format(value);
}

function AchievementsShelf({ items }: { items: UserAchievementView[] }) {
  return (
    <section className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300">Награды</p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Достижения AniMirok
        </h2>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((achievement) => (
            <article
              key={achievement.id}
              title={achievement.description}
              className={`rounded-3xl border bg-gradient-to-br p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-sm ${achievement.toneClass}`}
            >
              <div className="space-y-3">
                <div className="text-3xl">{achievement.emoji}</div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">
                    {achievement.title}
                  </h3>
                  <p className="text-sm leading-6 text-slate-300">
                    {achievement.description}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                  Открыто {formatAchievementDate(achievement.unlockedAt)}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-10 text-center text-sm text-slate-400">
          Пока без наград. Продолжайте смотреть тайтлы и открывать новые
          достижения.
        </div>
      )}
    </section>
  );
}

function ReadonlyAvatar({
  image,
  userName,
}: {
  image: string;
  userName: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="overflow-hidden rounded-full border-4 border-[#0f0f0f] shadow-[0_24px_50px_rgba(0,0,0,0.45)]">
        <img
          src={image}
          alt={userName}
          className="h-32 w-32 object-cover sm:h-40 sm:w-40"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

interface ProfilePageViewProps {
  data: ProfileViewData;
  editableAvatar?: boolean;
  eyebrow?: string;
  headerAction?: ReactNode;
}

export function ProfilePageView({
  data,
  editableAvatar = false,
  eyebrow = "Профиль AniMirok",
  headerAction,
}: ProfilePageViewProps) {
  const avatarImage = data.image?.trim() || "/default-avatar.jpg";
  const metrics = [
    {
      Icon: Award,
      label: "Ранг",
      value: data.rank,
      toneClass:
        "from-amber-300/35 to-orange-500/20 text-amber-100 ring-1 ring-amber-300/30",
    },
    {
      Icon: Tv2,
      label: "Просмотрено",
      value: `${data.completedCount} тайтлов`,
      toneClass:
        "from-sky-300/35 to-cyan-500/20 text-sky-100 ring-1 ring-sky-300/30",
    },
    {
      Icon: Clock3,
      label: "Время",
      value: data.timeSpentLabel,
      toneClass:
        "from-fuchsia-300/35 to-violet-500/20 text-fuchsia-100 ring-1 ring-fuchsia-300/30",
    },
    {
      Icon: Users,
      label: "Подписчики",
      value: String(data.followersCount),
      toneClass:
        "from-emerald-300/35 to-teal-500/20 text-emerald-100 ring-1 ring-emerald-300/30",
    },
    {
      Icon: UserPlus,
      label: "Подписки",
      value: String(data.followingCount),
      toneClass:
        "from-rose-300/35 to-pink-500/20 text-rose-100 ring-1 ring-rose-300/30",
    },
  ];

  return (
    <div className="space-y-8 pb-6">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#090f1d] shadow-[0_35px_100px_rgba(0,0,0,0.42)]">
        <div className="relative h-56 overflow-hidden sm:h-64">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#0f172a_0%,#1d4ed8_42%,#7c3aed_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(125,211,252,0.35),transparent_32%),radial-gradient(circle_at_82%_20%,rgba(216,180,254,0.28),transparent_28%),linear-gradient(to_top,rgba(9,15,29,0.92),rgba(9,15,29,0.12))]" />
          <div className="absolute -bottom-16 left-6 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute right-10 top-8 h-24 w-24 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm" />
          <div className="absolute bottom-8 right-24 h-14 w-14 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm" />
        </div>

        <div className="relative px-6 pb-8 sm:px-8">
          <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              {editableAvatar ? (
                <AvatarUpload
                  currentImage={data.image?.trim() || null}
                  fallbackImage="/default-avatar.jpg"
                  userName={data.name}
                  className="flex flex-col items-center"
                  avatarClassName="h-32 w-32 sm:h-40 sm:w-40"
                />
              ) : (
                <ReadonlyAvatar image={avatarImage} userName={data.name} />
              )}

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.22em] text-sky-200/90">
                  {eyebrow}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {data.name}
                  </h1>

                  {headerAction ? <div className="sm:pb-1">{headerAction}</div> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {metrics.map((metric) => (
              <ProfileMetricCard
                key={metric.label}
                Icon={metric.Icon}
                label={metric.label}
                value={metric.value}
                toneClass={metric.toneClass}
              />
            ))}
          </div>
        </div>
      </section>

      <AchievementsShelf items={data.achievements} />

      <ProfileShelf
        eyebrow="История просмотров"
        title="Недавно открытые тайтлы"
        items={data.historyItems}
      />

      {data.watchlistSections.map((section) => (
        <ProfileShelf
          key={section.status}
          eyebrow={section.eyebrow}
          title={section.title}
          items={section.items}
        />
      ))}
    </div>
  );
}
