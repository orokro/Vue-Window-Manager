#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Publishes a normal release under the npm "latest" dist-tag.
# Usage: ./publish.sh [patch|minor|major]   (default: patch)
# For BETA prereleases, use ./publish_beta.sh instead.
BUMP="${1:-patch}"

if [ "$BUMP" = "beta" ]; then
  echo "For beta releases use ./publish_beta.sh"
  exit 1
fi

# Ensure clean state
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Sanity: make sure we're logged in to npm before we bump/commit anything
if ! npm whoami >/dev/null 2>&1; then
  echo "Error: not logged in to npm. Run 'npm login' first."
  exit 1
fi

# Bump version (updates package.json)
npm version "$BUMP" --no-git-tag-version

# Get new version
VERSION=$(node -p "require('./package.json').version")
echo "Releasing version $VERSION (latest)..."

# Build project
echo "Building..."
npm run build

# Commit changes
git add .
git commit -m "v$VERSION"

# Tag
git tag "v$VERSION"

# Publish
echo "Publishing to NPM under 'latest'..."
echo "Enter 2FA OTP code (if required), or press Enter to try without:"
read OTP

if [ -n "$OTP" ]; then
  npm publish --otp="$OTP"
else
  npm publish
fi

# Push (set upstream so the first push on a new branch works too)
echo "Pushing to git..."
git push -u origin HEAD
git push origin "v$VERSION"

echo "Done! v$VERSION published (latest)."
