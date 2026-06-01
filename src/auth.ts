import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ profile }) {
      const allowed = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      // If no whitelist is set, allow all (dev convenience — set the env var in prod).
      if (allowed.length === 0) return true;
      return allowed.includes((profile as { login?: string }).login ?? "");
    },
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    session({ session, token }) {
      (session as typeof session & { accessToken?: string }).accessToken =
        token.accessToken as string | undefined;
      return session;
    },
  },
});
