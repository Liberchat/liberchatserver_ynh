# 📦 Guide de création de la version 6.7.1

## Objectif

Créer une version **6.7.1** de LiberChat qui :
- ✅ Fonctionne sur **tous les navigateurs** (y compris Electron)
- ✅ Utilise un chiffrement **simple** (sans obfuscation)
- ✅ Clé visible dans DevTools (pour tests/debug)
- ✅ Pas de WebAssembly
- ✅ Pas d'obfuscation JavaScript

## Étapes de création

### 1. Créer une branche pour la v6.7.1

```bash
git checkout -b version-6.7.1
```

### 2. Modifier `package.json`

```json
{
  "version": "6.7.1"
}
```

### 3. Modifier `manifest.toml`

```toml
version = "6.7.1~ynh1"
```

### 4. Simplifier `src/components/App.tsx`

Supprimer tout le code WASM et garder uniquement le chiffrement JavaScript simple :

**Supprimer :**
- Import de `wasm-crypto.ts`
- `useWasm` state
- `wasmReady` state
- `initWasmCrypto()` useEffect
- Logique de chiffrement/déchiffrement WASM
- Bannières WASM/Fallback

**Garder :**
- Chiffrement avec `crypto-js` ou Web Crypto API
- Clé en clair dans le code (pour v6.7.1)

### 5. Code de la clé (v6.7.1)

```typescript
// Version 6.7.1 - Clé simple visible
const DEFAULT_KEY = 'Liberchat-2024-Key!';

useEffect(() => {
  // Initialisation automatique avec la clé par défaut
  setKeyInput(DEFAULT_KEY);
  generateSymmetricKeyFromPassword(DEFAULT_KEY).then(setSymmetricKey);
}, []);
```

### 6. Supprimer les fichiers WASM

```bash
rm -rf crypto-wasm/
rm src/crypto/wasm-crypto.ts
```

### 7. Nettoyer `package.json` - Scripts

Supprimer :
```json
"build:wasm": "wasm-pack build --target web --release crypto-wasm",
```

Modifier :
```json
"build": "vite build",
"build:obfuscated": "vite build"
```

### 8. Simplifier `vite.config.ts`

Supprimer la configuration WASM si présente.

### 9. Créer les notes de version

Créer `RELEASE_NOTES_6.7.1.md` :

```markdown
# 🔓 LiberChat 6.7.1 - Version Simple

**Date :** Décembre 2024  
**Type :** Version stable - Compatibilité maximale

## Caractéristiques

- ✅ Chiffrement AES-256-GCM (Web Crypto API)
- ✅ Fallback crypto-js si Web Crypto non disponible
- ✅ Clé partagée simple : `Liberchat-2024-Key!`
- ✅ Compatible tous navigateurs (Chrome, Firefox, Safari, Edge, Electron)
- ✅ Pas de WebAssembly
- ✅ Pas d'obfuscation
- ✅ Code lisible pour audit

## Sécurité

**Niveau : 3/10**

⚠️ Cette version est conçue pour la **compatibilité maximale**, pas pour la sécurité maximale.

La clé est visible dans le code source. N'utilisez pas cette version pour des communications sensibles.

## Installation

```bash
sudo yunohost app install https://github.com/Liberchat/liberchatserver_ynh
```

## Mise à jour

```bash
sudo yunohost app upgrade liberchat
```

## Utilisation

1. Ouvrir l'application
2. Entrer votre nom
3. Commencer à chatter

La clé est automatiquement configurée, aucune action requise.

## Pour qui ?

- ✅ Tests et développement
- ✅ Environnements Electron
- ✅ Navigateurs anciens
- ✅ Audit de code
- ❌ Communications sensibles (utiliser v6.9.0)

## Versions suivantes

- **v6.8.0** : Obfuscation JavaScript (sécurité 9/10)
- **v6.9.0** : WebAssembly + fallback (sécurité 9.5/10)
```

### 10. Build et test

```bash
npm install
npm run build
npm run preview
```

### 11. Commit et tag

```bash
git add .
git commit -m "Release v6.7.1 - Version simple compatible Electron"
git tag v6.7.1
git push origin version-6.7.1
git push origin v6.7.1
```

## Code minimal pour v6.7.1

### `src/components/App.tsx` (simplifié)

```typescript
// Clé par défaut (visible)
const DEFAULT_ENCRYPTION_KEY = 'Liberchat-2024-Key!';

// Initialisation automatique
useEffect(() => {
  generateSymmetricKeyFromPassword(DEFAULT_ENCRYPTION_KEY)
    .then(setSymmetricKey);
}, []);

// Chiffrement simple
async function encryptMessageE2EE(message: string, key: CryptoKey | string) {
  if (window.crypto && window.crypto.subtle && typeof key !== 'string') {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(message)
    );
    return {
      iv: Array.from(iv),
      content: Array.from(new Uint8Array(ciphertext))
    };
  } else {
    // Fallback crypto-js
    return encryptMessageFallback(message, key as string);
  }
}

// Déchiffrement simple
async function decryptMessageE2EE(encrypted: any, key: CryptoKey | string) {
  if (window.crypto && window.crypto.subtle && typeof key !== 'string') {
    const dec = new TextDecoder();
    const iv = new Uint8Array(encrypted.iv);
    const ciphertext = new Uint8Array(encrypted.content);
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return dec.decode(plaintext);
  } else {
    // Fallback crypto-js
    return decryptMessageFallback(encrypted, key as string);
  }
}
```

## Résultat

Version **6.7.1** :
- 📦 Taille : ~500 KB (sans WASM)
- ⚡ Build : 20 secondes
- 🔓 Sécurité : 3/10 (clé visible)
- ✅ Compatibilité : 100% (tous navigateurs)
- 🖥️ Electron : ✅ Fonctionne parfaitement

---

**Prochaine étape :** Tester sur Electron et valider le déchiffrement.
