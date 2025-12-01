import init, { CryptoModule } from '../../crypto-wasm/pkg/crypto_wasm';

let cryptoModule: CryptoModule | null = null;
let initialized = false;

/**
 * Initialise le module WASM de chiffrement
 * Doit être appelé avant toute opération de chiffrement
 */
export async function initWasmCrypto(): Promise<void> {
  if (initialized) return;
  
  try {
    // Initialise le module WASM
    await init();
    
    // Crée une instance du module crypto
    cryptoModule = new CryptoModule();
    
    initialized = true;
    console.log('✅ Module WASM initialisé avec succès');
    
    // Log du hash de la clé (debug uniquement)
    if (import.meta.env.DEV) {
      const keyHash = cryptoModule.get_key_hash();
      console.log('🔑 Hash de la clé:', keyHash);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du module WASM:', error);
    throw error;
  }
}

/**
 * Chiffre un message avec WASM
 * @param message Message en clair
 * @returns Message chiffré (Uint8Array)
 */
export async function encryptWasm(message: string): Promise<Uint8Array> {
  if (!cryptoModule) {
    throw new Error('Module WASM non initialisé. Appelez initWasmCrypto() d\'abord.');
  }
  
  try {
    const encrypted = cryptoModule.encrypt(message);
    return encrypted;
  } catch (error) {
    console.error('❌ Erreur de chiffrement WASM:', error);
    throw error;
  }
}

/**
 * Déchiffre un message avec WASM
 * @param ciphertext Message chiffré (Uint8Array)
 * @returns Message en clair
 */
export async function decryptWasm(ciphertext: Uint8Array): Promise<string> {
  if (!cryptoModule) {
    throw new Error('Module WASM non initialisé. Appelez initWasmCrypto() d\'abord.');
  }
  
  try {
    const decrypted = cryptoModule.decrypt(ciphertext);
    return decrypted;
  } catch (error) {
    console.error('❌ Erreur de déchiffrement WASM:', error);
    throw error;
  }
}

/**
 * Vérifie si le module WASM est initialisé
 */
export function isWasmInitialized(): boolean {
  return initialized;
}

/**
 * Obtient le hash de la clé (debug uniquement)
 */
export function getKeyHash(): string | null {
  if (!cryptoModule) return null;
  return cryptoModule.get_key_hash();
}

/**
 * Convertit Uint8Array en base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convertit base64 en Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
