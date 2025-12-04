import type { NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Google from "next-auth/providers/google";
import {
  getEmployeeByGoogleId,
  getEmployeeByEmail,
  linkGoogleIdToEmployee,
} from "@/lib/contentstack/employees";
import type { EmployeeRole, EmployeeStatus } from "@/lib/contentstack/types";

// Extended JWT type
interface ExtendedJWT extends JWT {
  role?: EmployeeRole;
  status?: EmployeeStatus;
  employeeUid?: string;
  teamUid?: string;
}

// Extend the session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: EmployeeRole;
      status: EmployeeStatus;
      employeeUid: string;
      teamUid?: string;
    };
  }

  interface User {
    role?: EmployeeRole;
    status?: EmployeeStatus;
    employeeUid?: string;
    teamUid?: string;
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      const googleId = account.providerAccountId;

      try {
        // First, check if user exists by Google ID
        let employee = await getEmployeeByGoogleId(googleId);

        if (employee) {
          // User exists, allow sign in if active
          if (employee.status === "inactive") {
            return "/login?error=AccountInactive";
          }
          return true;
        }

        // Check if user exists by email (invited user)
        employee = await getEmployeeByEmail(email);

        if (employee) {
          // Link Google ID to existing employee
          if (employee.status === "invited") {
            // Mark as active and link Google ID
            await linkGoogleIdToEmployee(employee.uid, googleId, user.image || undefined);
            return true;
          } else if (employee.status === "active" && !employee.google_id) {
            // Existing active user without Google ID - link it
            await linkGoogleIdToEmployee(employee.uid, googleId, user.image || undefined);
            return true;
          } else if (employee.status === "inactive") {
            return "/login?error=AccountInactive";
          }
          return true;
        }

        // No employee record exists - deny sign in
        // Users must be invited first
        return "/login?error=NotInvited";
      } catch (error) {
        console.error("Sign in error:", error);
        return "/login?error=SignInError";
      }
    },

    async jwt({ token, account }) {
      const extToken = token as ExtendedJWT;
      // On initial sign in, fetch employee data
      if (account?.provider === "google" && account.providerAccountId) {
        const employee = await getEmployeeByGoogleId(account.providerAccountId);
        if (employee) {
          extToken.role = employee.role;
          extToken.status = employee.status;
          extToken.employeeUid = employee.uid;
          extToken.teamUid = employee.team?.[0]?.uid;
        }
      }

      return extToken;
    },

    async session({ session, token }) {
      const extToken = token as ExtendedJWT;
      if (extToken && session.user) {
        session.user.role = extToken.role || "employee";
        session.user.status = extToken.status || "active";
        session.user.employeeUid = extToken.employeeUid || "";
        session.user.teamUid = extToken.teamUid;
        session.user.id = extToken.sub || "";
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

