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

## Contact Form

### Submit Contact Form

Submit a contact form with security features including honeypot, hCaptcha, and CSRF protection.

**Endpoint**: `POST /api/contact`

**Authentication**: Not required

**Request Body**:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1 (555) 123-4567",
  "message": "Your message here",
  "consent": true,
  "website": "",
  "hCaptchaToken": "hcaptcha-token-here",
  "csrfToken": "optional-csrf-token",
  "secret": "optional-secret"
}
```

**Request Headers**:

```text
Content-Type: application/json
X-Contact-Secret: csrf-token-from-cookie
Cookie: personai_contact_secret=csrf-token
```

**Response** (200 OK):

```json
{
  "success": true
}
```

**Error Responses**:

- **400 Bad Request** - Invalid JSON

```json
{
  "success": false,
  "error": "invalid_json"
}
```

- **400 Bad Request** - Validation error

```json
{
  "success": false,
  "error": "validation_error"
}
```

- **400 Bad Request** - hCaptcha verification failed

```json
{
  "success": false,
  "error": "captcha_error"
}
```

- **403 Forbidden** - CSRF token mismatch

```json
{
  "success": false,
  "error": "csrf_error"
}
```

- **500 Internal Server Error** - Configuration error (CONTACT_EMAIL not set in production)

```json
{
  "success": false,
  "error": "configuration_error"
}
```

- **500 Internal Server Error** - Email sending failed

```json
{
  "success": false,
  "error": "email_error"
}
```

- **500 Internal Server Error** - Internal server error

```json
{
  "success": false,
  "error": "internal_error"
}
```

**Validation Rules**:

- **name**: Required, string, trimmed, 2-100 characters
- **email**: Required, string, trimmed, valid email format
- **phone**: Optional, string, matches pattern `/^[\d\s\-\+\(\)]*$/`, max 20 characters
- **message**: Required, string, trimmed, 10-2000 characters
- **consent**: Required, boolean, must be `true`
- **website** (honeypot): Must be empty string (max 0 characters)
- **hCaptchaToken**: Required, string, min 1 character
- **csrfToken**: Optional, string (validated via `X-Contact-Secret` header)
- **secret**: Optional, string (validated via `X-Contact-Secret` header)

**Security Features**:

- **Honeypot**: Hidden field (`website`) that must be empty. Bots filling this field are silently rejected.
- **hCaptcha**: Required verification token. In development, verification is skipped if `HCAPTCHA_SECRET_KEY` is not set.
- **CSRF Protection**: Token must match between cookie (`personai_contact_secret`) and header (`X-Contact-Secret`).

**Important Notes**:

- In development mode, if `CONTACT_EMAIL` is not set, the form will log safe metadata instead of sending an email.
- In production mode, `CONTACT_EMAIL` must be configured or the endpoint will return a configuration error.
- Honeypot field is silently accepted (returns success) to avoid revealing its existence to bots.
- All string fields are automatically trimmed before validation.
