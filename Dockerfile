# 1. Base stage: 依存関係のインストール
FROM node:20-alpine AS base

# 2. Rebuild the source code only when needed
FROM base AS deps
# 共有ライブラリの不足によるエラーを防ぐため libc6-compat を追加
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージ管理ツールに合わせて変更（npm想定）
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Builder stage: アプリのビルド
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 環境変数をビルド時に入れたい場合はここで定義（GA4などのクライアント側変数）
# ENV NEXT_PUBLIC_USER_NAME=luth

RUN pnpm run build

# 4. Runner stage: 実行用イメージの作成
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Cloud Run はデフォルトで 8080 ポートを期待するため
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# 実行用ユーザーの作成（セキュリティのため root で動かさない）
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# ビルド成果物のうち、実行に必要なものだけをコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

# server.js は standalone モードで生成されるファイル
CMD ["node", "server.js"]
