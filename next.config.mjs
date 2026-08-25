/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === "true";
const repo = "anton-lernapp";

const nextConfig = {
  reactStrictMode: true,
  // Statischer Export für GitHub Pages
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // Auf GitHub Pages liegt die App unter /<repo>/
  basePath: isGithubPages ? `/${repo}` : "",
  assetPrefix: isGithubPages ? `/${repo}/` : "",
};

export default nextConfig;
