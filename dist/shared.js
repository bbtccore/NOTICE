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
exports.loadKeypair = loadKeypair;
exports.getConnection = getConnection;
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function loadKeypair() {
    const key = process.env.SOLANA_PRIVATE_KEY;
    if (!key)
        throw new Error("SOLANA_PRIVATE_KEY missing in .env");
    try {
        if (key.trim().startsWith("[") && key.trim().endsWith("]")) {
            const arr = JSON.parse(key);
            return web3_js_1.Keypair.fromSecretKey(new Uint8Array(arr));
        }
        const bytes = bs58_1.default.decode(key);
        return web3_js_1.Keypair.fromSecretKey(bytes);
    }
    catch (e) {
        throw new Error("Failed to parse SOLANA_PRIVATE_KEY: " + e.message);
    }
}
function getConnection() {
    const url = process.env.RPC_URL ?? (0, web3_js_1.clusterApiUrl)("devnet");
    return new web3_js_1.Connection(url, "confirmed");
}
