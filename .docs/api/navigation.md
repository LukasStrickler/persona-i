# Navigation Behavior

Documentation for navigation behavior in Persona[i].

## Main Header

The main navigation header (`MainHeader`) is present on all pages, including the login/signup page.

### Logo Behavior

The logo navigation behavior depends on authentication state:

- **Not Authenticated**: Logo navigates to `/` (landing page)
- **Authenticated**: Logo navigates to `/tests` (tests page)

**Implementation**:

```typescript
<Link href={isAuthenticated ? "/tests" : "/"}>
  <Logo variant="navigation" />
</Link>
```

### Logo Interaction

The logo is configured to act like an image, not selectable text:

- **Non-selectable**: `userSelect: "none"` when used in navigation
- **Non-copyable**: Copy handler disabled for navigation variant
- **Clickable**: Cursor pointer indicates clickability
- **Accessible**: Proper ARIA labels for screen readers

**CSS Classes**:

- `cursor-pointer` - Indicates clickability
- `select-none` - Prevents text selection

## Navigation Items

### Desktop Navigation

Desktop navigation shows:

- **Tests** - `/tests`
- **Models** - `/models`
- **Benchmarks** - `/benchmarks`
- **Documentation** - `/documentation`

### Mobile Navigation

Mobile navigation uses a hamburger menu with:

- Same navigation items as desktop
- Account section at bottom (if authenticated)
- Sign in/Create account section (if not authenticated)

## Authentication State

### Authenticated Users

When authenticated, the header shows:

- **Account button** (desktop) - Shows user name/email, navigates to `/account`
- **Account button** (mobile) - Shows user icon, navigates to `/account`
- **Navigation items** - All navigation items available

### Unauthenticated Users

When not authenticated, the header shows:

- **Create account button** (desktop) - Navigates to `/login?mode=signup`
- **Sign in button** (desktop) - Navigates to `/login`
- **Sign in button** (mobile) - Navigates to `/login`
- **Navigation items** - All navigation items available

## Login Page Navigation

The login/signup page includes the main header, allowing users to:

- Navigate to other sections while on the login page
- Click the logo to return to the landing page
- Access navigation items without completing login

This improves user experience by not trapping users on the login page.
