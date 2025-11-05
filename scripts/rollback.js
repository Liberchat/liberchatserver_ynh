#!/usr/bin/env node

/**
 * Script de Rollback d'Urgence
 * Restaure la version précédente en cas de problème critique
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class EmergencyRollback {
  constructor() {
    this.rollbackId = `rollback-${Date.now()}`;
    this.backupDir = path.join(__dirname, '../backups');
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [ROLLBACK] [${level}] ${message}`);
  }

  async initiateRollback() {
    try {
      await this.log('🚨 DÉBUT DU ROLLBACK D\'URGENCE');
      await this.log('⚠️ RESTAURATION DE LA VERSION PRÉCÉDENTE');
      
      // 1. Arrêt immédiat du serveur actuel
      await this.emergencyShutdown();
      
      // 2. Identification de la dernière sauvegarde valide
      const backupToRestore = await this.findLatestBackup();
      
      // 3. Sauvegarde de l'état actuel (pour debug)
      await this.saveCurrentState();
      
      // 4. Restauration des fichiers
      await this.restoreFromBackup(backupToRestore);
      
      // 5. Vérification de l'intégrité
      await this.verifyRestoration();
      
      // 6. Redémarrage du serveur
      await this.restartServer();
      
      // 7. Validation du rollback
      await this.validateRollback();
      
      await this.log('✅ ROLLBACK TERMINÉ AVEC SUCCÈS');
      
      return {
        success: true,
        rollbackId: this.rollbackId,
        restoredFrom: backupToRestore,
        message: 'Version précédente restaurée'
      };
      
    } catch (error) {
      await this.log(`❌ ERREUR CRITIQUE DE ROLLBACK: ${error.message}`, 'ERROR');
      await this.log('🆘 INTERVENTION MANUELLE REQUISE', 'ERROR');
      throw error;
    }
  }

  async emergencyShutdown() {
    await this.log('⏹️ ARRÊT D\'URGENCE DU SERVEUR...');
    
    try {
      // Arrêt forcé de tous les processus Node.js liés
      execSync('pkill -f "node server.js"', { stdio: 'pipe' });
      
      // Attendre la fermeture
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Vérifier qu'aucun processus ne tourne encore
      try {
        execSync('pgrep -f "node server.js"', { stdio: 'pipe' });
        await this.log('⚠️ Processus encore actifs - arrêt forcé', 'WARN');
        execSync('pkill -9 -f "node server.js"', { stdio: 'pipe' });
      } catch (error) {
        // Aucun processus trouvé - c'est normal
      }
      
      await this.log('✅ Serveur arrêté');
    } catch (error) {
      await this.log('⚠️ Erreur lors de l\'arrêt - continuation du rollback', 'WARN');
    }
  }

  async findLatestBackup() {
    await this.log('🔍 Recherche de la dernière sauvegarde valide...');
    
    try {
      const backupDirs = await fs.readdir(this.backupDir);
      const productionBackups = backupDirs
        .filter(dir => dir.startsWith('production-backup-'))
        .sort()
        .reverse();
      
      if (productionBackups.length === 0) {
        throw new Error('Aucune sauvegarde de production trouvée');
      }
      
      // Vérifier l'intégrité de la sauvegarde la plus récente
      const latestBackup = productionBackups[0];
      const backupPath = path.join(this.backupDir, latestBackup);
      
      await this.verifyBackupIntegrity(backupPath);
      
      await this.log(`✅ Sauvegarde trouvée: ${latestBackup}`);
      return latestBackup;
      
    } catch (error) {
      throw new Error(`Impossible de trouver une sauvegarde valide: ${error.message}`);
    }
  }

  async verifyBackupIntegrity(backupPath) {
    const requiredFiles = ['server.js', 'package.json', 'metadata.json'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(backupPath, file);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Fichier manquant dans la sauvegarde: ${file}`);
      }
    }
    
    // Vérifier les métadonnées
    const metadataPath = path.join(backupPath, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    if (!metadata.timestamp || !metadata.version) {
      throw new Error('Métadonnées de sauvegarde corrompues');
    }
  }

  async saveCurrentState() {
    await this.log('💾 Sauvegarde de l\'état actuel pour debug...');
    
    const debugDir = path.join(this.backupDir, `debug-${this.rollbackId}`);
    await fs.mkdir(debugDir, { recursive: true });
    
    const filesToSave = ['server.js', 'package.json', 'groups.config.js'];
    
    for (const file of filesToSave) {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(debugDir, file);
      
      try {
        await fs.copyFile(srcPath, destPath);
      } catch (error) {
        await this.log(`⚠️ Impossible de sauvegarder ${file} pour debug`, 'WARN');
      }
    }
    
    // Sauvegarder les logs d'erreur
    const errorLog = {
      rollbackId: this.rollbackId,
      timestamp: new Date().toISOString(),
      reason: 'Rollback d\'urgence initié',
      currentVersion: require('../package.json').version
    };
    
    await fs.writeFile(
      path.join(debugDir, 'rollback-info.json'),
      JSON.stringify(errorLog, null, 2)
    );
    
    await this.log('✅ État actuel sauvegardé pour debug');
  }

  async restoreFromBackup(backupName) {
    await this.log('📦 RESTAURATION DEPUIS LA SAUVEGARDE...');
    
    const backupPath = path.join(this.backupDir, backupName);
    const rootPath = path.join(__dirname, '..');
    
    // Lire les métadonnées pour connaître les fichiers à restaurer
    const metadataPath = path.join(backupPath, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    
    for (const file of metadata.files) {
      const srcPath = path.join(backupPath, file);
      const destPath = path.join(rootPath, file);
      
      try {
        const stat = await fs.stat(srcPath);
        
        if (stat.isDirectory()) {
          // Supprimer le répertoire existant et restaurer
          try {
            await fs.rm(destPath, { recursive: true, force: true });
          } catch (error) {
            // Le répertoire n'existe peut-être pas
          }
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
        
        await this.log(`✅ Restauré: ${file}`);
      } catch (error) {
        await this.log(`⚠️ Erreur restauration ${file}: ${error.message}`, 'WARN');
      }
    }
    
    await this.log('✅ Fichiers restaurés depuis la sauvegarde');
  }

  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const files = await fs.readdir(src);
    
    for (const file of files) {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      const stat = await fs.stat(srcFile);
      
      if (stat.isDirectory()) {
        await this.copyDirectory(srcFile, destFile);
      } else {
        await fs.copyFile(srcFile, destFile);
      }
    }
  }

  async verifyRestoration() {
    await this.log('🔍 Vérification de l\'intégrité de la restauration...');
    
    const criticalFiles = ['server.js', 'package.json'];
    
    for (const file of criticalFiles) {
      const filePath = path.join(__dirname, '..', file);
      try {
        await fs.access(filePath);
        await this.log(`✅ Vérifié: ${file}`);
      } catch (error) {
        throw new Error(`Fichier critique manquant après restauration: ${file}`);
      }
    }
    
    // Vérifier que package.json est valide
    try {
      require('../package.json');
      await this.log('✅ package.json valide');
    } catch (error) {
      throw new Error('package.json corrompu après restauration');
    }
  }

  async restartServer() {
    await this.log('🚀 REDÉMARRAGE DU SERVEUR...');
    
    try {
      // Installer les dépendances si nécessaire
      execSync('npm install', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Démarrer le serveur en arrière-plan
      const startCommand = 'nohup node server.js > logs/rollback-server.log 2>&1 &';
      execSync(startCommand, { 
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe'
      });
      
      // Attendre que le serveur démarre
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.log('✅ Serveur redémarré');
    } catch (error) {
      throw new Error(`Impossible de redémarrer le serveur: ${error.message}`);
    }
  }

  async validateRollback() {
    await this.log('🧪 VALIDATION DU ROLLBACK...');
    
    // Vérifier que le serveur répond
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        // Test simple de connectivité
        const http = require('http');
        
        await new Promise((resolve, reject) => {
          const req = http.get('http://localhost:3000/', (res) => {
            if (res.statusCode === 200 || res.statusCode === 404) {
              resolve();
            } else {
              reject(new Error(`Status: ${res.statusCode}`));
            }
          });
          
          req.on('error', reject);
          req.setTimeout(3000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        
        await this.log('✅ Serveur répond correctement');
        break;
        
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error('Serveur ne répond pas après rollback');
        }
        
        await this.log(`⏳ Tentative ${retries}/${maxRetries} - attente...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    await this.log('✅ Rollback validé - serveur opérationnel');
  }

  async generateRollbackReport() {
    const report = {
      rollbackId: this.rollbackId,
      timestamp: new Date().toISOString(),
      success: true,
      restoredVersion: 'Version précédente',
      actions: [
        'Arrêt d\'urgence du serveur',
        'Identification de la sauvegarde',
        'Sauvegarde de l\'état actuel',
        'Restauration des fichiers',
        'Redémarrage du serveur',
        'Validation du rollback'
      ],
      recommendations: [
        'Analysez les logs de debug pour identifier la cause du problème',
        'Testez les corrections avant le prochain déploiement',
        'Vérifiez que tous les services fonctionnent normalement',
        'Informez les utilisateurs si nécessaire'
      ]
    };
    
    const reportFile = path.join(__dirname, '../logs/rollback-report.json');
    await fs.mkdir(path.dirname(reportFile), { recursive: true });
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    return report;
  }
}

async function main() {
  const rollback = new EmergencyRollback();
  
  console.log('🚨 ROLLBACK D\'URGENCE INITIÉ');
  console.log('⚠️ Cette opération va restaurer la version précédente');
  
  try {
    const result = await rollback.initiateRollback();
    const report = await rollback.generateRollbackReport();
    
    console.log('\n✅ ROLLBACK TERMINÉ AVEC SUCCÈS');
    console.log(`🔄 ID du rollback: ${result.rollbackId}`);
    console.log(`📦 Restauré depuis: ${result.restoredFrom}`);
    
    console.log('\n📋 Actions post-rollback:');
    console.log('1. ✅ Vérifiez que l\'application fonctionne');
    console.log('2. 🔍 Analysez les logs de debug');
    console.log('3. 🛠️ Corrigez les problèmes identifiés');
    console.log('4. 📢 Informez les utilisateurs si nécessaire');
    
    console.log('\n📊 Logs disponibles:');
    console.log('- Serveur: logs/rollback-server.log');
    console.log('- Debug: backups/debug-*/');
    console.log('- Rapport: logs/rollback-report.json');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ROLLBACK ÉCHOUÉ:', error.message);
    console.error('🆘 INTERVENTION MANUELLE REQUISE');
    console.error('📞 Contactez l\'équipe technique immédiatement');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EmergencyRollback;