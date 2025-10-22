// proxy.js
export default function proxy() {
  // no-op — global headers are set via next.config.js -> headers()
}

export const config = {
  matcher: ["/", "/:path*", "/ffmpeg/:path*"],
};
