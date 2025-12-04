import NextAuth from "next-auth";
import { authConfig } from "./config";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

// Helper to get current session (for server components)
export { auth as getServerSession };

// Re-export config for use in middleware
export { authConfig };

