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
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const shared_1 = require("./shared");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function mockPqcSignature(message, nonce) {
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
    const PROGRAM_ID = new web3_js_1.PublicKey(process.env.PROGRAM_ID || "PQF5700xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    const MINT = new web3_js_1.PublicKey(process.env.MINT);
    const TO = new web3_js_1.PublicKey(process.env.TO);
    const AMOUNT = BigInt(process.env.AMOUNT || "1000000");
    const idlPath = path.join(process.cwd(), "target", "idl", "pqf5700.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new anchor_1.Program(idl, PROGRAM_ID, provider);
    const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config"), MINT.toBuffer()], PROGRAM_ID);
    const fromAta = (0, spl_token_1.getAssociatedTokenAddressSync)(MINT, payer.publicKey, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
    const toAta = (0, spl_token_1.getAssociatedTokenAddressSync)(MINT, TO, false, spl_token_1.TOKEN_2022_PROGRAM_ID);
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
        tokenProgram: spl_token_1.TOKEN_2022_PROGRAM_ID,
    }).rpc();
    console.log("Transfer submitted.");
})();
