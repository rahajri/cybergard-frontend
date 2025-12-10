# ============================================================================
# FRONTEND DOCKERFILE - CyberGuard AI
# ============================================================================
# Multi-stage build pour optimiser la taille de l'image finale
# Stage 1: Dependencies - Installation des node_modules
# Stage 2: Builder - Build Next.js
# Stage 3: Runner - Image légère pour la production

# ============================================================================
# ARGUMENTS
# ============================================================================
ARG NODE_VERSION=20-alpine
ARG NODE_ENV=production

# ============================================================================
# STAGE 1: DEPENDENCIES
# ============================================================================
FROM node:${NODE_VERSION} AS deps

# Métadonnées
LABEL maintainer="CyberGuard AI Team"
LABEL description="Next.js Frontend for CyberGuard AI Audit Platform"

# Installer les dépendances système
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ============================================================================
# STAGE 2: BUILDER
# ============================================================================
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

# Copier les node_modules depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules

# Copier tout le code source
COPY . .

# Variables d'environnement pour le build
# Note: Les variables NEXT_PUBLIC_* doivent être définies au moment du build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_KEYCLOAK_URL
ARG NEXT_PUBLIC_KEYCLOAK_REALM
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG NODE_ENV

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL} \
    NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM} \
    NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID} \
    NODE_ENV=${NODE_ENV} \
    NEXT_TELEMETRY_DISABLED=1

# Build Next.js
RUN npm run build

# ============================================================================
# STAGE 3: RUNNER
# ============================================================================
FROM node:${NODE_VERSION} AS runner

WORKDIR /app

# Variables d'environnement
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copier les fichiers publics
COPY --from=builder /app/public ./public

# Créer le répertoire .next avec les bonnes permissions
RUN mkdir .next && \
    chown nextjs:nodejs .next

# Copier les fichiers de build Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Passer à l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "server.js"]
