import { LoginForm } from "@/app/login/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;

  return (
    <LoginForm callbackUrl={callbackUrl || "/"} queryError={error || null} />
  );
}
