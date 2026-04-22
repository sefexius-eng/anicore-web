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
          birthDate: user.birthDate.toISOString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.birthDate =
          "birthDate" in user ? normalizeBirthDate(user.birthDate) : null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
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
