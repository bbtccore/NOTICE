set -euo pipefail
# Install Anchor CLI, Solana CLI
if ! command -v solana >/dev/null 2>&1; then
  sh -c "$(curl -sSfL https://release.solana.com/stable/install)" >/dev/null 2>&1 || true
  export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi
if ! command -v anchor >/dev/null 2>&1; then
  cargo install --locked --git https://github.com/coral-xyz/anchor avm --force
  avm install latest
  avm use latest
fi
which anchor
anchor --version
