/**
 * Tests pour SecureStorage - Vérification de la gestion des métadonnées
 * Requirements: 2.1, 2.2, 10.1, 10.2, 3.3, 4.1, 4.2
 */

import { SecureStorage } from '../SecureStorage.ts';

// Mock de l'API Web Crypto pour les tests
const mockCrypto = {
  subtle: {
    generateKey: jest.fn().mockResolvedValue({
      algorithm: { name: 'AES-GCM' },
      type: 'secret',
      extractable: true,
      usages: ['encrypt', 'decrypt']
    }),
    exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    importKey: jest.fn().mockResolvedValue({
      algorithm: { name: 'AES-GCM' },
      type: 'secret',
      extractable: true,
      usages: ['encrypt', 'decrypt']
    }),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(48)),
    decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(32))
  },
  getRandomValues: jest.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  })
};

// Mock de localStorage
const mockLocalStorage = {
  storage: {},
  getItem: jest.fn((key) => mockLocalStorage.storage[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.storage[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.storage[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.storage = {};
  }),
  get length() {
    return Object.keys(mockLocalStorage.storage).length;
  },
  key: jest.fn((index) => {
    const keys = Object.keys(mockLocalStorage.storage);
    return keys[index] || null;
  })
};

// Configuration des mocks globaux
global.crypto = mockCrypto;
global.localStorage = mockLocalStorage;

describe('SecureStorage - Gestion des métadonnées', () => {
  let secureStorage;

  beforeEach(() => {
    secureStorage = new SecureStorage();
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test('stocke et récupère les métadonnées d\'une clé', async () => {
    const keyId = 'test-key';
    const metadata = {
      id: keyId,
      context: keyId,
      algorithm: 'AES-GCM',
      length: 256,
      created: Date.now(),
      lastUsed: Date.now(),
      version: 1
    };

    await secureStorage.storeMetadata(keyId, metadata);
    const retrievedMetadata = await secureStorage.getMetadata(keyId);

    expect(retrievedMetadata).toEqual(metadata);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'liberchat_meta_test-key',
      JSON.stringify(metadata)
    );
  });

  test('retourne null pour des métadonnées inexistantes', async () => {
    const metadata = await secureStorage.getMetadata('inexistant');
    expect(metadata).toBeNull();
  });

  test('liste toutes les clés stockées', async () => {
    // Simuler des clés stockées
    mockLocalStorage.storage['liberchat_secure_key1'] = 'data1';
    mockLocalStorage.storage['liberchat_secure_key2'] = 'data2';
    mockLocalStorage.storage['liberchat_secure_master_key_v1'] = 'master';
    mockLocalStorage.storage['other_data'] = 'other';

    const keys = await secureStorage.listKeys();

    expect(keys).toEqual(['key1', 'key2']);
    expect(keys).not.toContain('master_key_v1'); // La clé maître ne doit pas être listée
  });

  test('met à jour la dernière utilisation lors de la récupération', async () => {
    const keyId = 'test-key';
    const now = Date.now();
    
    // Simuler une clé stockée
    const storedData = {
      encryptedKey: [1, 2, 3],
      iv: [4, 5, 6],
      metadata: {
        id: keyId,
        context: keyId,
        algorithm: 'AES-GCM',
        length: 256,
        created: now - 1000,
        lastUsed: now - 1000,
        version: 1
      }
    };
    
    mockLocalStorage.storage['liberchat_secure_test-key'] = JSON.stringify(storedData);
    mockLocalStorage.storage['liberchat_meta_test-key'] = JSON.stringify(storedData.metadata);

    const key = await secureStorage.retrieveKey(keyId);
    
    expect(key).toBeDefined();
    
    // Vérifier que la dernière utilisation a été mise à jour
    const updatedMetadata = await secureStorage.getMetadata(keyId);
    expect(updatedMetadata.lastUsed).toBeGreaterThan(now - 1000);
  });

  test('calcule les statistiques de stockage', async () => {
    const now = Date.now();
    
    // Simuler plusieurs clés avec métadonnées
    const keys = ['key1', 'key2', 'key3'];
    for (let i = 0; i < keys.length; i++) {
      const keyId = keys[i];
      const metadata = {
        id: keyId,
        context: keyId,
        algorithm: 'AES-GCM',
        length: 256,
        created: now - (i * 1000),
        lastUsed: now - (i * 500),
        version: 1
      };
      
      mockLocalStorage.storage[`liberchat_secure_${keyId}`] = JSON.stringify({ data: 'test' });
      mockLocalStorage.storage[`liberchat_meta_${keyId}`] = JSON.stringify(metadata);
    }

    const stats = await secureStorage.getStorageStats();

    expect(stats.totalKeys).toBe(3);
    expect(stats.storageUsed).toBeGreaterThan(0);
    expect(stats.oldestKey?.id).toBe('key3');
    expect(stats.newestKey?.id).toBe('key1');
    expect(stats.mostUsedKey?.id).toBe('key1');
  });

  test('nettoie les clés expirées', async () => {
    const now = Date.now();
    const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours
    
    // Clé récente (ne doit pas être supprimée)
    const recentKey = {
      id: 'recent',
      context: 'recent',
      algorithm: 'AES-GCM',
      length: 256,
      created: now,
      lastUsed: now,
      version: 1
    };
    
    // Clé expirée (doit être supprimée)
    const expiredKey = {
      id: 'expired',
      context: 'expired',
      algorithm: 'AES-GCM',
      length: 256,
      created: now - EXPIRY_TIME - 1000,
      lastUsed: now - EXPIRY_TIME - 1000,
      version: 1
    };
    
    // Clé globale expirée (ne doit pas être supprimée)
    const globalKey = {
      id: 'global',
      context: 'global',
      algorithm: 'AES-GCM',
      length: 256,
      created: now - EXPIRY_TIME - 1000,
      lastUsed: now - EXPIRY_TIME - 1000,
      version: 1
    };

    // Stocker les clés
    mockLocalStorage.storage['liberchat_secure_recent'] = JSON.stringify({ data: 'recent' });
    mockLocalStorage.storage['liberchat_meta_recent'] = JSON.stringify(recentKey);
    
    mockLocalStorage.storage['liberchat_secure_expired'] = JSON.stringify({ data: 'expired' });
    mockLocalStorage.storage['liberchat_meta_expired'] = JSON.stringify(expiredKey);
    
    mockLocalStorage.storage['liberchat_secure_global'] = JSON.stringify({ data: 'global' });
    mockLocalStorage.storage['liberchat_meta_global'] = JSON.stringify(globalKey);

    await secureStorage.cleanup();

    // Vérifier que seule la clé expirée non-globale a été supprimée
    expect(mockLocalStorage.storage['liberchat_secure_recent']).toBeDefined();
    expect(mockLocalStorage.storage['liberchat_secure_expired']).toBeUndefined();
    expect(mockLocalStorage.storage['liberchat_secure_global']).toBeDefined(); // Clé globale préservée
  });

  test('vérifie l\'intégrité du stockage', async () => {
    // Simuler une clé valide
    const validKeyData = {
      encryptedKey: [1, 2, 3],
      iv: [4, 5, 6],
      metadata: {
        id: 'valid',
        context: 'valid',
        algorithm: 'AES-GCM',
        length: 256,
        created: Date.now(),
        lastUsed: Date.now(),
        version: 1
      }
    };
    
    mockLocalStorage.storage['liberchat_secure_valid'] = JSON.stringify(validKeyData);
    mockLocalStorage.storage['liberchat_meta_valid'] = JSON.stringify(validKeyData.metadata);
    
    // Simuler une clé sans métadonnées
    mockLocalStorage.storage['liberchat_secure_orphan'] = JSON.stringify({ data: 'orphan' });

    const integrity = await secureStorage.verifyIntegrity();

    expect(integrity.valid).toBe(true); // Pas d'erreurs critiques
    expect(integrity.warnings).toContain('Métadonnées manquantes pour la clé orphan');
  });
});

describe('SecureStorage - Export/Import', () => {
  let secureStorage;

  beforeEach(() => {
    secureStorage = new SecureStorage();
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test('exporte et importe les clés', async () => {
    const keyId = 'test-export';
    const mockKey = {
      algorithm: { name: 'AES-GCM' },
      type: 'secret',
      extractable: true,
      usages: ['encrypt', 'decrypt']
    };

    // Stocker une clé
    await secureStorage.storeKey(keyId, mockKey);

    // Exporter
    const exported = await secureStorage.exportKeys();
    
    expect(exported.version).toBe('1.0');
    expect(exported.keys).toHaveLength(1);
    expect(exported.keys[0].context).toBe(keyId);

    // Nettoyer le stockage
    await secureStorage.reset();

    // Importer
    await secureStorage.importKeys(exported);

    // Vérifier que la clé a été importée
    const keys = await secureStorage.listKeys();
    expect(keys).toContain(keyId);
  });
});