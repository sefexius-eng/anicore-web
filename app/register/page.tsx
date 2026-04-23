"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REGISTER_ERROR_MESSAGES = {
  invalid_email: "Укажите корректный email.",
  invalid_name: "Никнейм должен быть не короче 2 символов.",
  invalid_password: "Пароль должен содержать минимум 8 символов.",
  invalid_birth_date: "Укажите корректную дату рождения.",
  future_birth_date: "Дата рождения не может быть в будущем.",
  email_exists: "Пользователь с таким email уже существует.",
  unknown: "Не удалось создать аккаунт. Попробуйте еще раз.",
} as const;

function getErrorMessage(errorCode: string | null | undefined) {
  if (!errorCode) {
    return null;
  }

  return (
    REGISTER_ERROR_MESSAGES[
      errorCode as keyof typeof REGISTER_ERROR_MESSAGES
    ] ?? REGISTER_ERROR_MESSAGES.unknown
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const today = new Date();

  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  const maxBirthDate = today.toISOString().slice(0, 10);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email:
        typeof formData.get("email") === "string"
          ? String(formData.get("email")).trim()
          : "",
      name:
        typeof formData.get("name") === "string"
          ? String(formData.get("name")).trim()
          : "",
      password:
        typeof formData.get("password") === "string"
          ? String(formData.get("password"))
          : "",
      birthDate:
        typeof formData.get("birthDate") === "string"
          ? String(formData.get("birthDate")).trim()
          : "",
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setErrorMessage(
          getErrorMessage(data.error) ?? REGISTER_ERROR_MESSAGES.unknown,
        );
        return;
      }

      router.push("/login?callbackUrl=/");
      router.refresh();
    } catch {
      setErrorMessage(REGISTER_ERROR_MESSAGES.unknown);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
        <div className="space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Регистрация
          </h1>

          {errorMessage && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Никнейм
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="nickname"
                placeholder="Ваш никнейм"
                minLength={2}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Пароль
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Минимум 8 символов"
                minLength={8}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="birthDate"
                className="text-sm font-medium text-foreground"
              >
                Дата рождения
              </label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                max={maxBirthDate}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="h-11 w-full"
            >
              {isPending ? "Создаем аккаунт..." : "Создать аккаунт"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Войти
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
