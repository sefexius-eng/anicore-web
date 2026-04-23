"use client";

import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Неверный email или пароль.",
  AccessDenied: "Доступ к входу ограничен.",
  CallbackRouteError: "Не удалось завершить вход. Попробуйте еще раз.",
  Default: "Не удалось выполнить вход. Попробуйте еще раз.",
};

function getErrorMessage(error: string | null) {
  if (!error) {
    return null;
  }

  return AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default;
}

interface LoginFormProps {
  callbackUrl: string;
  queryError: string | null;
}

export function LoginForm({ callbackUrl, queryError }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      callbackUrl,
      redirect: false,
    });

    setIsPending(false);

    if (!result) {
      setErrorMessage(AUTH_ERROR_MESSAGES.Default);
      return;
    }

    if (result.error) {
      setErrorMessage(getErrorMessage(result.error));
      return;
    }

    router.push(result.url || callbackUrl);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center border-b border-white/10 bg-slate-950/70 p-8 sm:p-10 lg:border-b-0 lg:border-r">
          <div className="space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
              AniCore Account
            </p>

            <div className="space-y-4">
              <h1 className="max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Добро пожаловать в AniCore
              </h1>

              <p className="max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
                Войдите в свой аккаунт, чтобы сохранять историю просмотров и
                получать персональные рекомендации.
              </p>
            </div>
          </div>

        </div>

        <div className="p-8 sm:p-10">
          <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Войти
              </h2>
              <p className="text-sm text-slate-400">
                Используйте email и пароль от вашего аккаунта.
              </p>
            </div>

            {(errorMessage || getErrorMessage(queryError)) && (
              <div className="mt-6 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {errorMessage || getErrorMessage(queryError)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-200"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    className="h-11 rounded-lg border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus-visible:border-sky-300/60 focus-visible:ring-sky-300/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-200"
                >
                  Пароль
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                    required
                    className="h-11 rounded-lg border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus-visible:border-sky-300/60 focus-visible:ring-sky-300/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="h-11 w-full rounded-lg bg-sky-300 text-slate-950 hover:bg-sky-200 disabled:bg-sky-300/70"
              >
                <span>{isPending ? "Входим..." : "Войти"}</span>
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              Нет аккаунта?{" "}
              <Link
                href="/register"
                className="font-medium text-sky-300 transition-colors hover:text-sky-200"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
