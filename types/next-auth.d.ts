import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      birthDate: string | null;
    };
  }

  interface User {
    id: string;
    image?: string | null;
    birthDate?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    image?: string | null;
    birthDate?: string | null;
  }
}
