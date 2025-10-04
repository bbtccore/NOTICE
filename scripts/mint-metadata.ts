import { PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from "@solana/web3.js";
import { getMintLen, createInitializeInstruction, TYPE_SIZE, LENGTH_SIZE, createUpdateFieldInstruction, pack, TokenMetadata, createInitializeInstructionV2, createUpdateAuthorityInstruction } from "@solana/spl-token-metadata";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { loadKeypair, getConnection } from "./shared";

(async () => {
  const payer = loadKeypair();
  const connection = getConnection();
  const MINT = new PublicKey(process.env.MINT!);
  const name = "PQF 5700";
  const symbol = "PQF 5700";
  const uri = process.env.METADATA_URI || "https://example.com/pqf5700.json";

  const mintLen = getMintLen([]);
  // Create metadata PDA
  const [metadata] = PublicKey.findProgramAddressSync([Buffer.from("metadata"), TOKEN_2022_PROGRAM_ID.toBuffer(), MINT.toBuffer()], new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"));

  const tx = new Transaction();
  const data: TokenMetadata = { name, symbol, uri, updateAuthority: payer.publicKey, mint: MINT, additionalMetadata: [] };
  tx.add(createInitializeInstruction({ mint: MINT, metadata, name, symbol, uri, mintAuthority: payer.publicKey, updateAuthority: payer.publicKey, programId: TOKEN_2022_PROGRAM_ID }));
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  await sendAndConfirmTransaction(connection, tx, [payer]);
})();
