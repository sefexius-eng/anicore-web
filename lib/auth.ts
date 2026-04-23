import { compare } from "bcryptjs";
import { cache } from "react";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { isAdult } from "@/lib/age";
import { prisma } from "@/lib/prisma";

function normalizeBirthDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return null;
  }

  return parsedValue.toISOString();
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    newUser: "/register",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.image,
          birthDate: user.birthDate.toISOString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.name = user.name ?? token.name;
        token.email = user.email ?? token.email;
        token.image = user.image ?? null;
        token.birthDate =
          "birthDate" in user ? normalizeBirthDate(user.birthDate) : null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";

        const sessionUserId = Number(token.sub);

        if (Number.isInteger(sessionUserId) && sessionUserId > 0) {
          const user = await prisma.user.findUnique({
            where: {
              id: sessionUserId,
            },
            select: {
              name: true,
              email: true,
              image: true,
              birthDate: true,
            },
          });

          if (user) {
            session.user.name = user.name;
            session.user.email = user.email;
            session.user.image = user.image;
            session.user.birthDate = user.birthDate.toISOString();

            return session;
          }
        }

        session.user.image =
          typeof token.image === "string" ? token.image : session.user.image ?? null;
        session.user.birthDate =
          typeof token.birthDate === "string" ? token.birthDate : null;
      }

      return session;
    },
  },
};

export const auth = cache(async () => getServerSession(authOptions));

export const getViewerAccess = cache(async () => {
  const session = await auth();
  const birthDate = session?.user?.birthDate ?? null;
  const hasSession = Boolean(session?.user);
  const hasAdultAccess = hasSession && isAdult(birthDate);

  return {
    session,
    hasSession,
    hasAdultAccess,
    shouldFilterAdultContent: !hasAdultAccess,
  };
});
