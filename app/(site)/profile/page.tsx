import { redirect } from "next/navigation";

import { AvatarUpload } from "@/components/shared/avatar-upload";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
  }).format(value);
}

export default async function ProfilePage() {
  const session = await auth();
  const sessionUserId = Number(session?.user?.id ?? Number.NaN);

  if (!Number.isInteger(sessionUserId) || sessionUserId <= 0) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: sessionUserId,
    },
    select: {
      name: true,
      email: true,
      image: true,
      birthDate: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-2xl backdrop-blur-sm">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.18em] text-sky-300">
            Профиль
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {user.name}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Здесь можно обновить аватар и быстро проверить данные аккаунта.
          </p>

          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {user.email}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Дата рождения
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatDate(user.birthDate)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                В AniMirok с
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatDate(user.createdAt)}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Статус
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                Аккаунт активен
              </p>
            </div>
          </div>
        </div>
      </section>

      <AvatarUpload currentImage={user.image} userName={user.name} />
    </div>
  );
}
