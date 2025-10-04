# PQF 5700 - Post-Quantum Enforced Transfers on Solana

This repo contains an Anchor on-chain program that enforces a custom PQC-attested transfer for a specific Token-2022 mint, plus TypeScript scripts to deploy the mint and perform transfers.

IMPORTANT: The included verifier uses a placeholder hash check to simulate PQC verification. For production, integrate a true Dilithium/Falcon verifier program or a syscall-enabled library.

## Specs
- Name: PQF 5700
- Symbol: PQF 5700
- Supply cap: 57,000,000
- Enforced: Custom `pqc_transfer` must be used, not plain SPL transfer

## Setup

```bash
cp .env.example .env
# Set SOLANA_PRIVATE_KEY, RPC_URL, optionally PROGRAM_ID
npm install
anchor build
```

## Deploy

```bash
npm run deploy:mint
```

This will:
- Create a Token-2022 mint
- Mint 57,000,000 tokens to your key's ATA
- Configure the program with the allowed mint

## Transfer with PQC attestation

```bash
export PROGRAM_ID=YourDeployedProgramId
export MINT=YourMintAddress
export TO=RecipientPubkey
export AMOUNT=1000000
npm run transfer
```

Again, the PQC check is mocked; replace with real verifier.
