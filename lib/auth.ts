import { compare } from "bcryptjs";
import { cache } from "react";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { isAdult } from "@/lib/age";
import { prisma } from "@/lib/prisma";

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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      delete token.picture;
      delete token.image;
      delete token.birthDate;

      if (user) {
        token.id = user.id;
        token.sub = user.id;
        token.name = user.name ?? null;
        token.email = user.email ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const tokenUserId =
          typeof token.id === "string"
            ? token.id
            : typeof token.sub === "string"
              ? token.sub
              : "";

        session.user.id = tokenUserId;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name;
        session.user.email =
          typeof token.email === "string" ? token.email : session.user.email;
        session.user.image = null;
        session.user.birthDate = null;

        const sessionUserId = Number(tokenUserId);

        if (Number.isInteger(sessionUserId) && sessionUserId > 0) {
          const user = await prisma.user.findUnique({
            where: {
              id: sessionUserId,
            },
            select: {
              birthDate: true,
            },
          });

          if (user) {
            session.user.birthDate = user.birthDate.toISOString();
          }
        }
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
