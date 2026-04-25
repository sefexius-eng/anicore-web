/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Activity, ArrowRight, Clock3, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { normalizePositiveInteger } from "@/lib/profile-data";
import { getSocialFeedItems } from "@/lib/social-feed";
import { WATCHLIST_STATUS_LABELS } from "@/lib/watchlist";

function formatFeedDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function FeedPage() {
  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);

  if (!viewerUserId) {
    redirect("/login?callbackUrl=/feed");
  }

  const items = await getSocialFeedItems(viewerUserId);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.78))] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
                <Activity className="size-3.5" />
                Социальная лента
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  Последняя активность ваших подписок
                </h1>

                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Следите за тем, что друзья добавляют в списки и какие тайтлы
                  они продолжают смотреть.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-white">Событий в ленте</p>
              <p>{items.length}</p>
            </div>
          </div>
        </div>
      </section>

      {items.length > 0 ? (
        <section className="space-y-4">
          {items.map((item) => {
            const avatarSrc = item.user.image?.trim() || "/default-avatar.jpg";

            return (
              <article
                key={item.id}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:p-6"
              >
                <div className="flex gap-4">
                  <Link href={`/user/${item.user.id}`} className="shrink-0">
                    <img
                      src={avatarSrc}
                      alt={item.user.name}
                      className="size-14 rounded-full border border-white/10 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </Link>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/10 px-2.5 py-1">
                      {item.type === "watchlist" ? "Список" : "Прогресс"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" />
                      {formatFeedDate(item.occurredAt)}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-slate-200 sm:text-base">
                    <Link
                      href={`/user/${item.user.id}`}
                      className="font-semibold text-white transition-colors hover:text-sky-300"
                    >
                      {item.user.name}
                    </Link>{" "}
                    {item.type === "watchlist" ? (
                      <>
                        добавил{" "}
                        <Link
                          href={`/anime/${item.anime.id}`}
                          className="font-semibold text-white transition-colors hover:text-sky-300"
                        >
                          &quot;{item.anime.title}&quot;
                        </Link>{" "}
                        в список{" "}
                        <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-100">
                          {item.watchlistStatus
                            ? WATCHLIST_STATUS_LABELS[item.watchlistStatus]
                            : "Без статуса"}
                        </span>
                      </>
                    ) : (
                      <>
                        посмотрел {item.episodesWatched ?? 0} серию{" "}
                        <Link
                          href={`/anime/${item.anime.id}`}
                          className="font-semibold text-white transition-colors hover:text-sky-300"
                        >
                          &quot;{item.anime.title}&quot;
                        </Link>
                      </>
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <Link
                      href={`/user/${item.user.id}`}
                      className="inline-flex items-center gap-1 transition-colors hover:text-white"
                    >
                      Профиль
                      <ArrowRight className="size-4" />
                    </Link>

                    <Link
                      href={`/anime/${item.anime.id}`}
                      className="inline-flex items-center gap-1 transition-colors hover:text-white"
                    >
                      Страница аниме
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:p-7">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-5 text-sky-300" />
            <div className="space-y-3">
              <p className="text-base font-medium text-white">
                Лента пока пустая
              </p>
              <p className="max-w-2xl leading-6 text-slate-400">
                Подпишитесь на других пользователей и дождитесь их новых
                действий в watchlist или истории просмотра.
              </p>
              <Link
                href="/users"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Перейти в каталог пользователей
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
