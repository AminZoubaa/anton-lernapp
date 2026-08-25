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
};

export default nextConfig;
