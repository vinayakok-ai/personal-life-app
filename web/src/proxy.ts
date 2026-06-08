// Next.js 16 renamed Middleware -> Proxy. Auth.js's `auth` wrapper is exported as `proxy`.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    // Protect everything except the auth API, the sign-in page, and static/PWA assets.
    "/((?!api/auth|signin|_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|sw.js).*)",
  ],
};
