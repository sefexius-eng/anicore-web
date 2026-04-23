import { hash } from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";

const REGISTER_ERROR_MESSAGES = {
  invalid_email: "Укажите корректный email.",
  invalid_name: "Никнейм должен быть не короче 2 символов.",
  invalid_password: "Пароль должен содержать минимум 8 символов.",
  invalid_birth_date: "Укажите корректную дату рождения.",
  future_birth_date: "Дата рождения не может быть в будущем.",
  email_exists: "Пользователь с таким email уже существует.",
  unknown: "Не удалось создать аккаунт. Попробуйте еще раз.",
} as const;

function getErrorMessage(errorCode: string | undefined) {
  if (!errorCode) {
    return null;
  }

  return (
    REGISTER_ERROR_MESSAGES[
      errorCode as keyof typeof REGISTER_ERROR_MESSAGES
    ] ?? REGISTER_ERROR_MESSAGES.unknown
  );
}

function parseBirthDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

async function registerUser(formData: FormData) {
  "use server";

  const email =
    typeof formData.get("email") === "string"
      ? String(formData.get("email")).trim().toLowerCase()
      : "";
  const name =
    typeof formData.get("name") === "string"
      ? String(formData.get("name")).trim()
      : "";
  const password =
    typeof formData.get("password") === "string"
      ? String(formData.get("password"))
      : "";
  const birthDateInput =
    typeof formData.get("birthDate") === "string"
      ? String(formData.get("birthDate")).trim()
      : "";

  if (!email || !email.includes("@")) {
    redirect("/register?error=invalid_email");
  }

  if (name.length < 2) {
    redirect("/register?error=invalid_name");
  }

  if (password.length < 8) {
    redirect("/register?error=invalid_password");
  }

  const birthDate = parseBirthDateInput(birthDateInput);

  if (!birthDate) {
    redirect("/register?error=invalid_birth_date");
  }

  if (birthDate.getTime() > Date.now()) {
    redirect("/register?error=future_birth_date");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirect("/register?error=email_exists");
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      birthDate,
    },
  });

  redirect("/login?callbackUrl=/");
}

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { error } = await searchParams;
  const errorMessage = getErrorMessage(error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-sm">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_45%),radial-gradient(circle_at_80%_25%,_rgba(99,102,241,0.22),_transparent_38%),linear-gradient(180deg,rgba(10,18,32,0.96),rgba(5,10,20,0.94))] p-8 sm:p-10">
            <div className="pointer-events-none absolute -right-16 top-12 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-8 h-32 w-32 rounded-full bg-cyan-500/15 blur-3xl" />

            <div className="relative space-y-6">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-300">
                AniCore Account
              </p>

              <div className="space-y-4">
                <h1 className="max-w-md text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Создайте аккаунт и откройте персональные функции AniCore
                </h1>

                <p className="max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                  Регистрация сохраняет дату рождения в сессии, чтобы age-filter
                  применялся глобально без лишних обращений к базе данных.
                </p>
              </div>

              <div className="grid gap-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Безопасный вход через NextAuth CredentialsProvider
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Пароль сохраняется только в виде bcrypt-хеша
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Возрастной фильтр 18+ применяется автоматически
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Регистрация
                </h2>
                <p className="text-sm text-muted-foreground">
                  После создания аккаунта вы сможете сразу войти через нашу
                  кастомную страницу авторизации.
                </p>
              </div>

              {errorMessage && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <form action={registerUser} className="space-y-5">
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
                    required
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="h-11 w-full">
                  Создать аккаунт
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
          </div>
        </div>
      </section>
    </main>
  );
}
