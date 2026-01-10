/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hzppavbxqvjmcykhryvn.supabase.co",
      },
    ],
  },
};

export default nextConfig;
