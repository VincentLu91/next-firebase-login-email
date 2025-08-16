/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    return config;
  },

  reactStrictMode: false,

  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },

  // Headers for SharedArrayBuffer support
  async headers() {
    return [
      {
        // apply to every route (not only /ffmpeg) so media from other origins can load
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
