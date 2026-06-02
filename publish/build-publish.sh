#!/usr/bin/env bash
# Build each static-site image, push it, and pin the image: digest into its
# single-service Akash SDL — one deployment per site (the form every working Akash
# web deploy uses). Then deploy each .tpl.yaml as its OWN deployment in the Console.
#
# Idempotent / no double-publish: each image is tagged `src-<hash>` (a content hash
# of its build inputs). If that tag already exists the source is unchanged, so build
# & push are skipped — the same image is never published twice, and the Akash
# provider can reuse cached layers for the unchanged digest.
#
# Prereqs: docker (buildx) logged in to your registry (`docker login`).
# Usage:   REGISTRY=ghcr.io/you ./publish/build-publish.sh
set -euo pipefail

REGISTRY="${REGISTRY:?set REGISTRY, e.g. ghcr.io/you or docker.io/you}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HASHER=$(command -v shasum >/dev/null 2>&1 && echo "shasum -a 256" || echo "sha256sum")

# sha <site-dir> <dockerfile> <caddyfile>
# Deterministic, content-only hash of an image's build inputs. Over-inclusive on
# purpose (whole trees, all workspace manifests) so it never skips a real change;
# node_modules/dist/build-artifacts are pruned. Relative paths → machine-portable.
sha() {
  (
    cd "$ROOT" && {
      find aelea "$1" -type d \( -name node_modules -o -name dist \) -prune -o \
        -type f ! -name '*.tsbuildinfo' ! -name '.DS_Store' -print
      printf '%s\n' package.json bun.lock tsconfig.base.json \
        aelea/package.json website/package.json company/package.json "$2" "$3"
    } | sort -u | xargs $HASHER | $HASHER | cut -c1-12
  )
}

# ref <image-name> <tag>  — echo the immutable "registry/name@sha256:…" reference
ref() {
  local digest
  digest="$(docker buildx imagetools inspect "$REGISTRY/$1:$2" | awk '/^Digest:/{print $2; exit}')"
  printf '%s/%s@%s' "$REGISTRY" "$1" "$digest"
}

# publish <image-name> <dockerfile> <site-dir> <caddyfile>
# Builds + pushes only if the content tag is new; echoes the immutable ref on stdout
# (status/build noise goes to stderr so the ref can be captured cleanly).
publish() {
  local name="$1" tag target
  tag="src-$(sha "$3" "$2" "$4")"
  target="$REGISTRY/$name:$tag"
  {
    if docker buildx imagetools inspect "$target" >/dev/null 2>&1; then
      echo "▸ $name: content $tag already published — skipping build & push"
    else
      echo "▸ $name: building & pushing $target (linux/amd64)"
      docker buildx build --platform linux/amd64 -f "$ROOT/$2" -t "$target" --push "$ROOT"
    fi
  } >&2
  ref "$name" "$tag"
}

# pin <sdl-file> <full-ref>  — replace the single image: line in place ($TMPDIR temp
# + atomic mv, so no stray file lands in the repo).
pin() {
  local tmp
  tmp="$(mktemp)"
  awk -v ref="$2" '
    /^[[:space:]]*image:[[:space:]]/ { match($0, /^[[:space:]]*/); print substr($0, 1, RLENGTH) "image: " ref; next }
    { print }
  ' "$1" > "$tmp" && mv "$tmp" "$1" || { rm -f "$tmp"; return 1; }
}

pin "$ROOT/publish/aelea-web.tpl.yaml" "$(publish aelea-website website/Dockerfile website website/Caddyfile)"
pin "$ROOT/publish/cecihelp.tpl.yaml"  "$(publish cecihelp      company/Dockerfile company company/Caddyfile)"

echo
echo "✓ pinned (deploy EACH as its own deployment):"
grep -nE '^[[:space:]]*image:' "$ROOT/publish/aelea-web.tpl.yaml" "$ROOT/publish/cecihelp.tpl.yaml"
echo
echo "→ https://console.akash.network → Deploy → Upload your SDL (once per file)"
