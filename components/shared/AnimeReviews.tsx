"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Star } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { buildAvatarFallback } from "@/lib/profile-data";
import { cn } from "@/lib/utils";

interface ReviewAuthor {
  id: number;
  name: string;
  image: string | null;
}

interface AnimeReview {
  id: string;
  animeId: number;
  rating: number;
  text: string | null;
  createdAt: string;
  user: ReviewAuthor;
}

interface ReviewsResponse {
  averageRating?: number | null;
  reviewCount?: number;
  reviews?: AnimeReview[];
  viewerReview?: AnimeReview | null;
  error?: string;
}

interface AnimeReviewsProps {
  animeId: number;
}

function formatReviewDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function AnimeReviews({ animeId }: AnimeReviewsProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<AnimeReview[]>([]);
  const [viewerReview, setViewerReview] = useState<AnimeReview | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchReviews() {
      try {
        const response = await fetch(`/api/reviews?animeId=${animeId}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as ReviewsResponse;

        if (!response.ok) {
          throw new Error(data.error || "Не удалось загрузить рецензии.");
        }

        if (!isMounted) {
          return;
        }

        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setViewerReview(data.viewerReview ?? null);
        setSelectedRating(data.viewerReview?.rating ?? 0);
        setDraftText(data.viewerReview?.text ?? "");
        setAverageRating(
          typeof data.averageRating === "number" ? data.averageRating : null,
        );
        setReviewCount(typeof data.reviewCount === "number" ? data.reviewCount : 0);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить рецензии.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [animeId]);

  const ratingButtons = useMemo(
    () => Array.from({ length: 10 }, (_, index) => index + 1),
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRating) {
      setErrorMessage("Выберите оценку от 1 до 10.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          animeId,
          rating: selectedRating,
          text: draftText,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/anime/${animeId}`)}`);
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        review?: AnimeReview;
        error?: string;
      };

      if (!response.ok || !data.review) {
        throw new Error(data.error || "Не удалось сохранить рецензию.");
      }

      const nextViewerReview = data.review;
      const nextOtherReviews = reviews.filter(
        (review) => review.user.id !== nextViewerReview.user.id,
      );
      const ratingValues = [
        ...nextOtherReviews.map((review) => review.rating),
        nextViewerReview.rating,
      ];

      setViewerReview(nextViewerReview);
      setReviews(nextOtherReviews);
      setAverageRating(
        ratingValues.reduce((sum, rating) => sum + rating, 0) / ratingValues.length,
      );
      setReviewCount(ratingValues.length);
      setDraftText(nextViewerReview.text ?? "");
      setStatusMessage("Оценка сохранена.");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось сохранить рецензию.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-neutral-800 bg-[#111111] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Рецензии AniMirok
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
            <span>
              Средняя оценка:{" "}
              <span className="font-semibold text-white">
                {averageRating !== null ? averageRating.toFixed(1) : "Пока нет"}
              </span>
            </span>
            <span>Рецензий: {reviewCount}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-white">Ваша оценка</p>

            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {ratingButtons.map((rating) => {
                const isActive = rating <= selectedRating;

                return (
                  <button
                    key={rating}
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "border-amber-400/40 bg-amber-400/20 text-amber-100"
                        : "border-neutral-800 bg-[#181818] text-neutral-400 hover:border-neutral-700 hover:text-white",
                    )}
                    onClick={() => setSelectedRating(rating)}
                    aria-pressed={isActive}
                  >
                    <Star
                      className={cn("size-4", isActive && "fill-current")}
                    />
                    <span>{rating}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white">
              Текст рецензии
            </span>
            <textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              placeholder="Расскажите, чем вам запомнился этот тайтл..."
              rows={4}
              maxLength={2000}
              className="min-h-32 w-full resize-y rounded-2xl border border-neutral-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-cyan-500"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-xs text-neutral-500">
              <p>Оценка от 1 до 10. Одна рецензия на один тайтл.</p>
              <p>Текст необязателен, но помогает другим выбрать, что смотреть.</p>
            </div>

            <Button
              type="submit"
              className="rounded-full bg-white px-5 text-black hover:bg-neutral-200"
              disabled={isSubmitting || !selectedRating}
            >
              {isSubmitting
                ? "Сохраняем..."
                : viewerReview
                  ? "Обновить оценку"
                  : "Оценить"}
            </Button>
          </div>

          {statusMessage ? (
            <p className="text-sm text-emerald-300">{statusMessage}</p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-300">
              {errorMessage}
              {errorMessage.includes("Войдите") ? (
                <>
                  {" "}
                  <Link
                    href={`/login?callbackUrl=${encodeURIComponent(`/anime/${animeId}`)}`}
                    className="underline decoration-neutral-400 underline-offset-4"
                  >
                    Войти
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </form>

        {viewerReview ? (
          <article className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Ваша рецензия</p>
                <p className="text-xs text-cyan-100/80">
                  Обновлено {formatReviewDate(viewerReview.createdAt)}
                </p>
              </div>
              <span className="rounded-full border border-cyan-300/30 bg-black/20 px-3 py-1 text-sm font-semibold text-cyan-100">
                {viewerReview.rating}/10
              </span>
            </div>

            <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-neutral-200">
              {viewerReview.text?.trim() || "Оценка сохранена без текста."}
            </p>
          </article>
        ) : null}

        <div className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`review-skeleton-${index}`}
                  className="flex gap-3 rounded-2xl border border-neutral-800 bg-[#151515] p-4"
                >
                  <div className="size-10 rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-40 rounded-full bg-neutral-800" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded-full bg-neutral-900" />
                      <div className="h-3 w-4/5 rounded-full bg-neutral-900" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <article
                key={review.id}
                className="flex gap-3 rounded-2xl border border-neutral-800 bg-[#151515] p-4"
              >
                <Link href={`/user/${review.user.id}`} className="shrink-0">
                  <img
                    src={review.user.image?.trim() || buildAvatarFallback(review.user.name)}
                    alt={review.user.name}
                    className="size-10 rounded-full border border-neutral-700 object-cover"
                    referrerPolicy="no-referrer"
                  />
                </Link>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link
                      href={`/user/${review.user.id}`}
                      className="text-sm font-semibold text-white transition-colors hover:text-cyan-300"
                    >
                      {review.user.name}
                    </Link>
                    <span className="rounded-full border border-neutral-700 bg-black/20 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                      {review.rating}/10
                    </span>
                    <p className="text-xs text-neutral-500">
                      {formatReviewDate(review.createdAt)}
                    </p>
                  </div>

                  <p className="whitespace-pre-line break-words text-sm leading-6 text-neutral-200">
                    {review.text?.trim() || "Пользователь оставил только оценку без текста."}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-[#141414] px-4 py-10 text-center text-sm text-neutral-500">
              Пока нет рецензий от других пользователей. Станьте первым, кто задаст тон обсуждению.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
