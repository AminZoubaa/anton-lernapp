/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repo = "anton-lernapp";

const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
  reactStrictMode: true,
  // Statischer Export für GitHub Pages (nur beim Build, nicht im Dev-Modus)
  output: isDev ? undefined : "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Auf GitHub Pages liegt die App unter /<repo>/
  basePath: isGithubPages ? `/${repo}` : "",
  assetPrefix: isGithubPages ? `/${repo}/` : "",
  // Basis-Pfad auch im Browser verfügbar (für vorgerenderte Audios, SW)
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? `/${repo}` : "",
    NEXT_PUBLIC_APP_VERSION: (process.env.GITHUB_SHA || "dev").slice(0, 7),
  },
};

export default nextConfig;
