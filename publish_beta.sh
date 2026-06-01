#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status

# Publishes a BETA prerelease (x.y.z-beta.N) under the npm "beta" dist-tag.
# Your existing "latest" users are NOT affected by this.
# Run it again to bump the beta number (beta.0 -> beta.1 -> ...).
#
# Install the beta elsewhere with:  npm install vue-win-mgr@beta

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

# Bump to the next beta prerelease (e.g. 0.9.1 -> 0.9.2-beta.0, then -> 0.9.2-beta.1)
npm version prerelease --preid=beta --no-git-tag-version

# Get new version
VERSION=$(node -p "require('./package.json').version")
echo "Publishing beta version $VERSION..."

# Build project
echo "Building..."
npm run build

# Commit changes
git add .
git commit -m "v$VERSION"

# Tag
git tag "v$VERSION"

# Publish under the "beta" dist-tag (NOT latest)
echo "Publishing to NPM under 'beta'..."
echo "Enter 2FA OTP code (if required), or press Enter to try without:"
read OTP

if [ -n "$OTP" ]; then
  npm publish --tag beta --otp="$OTP"
else
  npm publish --tag beta
fi

# Push (set upstream so the first push on a new branch works too)
echo "Pushing to git..."
git push -u origin HEAD
git push origin "v$VERSION"

echo "Done! Beta v$VERSION published under 'beta'."
echo "Install it elsewhere with:  npm install vue-win-mgr@beta"
