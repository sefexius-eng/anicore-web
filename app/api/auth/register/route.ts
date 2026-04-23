import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      password?: unknown;
      name?: unknown;
      birthDate?: unknown;
    };

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const birthDateInput =
      typeof body.birthDate === "string" ? body.birthDate.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "invalid_email" },
        { status: 400 },
      );
    }

    if (name.length < 2) {
      return NextResponse.json(
        { success: false, error: "invalid_name" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "invalid_password" },
        { status: 400 },
      );
    }

    const birthDate = parseBirthDateInput(birthDateInput);

    if (!birthDate) {
      return NextResponse.json(
        { success: false, error: "invalid_birth_date" },
        { status: 400 },
      );
    }

    if (birthDate.getTime() > Date.now()) {
      return NextResponse.json(
        { success: false, error: "future_birth_date" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { success: false, error: "email_exists" },
        { status: 409 },
      );
    }

    const hashedPassword = await hash(password, 12);
    console.log("Register attempt for:", body.email);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        birthDate: new Date(birthDate),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, error: "email_exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register user" },
      { status: 500 },
    );
  }
}
