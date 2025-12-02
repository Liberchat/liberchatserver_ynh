use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce, Key
};
use x25519_dalek::{EphemeralSecret, PublicKey};
use hkdf::Hkdf;
use rand_core::RngCore;

// Fonction pour logger dans la console (debug uniquement)
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct CryptoModule {
    master_key: Vec<u8>,
    session_key: Vec<u8>,
    private_key: Option<EphemeralSecret>,
    public_key: Vec<u8>,
    shared_secret: Option<Vec<u8>>,
}

#[wasm_bindgen]
impl CryptoModule {
    /// Crée une nouvelle instance du module crypto avec génération de clés éphémères
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<CryptoModule, JsValue> {
        // Génération de la clé maître obfusquée (multi-couches)
        let master_key = Self::derive_master_key()?;
        
        // Génération d'une paire de clés éphémères X25519 pour l'échange Diffie-Hellman
        let mut rng_bytes = [0u8; 32];
        getrandom::getrandom(&mut rng_bytes)
            .map_err(|e| JsValue::from_str(&format!("Random error: {}", e)))?;
        
        let private_key = EphemeralSecret::random_from_rng(&mut CustomRng::new(rng_bytes));
        let public_key = PublicKey::from(&private_key);
        
        // Clé de session initiale (sera remplacée après échange DH)
        let session_key = Self::derive_session_key(&master_key, &[])?;
        
        Ok(CryptoModule {
            master_key,
            session_key,
            private_key: Some(private_key),
            public_key: public_key.as_bytes().to_vec(),
            shared_secret: None,
        })
    }
    
    /// Dérive la clé maître avec obfuscation multi-couches
    fn derive_master_key() -> Result<Vec<u8>, JsValue> {
        // Couche 1: Fragments XOR avec clés multiples
        let fragments = vec![
            Self::xor_fragment(&[0x52, 0x65, 0x76, 0x6F, 0x6C, 0x75, 0x74, 0x69, 0x6F, 0x6E], 0xAA),
            Self::xor_fragment(&[0x53, 0x6F, 0x63, 0x69, 0x61, 0x6C, 0x65], 0xBB),
            Self::xor_fragment(&[0x32, 0x30, 0x32, 0x36], 0xCC),
            Self::xor_fragment(&[0x4C, 0x69, 0x62, 0x65, 0x72], 0xDD),
            Self::xor_fragment(&[0x43, 0x68, 0x61, 0x74], 0xEE),
            Self::xor_fragment(&[0xE2, 0x88, 0x9E], 0xFF), // ∞
        ];
        
        let base_key: Vec<u8> = fragments.into_iter().flatten().collect();
        
        // Couche 2: Dérivation HKDF avec salt complexe
        let salt = Self::generate_complex_salt();
        let hk = Hkdf::<Sha256>::new(Some(&salt), &base_key);
        let mut master_key = vec![0u8; 32];
        hk.expand(b"LiberchatMasterKey2026", &mut master_key)
            .map_err(|e| JsValue::from_str(&format!("HKDF error: {:?}", e)))?;
        
        // Couche 3: Mélange avec entropie supplémentaire
        let entropy = Self::get_entropy();
        let mut hasher = Sha256::new();
        hasher.update(&master_key);
        hasher.update(&entropy);
        hasher.update(b"v2-enhanced");
        
        Ok(hasher.finalize().to_vec())
    }
    
    /// XOR un fragment avec une clé
    fn xor_fragment(data: &[u8], key: u8) -> Vec<u8> {
        data.iter().map(|b| b ^ key).collect()
    }
    
    /// Génère un salt complexe
    fn generate_complex_salt() -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(b"liberchat-salt-v3");
        hasher.update(b"enhanced-security");
        hasher.update(&[0x4C, 0x69, 0x62, 0x65, 0x72, 0x43, 0x68, 0x61, 0x74]);
        hasher.finalize().to_vec()
    }
    
    /// Génère de l'entropie supplémentaire
    fn get_entropy() -> Vec<u8> {
        let mut hasher = Sha256::new();
        hasher.update(b"LiberchatEntropy");
        hasher.update(b"2026");
        hasher.finalize().to_vec()
    }
    
    /// Dérive une clé de session à partir de la clé maître et d'un secret partagé
    fn derive_session_key(master_key: &[u8], shared_secret: &[u8]) -> Result<Vec<u8>, JsValue> {
        let mut input = master_key.to_vec();
        input.extend_from_slice(shared_secret);
        
        let hk = Hkdf::<Sha256>::new(Some(b"session-salt"), &input);
        let mut session_key = vec![0u8; 32];
        hk.expand(b"LiberchatSessionKey", &mut session_key)
            .map_err(|e| JsValue::from_str(&format!("Session key derivation error: {:?}", e)))?;
        
        Ok(session_key)
    }
    
    /// Obtient la clé publique pour l'échange Diffie-Hellman
    #[wasm_bindgen]
    pub fn get_public_key(&self) -> Vec<u8> {
        self.public_key.clone()
    }
    
    /// Effectue l'échange de clés Diffie-Hellman avec la clé publique d'un pair
    #[wasm_bindgen]
    pub fn perform_key_exchange(&mut self, peer_public_key: &[u8]) -> Result<(), JsValue> {
        if peer_public_key.len() != 32 {
            return Err(JsValue::from_str("Invalid public key length"));
        }
        
        let peer_public = PublicKey::from(<[u8; 32]>::try_from(peer_public_key)
            .map_err(|_| JsValue::from_str("Invalid public key format"))?);
        
        let private_key = self.private_key.take()
            .ok_or_else(|| JsValue::from_str("Private key already used"))?;
        
        let shared_secret = private_key.diffie_hellman(&peer_public);
        self.shared_secret = Some(shared_secret.as_bytes().to_vec());
        
        // Dérive une nouvelle clé de session avec le secret partagé
        self.session_key = Self::derive_session_key(&self.master_key, shared_secret.as_bytes())?;
        
        Ok(())
    }
    
    /// Chiffre un message avec AES-256-GCM (authentification intégrée)
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, JsValue> {
        // Génération d'un nonce aléatoire (96 bits pour GCM)
        let mut nonce_bytes = [0u8; 12];
        getrandom::getrandom(&mut nonce_bytes)
            .map_err(|e| JsValue::from_str(&format!("Random error: {}", e)))?;
        
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        // Création du cipher AES-256-GCM
        let key = Key::<Aes256Gcm>::from_slice(&self.session_key);
        let cipher = Aes256Gcm::new(key);
        
        // Chiffrement avec authentification
        let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| JsValue::from_str(&format!("Encryption error: {:?}", e)))?;
        
        // Format: nonce (12 bytes) + ciphertext + tag (16 bytes intégré dans ciphertext)
        let mut result = nonce_bytes.to_vec();
        result.extend_from_slice(&ciphertext);
        
        Ok(result)
    }
    
    /// Déchiffre un message avec AES-256-GCM (vérification d'authenticité)
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<String, JsValue> {
        if ciphertext.len() < 28 {  // 12 (nonce) + 16 (tag minimum)
            return Err(JsValue::from_str("Ciphertext too short"));
        }
        
        // Extraction du nonce
        let nonce = Nonce::from_slice(&ciphertext[..12]);
        let encrypted_data = &ciphertext[12..];
        
        // Création du cipher AES-256-GCM
        let key = Key::<Aes256Gcm>::from_slice(&self.session_key);
        let cipher = Aes256Gcm::new(key);
        
        // Déchiffrement avec vérification d'authenticité
        let plaintext = cipher.decrypt(nonce, encrypted_data)
            .map_err(|e| JsValue::from_str(&format!("Decryption error (authentication failed): {:?}", e)))?;
        
        // Conversion en string
        String::from_utf8(plaintext)
            .map_err(|e| JsValue::from_str(&format!("UTF-8 error: {}", e)))
    }
    
    /// Rotation de la clé de session (à appeler périodiquement)
    #[wasm_bindgen]
    pub fn rotate_session_key(&mut self) -> Result<(), JsValue> {
        let shared_secret = self.shared_secret.as_ref()
            .map(|s| s.as_slice())
            .unwrap_or(&[]);
        
        // Ajoute de l'entropie supplémentaire pour la rotation
        let mut entropy = vec![0u8; 32];
        getrandom::getrandom(&mut entropy)
            .map_err(|e| JsValue::from_str(&format!("Random error: {}", e)))?;
        
        let mut input = self.master_key.clone();
        input.extend_from_slice(shared_secret);
        input.extend_from_slice(&entropy);
        
        self.session_key = Self::derive_session_key(&input, &[])?;
        
        Ok(())
    }
    
    /// Obtient le hash de la clé de session (debug uniquement)
    #[wasm_bindgen]
    pub fn get_key_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.session_key);
        hex::encode(hasher.finalize())
    }
    
    /// Vérifie si un échange de clés a été effectué
    #[wasm_bindgen]
    pub fn has_shared_secret(&self) -> bool {
        self.shared_secret.is_some()
    }
}

// RNG personnalisé pour X25519
struct CustomRng {
    seed: [u8; 32],
    counter: usize,
}

impl CustomRng {
    fn new(seed: [u8; 32]) -> Self {
        Self { seed, counter: 0 }
    }
}

impl RngCore for CustomRng {
    fn next_u32(&mut self) -> u32 {
        let mut bytes = [0u8; 4];
        self.fill_bytes(&mut bytes);
        u32::from_le_bytes(bytes)
    }

    fn next_u64(&mut self) -> u64 {
        let mut bytes = [0u8; 8];
        self.fill_bytes(&mut bytes);
        u64::from_le_bytes(bytes)
    }

    fn fill_bytes(&mut self, dest: &mut [u8]) {
        getrandom::getrandom(dest).expect("getrandom failed");
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> Result<(), rand_core::Error> {
        getrandom::getrandom(dest)
            .map_err(|_| rand_core::Error::from(core::num::NonZeroU32::new(1).unwrap()))
    }
}

impl rand_core::CryptoRng for CustomRng {}

// Tests unitaires
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encrypt_decrypt() {
        let crypto = CryptoModule::new().unwrap();
        let plaintext = "Test message sécurisé";
        
        let encrypted = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&encrypted).unwrap();
        
        assert_eq!(plaintext, decrypted);
    }
    
    #[test]
    fn test_key_exchange() {
        let mut alice = CryptoModule::new().unwrap();
        let mut bob = CryptoModule::new().unwrap();
        
        let alice_public = alice.get_public_key();
        let bob_public = bob.get_public_key();
        
        alice.perform_key_exchange(&bob_public).unwrap();
        bob.perform_key_exchange(&alice_public).unwrap();
        
        assert!(alice.has_shared_secret());
        assert!(bob.has_shared_secret());
        
        // Test de chiffrement/déchiffrement après échange
        let plaintext = "Message après échange DH";
        let encrypted = alice.encrypt(plaintext).unwrap();
        let decrypted = bob.decrypt(&encrypted).unwrap();
        
        assert_eq!(plaintext, decrypted);
    }
    
    #[test]
    fn test_session_key_rotation() {
        let mut crypto = CryptoModule::new().unwrap();
        let old_hash = crypto.get_key_hash();
        
        crypto.rotate_session_key().unwrap();
        let new_hash = crypto.get_key_hash();
        
        assert_ne!(old_hash, new_hash);
    }
}
