# BetterAuth Setup Guide

## ✅ Completed Setup

The BetterAuth schema has been fully configured and integrated:

### Schema Tables Created

- ✅ `user` - User accounts
- ✅ `session` - User sessions
- ✅ `account` - OAuth/social provider accounts
- ✅ `verification` - Magic link verification tokens

### Configuration Files

- ✅ `src/lib/auth.ts` - BetterAuth server configuration with Drizzle adapter
- ✅ `src/lib/auth-client.ts` - BetterAuth client configuration
- ✅ `src/app/api/auth/[...all]/route.ts` - Next.js App Router API route handler
- ✅ `src/server/db/schema/_auth.ts` - Drizzle schema with BetterAuth tables
- ✅ `src/server/db/schema/index.ts` - Schema exports

## 🚀 Next Steps to Complete Setup

### 1. Set Environment Variables

Create a `.env` file in the project root with:

```env
# Database
DATABASE_URL="file:./db.sqlite"
# Or for Turso/LibSQL: DATABASE_URL="libsql://your-database-url"

# Better Auth
BETTER_AUTH_SECRET="generate-a-random-secret-here"  # Use: openssl rand -base64 32
BETTER_AUTH_URL="https://personai.review"  # Production URL
NEXT_PUBLIC_BETTER_AUTH_URL="https://personai.review"  # Production URL
# For local development, use: http://localhost:3000

# Resend (for magic link emails)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM="noreply@personai.review"

# Node Environment (optional)
NODE_ENV="development"
```

### 2. Generate Database Migration

After setting up your `.env` file, generate the database migration:

```bash
bun run db:generate
```

This will create a migration file for the BetterAuth tables.

### 3. Push Migration to Database

Apply the migration to create the tables:

```bash
bun run db:push
```

### 4. Verify Setup

Start the development server:

```bash
bun run dev
```

The BetterAuth endpoints will be available at:

- `/api/auth/sign-in/magic-link` - POST to send magic link
- `/api/auth/magic-link/verify` - GET to verify magic link token
- `/api/auth/session` - GET current session

## 📝 Schema Overview

The BetterAuth schema includes:

### User Table

- `id` - Primary key (text)
- `name` - User's name
- `email` - Unique email address
- `emailVerified` - Email verification status
- `image` - Profile image URL
- `createdAt` / `updatedAt` - Timestamps

### Session Table

- `id` - Primary key
- `token` - Unique session token
- `expiresAt` - Session expiration
- `userId` - Foreign key to user
- `ipAddress` / `userAgent` - Session metadata

### Account Table

- `id` - Primary key
- `providerId` - OAuth provider identifier
- `accountId` - Provider's account ID
- `userId` - Foreign key to user
- `accessToken` / `refreshToken` - OAuth tokens

### Verification Table

- `id` - Primary key
- `identifier` - Email/phone identifier
- `value` - Verification token/value
- `expiresAt` - Token expiration

## 🔧 Troubleshooting

If you encounter environment variable errors:

- Make sure all required variables are set in `.env`
- For database operations, temporarily use: `SKIP_ENV_VALIDATION=true bun run db:generate`
