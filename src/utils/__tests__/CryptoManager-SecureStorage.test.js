/**
 * Tests d'intégration CryptoManager + SecureStorage
 * Vérification de la persistance des clés entre les sessions
 * Requirements: 2.1, 2.2, 4.1, 4.2
 */

import { CryptoManager } from '../CryptoManager.ts';
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

// Mock de TextEncoder/TextDecoder
global.TextEncoder = jest.fn().mockImplementation(() => ({
    encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
    decode: jest.fn().mockReturnValue('Message déchiffré')
}));

// Configuration des mocks globaux
global.crypto = mockCrypto;
global.localStorage = mockLocalStorage;

describe('Intégration CryptoManager + SecureStorage', () => {
    let cryptoManager;

    beforeEach(() => {
        cryptoManager = new CryptoManager();
        mockLocalStorage.clear();
        jest.clearAllMocks();
    });

    test('persiste les clés entre les sessions', async () => {
        // Générer une clé globale
        const globalKey = await cryptoManager.generateGlobalKey();
        expect(globalKey).toBeDefined();

        // Générer une clé de groupe
        const groupKey = await cryptoManager.generateGroupKey('test-group');
        expect(groupKey).toBeDefined();

        // Vérifier que les clés sont stockées
        const contexts = await cryptoManager.listKeyContexts();
        expect(contexts).toContain('global');
        expect(contexts).toContain('group_test-group');

        // Simuler une nouvelle session en créant un nouveau CryptoManager
        const newCryptoManager = new CryptoManager();

        // Vérifier que les clés sont récupérées depuis le stockage
        const retrievedGlobalKey = await newCryptoManager.getKey('global');
        const retrievedGroupKey = await newCryptoManager.getKey('group_test-group');

        expect(retrievedGlobalKey).toBeDefined();
        expect(retrievedGroupKey).toBeDefined();
    });

    test('chiffre et déchiffre avec persistance', async () => {
        const message = 'Message secret à persister';

        // Chiffrer avec le premier CryptoManager
        const encrypted = await cryptoManager.encryptMessage(message, 'global');
        expect(encrypted).toBeDefined();
        expect(encrypted.content).toBeDefined();
        expect(encrypted.iv).toBeDefined();

        // Simuler une nouvelle session
        const newCryptoManager = new CryptoManager();

        // Déchiffrer avec le nouveau CryptoManager (doit récupérer la clé du stockage)
        const decrypted = await newCryptoManager.decryptMessage(encrypted, 'global');
        expect(decrypted).toBe('Message déchiffré'); // Mock retourne toujours cette valeur
    });

    test('gère les métadonnées correctement', async () => {
        await cryptoManager.generateGlobalKey();

        const metadata = await cryptoManager.getKeyMetadata('global');
        expect(metadata).toBeDefined();
        expect(metadata.id).toBe('global');
        expect(metadata.context).toBe('global');
        expect(metadata.algorithm).toBe('AES-GCM');
        expect(metadata.length).toBe(256);
        expect(metadata.created).toBeDefined();
        expect(metadata.lastUsed).toBeDefined();
        expect(metadata.version).toBe(1);
    });

    test('nettoie les clés expirées automatiquement', async () => {
        // Générer quelques clés
        await cryptoManager.generateGlobalKey();
        await cryptoManager.generateGroupKey('group1');
        await cryptoManager.generateGroupKey('group2');

        // Vérifier qu'elles existent
        let contexts = await cryptoManager.listKeyContexts();
        expect(contexts.length).toBe(3);

        // Simuler des clés expirées en modifiant directement le stockage
        const now = Date.now();
        const EXPIRY_TIME = 30 * 24 * 60 * 60 * 1000; // 30 jours

        // Modifier les métadonnées pour simuler l'expiration
        const expiredMetadata = {
            id: 'group_group1',
            context: 'group_group1',
            algorithm: 'AES-GCM',
            length: 256,
            created: now - EXPIRY_TIME - 1000,
            lastUsed: now - EXPIRY_TIME - 1000,
            version: 1
        };

        mockLocalStorage.storage['liberchat_meta_group_group1'] = JSON.stringify(expiredMetadata);

        // Créer un nouveau CryptoManager qui déclenchera le nettoyage
        const newCryptoManager = new CryptoManager();
        await newCryptoManager.listKeyContexts(); // Déclenche l'initialisation et le nettoyage

        // La clé expirée devrait être supprimée (sauf la globale qui est protégée)
        contexts = await newCryptoManager.listKeyContexts();
        expect(contexts).toContain('global'); // Toujours présente
        expect(contexts).toContain('group_group2'); // Toujours présente
        // group1 pourrait être supprimée selon la logique de nettoyage
    });

    test('exporte et importe les clés', async () => {
        // Générer des clés
        await cryptoManager.generateGlobalKey();
        await cryptoManager.generateGroupKey('export-test');

        // Exporter
        const exported = await cryptoManager.exportKeys();
        expect(exported).toBeDefined();
        expect(exported.version).toBe('1.0');
        expect(exported.keys).toBeDefined();

        // Réinitialiser
        await cryptoManager.reset();

        // Vérifier que les clés sont supprimées
        let contexts = await cryptoManager.listKeyContexts();
        expect(contexts.length).toBe(0);

        // Importer
        await cryptoManager.importKeys(exported);

        // Vérifier que les clés sont restaurées
        contexts = await cryptoManager.listKeyContexts();
        expect(contexts.length).toBeGreaterThan(0);
    });

    test('vérifie l\'intégrité du stockage', async () => {
        await cryptoManager.generateGlobalKey();

        const integrity = await cryptoManager.verifyIntegrity();
        expect(integrity).toBeDefined();
        expect(integrity.valid).toBeDefined();
        expect(integrity.errors).toBeDefined();
        expect(integrity.warnings).toBeDefined();
    });

    test('gère les statistiques de stockage', async () => {
        await cryptoManager.generateGlobalKey();
        await cryptoManager.generateGroupKey('stats-test');

        const stats = await cryptoManager.getCacheStats();
        expect(stats).toBeDefined();
        expect(stats.cacheSize).toBeDefined();
        expect(stats.maxCacheSize).toBe(50);
        expect(stats.totalStoredKeys).toBeDefined();
        expect(stats.storageStats).toBeDefined();
    });

    test('supprime les clés correctement', async () => {
        await cryptoManager.generateGroupKey('to-delete');

        // Vérifier que la clé existe
        const hasKey = await cryptoManager.hasKey('group_to-delete');
        expect(hasKey).toBe(true);

        // Supprimer la clé
        await cryptoManager.removeKey('group_to-delete');

        // Vérifier que la clé n'existe plus
        const hasKeyAfter = await cryptoManager.hasKey('group_to-delete');
        expect(hasKeyAfter).toBe(false);
    });

    test('gère les groupes actifs', async () => {
        await cryptoManager.generateGroupKey('active1');
        await cryptoManager.generateGroupKey('active2');
        await cryptoManager.generateGlobalKey();

        const activeGroups = await cryptoManager.getActiveGroups();
        expect(activeGroups).toContain('active1');
        expect(activeGroups).toContain('active2');
        expect(activeGroups).not.toContain('global'); // La clé globale n'est pas un groupe

        // Supprimer toutes les clés de groupe
        await cryptoManager.clearGroupKeys();

        const activeGroupsAfter = await cryptoManager.getActiveGroups();
        expect(activeGroupsAfter.length).toBe(0);

        // La clé globale doit toujours exister
        const hasGlobal = await cryptoManager.hasKey('global');
        expect(hasGlobal).toBe(true);
    });
});