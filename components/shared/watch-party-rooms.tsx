"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { CalendarClock, MessageCircle, Plus, Send, Users } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildAvatarFallback } from "@/lib/profile-data";
import { cn } from "@/lib/utils";

interface WatchPartyUser {
  id: number;
  name: string;
  image: string | null;
}

interface WatchPartyRoom {
  id: string;
  animeId: number;
  title: string;
  description: string | null;
  startsAt: string | null;
  createdAt: string;
  lastActivityAt: string;
  host: WatchPartyUser;
  messageCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    user: {
      name: string;
    };
  } | null;
}

interface WatchPartyMessage {
  id: string;
  content: string;
  createdAt: string;
  user: WatchPartyUser;
}

interface WatchPartyRoomsProps {
  animeId: number;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Без расписания";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Без расписания";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function WatchPartyRooms({ animeId }: WatchPartyRoomsProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<WatchPartyRoom[]>([]);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomStartsAt, setRoomStartsAt] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeRoom = useMemo(
    () => rooms.find((room) => room.id === activeRoomId) ?? null,
    [activeRoomId, rooms],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let isMounted = true;

    async function loadRooms() {
      setIsLoadingRooms(true);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/watch-party/rooms?animeId=${animeId}`, {
          cache: "no-store",
        });
        const data = (await response.json().catch(() => ({}))) as {
          rooms?: WatchPartyRoom[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Не удалось загрузить комнаты.");
        }

        if (!isMounted) {
          return;
        }

        const nextRooms = Array.isArray(data.rooms) ? data.rooms : [];
        setRooms(nextRooms);
        setActiveRoomId((currentRoomId) => currentRoomId ?? nextRooms[0]?.id ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить комнаты.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingRooms(false);
        }
      }
    }

    void loadRooms();

    return () => {
      isMounted = false;
    };
  }, [animeId]);

  useEffect(() => {
    if (!activeRoomId) {
      setMessages([]);
      setIsLoadingMessages(false);
      return;
    }

    let isMounted = true;
    let intervalId: number | null = null;

    async function loadMessages(showLoading: boolean) {
      if (showLoading) {
        setIsLoadingMessages(true);
      }

      try {
        const response = await fetch(
          `/api/watch-party/messages?roomId=${encodeURIComponent(activeRoomId!)}`,
          {
            cache: "no-store",
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          messages?: WatchPartyMessage[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Не удалось загрузить сообщения.");
        }

        if (!isMounted) {
          return;
        }

        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "Не удалось загрузить сообщения.",
        );
      } finally {
        if (isMounted && showLoading) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages(true);
    intervalId = window.setInterval(() => {
      void loadMessages(false);
    }, 15000);

    return () => {
      isMounted = false;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [activeRoomId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = roomTitle.trim();

    if (!normalizedTitle) {
      return;
    }

    setIsCreatingRoom(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/watch-party/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          animeId,
          title: normalizedTitle,
          description: roomDescription,
          startsAt: roomStartsAt,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/anime/${animeId}`)}`);
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        room?: WatchPartyRoom;
        error?: string;
      };

      if (!response.ok || !data.room) {
        throw new Error(data.error || "Не удалось создать комнату.");
      }

      setRooms((currentRooms) => [data.room!, ...currentRooms]);
      setActiveRoomId(data.room.id);
      setRoomTitle("");
      setRoomDescription("");
      setRoomStartsAt("");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось создать комнату.",
      );
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedMessage = messageDraft.trim();

    if (!activeRoomId || !normalizedMessage) {
      return;
    }

    setIsSendingMessage(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/watch-party/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          roomId: activeRoomId,
          content: normalizedMessage,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/anime/${animeId}`)}`);
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        message?: WatchPartyMessage;
        error?: string;
      };

      if (!response.ok || !data.message) {
        throw new Error(data.error || "Не удалось отправить сообщение.");
      }

      setMessages((currentMessages) => [...currentMessages, data.message!]);
      setRooms((currentRooms) =>
        currentRooms.map((room) =>
          room.id === activeRoomId
            ? {
                ...room,
                lastActivityAt: data.message!.createdAt,
                messageCount: room.messageCount + 1,
                lastMessage: {
                  content: data.message!.content,
                  createdAt: data.message!.createdAt,
                  user: {
                    name: data.message!.user.name,
                  },
                },
              }
            : room,
        ),
      );
      setMessageDraft("");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Не удалось отправить сообщение.",
      );
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-neutral-800 bg-[#111111] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.32)] sm:p-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-sky-200">
              <Users className="size-3.5" />
              Watch-party
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Комнаты просмотра
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-neutral-400">
              Создавайте комнату под совместный просмотр, договаривайтесь о времени
              и обсуждайте тайтл без смешивания с обычными комментариями.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-300">
            <p className="font-medium text-white">{rooms.length}</p>
            <p>активных комнат</p>
          </div>
        </div>

        <form
          onSubmit={handleCreateRoom}
          className="grid gap-3 rounded-2xl border border-neutral-800 bg-[#151515] p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_220px_auto]"
        >
          <Input
            value={roomTitle}
            onChange={(event) => setRoomTitle(event.target.value)}
            placeholder="Название комнаты"
            maxLength={80}
            className="h-11 rounded-2xl border-neutral-800 bg-[#181818] text-sm"
          />
          <Input
            value={roomDescription}
            onChange={(event) => setRoomDescription(event.target.value)}
            placeholder="Тема или эпизоды"
            maxLength={240}
            className="h-11 rounded-2xl border-neutral-800 bg-[#181818] text-sm"
          />
          <Input
            type="datetime-local"
            value={roomStartsAt}
            onChange={(event) => setRoomStartsAt(event.target.value)}
            className="h-11 rounded-2xl border-neutral-800 bg-[#181818] text-sm"
          />
          <Button
            type="submit"
            disabled={isCreatingRoom || !roomTitle.trim()}
            className="h-11 rounded-2xl bg-white px-5 text-black hover:bg-neutral-200"
          >
            <Plus className="size-4" />
            {isCreatingRoom ? "Создаём" : "Создать"}
          </Button>
        </form>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-3">
            {isLoadingRooms ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`watch-party-room-skeleton-${index}`}
                  className="h-28 animate-pulse rounded-2xl border border-neutral-800 bg-[#151515]"
                />
              ))
            ) : rooms.length > 0 ? (
              rooms.map((room) => {
                const isActive = room.id === activeRoomId;

                return (
                  <button
                    key={room.id}
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      isActive
                        ? "border-sky-300/30 bg-sky-400/10"
                        : "border-neutral-800 bg-[#151515] hover:border-neutral-700 hover:bg-[#181818]",
                    )}
                    onClick={() => setActiveRoomId(room.id)}
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={room.host.image?.trim() || buildAvatarFallback(room.host.name)}
                        alt={room.host.name}
                        className="size-10 rounded-full border border-neutral-700 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        <h3 className="line-clamp-1 text-sm font-semibold text-white">
                          {room.title}
                        </h3>
                        <p className="line-clamp-2 text-xs leading-5 text-neutral-400">
                          {room.description || "Комната без описания"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="size-3.5" />
                            {formatDateTime(room.startsAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="size-3.5" />
                            {room.messageCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-800 bg-[#151515] px-4 py-10 text-center text-sm text-neutral-500">
                Комнат пока нет. Создайте первую.
              </div>
            )}
          </div>

          <div className="flex min-h-[420px] flex-col rounded-2xl border border-neutral-800 bg-[#151515]">
            {activeRoom ? (
              <>
                <div className="border-b border-neutral-800 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-semibold text-white">
                        {activeRoom.title}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {activeRoom.description || "Обсуждение без описания"}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-neutral-300">
                      {formatDateTime(activeRoom.startsAt)}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {isLoadingMessages ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={`watch-party-message-skeleton-${index}`}
                        className="h-16 animate-pulse rounded-2xl bg-neutral-800/60"
                      />
                    ))
                  ) : messages.length > 0 ? (
                    messages.map((message) => (
                      <article key={message.id} className="flex gap-3">
                        <Link href={`/user/${message.user.id}`} className="shrink-0">
                          <img
                            src={
                              message.user.image?.trim() ||
                              buildAvatarFallback(message.user.name)
                            }
                            alt={message.user.name}
                            className="size-9 rounded-full border border-neutral-700 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </Link>

                        <div className="min-w-0 flex-1 rounded-2xl border border-neutral-800 bg-[#181818] px-4 py-3">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Link
                              href={`/user/${message.user.id}`}
                              className="text-sm font-semibold text-white hover:text-sky-300"
                            >
                              {message.user.name}
                            </Link>
                            <span className="text-xs text-neutral-500">
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-line break-words text-sm leading-6 text-neutral-200">
                            {message.content}
                          </p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-800 px-4 py-10 text-center text-sm text-neutral-500">
                      Сообщений пока нет. Начните обсуждение.
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-3 border-t border-neutral-800 p-4"
                >
                  <Input
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder="Сообщение в комнату"
                    maxLength={700}
                    className="h-11 rounded-2xl border-neutral-800 bg-[#181818] text-sm"
                  />
                  <Button
                    type="submit"
                    disabled={isSendingMessage || !messageDraft.trim()}
                    className="h-11 shrink-0 rounded-2xl bg-white px-4 text-black hover:bg-neutral-200"
                  >
                    <Send className="size-4" />
                    <span className="hidden sm:inline">
                      {isSendingMessage ? "Отправляем" : "Отправить"}
                    </span>
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 py-10 text-center text-sm text-neutral-500">
                Выберите комнату или создайте новую.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
