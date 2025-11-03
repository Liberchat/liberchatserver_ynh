# 📚 API Cryptographique - Documentation Technique

## Vue d'ensemble

Cette documentation détaille l'API des nouveaux composants cryptographiques de LiberChat, conçus pour un chiffrement automatique et transparent.

---

## 🔐 CryptoManager

### Description
Gestionnaire central pour toutes les opérations cryptographiques. Gère la génération, le stockage et l'utilisation des clés de chiffrement.

### Interface

```typescript
interface CryptoManager {
  // Gestion des clés
  generateGlobalKey(): Promise<CryptoKey>;
  generateGroupKey(groupId: string): Promise<CryptoKey>;
  getKey(context: 'global' | string): Promise<CryptoKey | null>;
  storeKey(context: string, key: CryptoKey): Promise<void>;
  
  // Chiffrement/Déchiffrement
  encryptMessage(message: string, context?: string): Promise<EncryptedMessage>;
  decryptMessage(encrypted: EncryptedMessage, context?: string): Promise<string>;
  
  // Échange de clés
  initiateKeyExchange(groupId: string): Promise<void>;
  handleKeyExchange(data: KeyExchangeData): Promise<void>;
  
  // Gestion d'erreurs
  handleDecryptionError(error: Error, context: string): Promise<void>;
  regenerateKey(context: string): Promise<void>;
}
```

### Méthodes

#### `generateGlobalKey(): Promise<CryptoKey>`
Génère une nouvelle clé globale AES-GCM 256 bits.

**Retour :** Clé cryptographique pour le chiffrement global

**Exemple :**
```typescript
const cryptoManager = new CryptoManager();
const globalKey = await cryptoManager.generateGlobalKey();
```

#### `encryptMessage(message: string, context?: string): Promise<EncryptedMessage>`
Chiffre un message avec la clé appropriée selon le contexte.

**Paramètres :**
- `message` : Message en clair à chiffrer
- `context` : Contexte ('global' ou ID de groupe)

**Retour :** Objet message chiffré avec IV et métadonnées

**Exemple :**
```typescript
const encrypted = await cryptoManager.encryptMessage("Hello World", "group-123");
```

#### `decryptMessage(encrypted: EncryptedMessage, context?: string): Promise<string>`
Déchiffre un message avec gestion d'erreurs automatique.

**Paramètres :**
- `encrypted` : Message chiffré à déchiffrer
- `context` : Contexte pour sélectionner la bonne clé

**Retour :** Message en clair

**Exemple :**
```typescript
const decrypted = await cryptoManager.decryptMessage(encryptedMsg, "group-123");
```

---

## 💾 SecureStorage

### Description
Système de stockage sécurisé pour les clés cryptographiques avec chiffrement local et gestion des métadonnées.

### Interface

```typescript
interface SecureStorage {
  // Stockage des clés
  storeKey(keyId: string, key: CryptoKey): Promise<void>;
  retrieveKey(keyId: string): Promise<CryptoKey | null>;
  deleteKey(keyId: string): Promise<void>;
  listKeys(): Promise<string[]>;
  
  // Métadonnées
  storeMetadata(keyId: string, metadata: KeyMetadata): Promise<void>;
  getMetadata(keyId: string): Promise<KeyMetadata | null>;
  
  // Nettoyage et maintenance
  cleanup(): Promise<void>;
  exportKeys(): Promise<ExportedKeys>;
  importKeys(keys: ExportedKeys): Promise<void>;
}
```

### Méthodes

#### `storeKey(keyId: string, key: CryptoKey): Promise<void>`
Stocke une clé de manière sécurisée avec chiffrement local.

**Paramètres :**
- `keyId` : Identifiant unique de la clé
- `key` : Clé cryptographique à stocker

**Exemple :**
```typescript
const storage = new SecureStorage();
await storage.storeKey("global", globalKey);
```

#### `exportKeys(): Promise<ExportedKeys>`
Exporte toutes les clés dans un format chiffré pour sauvegarde.

**Retour :** Objet contenant les clés chiffrées et métadonnées

**Exemple :**
```typescript
const backup = await storage.exportKeys();
// Sauvegarder backup dans un fichier sécurisé
```

---

## 🔄 KeyExchanger

### Description
Gestionnaire d'échange de clés pour les groupes utilisant le protocole Diffie-Hellman.

### Interface

```typescript
interface KeyExchanger {
  // Protocole d'échange
  generateKeyPair(): Promise<CryptoKeyPair>;
  deriveSharedSecret(publicKey: CryptoKey, privateKey: CryptoKey): Promise<CryptoKey>;
  
  // Gestion des groupes
  joinGroup(groupId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  rotateGroupKey(groupId: string): Promise<void>;
  
  // Sécurité
  verifyPeer(peerId: string, signature: ArrayBuffer): Promise<boolean>;
  signMessage(message: ArrayBuffer): Promise<ArrayBuffer>;
}
```

### Méthodes

#### `joinGroup(groupId: string): Promise<void>`
Initie l'échange de clés pour rejoindre un groupe sécurisé.

**Paramètres :**
- `groupId` : Identifiant du groupe à rejoindre

**Exemple :**
```typescript
const keyExchanger = new KeyExchanger();
await keyExchanger.joinGroup("secure-team");
```

#### `rotateGroupKey(groupId: string): Promise<void>`
Effectue une rotation de la clé de groupe pour sécurité renforcée.

**Paramètres :**
- `groupId` : Identifiant du groupe

**Exemple :**
```typescript
await keyExchanger.rotateGroupKey("secure-team");
```

---

## 🛡️ CryptoErrorHandler

### Description
Gestionnaire d'erreurs cryptographiques avec stratégies de récupération automatique.

### Interface

```typescript
interface CryptoErrorHandler {
  handleError(error: CryptoError, context: string): Promise<void>;
  handleDecryptionFailure(error: Error, context: string): Promise<void>;
  handleMissingKey(keyId: string): Promise<void>;
  handleStorageError(error: Error): Promise<void>;
}
```

### Méthodes

#### `handleError(error: CryptoError, context: string): Promise<void>`
Point d'entrée principal pour la gestion d'erreurs cryptographiques.

**Paramètres :**
- `error` : Erreur cryptographique à traiter
- `context` : Contexte de l'erreur

**Exemple :**
```typescript
const errorHandler = new CryptoErrorHandler();
try {
  await cryptoManager.decryptMessage(msg);
} catch (error) {
  await errorHandler.handleError(error, "group-123");
}
```

---

## 📊 Types de Données

### EncryptedMessage

```typescript
interface EncryptedMessage {
  iv: number[];           // Vecteur d'initialisation (12 bytes)
  content: number[];      // Contenu chiffré
  algorithm: string;      // 'AES-GCM'
  keyVersion: number;     // Version de la clé utilisée
  timestamp: number;      // Horodatage du chiffrement
  context?: string;       // Contexte (groupe, global)
}
```

### KeyMetadata

```typescript
interface KeyMetadata {
  id: string;             // Identifiant unique
  context: string;        // 'global' ou groupId
  algorithm: string;      // 'AES-GCM'
  length: number;         // 256
  created: number;        // Timestamp de création
  lastUsed: number;       // Dernière utilisation
  version: number;        // Version de la clé
  rotationSchedule?: number; // Prochaine rotation
}
```

### CryptoError

```typescript
interface CryptoError extends Error {
  type: 'DECRYPTION_FAILED' | 'KEY_NOT_FOUND' | 'KEY_EXCHANGE_FAILED' | 'STORAGE_ERROR';
  context: string;
  recoverable: boolean;
  retryCount?: number;
}
```

### KeyExchangeData

```typescript
interface KeyExchangeData {
  groupId: string;
  publicKey: ArrayBuffer;
  signature: ArrayBuffer;
  timestamp: number;
  peerId: string;
}
```

---

## 🎯 Utilisation Pratique

### Initialisation Complète

```typescript
// Initialisation du système cryptographique
const storage = new SecureStorage();
const keyExchanger = new KeyExchanger();
const errorHandler = new CryptoErrorHandler();
const cryptoManager = new CryptoManager(storage, keyExchanger, errorHandler);

// Génération de la clé globale
await cryptoManager.generateGlobalKey();
```

### Chiffrement de Message

```typescript
// Chiffrement automatique
const message = "Message confidentiel";
const encrypted = await cryptoManager.encryptMessage(message, "global");

// Le message est maintenant sécurisé
console.log(encrypted);
// {
//   iv: [123, 45, 67, ...],
//   content: [89, 12, 34, ...],
//   algorithm: "AES-GCM",
//   keyVersion: 1,
//   timestamp: 1698765432000
// }
```

### Gestion de Groupe

```typescript
// Rejoindre un groupe sécurisé
await keyExchanger.joinGroup("team-alpha");

// Chiffrer pour le groupe
const groupMessage = await cryptoManager.encryptMessage(
  "Message pour l'équipe", 
  "team-alpha"
);

// Rotation de sécurité
await keyExchanger.rotateGroupKey("team-alpha");
```

### Gestion d'Erreurs

```typescript
// Déchiffrement avec gestion d'erreurs
try {
  const decrypted = await cryptoManager.decryptMessage(encrypted, "team-alpha");
  console.log("Message:", decrypted);
} catch (error) {
  // Récupération automatique
  await errorHandler.handleError(error, "team-alpha");
  
  // Nouvelle tentative
  const decrypted = await cryptoManager.decryptMessage(encrypted, "team-alpha");
}
```

---

## 🔧 Configuration

### Paramètres Cryptographiques

```typescript
const cryptoConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 16,
  keyRotationInterval: 24 * 60 * 60 * 1000, // 24h
  maxRetries: 3,
  storagePrefix: 'liberchat_crypto_',
  compressionThreshold: 1024 // bytes
};
```

### Variables d'Environnement

```bash
# Configuration optionnelle
CRYPTO_DEBUG=true
CRYPTO_PERFORMANCE_MONITORING=true
CRYPTO_AUTO_ROTATION=true
CRYPTO_BACKUP_ENABLED=true
```

---

## 🧪 Tests

### Tests Unitaires

```typescript
describe('CryptoManager', () => {
  test('génère des clés uniques', async () => {
    const crypto = new CryptoManager();
    const key1 = await crypto.generateGlobalKey();
    const key2 = await crypto.generateGlobalKey();
    expect(key1).not.toBe(key2);
  });
  
  test('chiffre avec IV uniques', async () => {
    const crypto = new CryptoManager();
    const msg = "Test message";
    const enc1 = await crypto.encryptMessage(msg);
    const enc2 = await crypto.encryptMessage(msg);
    expect(enc1.iv).not.toEqual(enc2.iv);
  });
});
```

### Tests de Performance

```typescript
describe('Performance', () => {
  test('chiffrement sous 100ms', async () => {
    const crypto = new CryptoManager();
    const start = performance.now();
    await crypto.encryptMessage("Test performance");
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 📈 Métriques et Monitoring

### Métriques Disponibles

```typescript
interface CryptoMetrics {
  encryptionCount: number;
  decryptionCount: number;
  averageEncryptionTime: number;
  averageDecryptionTime: number;
  errorRate: number;
  keyRotations: number;
  activeKeys: number;
}
```

### Collecte de Métriques

```typescript
const metrics = await cryptoManager.getMetrics();
console.log(`Taux d'erreur: ${metrics.errorRate}%`);
console.log(`Temps moyen de chiffrement: ${metrics.averageEncryptionTime}ms`);
```

---

## 🚀 Bonnes Pratiques

### Sécurité

1. **Rotation régulière** : Utilisez la rotation automatique des clés
2. **Gestion d'erreurs** : Toujours implémenter la récupération automatique
3. **Validation** : Vérifiez l'intégrité des messages déchiffrés
4. **Logs sécurisés** : Ne jamais logger les clés ou contenus sensibles

### Performance

1. **Cache intelligent** : Utilisez le cache de clés intégré
2. **Chiffrement asynchrone** : Ne bloquez jamais l'interface utilisateur
3. **Compression** : Activez la compression pour les gros messages
4. **Monitoring** : Surveillez les métriques de performance

### Maintenance

1. **Nettoyage automatique** : Configurez le nettoyage des clés expirées
2. **Sauvegardes** : Implémentez l'export/import de clés
3. **Tests continus** : Exécutez les tests de sécurité régulièrement
4. **Mise à jour** : Gardez les algorithmes cryptographiques à jour

---

Cette API offre une base solide pour un chiffrement automatique, sécurisé et performant dans LiberChat. 🛡️