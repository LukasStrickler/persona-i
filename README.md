# Persona[i] - Personality Benchmark Platform

> **Note**: This project is under active development. Features and documentation may change.

## Overview

Persona[i] is a personality benchmarking platform that hosts personality questionnaires. Users take comprehensive personality assessments and receive detailed evaluations. The platform compares these evaluations with various LLM models (GPT, Claude, Gemini, etc.) to identify which AI personality profile most closely matches the user's own.

### Features

- **Personality Test** - Complete personality assessments with detailed results
- **AI Model Comparison** - Compare your personality with various LLM models
- **Model Benchmarking** - Benchmark LLM models against each other

### Tech Stack

- **[TypeScript](https://www.typescriptlang.org)** - Type-safe JavaScript
- **[Bun](https://bun.sh)** - Fast JavaScript runtime and package manager
- **[Next.js 16](https://nextjs.org)** - React framework with App Router
- **[React 19](https://react.dev)** - UI library
- **[tRPC](https://trpc.io)** - End-to-end typesafe APIs
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Shadcn/UI](https://ui.shadcn.com)** - Accessible UI component primitives
- **[Zod](https://zod.dev)** - TypeScript-first schema validation
- **[BetterAuth](https://www.better-auth.com)** - Authentication with magic link support
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe ORM for database operations
- **[Turso/LibSQL](https://turso.tech)** - Edge database with SQLite compatibility

---

## Project Structure

```
persona-i/
├── .docs/                     # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/         # Architecture documentation
│   ├── db/                    # Database documentation
│   ├── workflow/              # Workflow diagrams
│   └── DOCUMENTATION_GUIDE.md # Documentation guidelines
├── public/                    # Static assets
├── scripts/                   # Helper scripts
├── src/
│   ├── app/                   # Next.js application pages
│   │   ├── (shared-background)/
│   │   │   ├── account/
│   │   │   ├── auth/
│   │   │   └── login/
│   │   ├── api/               # API configuration
│   │   └── layout.tsx
│   ├── components/            # React components
│   │   ├── auth/
│   │   ├── landing/
│   │   ├── providers/
│   │   ├── test-analysis/    # Test analysis components
│   │   ├── test-taking/      # Test-taking UI components
│   │   └── ui/
│   ├── emails/                # Email templates
│   ├── hooks/
│   ├── lib/                   # Utility libraries
│   ├── server/                # Server-side code
│   │   ├── api/               # tRPC API configuration
│   │   │   ├── routers/
│   │   │   └── trpc.ts
│   │   └── db/                # Database schema
│   └── styles/                # Global styles
├── LICENSE
└── package.json               # Dependencies and scripts
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 18+
- [Turso](https://turso.tech) account for database
- [Resend](https://resend.com) account for email functionality (optional for development)

### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/personai-review/persona-i.git
cd persona-i
```

2. **Install dependencies**

```bash
bun install
```

3. **Set up environment variables**

Create a `.env` file in the project root (see [Environment Variables](#environment-variables) below).

```bash
cp .env.example .env
```

4. **Set up the database**

Run the database setup script to create the database and generate login links for test users.

```bash
bun run db:setup
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

#### Required for Local Development

- **`DATABASE_URL`** - Your database URL (e.g., `libsql://your-database-url` for Turso or `file:./db.sqlite` for local SQLite)
- **`BETTER_AUTH_SECRET`** - A random secret for BetterAuth (minimum 32 characters). Generate with: `openssl rand -base64 32`
- **`NODE_ENV`** - Environment mode (`development`, `test`, or `production`)

#### Optional / Feature-specific

- **`DATABASE_TOKEN`** - Your Turso database authentication token (only required for remote Turso databases, not needed for local file-based databases)
- **`BETTER_AUTH_URL`** - Your application URL (optional, defaults to `http://localhost:3000` for development)
- **`NEXT_PUBLIC_BETTER_AUTH_URL`** - Public-facing BetterAuth URL (optional, defaults to `http://localhost:3000` for development, same as `BETTER_AUTH_URL` for development)
- **`NEXT_PUBLIC_SITE_URL`** - Public-facing site URL for sitemap generation (optional, defaults to `http://localhost:3000` for development, `https://personai.review` for production)
- **`RESEND_API_KEY`** - Your Resend API key for sending magic link emails (only required if using email magic-link functionality)
- **`RESEND_FROM`** - The email address to send magic links from, must be verified in Resend (only required if using email magic-link functionality)
- **`CONTACT_EMAIL`** - Email address to receive contact form submissions (required for contact form in production, optional in development where submissions are logged instead)
- **`HCAPTCHA_SECRET_KEY`** - hCaptcha secret key for contact form verification (optional, contact form will skip verification in development if not set)
- **`NEXT_PUBLIC_HCAPTCHA_SITE_KEY`** - hCaptcha site key for contact form (optional, contact form will skip verification in development if not set)

See [.env.example](.env.example) for a template.

5. **Start the development server**

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

---

## Resources

### Documentation

- **[API Documentation](./.docs/api/)** - API endpoints and authentication flow
- **[Architecture Documentation](./.docs/architecture/)** - System architecture and design patterns
- **[Database Documentation](./.docs/db/)** - Database schema and structure
- **[Workflow Diagrams](./.docs/workflow/)** - Process workflows and sequences

### Quick Reference

#### Development

| Command             | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `bun run dev`       | Start development server                                    |
| `bun run build`     | Build for production                                        |
| `bun run start`     | Start production server                                     |
| `bun run preview`   | Build and start production server                           |
| `bun run email`     | Start email preview server                                  |
| `bun run storybook` | Start Storybook for component development                   |
| `bun run ci:setup`  | First-time setup (creates `.env` and installs dependencies) |

#### Database

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `bun run db:setup`      | Setup database with mock data               |
| `bun run db:setup:full` | Setup database with full mock data          |
| `bun run db:generate`   | Generate database migrations                |
| `bun run db:migrate`    | Run database migrations                     |
| `bun run db:push`       | Push schema changes to database             |
| `bun run db:studio`     | Open Drizzle Studio for database management |

#### Code Quality

| Command                  | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `bun run check`          | Run ESLint and TypeScript checks                 |
| `bun run typecheck`      | TypeScript type checking                         |
| `bun run lint`           | ESLint linting                                   |
| `bun run lint:fix`       | Auto-fix ESLint issues                           |
| `bun run format:check`   | Check code formatting with Prettier              |
| `bun run format:write`   | Format code with Prettier                        |
| `bun run agent:finalize` | Run all quality checks (typecheck, lint, format) |

#### Testing

| Command                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `bun run test:all`         | Run all tests (unit, integration, e2e, storybook) |
| `bun run test:unit`        | Run unit tests only                               |
| `bun run test:integration` | Run integration tests only                        |
| `bun run test:e2e`         | Run end-to-end tests only                         |
| `bun run test:storybook`   | Run Storybook interaction tests                   |
| `bun run test:watch`       | Start watch mode for rapid development            |

---

## License

This project is licensed under the **Business Source License 1.1 (BSL 1.1)**.

- **Non-production use**: You may copy, modify, create derivative works, redistribute, and make non-production use of the Licensed Work.
- **Change Date**: Four years from the date the respective version of the Licensed Work is published.
- **Change License**: After the Change Date, the license will change to **GNU GPLv3**.
- **Commercial Use**: For production/commercial use, you must purchase a commercial license or refrain from using the Licensed Work.

See [LICENSE](./LICENSE) for the complete license text.

For information about alternative licensing arrangements, please contact: [https://lukasstrickler.com](https://lukasstrickler.com)
