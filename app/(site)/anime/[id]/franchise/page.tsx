import Link from "next/link";
import { ArrowLeft, BadgeInfo, Clapperboard, Film, ListOrdered, Split } from "lucide-react";

import {
  getAnimeById,
  getAnimeFranchiseGuide,
  type AnimeFranchiseGuide,
  type AnimeFranchiseGuideItem,
} from "@/services/jikanApi";
import { cn } from "@/lib/utils";

interface FranchisePageProps {
  params: Promise<{
    id?: string | string[];
  }>;
}

interface FranchiseSectionProps {
  title: string;
  description: string;
  emptyLabel: string;
  items: AnimeFranchiseGuideItem[];
  icon: "order" | "movie" | "ova" | "spin";
}

function getRouteAnimeId(value: string | string[] | undefined): number {
  const rawId = Array.isArray(value) ? value[0] : value;
  return Number(rawId);
}

function FranchiseSectionIcon({ icon }: { icon: FranchiseSectionProps["icon"] }) {
  if (icon === "movie") {
    return <Film className="size-5" />;
  }

  if (icon === "ova") {
    return <Clapperboard className="size-5" />;
  }

  if (icon === "spin") {
    return <Split className="size-5" />;
  }

  return <ListOrdered className="size-5" />;
}

function FranchiseItemRow({ item }: { item: AnimeFranchiseGuideItem }) {
  const body = (
    <>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-200">
        {item.order}
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-sm font-semibold leading-6 text-white sm:text-base">
            {item.title}
          </h3>

          {item.isCurrent ? (
            <span className="rounded-full border border-sky-300/30 bg-sky-400/15 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-sky-100">
              Сейчас
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-black/10 px-2.5 py-1">
            {item.kind}
          </span>
          <span>{item.year ?? "Год неизвестен"}</span>
          {item.relationLabels.slice(0, 2).map((label) => (
            <span
              key={`${item.id}-${label}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  if (item.isCurrent) {
    return (
      <div className="flex gap-3 rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-sky-300/30 hover:bg-sky-400/10"
    >
      {body}
    </Link>
  );
}

function FranchiseSection({
  title,
  description,
  emptyLabel,
  items,
  icon,
}: FranchiseSectionProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-100">
          <FranchiseSectionIcon icon={icon} />
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
          <p className="text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            <FranchiseItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

async function getCurrentTitle(animeId: number): Promise<string> {
  try {
    const anime = await getAnimeById(animeId);
    return anime.russian?.trim() || anime.name?.trim() || anime.title;
  } catch {
    return `Anime #${animeId}`;
  }
}

async function getFranchiseGuideSafely(
  animeId: number,
  title: string,
): Promise<AnimeFranchiseGuide> {
  try {
    return await getAnimeFranchiseGuide(animeId);
  } catch {
    return {
      currentId: animeId,
      watchOrder: [
        {
          id: animeId,
          order: 1,
          title,
          kind: "TV",
          year: null,
          href: `/anime/${animeId}`,
          isCurrent: true,
          relationLabels: [],
        },
      ],
      movies: [],
      ova: [],
      spinOffs: [],
    };
  }
}

export default async function FranchisePage({ params }: FranchisePageProps) {
  const resolvedParams = await params;
  const animeId = getRouteAnimeId(resolvedParams.id);

  if (!Number.isInteger(animeId) || animeId <= 0) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Не удалось определить тайтл для франшизы.
      </p>
    );
  }

  const title = await getCurrentTitle(animeId);
  const guide = await getFranchiseGuideSafely(animeId, title);
  const totalItems = new Set([
    ...guide.watchOrder,
    ...guide.movies,
    ...guide.ova,
    ...guide.spinOffs,
  ].map((item) => item.id)).size;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-2xl backdrop-blur-sm">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.78))] p-6 sm:p-7">
          <Link
            href={`/anime/${animeId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" />
            Вернуться к тайтлу
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-sky-200">
                <BadgeInfo className="size-3.5" />
                Франшиза
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="text-sm leading-6 text-slate-300 sm:text-base">
                  Порядок сезонов, полнометражные фильмы, OVA, спецвыпуски и
                  спин-оффы собраны в одном месте по данным Shikimori.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <p className="font-medium text-white">Связанных тайтлов</p>
              <p>{totalItems}</p>
            </div>
          </div>
        </div>
      </section>

      <div className={cn("grid gap-5", "xl:grid-cols-2")}>
        <FranchiseSection
          title="Порядок сезонов"
          description="Основная линия просмотра в хронологическом порядке выхода."
          emptyLabel="Для этой франшизы не найдено отдельных TV-сезонов."
          icon="order"
          items={guide.watchOrder}
        />

        <FranchiseSection
          title="Фильмы"
          description="Полнометражные истории, пересказы и театральные релизы."
          emptyLabel="Фильмы в этой франшизе пока не найдены."
          icon="movie"
          items={guide.movies}
        />

        <FranchiseSection
          title="OVA и спецвыпуски"
          description="Дополнительные эпизоды, ONA, OVA и специальные выпуски."
          emptyLabel="OVA и спецвыпуски в этой франшизе пока не найдены."
          icon="ova"
          items={guide.ova}
        />

        <FranchiseSection
          title="Спин-оффы"
          description="Побочные ветки, истории персонажей и альтернативные ответвления."
          emptyLabel="Спин-оффы в этой франшизе пока не найдены."
          icon="spin"
          items={guide.spinOffs}
        />
      </div>
    </div>
  );
}
