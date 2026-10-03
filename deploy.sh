#!/usr/bin/env bash
# Padhle Beta — one-shot deploy script
#
# Run this from /Users/gautam/Documents/claude/padhlebeta after:
#   1. gh auth refresh -h github.com -u gautamproduct
#   2. Created the empty repo at github.com/gautamproduct/padhlebeta
#      (Settings → Developer settings → Personal access tokens, or via gh:
#       gh repo create gautamproduct/padhlebeta --public --source=. --remote=origin)
#
# What this does:
#   - Inits git (if not already)
#   - Stages everything (except preview.html and .DS_Store)
#   - Creates initial commit
#   - Sets origin
#   - Pushes to main
#   - GitHub Actions auto-deploys to https://gautamproduct.github.io/padhlebeta/

set -euo pipefail

cd "$(dirname "$0")"

# Padhle Beta — one-shot deploy script
#
# Run this from /Users/gautam/Documents/claude/padhlebeta after authenticating
# gh CLI with the gautamproduct account:
#
#   gh auth switch -u gautamproduct
#   gh auth refresh -h github.com
#
# What this does:
#   - Inits git (if not already)
#   - Stages everything (except preview.html)
#   - Creates initial commit
#   - Sets origin
#   - Pushes to main
#   - GitHub Actions auto-deploys to https://gautamproduct.github.io/padhlebeta/

# --- Init ---
if [ -d .git ]; then
  if [ ! -f .git/HEAD ] || [ ! -d .git/refs ]; then
    echo "❌ Found a broken .git directory from a previous failed init."
    echo "   Remove it first with:"
    echo "     rm -rf .git"
    echo "   Then re-run this script."
    exit 1
  fi
else
  echo "→ Initialising git repo"
  git init -b main
fi

git config user.name "Padhle Beta" 2>/dev/null || true
git config user.email "hello@padhlebeta.in" 2>/dev/null || true

# --- Stage ---
echo "→ Staging files"
# Add everything except preview.html (design preview, not for production)
cat > .gitignore.append <<'EOF'

# Design preview (open locally only, not for production)
preview.html
EOF
cat .gitignore .gitignore.append 2>/dev/null | sort -u > .gitignore.tmp && mv .gitignore.tmp .gitignore
rm -f .gitignore.append

git add -A

# --- Commit ---
if git diff --cached --quiet; then
  echo "→ Nothing to commit (already committed)"
else
  echo "→ Creating initial commit"
  git commit -m "feat: initial Padhle Beta scaffold

- Astro 5 static site with five PDF tools (dark→light, merge, compress,
  image-to-PDF, extract pages)
- All processing client-side via pdf-lib + PDF.js
- 6 long-form blog posts, 2 programmatic landing pages (NEET/JEE)
- Full JSON-LD coverage: WebApplication, FAQPage, HowTo, SoftwareApplication,
  BreadcrumbList, BlogPosting, Organization
- Premium UI: custom SVG icons, glass-morphism header, atmospheric blobs,
  scroll-triggered reveals, dark/light theme toggle
- GitHub Actions workflow for auto-deploy to GitHub Pages" \
    -m "Co-Authored-By: Claude <noreply@anthropic.com>"
fi

# --- Remote ---
if ! git remote get-url origin >/dev/null 2>&1; then
  echo "→ Adding origin remote"
  git remote add origin https://github.com/gautamproduct/padhlebeta.git
fi

# --- Branch ---
git branch -M main 2>/dev/null || true

# --- Push ---
echo "→ Pushing to GitHub"
git push -u origin main

echo ""
echo "✅ Pushed!"
echo ""
echo "Next steps:"
echo "  1. Visit https://github.com/gautamproduct/padhlebeta/actions to watch the deploy"
echo "  2. Once it succeeds, your site is live at:"
echo "     https://gautamproduct.github.io/padhlebeta/"
echo "  3. Optional: attach a custom domain in repo Settings → Pages"
