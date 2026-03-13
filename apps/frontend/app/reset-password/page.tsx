import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import Logo from "@/components/logo";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="grid min-h-svh lg:grid-cols-5">
        <div className="flex flex-col gap-4 p-6 md:p-10 lg:col-span-2">
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-bold">Invalid reset link</h1>
            <p className="text-muted-foreground text-center text-sm">
              This link is missing a token. Please request a new password reset
              from the login page.
            </p>
            <Link
              href="/forgot-password"
              className="text-primary underline"
            >
              Forgot password
            </Link>
            <Link href="/login" className="text-primary underline">
              Back to login
            </Link>
          </div>
        </div>
        <div className="bg-primary relative hidden lg:block lg:col-span-3">
          <div className="flex h-full items-center justify-center">
            <Logo className="w-80 h-80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-5">
      <div className="flex flex-col gap-4 p-6 md:p-10 lg:col-span-2">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <ResetPasswordForm token={token} />
          </div>
        </div>
      </div>
      <div className="bg-primary relative hidden lg:block lg:col-span-3">
        <div className="flex h-full items-center justify-center">
          <a
            href="https://www.restack.io"
            className="flex items-center gap-2 font-bold"
          >
            <div className="flex items-center justify-center">
              <Logo className="w-80 h-80" />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
