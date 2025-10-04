import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, createMintToInstruction } from "@solana/spl-token";
import { loadKeypair, getConnection } from "./shared";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config();

// Program ID handling
const programIdStr = process.env.PROGRAM_ID || "PQF5700xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const PROGRAM_ID = new PublicKey(programIdStr);

(async () => {
  const payer = loadKeypair();
  const connection = getConnection();
  const provider = new AnchorProvider(connection, new (class {
    publicKey = payer.publicKey;
    async signTransaction(tx: any) { return tx; }
    async signAllTransactions(txs: any[]) { return txs; }
  })() as any, AnchorProvider.defaultOptions());
  setProvider(provider);

  // Create Mint (Token-2022)
  const mint = Keypair.generate();
  const decimals = Number(process.env.MINT_DECIMALS ?? 9);

  // Create mint and ATA via raw system instructions for brevity using SPL helpers
  const ata = getAssociatedTokenAddressSync(mint.publicKey, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);

  // Use @solana/spl-token command helpers via program-less flow
  const { createInitializeMint2Instruction, MINT_SIZE, getMinimumBalanceForRentExemptMint, createAssociatedTokenAccountInstruction } = await import("@solana/spl-token");

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx = new Transaction();
  tx.add(
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: mint.publicKey, lamports, space: MINT_SIZE, programId: TOKEN_2022_PROGRAM_ID }),
    createInitializeMint2Instruction(mint.publicKey, decimals, payer.publicKey, null, TOKEN_2022_PROGRAM_ID),
    // payer creates ATA owned by payer for the new mint
    createAssociatedTokenAccountInstruction(payer.publicKey, ata, payer.publicKey, mint.publicKey, TOKEN_2022_PROGRAM_ID),
  );
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.partialSign(mint);
  tx.sign(payer);
  const sig1 = await sendAndConfirmTransaction(connection, tx, [payer, mint], { commitment: "confirmed" });

  // Mint total supply to payer
  const totalSupply = BigInt(57_000_000) * (BigInt(10) ** BigInt(decimals));
  const tx2 = new Transaction();
  tx2.add(createMintToInstruction(mint.publicKey, ata, payer.publicKey, totalSupply as unknown as bigint, [], TOKEN_2022_PROGRAM_ID));
  tx2.feePayer = payer.publicKey;
  tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx2.sign(payer);
  const sig2 = await sendAndConfirmTransaction(connection, tx2, [payer], { commitment: "confirmed" });

  // Configure program with allowed mint
  const idlPath = path.join(process.cwd(), "target", "idl", "pqf5700.json");
  if (!fs.existsSync(idlPath)) throw new Error("Build program first to generate IDL at " + idlPath);
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new (Program as any)(idl, PROGRAM_ID, provider) as any;

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config"), mint.publicKey.toBuffer()], PROGRAM_ID);
  const tx3 = await program.methods.configure(mint.publicKey).accounts({
    config: configPda,
    authority: payer.publicKey,
    systemProgram: SystemProgram.programId,
  }).signers([]).rpc();

  console.log("Mint:", mint.publicKey.toBase58());
  console.log("ATA:", ata.toBase58());
  console.log("Config PDA:", configPda.toBase58());
})();
