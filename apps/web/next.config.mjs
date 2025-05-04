/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  reactStrictMode: false, // 奇怪的BUG设置，开发会导致双渲染
}

export default nextConfig
