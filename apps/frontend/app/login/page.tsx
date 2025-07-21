import { LoginForm } from "@/components/login-form";
import Logo from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-primary relative hidden lg:block">
        <div className="flex h-full items-center justify-center">
          <a
            href="https://www.restack.io"
            className="flex items-center gap-2 font-bold"
          >
            <div className="flex items-center justify-center">
              <Logo />
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
