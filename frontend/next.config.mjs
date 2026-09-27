/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone bundles the app into a self-contained Node server
  // used by Render Web Service: node .next/standalone/server.js
  output: "standalone",
};

export default nextConfig;
