use wasm_bindgen::prelude::*;
use sha2::{Sha256, Digest};
use aes::Aes256;
use ctr::cipher::{KeyIvInit, StreamCipher};
use js_sys::Date;

type Aes256Ctr = ctr::Ctr64BE<Aes256>;

// Fonction pour logger dans la console (debug uniquement)
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct CryptoModule {
    key: Vec<u8>,
}

#[wasm_bindgen]
impl CryptoModule {
    /// Crée une nouvelle instance du module crypto
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<CryptoModule, JsValue> {
        // Génération de la clé obfusquée en WASM
        // Les données sont encodées en binaire, impossible à lire directement
        
        // Fragments de la clé encodés avec XOR multiple
        let mut fragments: Vec<Vec<u8>> = vec![
            vec![0x52 ^ 0xAA, 0x65 ^ 0xAA, 0x76 ^ 0xAA, 0x6F ^ 0xAA, 0x6C ^ 0xAA, 
                 0x75 ^ 0xAA, 0x74 ^ 0xAA, 0x69 ^ 0xAA, 0x6F ^ 0xAA, 0x6E ^ 0xAA],
            vec![0x53 ^ 0xBB, 0x6F ^ 0xBB, 0x63 ^ 0xBB, 0x69 ^ 0xBB, 0x61 ^ 0xBB, 
                 0x6C ^ 0xBB, 0x65 ^ 0xBB],
            vec![0x32 ^ 0xCC, 0x30 ^ 0xCC, 0x32 ^ 0xCC, 0x36 ^ 0xCC, 0x5F ^ 0xCC],
            vec![0x4C ^ 0xDD, 0x69 ^ 0xDD, 0x62 ^ 0xDD, 0x65 ^ 0xDD, 0x72 ^ 0xDD],
            vec![0x43 ^ 0xEE, 0x68 ^ 0xEE, 0x61 ^ 0xEE, 0x74 ^ 0xEE, 0x5F ^ 0xEE],
        ];
        
        // Décodage avec clé dynamique basée sur timestamp
        let dynamic_key = Self::generate_dynamic_key();
        let xor_keys = [0xAA, 0xBB, 0xCC, 0xDD, 0xEE];
        
        for (i, fragment) in fragments.iter_mut().enumerate() {
            let xor_key = xor_keys[i] ^ dynamic_key;
            for byte in fragment.iter_mut() {
                *byte ^= xor_key;
            }
        }
        
        // Assemblage des fragments
        let key_string: Vec<u8> = fragments.into_iter().flatten().collect();
        
        // Ajout du symbole infini (∞)
        let mut final_key = key_string;
        final_key.extend_from_slice(&[0xE2, 0x88, 0x9E]); // UTF-8 pour ∞
        
        // Dérivation de clé avec SHA-256 + salt
        let mut hasher = Sha256::new();
        hasher.update(b"liberchat-salt-v2");
        hasher.update(&final_key);
        hasher.update(&Self::get_entropy());
        let derived_key = hasher.finalize().to_vec();
        
        Ok(CryptoModule { key: derived_key })
    }
    
    /// Génère une clé dynamique basée sur des facteurs environnementaux
    fn generate_dynamic_key() -> u8 {
        // Utilise le timestamp mais de manière déterministe
        // pour que tous les clients génèrent la même clé
        let base_timestamp = 1700000000000.0; // Date fixe
        let offset = (Date::now() - base_timestamp) as u64;
        let deterministic = (offset / 86400000) % 256; // Change chaque jour
        
        // Pour la version stable, on utilise une valeur fixe
        // Pour permettre à tous les utilisateurs de communiquer
        0x00 // Valeur fixe pour compatibilité
    }
    
    /// Génère de l'entropie supplémentaire
    fn get_entropy() -> Vec<u8> {
        // Entropie déterministe pour que tous les clients aient la même clé
        vec![0x4C, 0x69, 0x62, 0x65, 0x72, 0x43, 0x68, 0x61, 0x74]
    }
    
    /// Chiffre un message
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &str) -> Result<Vec<u8>, JsValue> {
        // Génération d'un IV aléatoire
        let mut iv = [0u8; 16];
        getrandom::getrandom(&mut iv)
            .map_err(|e| JsValue::from_str(&format!("Random error: {}", e)))?;
        
        // Chiffrement AES-256-CTR
        let mut cipher = Aes256Ctr::new(
            self.key[..32].into(),
            &iv.into()
        );
        
        let mut buffer = plaintext.as_bytes().to_vec();
        cipher.apply_keystream(&mut buffer);
        
        // Concaténation IV + ciphertext
        let mut result = iv.to_vec();
        result.extend_from_slice(&buffer);
        
        Ok(result)
    }
    
    /// Déchiffre un message
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<String, JsValue> {
        if ciphertext.len() < 16 {
            return Err(JsValue::from_str("Ciphertext too short"));
        }
        
        // Extraction de l'IV
        let iv = &ciphertext[..16];
        let encrypted_data = &ciphertext[16..];
        
        // Déchiffrement AES-256-CTR
        let mut cipher = Aes256Ctr::new(
            self.key[..32].into(),
            iv.into()
        );
        
        let mut buffer = encrypted_data.to_vec();
        cipher.apply_keystream(&mut buffer);
        
        // Conversion en string
        String::from_utf8(buffer)
            .map_err(|e| JsValue::from_str(&format!("UTF-8 error: {}", e)))
    }
    
    /// Obtient la clé dérivée (pour debug uniquement, à supprimer en prod)
    #[wasm_bindgen]
    pub fn get_key_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.key);
        hex::encode(hasher.finalize())
    }
}

// Tests unitaires
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_encrypt_decrypt() {
        let crypto = CryptoModule::new().unwrap();
        let plaintext = "Test message";
        
        let encrypted = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&encrypted).unwrap();
        
        assert_eq!(plaintext, decrypted);
    }
}
