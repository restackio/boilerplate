import { SignupForm } from "@/components/auth/signup-form";
import Logo from "@/components/logo";

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-5">
      <div className="flex flex-col gap-4 p-6 md:p-10 lg:col-span-2">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
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
