/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  reactStrictMode: false, // 奇怪的BUG设置，开发会导致双渲染
  devIndicators: false, // 禁用开发环境的指示器
}

export default nextConfig
