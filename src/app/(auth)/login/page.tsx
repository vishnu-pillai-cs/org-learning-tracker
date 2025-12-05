"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const errorMessages: Record<string, string> = {
    NotInvited: "You need an invitation to join. Please contact your manager.",
    AccountInactive: "Your account has been deactivated. Please contact your administrator.",
    SignInError: "An error occurred during sign in. Please try again.",
    OAuthAccountNotLinked: "This email is already linked to another account.",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxMGI5ODEiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      {/* Animated gradient blobs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-emerald-300/30 to-teal-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-teal-300/20 to-emerald-300/20 rounded-full blur-3xl animate-pulse delay-700" />
      
      {/* Floating shapes */}
      <div className="absolute top-32 right-1/4 w-3 h-3 bg-emerald-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.2s' }} />
      <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-teal-500 rounded-full opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/3 left-20 w-4 h-4 border-2 border-emerald-400/30 rounded-lg rotate-12 animate-spin" style={{ animationDuration: '10s' }} />

      <div className="relative z-10 w-full max-w-md px-6 animate-slide-up">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-emerald-500/10 border border-white/50 p-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 w-16 h-16 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
              <div className="relative w-full h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">LearnForge</span>
            </h1>
            <p className="text-slate-500">
              Track your learning journey and grow with your team
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-red-600">
                  {errorMessages[error] || "An error occurred. Please try again."}
                </p>
              </div>
            </div>
          )}

          {/* Sign In Button */}
          <Button
            onClick={() => signIn("google", { callbackUrl })}
            size="lg"
            className="w-full h-13 text-base font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 border-0"
          >
            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { icon: "📚", label: "Track" },
                { icon: "📈", label: "Grow" },
                { icon: "🏆", label: "Achieve" },
              ].map((item, i) => (
                <div key={i} className="group cursor-default">
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</div>
                  <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-slate-400">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
          <div className="w-10 h-10 rounded-full border-3 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
