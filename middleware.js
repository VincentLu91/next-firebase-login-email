import { NextResponse } from "next/server";

export function middleware(req) {
  const res = NextResponse.next();

  // Apply headers to all routes to ensure SharedArrayBuffer support
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  res.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  res.headers.set("Origin-Agent-Cluster", "?1");

  return res;
}

// Apply to all routes
export const config = {
  matcher: [
    // Apply to all pages
    "/",
    "/:path*",
    // Ensure static files are covered
    "/ffmpeg/:path*",
  ],
};
