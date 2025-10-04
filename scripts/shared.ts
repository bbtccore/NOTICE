import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import * as dotenv from "dotenv";

dotenv.config();

export function loadKeypair(): Keypair {
  const key = process.env.SOLANA_PRIVATE_KEY;
  if (!key) throw new Error("SOLANA_PRIVATE_KEY missing in .env");
  try {
    if (key.trim().startsWith("[") && key.trim().endsWith("]")) {
      const arr = JSON.parse(key) as number[];
      return Keypair.fromSecretKey(new Uint8Array(arr));
    }
    const bytes = bs58.decode(key);
    return Keypair.fromSecretKey(bytes);
  } catch (e) {
    throw new Error("Failed to parse SOLANA_PRIVATE_KEY: " + (e as Error).message);
  }
}

export function getConnection(): Connection {
  const url = process.env.RPC_URL ?? clusterApiUrl("devnet");
  return new Connection(url, "confirmed");
}
