"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { AppDataProvider } from "@/lib/context";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <AppDataProvider>{children}</AppDataProvider>
    </SessionProvider>
  );
}

