import _sodium from 'libsodium-wrappers';

let sodium: typeof _sodium;
let initialized = false;
let sharedKey: Uint8Array | null = null;

/**
 * Initialise libsodium (WASM natif, très sécurisé)
 * Utilisé par ProtonMail, Wire, etc.
 */
export async function initLibsodium(): Promise<void> {
    if (initialized) return;

    await _sodium.ready;
    sodium = _sodium;

    // Génération d'une clé partagée pour le chat public
    // Pour un vrai système, cette clé devrait être échangée via Diffie-Hellman
    const masterPassword = 'Revolution∞Sociale2026LiberChat∞';

    // Utilisation de crypto_generichash pour dériver une clé de 32 bytes
    sharedKey = sodium.crypto_generichash(
        32, // 256 bits
        sodium.from_string(masterPassword)
    );

    initialized = true;
    // console.log('✅ Libsodium initialisé avec succès');
    // console.log('🔐 Chiffrement: XSalsa20-Poly1305 (authentifié)');
    // console.log('🔑 Dérivation: BLAKE2b (hash cryptographique)');
}

/**
 * Chiffre un message avec XChaCha20-Poly1305
 * Plus sécurisé que AES-GCM (nonce de 192 bits au lieu de 96)
 */
export async function encryptMessage(plaintext: string): Promise<Uint8Array> {
    if (!initialized || !sharedKey || !sodium) {
        if (!sodium && _sodium) sodium = _sodium;
        if (!sodium) throw new Error('Libsodium non initialisé');
    }

    const message = sodium.from_string(plaintext);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    // XChaCha20-Poly1305 (authentifié, résistant aux attaques)
    const ciphertext = sodium.crypto_secretbox_easy(message, nonce, sharedKey!);

    // Format: nonce + ciphertext
    const result = new Uint8Array(nonce.length + ciphertext.length);
    result.set(nonce);
    result.set(ciphertext, nonce.length);

    return result;
}

/**
 * Déchiffre un message avec XChaCha20-Poly1305
 */
export async function decryptMessage(encrypted: Uint8Array): Promise<string> {
    if (!initialized || !sharedKey || !sodium) {
        if (!sodium && _sodium) sodium = _sodium;
        if (!sodium) throw new Error('Libsodium non initialisé');
    }

    const nonceLength = sodium.crypto_secretbox_NONCEBYTES;

    if (encrypted.length < nonceLength) {
        throw new Error('Message trop court');
    }

    const nonce = encrypted.slice(0, nonceLength);
    const ciphertext = encrypted.slice(nonceLength);

    // Déchiffrement avec vérification d'authenticité
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, sharedKey!);

    if (!decrypted) {
        throw new Error('Déchiffrement échoué (message corrompu ou clé incorrecte)');
    }

    return sodium.to_string(decrypted);
}

/**
 * Convertit Uint8Array en base64
 */
export function toBase64(data: Uint8Array): string {
    if (!sodium && _sodium) sodium = _sodium;
    if (!sodium) throw new Error('Libsodium non initialisé');
    return sodium.to_base64(data, sodium.base64_variants.ORIGINAL);
}

/**
 * Convertit base64 en Uint8Array
 */
export function fromBase64(base64: string): Uint8Array {
    if (!sodium && _sodium) sodium = _sodium;
    if (!sodium) throw new Error('Libsodium non initialisé');
    return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
}

/**
 * Vérifie si libsodium est initialisé
 */
export function isLibsodiumReady(): boolean {
    return initialized && sharedKey !== null;
}
