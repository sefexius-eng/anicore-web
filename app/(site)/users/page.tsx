/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Search, Users } from "lucide-react";

import { FollowButton } from "@/components/shared/FollowButton";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { normalizePositiveInteger } from "@/lib/profile-data";
import { prisma } from "@/lib/prisma";

interface UsersPageProps {
  searchParams: Promise<{
    q?: string | string[];
  }>;
}

function getSearchQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { q } = await searchParams;
  const searchQuery = getSearchQuery(q);

  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);

  const [users, followingEntries] = await Promise.all([
    prisma.user.findMany({
      where: {
        ...(viewerUserId
          ? {
              id: {
                not: viewerUserId,
              },
            }
          : {}),
        ...(searchQuery
          ? {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    }),
    viewerUserId
      ? prisma.follows.findMany({
          where: {
            followerId: viewerUserId,
          },
          select: {
            followingId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const followingSet = new Set(
    followingEntries.map((entry) => entry.followingId),
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.78))] p-6 sm:p-7">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
              <Users className="size-3.5" />
              Сообщество AniMirok
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                Каталог пользователей
              </h1>

              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Ищите друзей по имени, переходите в публичные профили и
                подписывайтесь на тех, чья активность вам интересна.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <form className="space-y-3" method="get">
            <label className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                Поиск по имени
              </span>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Например: Sefexxs"
                  className="h-11 rounded-2xl border-border/70 bg-background/80 pl-11 pr-4 text-sm"
                />
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-slate-300">
              <p>
                Найдено пользователей:{" "}
                <span className="font-semibold text-white">{users.length}</span>
              </p>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
              >
                Найти
              </button>
            </div>
          </form>
        </div>
      </section>

      {users.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => {
            const avatarSrc = user.image?.trim() || "/default-avatar.jpg";

            return (
              <article
                key={user.id}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <Link href={`/user/${user.id}`} className="shrink-0">
                    <img
                      src={avatarSrc}
                      alt={user.name}
                      className="size-16 rounded-full border border-white/10 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </Link>

                  <div className="min-w-0 flex-1 space-y-4">
                    <div className="space-y-1">
                      <Link
                        href={`/user/${user.id}`}
                        className="block truncate text-lg font-semibold text-white transition-colors hover:text-sky-300"
                      >
                        {user.name}
                      </Link>

                      <p className="text-sm text-slate-400">
                        Подписчики: {user._count.followers} · Подписки:{" "}
                        {user._count.following}
                      </p>
                    </div>

                    <FollowButton
                      targetUserId={user.id}
                      initialIsFollowing={followingSet.has(user.id)}
                      className="w-full"
                      buttonClassName="w-full justify-center rounded-2xl"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm text-slate-400 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur-sm">
          Пользователи по этому запросу пока не найдены.
        </section>
      )}
    </div>
  );
}
