#!/bin/bash
# CI Setup Script - Sets up environment for cloud agents
# Generates .env from .env.example, installs dependencies
# Skips database setup (agents use memory DB for tests or Storybook for UI)

set -e

echo "🚀 Setting up agent environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to extract key from env line
extract_key() {
  echo "$1" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*=.*$//' | sed 's/^#.*$//'
}

# Function to check if key exists in env file
key_exists() {
  local key="$1"
  local file="$2"
  grep -q "^[[:space:]]*${key}[[:space:]]*=" "$file" 2>/dev/null || grep -q "^[[:space:]]*#.*${key}[[:space:]]*=" "$file" 2>/dev/null
}

# Function to get value from env file
get_value() {
  local key="$1"
  local file="$2"
  grep "^[[:space:]]*${key}[[:space:]]*=" "$file" 2>/dev/null | sed 's/^[^=]*=[[:space:]]*//' | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/" || echo ""
}

# Step 1: Handle .env file
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "📋 Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env from .env.example"
  else
    echo -e "${YELLOW}⚠${NC}  .env.example not found, creating minimal .env..."
    cat > .env << EOF
# Environment variables for agent setup
# These are placeholder values that satisfy validation but are non-functional

DATABASE_URL=file:./db.sqlite
DATABASE_TOKEN=placeholder-token-for-agent-env
BETTER_AUTH_SECRET=
RESEND_API_KEY=placeholder-resend-api-key
RESEND_FROM=dev@example.com
CONTACT_EMAIL=contact@example.com
NODE_ENV=development
EOF
    echo -e "${GREEN}✓${NC} Created minimal .env file"
  fi
else
  echo "📋 .env already exists, merging missing keys from .env.example..."
  
  if [ -f ".env.example" ]; then
    # Read .env.example and merge missing keys
    MERGED=false
    while IFS= read -r line || [ -n "$line" ]; do
      # Skip empty lines and comments (unless they're comments for keys)
      if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
        continue
      fi
      
      # Extract key
      key=$(extract_key "$line")
      
      # Skip if key is empty or line is just a comment
      if [ -z "$key" ]; then
        continue
      fi
      
      # Check if key exists in .env
      if ! key_exists "$key" ".env"; then
        # Add the line to .env
        echo "$line" >> .env
        MERGED=true
        echo -e "  ${GREEN}+${NC} Added: $key"
      fi
    done < .env.example
    
    if [ "$MERGED" = false ]; then
      echo -e "  ${GREEN}✓${NC} No missing keys to merge"
    fi
  else
    echo -e "${YELLOW}⚠${NC}  .env.example not found, skipping merge"
  fi
fi

echo ""

# Step 2: Generate BETTER_AUTH_SECRET if missing or empty
BETTER_AUTH_SECRET=$(get_value "BETTER_AUTH_SECRET" ".env" || echo "")

if [ -z "$BETTER_AUTH_SECRET" ] || [ "$BETTER_AUTH_SECRET" = "" ]; then
  echo "🔐 Generating BETTER_AUTH_SECRET..."
  
  # Check if openssl is available
  if command -v openssl &> /dev/null; then
    NEW_SECRET=$(openssl rand -base64 32 | tr -d '\n')
  else
    # Fallback: use /dev/urandom
    NEW_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
  fi
  
  # Update .env file
  if grep -q "^[[:space:]]*BETTER_AUTH_SECRET[[:space:]]*=" .env 2>/dev/null; then
    # Replace existing (possibly empty) value
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s#^[[:space:]]*BETTER_AUTH_SECRET[[:space:]]*=.*#BETTER_AUTH_SECRET=${NEW_SECRET}#" .env
    else
      # Linux
      sed -i "s#^[[:space:]]*BETTER_AUTH_SECRET[[:space:]]*=.*#BETTER_AUTH_SECRET=${NEW_SECRET}#" .env
    fi
  else
    # Add new line
    echo "BETTER_AUTH_SECRET=${NEW_SECRET}" >> .env
  fi
  
  echo -e "${GREEN}✓${NC} Generated BETTER_AUTH_SECRET"
else
  echo -e "${GREEN}✓${NC} BETTER_AUTH_SECRET already set"
fi

echo ""

# Step 3: Install dependencies
echo "📦 Installing dependencies..."
if command -v bun &> /dev/null; then
  bun install
  echo -e "${GREEN}✓${NC} Dependencies installed"
else
  echo -e "${RED}❌${NC} Bun not found. Please install Bun: https://bun.sh"
  exit 1
fi

echo ""
echo -e "${GREEN}✅${NC} Agent environment setup complete!"
echo ""
echo "Note: Environment variables are placeholders that satisfy validation."
echo "They are non-functional but allow the app to start without errors."
echo "For testing, use memory DB. For UI, use Storybook."


