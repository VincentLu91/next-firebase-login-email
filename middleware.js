import { NextResponse } from "next/server";

export function middleware(req) {
  const res = NextResponse.next();

  // Apply only to the internal recording page and anything under it
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  // (Optional, but often helpful)
  // res.headers.set("Origin-Agent-Cluster", "?1");

  return res;
}

// Tell Next which routes get these headers
export const config = {
  matcher: ["/internalrecording", "/internalrecording/:path*"],
};
