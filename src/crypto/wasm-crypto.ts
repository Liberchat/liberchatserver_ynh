import init, { CryptoModule } from '../../crypto-wasm/pkg/crypto_wasm';

let cryptoModule: CryptoModule | null = null;
let initialized = false;
let keyRotationInterval: number | null = null;

/**
 * Initialise le module WASM de chiffrement avec rotation automatique des clés
 * Doit être appelé avant toute opération de chiffrement
 */
export async function initWasmCrypto(): Promise<void> {
  if (initialized) return;
  
  try {
    // Initialise le module WASM
    await init();
    
    // Crée une instance du module crypto avec génération de clés éphémères
    cryptoModule = new CryptoModule();
    
    initialized = true;
    console.log('✅ Module WASM initialisé avec succès');
    console.log('🔐 Clés éphémères générées pour Perfect Forward Secrecy');
    
    // Log du hash de la clé (debug uniquement)
    if (import.meta.env.DEV) {
      const keyHash = cryptoModule.get_key_hash();
      console.log('🔑 Hash de la clé de session:', keyHash);
      console.log('🔄 Rotation automatique des clés activée (toutes les 30 minutes)');
    }
    
    // Active la rotation automatique des clés toutes les 30 minutes
    startKeyRotation();
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation du module WASM:', error);
    throw error;
  }
}

/**
 * Démarre la rotation automatique des clés de session
 */
function startKeyRotation(): void {
  if (keyRotationInterval) return;
  
  // Rotation toutes les 30 minutes
  keyRotationInterval = window.setInterval(() => {
    if (cryptoModule) {
      try {
        cryptoModule.rotate_session_key();
        console.log('🔄 Clé de session rotée avec succès');
        
        if (import.meta.env.DEV) {
          const newKeyHash = cryptoModule.get_key_hash();
          console.log('🔑 Nouveau hash de clé:', newKeyHash);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la rotation de clé:', error);
      }
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * Arrête la rotation automatique des clés
 */
export function stopKeyRotation(): void {
  if (keyRotationInterval) {
    clearInterval(keyRotationInterval);
    keyRotationInterval = null;
  }
}

/**
 * Obtient la clé publique pour l'échange Diffie-Hellman
 */
export function getPublicKey(): Uint8Array | null {
  if (!cryptoModule) return null;
  return cryptoModule.get_public_key();
}

/**
 * Effectue un échange de clés Diffie-Hellman avec un pair
 * @param peerPublicKey Clé publique du pair
 */
export async function performKeyExchange(peerPublicKey: Uint8Array): Promise<void> {
  if (!cryptoModule) {
    throw new Error('Module WASM non initialisé. Appelez initWasmCrypto() d\'abord.');
  }
  
  try {
    cryptoModule.perform_key_exchange(peerPublicKey);
    console.log('🤝 Échange de clés Diffie-Hellman réussi');
    
    if (import.meta.env.DEV) {
      const keyHash = cryptoModule.get_key_hash();
      console.log('🔑 Nouvelle clé de session après échange:', keyHash);
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'échange de clés:', error);
    throw error;
  }
}

/**
 * Vérifie si un échange de clés a été effectué
 */
export function hasSharedSecret(): boolean {
  if (!cryptoModule) return false;
  return cryptoModule.has_shared_secret();
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
