use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use solana_program::program_error::ProgramError;

// NOTE: This program demonstrates a transfer-hook-like enforcement by exposing
// a custom `pqc_transfer` instruction. Clients must call this instead of SPL transfer.
// The program validates a post-quantum attestation payload (signature over transfer intent).
// For production, integrate an audited PQC library via syscalls or a custom verifier program.

// Program ID is set by Anchor at deploy time from Anchor.toml
declare_id!("PQF5700xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod pqf5700 {
    use super::*;

    pub fn configure(ctx: Context<Configure>, allowed_mint: Pubkey) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.allowed_mint = allowed_mint;
        cfg.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn pqc_transfer(
        ctx: Context<PqcTransfer>,
        amount: u64,
        attestation: Attestation,
    ) -> Result<()> {
        // 1) Enforce mint matches configured token
        require_keys_eq!(ctx.accounts.mint.key(), ctx.accounts.config.allowed_mint, PqfError::MintNotAllowed);

        // 2) Verify PQC attestation over transfer intent
        // verify_attestation should validate PQC signature (e.g., Dilithium) against provided pubkey
        verify_attestation(&attestation, &PqcMessage {
            mint: ctx.accounts.mint.key(),
            from: ctx.accounts.from.key(),
            to: ctx.accounts.to.key(),
            amount,
            attested_slot: attestation.slot,
        })?;

        // Freshness: attested slot must be recent
        let current_slot = Clock::get()?.slot;
        require!(
            current_slot >= attestation.slot && current_slot - attestation.slot <= 150,
            PqfError::StaleAttestation
        );

        // 3) Perform CPI to Token-2022 transfer using token interface
        anchor_spl::token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token_interface::TransferChecked {
                    from: ctx.accounts.from.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.to.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        Ok(())
    }
}

#[account]
pub struct Config {
    pub allowed_mint: Pubkey,
    pub authority: Pubkey,
}

#[derive(Accounts)]
pub struct Configure<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32,
        seeds = [b"config", allowed_mint.as_ref()],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PqcTransfer<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    /// CHECK: authority must sign; verified by Anchor
    pub authority: Signer<'info>,
    #[account(seeds = [b"config", mint.key().as_ref()], bump)]
    pub config: Account<'info, Config>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Attestation {
    pub pqc_pubkey: [u8; 32], // Placeholder length; real schemes use larger keys
    pub signature: Vec<u8>,   // Dilithium sig is large; store as bytes
    pub nonce: u64,
    pub slot: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PqcMessage {
    pub mint: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub attested_slot: u64,
}

#[error_code]
pub enum PqfError {
    #[msg("Mint is not allowed in this program config")] 
    MintNotAllowed,
    #[msg("Invalid PQC attestation")] 
    InvalidAttestation,
    #[msg("PQC attestation is too old")]
    StaleAttestation,
}

fn verify_attestation(att: &Attestation, msg: &PqcMessage) -> Result<()> {
    let serialized = anchor_lang::AnchorSerialize::try_to_vec(msg)
        .map_err(|_| error!(PqfError::InvalidAttestation))?;

    #[cfg(feature = "pqc-real")]
    {
        // Example using Dilithium2 from pqcrypto (must ensure it compiles to BPF)
        use pqcrypto_dilithium::dilithium2::{PublicKey, verify_detached_signature, DetachedSignature};
        let pk = PublicKey::from_bytes(&att.pqc_pubkey)
            .map_err(|_| error!(PqfError::InvalidAttestation))?;
        let sig = DetachedSignature::from_bytes(&att.signature)
            .map_err(|_| error!(PqfError::InvalidAttestation))?;
        verify_detached_signature(&sig, &serialized, &pk)
            .map_err(|_| error!(PqfError::InvalidAttestation))?;
        return Ok(());
    }

    #[cfg(not(feature = "pqc-real"))]
    {
        // Fallback: SHA3-256 digest prefix check (non-production)
        use sha3::{Digest, Sha3_256};
        let mut hasher = Sha3_256::new();
        hasher.update(&serialized);
        hasher.update(&att.nonce.to_le_bytes());
        let digest = hasher.finalize();
        if att.signature.len() < 4 || att.signature[0..4] != digest[0..4] {
            return err!(PqfError::InvalidAttestation);
        }
        Ok(())
    }
}
