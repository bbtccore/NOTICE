import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { loadKeypair, getConnection } from "./shared";
import * as fs from "fs";
import * as path from "path";

function mockPqcSignature(message: Uint8Array, nonce: bigint): Uint8Array {
  const { sha3_256 } = require("js-sha3");
  const hash = sha3_256.create();
  hash.update(message);
  const nonceBytes = Buffer.alloc(8);
  nonceBytes.writeBigUInt64LE(nonce);
  hash.update(nonceBytes);
  const digestHex = hash.hex();
  return Buffer.from(digestHex.substring(0, 8), "hex");
}

(async () => {
  const payer = loadKeypair();
  const connection = getConnection();
  const provider = new AnchorProvider(connection, new (class {
    publicKey = payer.publicKey;
    async signTransaction(tx: any) { return tx; }
    async signAllTransactions(txs: any[]) { return txs; }
  })() as any, AnchorProvider.defaultOptions());
  setProvider(provider);

  const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || "PQF5700xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const MINT = new PublicKey(process.env.MINT!);
  const TO = new PublicKey(process.env.TO!);
  const AMOUNT = BigInt(process.env.AMOUNT || "1000000");

  const idlPath = path.join(process.cwd(), "target", "idl", "pqf5700.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new (Program as any)(idl, provider) as any;

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config"), MINT.toBuffer()], PROGRAM_ID);

  const fromAta = getAssociatedTokenAddressSync(MINT, payer.publicKey, false, TOKEN_2022_PROGRAM_ID);
  const toAta = getAssociatedTokenAddressSync(MINT, TO, false, TOKEN_2022_PROGRAM_ID);

  const message = Buffer.concat([MINT.toBuffer(), fromAta.toBuffer(), toAta.toBuffer(), Buffer.from(AMOUNT.toString())]);
  const slotInfo = await connection.getSlot();
  const nonce = BigInt(Date.now());
  const signature = mockPqcSignature(message, nonce);

  const attestation = { pqcPubkey: new Array(32).fill(1), signature: Array.from(signature), nonce: Number(nonce), slot: Number(slotInfo) };

  await program.methods.pqcTransfer(new anchor.BN(AMOUNT.toString()), attestation).accounts({
    from: fromAta,
    to: toAta,
    mint: MINT,
    authority: payer.publicKey,
    config: configPda,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
  }).rpc();

  console.log("Transfer submitted.");
})();
