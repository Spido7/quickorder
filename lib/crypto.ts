// Edge-native encryption utilities using Web Crypto API (AES-GCM-256)
// This file is fully compatible with Cloudflare Workers / Next.js Edge runtime.

const IV_LENGTH = 12;

function getEnvKey(): string {
  const key = process.env.PAYMENT_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PAYMENT_ENCRYPTION_KEY is not defined in environment variables");
  }
  return key;
}

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.trim();
  if (cleanHex.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const array = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return array;
}

// Convert Uint8Array to base64 string
function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

// Convert base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to import the raw master key
async function importKey(): Promise<CryptoKey> {
  const rawKeyHex = getEnvKey();
  const rawKey = hexToUint8Array(rawKeyHex);

  return await crypto.subtle.importKey(
    "raw",
    rawKey as any,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts plain text using AES-GCM-256 with a random IV
 * Returns a base64-encoded string containing both IV and ciphertext
 */
export async function encrypt(text: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();
  const encodedText = encoder.encode(text);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    encodedText as any
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  // Combine IV and Ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts a base64-encoded AES-GCM-256 ciphertext string
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  try {
    const key = await importKey();
    
    let combined: Uint8Array;
    try {
      combined = base64ToUint8Array(encryptedBase64);
    } catch {
      // If it fails to parse as base64, assume it's raw/plain text and return it directly
      return encryptedBase64;
    }

    // Minimum length for a valid AES-GCM ciphertext:
    // IV (12 bytes) + AES-GCM tag (16 bytes) + plaintext (>= 0 bytes) = 28 bytes
    if (combined.length < IV_LENGTH + 16) {
      return encryptedBase64;
    }

    // Split IV and Ciphertext
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv as any,
      },
      key,
      ciphertext as any
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.warn("Failed to decrypt secret, falling back to raw value:", error);
    return encryptedBase64;
  }
}
