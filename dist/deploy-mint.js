"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const shared_1 = require("./shared");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Program ID handling
const programIdStr = process.env.PROGRAM_ID || "PQF5700xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const PROGRAM_ID = new web3_js_1.PublicKey(programIdStr);
(async () => {
    const payer = (0, shared_1.loadKeypair)();
    const connection = (0, shared_1.getConnection)();
    const provider = new anchor_1.AnchorProvider(connection, new (class {
        constructor() {
            this.publicKey = payer.publicKey;
        }
        async signTransaction(tx) { return tx; }
        async signAllTransactions(txs) { return txs; }
    })(), anchor_1.AnchorProvider.defaultOptions());
    (0, anchor_1.setProvider)(provider);
    // Create Mint (Token-2022)
    const mint = web3_js_1.Keypair.generate();
    const decimals = Number(process.env.MINT_DECIMALS ?? 9);
    // Create mint and ATA via raw system instructions for brevity using SPL helpers
    const ata = (0, spl_token_1.getAssociatedTokenAddressSync)(mint.publicKey, payer.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    // Use @solana/spl-token command helpers via program-less flow
    const { createInitializeMint2Instruction, MINT_SIZE, getMinimumBalanceForRentExemptMint, createAssociatedTokenAccountInstruction } = await Promise.resolve().then(() => __importStar(require("@solana/spl-token")));
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const tx = new web3_js_1.Transaction();
    tx.add(web3_js_1.SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: mint.publicKey, lamports, space: MINT_SIZE, programId: spl_token_1.TOKEN_2022_PROGRAM_ID }), createInitializeMint2Instruction(mint.publicKey, decimals, payer.publicKey, null, spl_token_1.TOKEN_2022_PROGRAM_ID), createAssociatedTokenAccountInstruction(payer.publicKey, ata, payer.publicKey, payer.publicKey, mint.publicKey, spl_token_1.TOKEN_2022_PROGRAM_ID));
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.partialSign(mint);
    tx.sign(payer);
    const sig1 = await (0, web3_js_1.sendAndConfirmTransaction)(connection, tx, [payer, mint], { commitment: "confirmed" });
    // Mint total supply to payer
    const totalSupply = BigInt(57_000_000) * BigInt(10 ** decimals);
    const tx2 = new web3_js_1.Transaction();
    tx2.add((0, spl_token_1.createMintToInstruction)(mint.publicKey, ata, payer.publicKey, Number(totalSupply), [], spl_token_1.TOKEN_2022_PROGRAM_ID));
    tx2.feePayer = payer.publicKey;
    tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx2.sign(payer);
    const sig2 = await (0, web3_js_1.sendAndConfirmTransaction)(connection, tx2, [payer], { commitment: "confirmed" });
    // Configure program with allowed mint
    const idlPath = path.join(process.cwd(), "target", "idl", "pqf5700.json");
    if (!fs.existsSync(idlPath))
        throw new Error("Build program first to generate IDL at " + idlPath);
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new anchor_1.Program(idl, PROGRAM_ID, provider);
    const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config"), mint.publicKey.toBuffer()], PROGRAM_ID);
    const tx3 = await program.methods.configure(mint.publicKey).accounts({
        config: configPda,
        authority: payer.publicKey,
        systemProgram: web3_js_1.SystemProgram.programId,
    }).signers([]).rpc();
    console.log("Mint:", mint.publicKey.toBase58());
    console.log("ATA:", ata.toBase58());
    console.log("Config PDA:", configPda.toBase58());
})();
