/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'canvas', 'jsdom', 'pdf-parse']
    }
    return config
  },
}

export default nextConfig
