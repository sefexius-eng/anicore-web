"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

interface CommentAuthor {
  id: number;
  name: string;
  image: string | null;
}

interface AnimeComment {
  id: string;
  animeId: number;
  content: string;
  createdAt: string;
  user: CommentAuthor;
}

interface AnimeCommentsProps {
  animeId: number;
}

function buildAvatarFallback(userName: string): string {
  const initials =
    userName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "A";

  return `https://placehold.co/96x96/111827/e5e7eb?text=${encodeURIComponent(initials)}`;
}

function formatCommentDate(value: string): string {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export function AnimeComments({ animeId }: AnimeCommentsProps) {
  const [comments, setComments] = useState<AnimeComment[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchComments() {
      try {
        const response = await fetch(`/api/comments?animeId=${animeId}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          comments?: AnimeComment[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Не удалось загрузить комментарии.");
        }

        if (!isMounted) {
          return;
        }

        setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить комментарии.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchComments();

    return () => {
      isMounted = false;
    };
  }, [animeId]);

  const commentCountLabel = useMemo(() => {
    const total = comments.length;
    return `${total} ${total === 1 ? "комментарий" : total < 5 ? "комментария" : "комментариев"}`;
  }, [comments.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedDraft = draft.trim();

    if (!normalizedDraft) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          animeId,
          content: normalizedDraft,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        comment?: AnimeComment;
        error?: string;
      };

      if (!response.ok || !data.comment) {
        throw new Error(
          data.error ||
            (response.status === 401
              ? "Войдите, чтобы оставить комментарий."
              : "Не удалось опубликовать комментарий."),
        );
      }

      setComments((currentComments) => [data.comment!, ...currentComments]);
      setDraft("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Не удалось опубликовать комментарий.",
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
            Комментарии
          </h2>
          <p className="text-sm text-neutral-400">{commentCountLabel}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Оставьте комментарий..."
            rows={3}
            maxLength={1000}
            className="min-h-28 w-full resize-y rounded-2xl border border-neutral-800 bg-[#181818] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-cyan-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">
              До 1000 символов. Комментарий появится сразу после отправки.
            </p>

            <Button
              type="submit"
              className="rounded-full bg-white px-5 text-black hover:bg-neutral-200"
              disabled={isSubmitting || !draft.trim()}
            >
              {isSubmitting ? "Публикуем..." : "Отправить"}
            </Button>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-300">
              {errorMessage}{" "}
              {errorMessage.includes("Войдите") ? (
                <Link href="/login" className="underline decoration-neutral-400 underline-offset-4">
                  Войти
                </Link>
              ) : null}
            </p>
          ) : null}
        </form>

        <div className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`comment-skeleton-${index}`}
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
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <article
                key={comment.id}
                className="flex gap-3 rounded-2xl border border-neutral-800 bg-[#151515] p-4"
              >
                <img
                  src={comment.user.image?.trim() || buildAvatarFallback(comment.user.name)}
                  alt={comment.user.name}
                  className="size-10 rounded-full border border-neutral-700 object-cover"
                  referrerPolicy="no-referrer"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm font-semibold text-white">
                      {comment.user.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                  </div>

                  <p className="whitespace-pre-line break-words text-sm leading-6 text-neutral-200">
                    {comment.content}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-[#141414] px-4 py-10 text-center text-sm text-neutral-500">
              Пока нет комментариев. Станьте первым.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
