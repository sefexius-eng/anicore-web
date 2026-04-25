import Link from "next/link";
import { Bell, Clock3, Radio, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  getNotificationCenterData,
  type NotificationCenterItem,
} from "@/lib/notifications";
import { normalizePositiveInteger } from "@/lib/profile-data";

function formatNotificationDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function NotificationIcon({ type }: { type: NotificationCenterItem["type"] }) {
  const Icon = type === "new_episode" ? Radio : Users;

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-100">
      <Icon className="size-5" />
    </div>
  );
}

export default async function NotificationsPage() {
  const session = await auth();
  const viewerUserId = normalizePositiveInteger(session?.user?.id);

  if (!viewerUserId) {
    redirect("/login?callbackUrl=/notifications");
  }

  const data = await getNotificationCenterData(viewerUserId);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.78))] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
                <Bell className="size-3.5" />
                Уведомления
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  Новые серии и активность друзей
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Здесь собраны тайтлы, где появились непросмотренные серии, и
                  свежие действия пользователей, на которых вы подписаны.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-medium text-white">{data.newEpisodeCount}</p>
                <p>серий</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-medium text-white">{data.friendActivityCount}</p>
                <p>друзей</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {data.items.length > 0 ? (
        <section className="space-y-3">
          {data.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] transition-colors hover:border-sky-300/30 hover:bg-sky-400/10 sm:p-6"
            >
              <NotificationIcon type={item.type} />

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">
                    {item.metaLabel}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" />
                    {formatNotificationDate(item.occurredAt)}
                  </span>
                </div>

                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                <p className="text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-slate-400 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-7">
          Пока нет уведомлений. Добавьте тайтлы в список просмотра или подпишитесь
          на пользователей, чтобы здесь появилась свежая активность.
        </section>
      )}
    </div>
  );
}
