import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Single-user app: only this account may sign in.
const ALLOWED_EMAIL = "vinayakok@gmail.com";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  pages: { signIn: "/signin" },
  callbacks: {
    // Lock sign-in to the one allowed Google account.
    signIn({ profile }) {
      return profile?.email === ALLOWED_EMAIL;
    },
    // Used by the middleware: only authenticated requests are allowed through.
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
});
