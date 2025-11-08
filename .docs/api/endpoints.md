# API Endpoints

Reference documentation for Persona[i] API endpoints.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: Set via `NEXT_PUBLIC_BETTER_AUTH_URL` environment variable

## Authentication

All authenticated endpoints require a valid session cookie. See [authentication.md](./authentication.md) for authentication flow.

## Account Management

### Update User Name

Update the authenticated user's name.

**Endpoint**: `PATCH /api/auth/update-user`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "John Doe"
}
```

**Request Headers**:
```text
Content-Type: application/json
Cookie: better-auth.session_token=...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Name updated successfully"
}
```

**Error Responses**:

- **401 Unauthorized** - No valid session
```json
{
  "error": "Unauthorized"
}
```

- **400 Bad Request** - Invalid name format
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": ["name"],
      "message": "Name must be at least 2 characters"
    }
  ]
}
```

- **404 Not Found** - User not found after update
```json
{
  "error": "User not found"
}
```

**Name Validation**:
- Minimum length: 2 characters
- Maximum length: 50 characters
- Allowed characters: Unicode letters, numbers, spaces, hyphens, apostrophes
- Pattern: `/^[\p{L}\p{M}0-9\s'-]+$/u`

### Delete Account

Permanently delete the authenticated user's account and all associated data.

**Endpoint**: `DELETE /api/auth/delete-account`

**Authentication**: Required

**Request Body**:
```json
{
  "confirmed": true
}
```

**Request Headers**:
```text
Content-Type: application/json
Cookie: better-auth.session_token=...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

**Error Responses**:

- **401 Unauthorized** - No valid session
```json
{
  "error": "Unauthorized"
}
```

- **400 Bad Request** - Invalid JSON
```json
{
  "error": "Invalid or malformed JSON in request body"
}
```

- **403 Forbidden** - Missing confirmation
```json
{
  "error": "Account deletion requires confirmation"
}
```

- **500 Internal Server Error** - Deletion failed
```json
{
  "error": "Internal server error"
}
```

**Important Notes**:
- **Requires explicit confirmation**: `confirmed: true` must be set in request body
- **Permanent deletion**: All user data is deleted (sessions, user record, cascading deletes)
- **GDPR compliant**: All user data is permanently removed
- **Audit logged**: Deletion is logged with IP address and timestamp

## BetterAuth Endpoints

BetterAuth provides the following endpoints (see [BetterAuth documentation](https://www.better-auth.com/docs)):

- `POST /api/auth/sign-in/magic-link` - Request magic link
- `GET /api/auth/magic-link/verify` - Verify magic link code
- `GET /api/auth/session` - Get current session
- `POST /api/auth/sign-out` - Sign out

These endpoints are handled by BetterAuth and follow BetterAuth conventions.

