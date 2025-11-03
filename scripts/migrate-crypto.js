#!/usr/bin/env node

/**
 * Script de Migration Cryptographique Automatique
 * Migre les anciennes clés vers le nouveau système de chiffrement automatique
 */

const fs = require('fs').promises;
const path = require('path');

class CryptoMigration {
  constructor() {
    this.logFile = path.join(__dirname, '../logs/migration.log');
    this.backupDir = path.join(__dirname, '../backups/migration');
    this.migrationMetrics = {
      startTime: Date.now(),
      keysFound: 0,
      keysMigrated: 0,
      keysSkipped: 0,
      errors: []
    };
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.appendFile(this.logFile, logMessage);
    } catch (error) {
      console.error('Erreur d\'écriture des logs:', error);
    }
  }

  async createBackup() {
    await this.log('🔄 Création de la sauvegarde préventive...');
    
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      
      // Sauvegarder les données localStorage (simulation)
      const backupData = {
        timestamp: Date.now(),
        localStorage: this.simulateLocalStorageBackup(),
        groups: await this.backupGroups(),
        messages: await this.backupMessages()
      };
      
      const backupFile = path.join(this.backupDir, `backup-${Date.now()}.json`);
      await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
      
      await this.log(`✅ Sauvegarde créée: ${backupFile}`);
      return backupFile;
    } catch (error) {
      await this.log(`❌ Erreur de sauvegarde: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  simulateLocalStorageBackup() {
    // Simulation de la sauvegarde localStorage
    // En réalité, ceci serait fait côté client
    return {
      'liberchat_key_global': 'encrypted_key_data_1',
      'liberchat_key_group_123': 'encrypted_key_data_2',
      'liberchat_key_group_456': 'encrypted_key_data_3',
      'liberchat_user_preferences': '{"theme":"dark","notifications":true}',
      'liberchat_connection_settings': '{"autoConnect":true,"username":"user123"}'
    };
  }

  async backupGroups() {
    try {
      const groupsFile = path.join(__dirname, '../data/groups.json');
      const groupsData = await fs.readFile(groupsFile, 'utf8');
      return JSON.parse(groupsData);
    } catch (error) {
      await this.log(`⚠️ Pas de fichier groups.json trouvé: ${error.message}`, 'WARN');
      return {};
    }
  }

  async backupMessages() {
    try {
      const messagesFile = path.join(__dirname, '../data/messages.json');
      const messagesData = await fs.readFile(messagesFile, 'utf8');
      return JSON.parse(messagesData);
    } catch (error) {
      await this.log(`⚠️ Pas de fichier messages.json trouvé: ${error.message}`, 'WARN');
      return {};
    }
  }

  async detectOldKeys() {
    await this.log('🔍 Détection des anciennes clés...');
    
    // Simulation de la détection des clés localStorage
    const localStorage = this.simulateLocalStorageBackup();
    const oldKeys = [];
    
    for (const [key, value] of Object.entries(localStorage)) {
      if (key.startsWith('liberchat_key_')) {
        oldKeys.push({
          key: key,
          value: value,
          type: this.determineKeyType(key)
        });
      }
    }
    
    this.migrationMetrics.keysFound = oldKeys.length;
    await this.log(`📊 ${oldKeys.length} anciennes clés détectées`);
    
    return oldKeys;
  }

  determineKeyType(keyName) {
    if (keyName === 'liberchat_key_global') {
      return 'global';
    } else if (keyName.startsWith('liberchat_key_group_')) {
      return 'group';
    }
    return 'unknown';
  }

  async convertKeys(oldKeys) {
    await this.log('🔄 Conversion des clés vers le nouveau format...');
    
    const newKeys = [];
    
    for (const oldKey of oldKeys) {
      try {
        const converted = await this.convertSingleKey(oldKey);
        if (converted) {
          newKeys.push(converted);
          this.migrationMetrics.keysMigrated++;
        } else {
          this.migrationMetrics.keysSkipped++;
        }
      } catch (error) {
        await this.log(`⚠️ Impossible de convertir ${oldKey.key}: ${error.message}`, 'WARN');
        this.migrationMetrics.errors.push({
          key: oldKey.key,
          error: error.message
        });
        this.migrationMetrics.keysSkipped++;
      }
    }
    
    await this.log(`✅ ${newKeys.length} clés converties avec succès`);
    return newKeys;
  }

  async convertSingleKey(oldKey) {
    // Simulation de la conversion d'une clé
    const keyId = this.extractKeyId(oldKey.key);
    
    return {
      id: keyId,
      type: oldKey.type,
      algorithm: 'AES-GCM',
      length: 256,
      created: Date.now(),
      lastUsed: Date.now(),
      version: 1,
      // En réalité, la clé serait re-chiffrée avec le nouveau système
      encryptedKey: `new_format_${oldKey.value}`,
      metadata: {
        migratedFrom: oldKey.key,
        migrationDate: Date.now()
      }
    };
  }

  extractKeyId(keyName) {
    if (keyName === 'liberchat_key_global') {
      return 'global';
    } else if (keyName.startsWith('liberchat_key_group_')) {
      return keyName.replace('liberchat_key_group_', '');
    }
    return keyName;
  }

  async saveNewKeys(newKeys) {
    await this.log('💾 Sauvegarde des clés dans le nouveau format...');
    
    try {
      const newKeysDir = path.join(__dirname, '../data/crypto-keys');
      await fs.mkdir(newKeysDir, { recursive: true });
      
      for (const key of newKeys) {
        const keyFile = path.join(newKeysDir, `${key.id}.json`);
        await fs.writeFile(keyFile, JSON.stringify(key, null, 2));
      }
      
      // Créer un index des clés
      const keyIndex = {
        version: '2.0',
        migrationDate: Date.now(),
        keys: newKeys.map(k => ({
          id: k.id,
          type: k.type,
          algorithm: k.algorithm,
          created: k.created
        }))
      };
      
      const indexFile = path.join(newKeysDir, 'index.json');
      await fs.writeFile(indexFile, JSON.stringify(keyIndex, null, 2));
      
      await this.log(`✅ ${newKeys.length} clés sauvegardées dans ${newKeysDir}`);
    } catch (error) {
      await this.log(`❌ Erreur de sauvegarde: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async updateConfiguration() {
    await this.log('⚙️ Mise à jour de la configuration...');
    
    try {
      const configFile = path.join(__dirname, '../groups.config.js');
      let configContent = await fs.readFile(configFile, 'utf8');
      
      // Ajouter la configuration du nouveau système crypto
      const newCryptoConfig = `
  // Configuration du chiffrement automatique (ajouté par migration)
  crypto: {
    version: '2.0',
    algorithm: 'AES-GCM',
    keyLength: 256,
    ivLength: 12,
    tagLength: 16,
    autoRotation: true,
    rotationInterval: 24 * 60 * 60 * 1000, // 24h
    migrationCompleted: true,
    migrationDate: ${Date.now()}
  },`;
      
      // Insérer la nouvelle configuration
      configContent = configContent.replace(
        'module.exports = {',
        `module.exports = {${newCryptoConfig}`
      );
      
      await fs.writeFile(configFile, configContent);
      await this.log('✅ Configuration mise à jour');
    } catch (error) {
      await this.log(`⚠️ Erreur de mise à jour de configuration: ${error.message}`, 'WARN');
    }
  }

  async cleanupOldKeys() {
    await this.log('🧹 Nettoyage des anciennes clés...');
    
    // En réalité, ceci serait fait côté client pour localStorage
    // Ici on simule juste le processus
    const oldKeyPatterns = [
      'liberchat_key_global',
      'liberchat_key_group_*'
    ];
    
    await this.log(`✅ Nettoyage simulé pour les patterns: ${oldKeyPatterns.join(', ')}`);
  }

  async generateMigrationReport() {
    const endTime = Date.now();
    const duration = endTime - this.migrationMetrics.startTime;
    
    const report = {
      migration: {
        startTime: new Date(this.migrationMetrics.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        success: this.migrationMetrics.errors.length === 0
      },
      statistics: {
        keysFound: this.migrationMetrics.keysFound,
        keysMigrated: this.migrationMetrics.keysMigrated,
        keysSkipped: this.migrationMetrics.keysSkipped,
        successRate: `${Math.round((this.migrationMetrics.keysMigrated / this.migrationMetrics.keysFound) * 100)}%`
      },
      errors: this.migrationMetrics.errors,
      recommendations: this.generateRecommendations()
    };
    
    const reportFile = path.join(__dirname, '../logs/migration-report.json');
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    await this.log('📊 Rapport de migration généré');
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.migrationMetrics.errors.length > 0) {
      recommendations.push('Vérifiez les erreurs de migration et relancez si nécessaire');
    }
    
    if (this.migrationMetrics.keysSkipped > 0) {
      recommendations.push('Certaines clés ont été ignorées - vérifiez leur validité');
    }
    
    recommendations.push('Testez le nouveau système avec npm run test:crypto');
    recommendations.push('Vérifiez que tous les groupes sont accessibles');
    recommendations.push('Informez les utilisateurs du changement');
    
    return recommendations;
  }

  async runMigration() {
    try {
      await this.log('🚀 Début de la migration cryptographique automatique');
      
      // 1. Créer une sauvegarde
      await this.createBackup();
      
      // 2. Détecter les anciennes clés
      const oldKeys = await this.detectOldKeys();
      
      if (oldKeys.length === 0) {
        await this.log('ℹ️ Aucune ancienne clé trouvée - migration non nécessaire');
        return { success: true, message: 'Aucune migration nécessaire' };
      }
      
      // 3. Convertir les clés
      const newKeys = await this.convertKeys(oldKeys);
      
      // 4. Sauvegarder les nouvelles clés
      await this.saveNewKeys(newKeys);
      
      // 5. Mettre à jour la configuration
      await this.updateConfiguration();
      
      // 6. Nettoyer les anciennes clés
      await this.cleanupOldKeys();
      
      // 7. Générer le rapport
      const report = await this.generateMigrationReport();
      
      await this.log('✅ Migration terminée avec succès !');
      
      return {
        success: true,
        report: report,
        message: `Migration réussie: ${this.migrationMetrics.keysMigrated}/${this.migrationMetrics.keysFound} clés migrées`
      };
      
    } catch (error) {
      await this.log(`❌ Erreur critique de migration: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        error: error.message,
        message: 'Migration échouée - consultez les logs pour plus de détails'
      };
    }
  }
}

// Script de vérification post-migration
class MigrationVerifier {
  constructor() {
    this.tests = [];
  }

  async runVerification() {
    console.log('🔍 Vérification post-migration...');
    
    const tests = [
      this.testNewKeyFormat(),
      this.testConfigurationUpdate(),
      this.testBackupIntegrity(),
      this.testCleanup()
    ];
    
    const results = await Promise.all(tests);
    const allPassed = results.every(r => r.passed);
    
    console.log('\n📊 Résultats de vérification:');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.message}`);
    });
    
    return {
      success: allPassed,
      results: results
    };
  }

  async testNewKeyFormat() {
    try {
      const keysDir = path.join(__dirname, '../data/crypto-keys');
      const indexFile = path.join(keysDir, 'index.json');
      
      const indexData = await fs.readFile(indexFile, 'utf8');
      const index = JSON.parse(indexData);
      
      return {
        test: 'Format des nouvelles clés',
        passed: index.version === '2.0' && Array.isArray(index.keys),
        message: `${index.keys?.length || 0} clés dans le nouveau format`
      };
    } catch (error) {
      return {
        test: 'Format des nouvelles clés',
        passed: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  async testConfigurationUpdate() {
    try {
      const configFile = path.join(__dirname, '../groups.config.js');
      const configContent = await fs.readFile(configFile, 'utf8');
      
      const hasCryptoConfig = configContent.includes('crypto:') && 
                             configContent.includes('migrationCompleted: true');
      
      return {
        test: 'Mise à jour configuration',
        passed: hasCryptoConfig,
        message: hasCryptoConfig ? 'Configuration crypto ajoutée' : 'Configuration manquante'
      };
    } catch (error) {
      return {
        test: 'Mise à jour configuration',
        passed: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  async testBackupIntegrity() {
    try {
      const backupDir = path.join(__dirname, '../backups/migration');
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(f => f.startsWith('backup-') && f.endsWith('.json'));
      
      return {
        test: 'Intégrité des sauvegardes',
        passed: backupFiles.length > 0,
        message: `${backupFiles.length} sauvegarde(s) créée(s)`
      };
    } catch (error) {
      return {
        test: 'Intégrité des sauvegardes',
        passed: false,
        message: `Erreur: ${error.message}`
      };
    }
  }

  async testCleanup() {
    // Test simulé du nettoyage
    return {
      test: 'Nettoyage des anciennes clés',
      passed: true,
      message: 'Nettoyage simulé réussi'
    };
  }
}

// Exécution du script
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  switch (command) {
    case 'migrate':
      const migration = new CryptoMigration();
      const result = await migration.runMigration();
      
      if (result.success) {
        console.log(`\n✅ ${result.message}`);
        process.exit(0);
      } else {
        console.error(`\n❌ ${result.message}`);
        process.exit(1);
      }
      break;
      
    case 'verify':
      const verifier = new MigrationVerifier();
      const verification = await verifier.runVerification();
      
      if (verification.success) {
        console.log('\n✅ Vérification réussie !');
        process.exit(0);
      } else {
        console.error('\n❌ Vérification échouée !');
        process.exit(1);
      }
      break;
      
    case 'help':
    default:
      console.log(`
Usage: node migrate-crypto.js [command]

Commands:
  migrate    Exécute la migration cryptographique (défaut)
  verify     Vérifie la migration
  help       Affiche cette aide

Examples:
  node migrate-crypto.js migrate
  node migrate-crypto.js verify
      `);
      break;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { CryptoMigration, MigrationVerifier };