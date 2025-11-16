/** @type {import('next').NextConfig} */
const nextConfig = {
  //turbopack: {}, // <- add this line
  webpack: (config, { isServer }) => {
    if (!isServer) config.resolve.fallback = { fs: false };
    return config;
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async headers() {
    return [
      {
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
