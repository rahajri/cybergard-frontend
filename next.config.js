const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Output standalone pour Docker (génère un serveur Node.js autonome)
  output: 'standalone',

  // Désactiver complètement le tracing pour éviter les erreurs EPERM sur Windows
  // experimental: {
  //   instrumentationHook: false,
  // },

  // Désactiver la télémétrie
  // swcMinify: false,

  // Configuration des rewrites pour rediriger /api/v1 vers le backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },

  // Augmenter le timeout pour les requêtes longues (génération de rapports avec IA)
  serverRuntimeConfig: {
    // Timeout de 5 minutes pour les API routes
    apiTimeout: 300000,
  },

  // Configuration expérimentale pour les proxies longs
  experimental: {
    proxyTimeout: 300000, // 5 minutes
  },

  webpack: (config) => {
    // --- Ajout de l'alias pour accéder aux ressources partagées
    const alias = config.resolve.alias || {};
    config.resolve.alias = {
      ...alias,
      "@shared": path.resolve(__dirname, "../shared"),
      "@": path.resolve(__dirname, "src"),
    };

    return config;
  },
};

module.exports = nextConfig;
