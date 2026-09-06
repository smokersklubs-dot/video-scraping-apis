#!/usr/bin/env bash
# Refresh the vendored third-party cinema skills from upstream.
# Licences and the attribution table in .claude/skills/README.md are preserved.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
skills="$root/.claude/skills"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

clone() { git clone -q --depth 1 "$1" "$tmp/$2"; }

clone https://github.com/wuwangzhang1216/DirectorSKILL.git DirectorSKILL
clone https://github.com/smixs/visual-skills.git visual-skills
clone https://github.com/smixs/creative-director-skill.git creative-director-skill

install_skill() {  # <source dir> <target name> [licence file]
  rm -rf "${skills:?}/$2"
  cp -r "$1" "$skills/$2"
  rm -rf "$skills/$2/.git"
  [ -n "${3:-}" ] && cp "$3" "$skills/$2/LICENSE"
  echo "updated $2"
}

install_skill "$tmp/DirectorSKILL" cinematic-director
install_skill "$tmp/visual-skills/video" video "$tmp/visual-skills/LICENSE"
install_skill "$tmp/visual-skills/image" image "$tmp/visual-skills/LICENSE"
install_skill "$tmp/creative-director-skill/creative-director" creative-director \
  "$tmp/creative-director-skill/LICENSE"

echo "Done. Review the diff before committing."
