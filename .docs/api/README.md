# API Documentation

This directory contains API documentation for Persona[i].

## Contents

- [`authentication.md`](./authentication.md) - Authentication flow, magic link login/signup, session management
- [`endpoints.md`](./endpoints.md) - API endpoint reference with request/response examples
- [`navigation.md`](./navigation.md) - Navigation behavior, logo routing, MainHeader component

## Overview

Persona[i] uses:

- **BetterAuth** for authentication (magic link-based)
- **Next.js API Routes** for REST endpoints
- **tRPC** for type-safe APIs (planned)

## Authentication

All authenticated endpoints require a valid session cookie. See [authentication.md](./authentication.md) for details.

## API Base URL

- **Development**: `http://localhost:3000`
- **Production**: Set via `NEXT_PUBLIC_BETTER_AUTH_URL` environment variable
