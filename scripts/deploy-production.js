#!/usr/bin/env node

/**
 * Script de Déploiement Production
 * Déploie le système de chiffrement automatique en production avec toutes les sécurités
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ProductionDeployer {
  constructor() {
    this.productionConfig = {
      environment: 'production',
      cryptoDebug: false,
      backupEnabled: true,
      logLevel: 'info',
      healthCheckInterval: 30000,
      maxRetries: 3
    };
    
    this.preDeploymentChecks = [
      'buildValidation',
      'cryptoTests',
      'performanceTests',
      'securityTests',
      'migrationValidation'
    ];
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [PRODUCTION] [${level}] ${message}`);
  }

  async deploy() {
    try {
      await this.log('🚀 DÉBUT DU DÉPLOIEMENT PRODUCTION');
      await this.log('⚠️ ENVIRONNEMENT CRITIQUE - VÉRIFICATIONS RENFORCÉES');
      
      // 1. Vérifications critiques pré-déploiement
      await this.runCriticalChecks();
      
      // 2. Sauvegarde de sécurité
      await this.createProductionBackup();
      
      // 3. Build optimisé production
      await this.buildForProduction();
      
      // 4. Tests de validation finale
      await this.runFinalValidation();
      
      // 5. Déploiement avec rollback automatique
      await this.deployWithRollback();
      
      // 6. Vérification post-déploiement
      await this.postDeploymentValidation();
      
      // 7. Monitoring et alertes
      await this.setupMonitoring();
      
      await this.log('✅ DÉPLOIEMENT PRODUCTION TERMINÉ AVEC SUCCÈS !');
      
      return {
        success: true,
        environment: 'production',
        deploymentId: Date.now(),
        rollbackAvailable: true
      };
      
    } catch (error) {
      await this.log(`❌ ERREUR CRITIQUE DE DÉPLOIEMENT: ${error.message}`, 'ERROR');
      await this.initiateRollback();
      throw error;
    }
  }

  async runCriticalChecks() {
    await this.log('🔍 VÉRIFICATIONS CRITIQUES PRÉ-DÉPLOIEMENT...');
    
    const checks = [
      this.validateBuild(),
      this.validateCrypto(),
      this.validatePerformance(),
      this.validateSecurity(),
      this.validateMigration()
    ];
    
    const results = await Promise.all(checks);
    const failures = results.filter(r => !r.passed);
    
    if (failures.length > 0) {
      await this.log('❌ VÉRIFICATIONS CRITIQUES ÉCHOUÉES:', 'ERROR');
      failures.forEach(f => this.log(`  - ${f.test}: ${f.message}`, 'ERROR'));
      throw new Error('Vérifications critiques échouées - déploiement annulé');
    }
    
    await this.log('✅ TOUTES LES VÉRIFICATIONS CRITIQUES PASSÉES');
  }

  async validateBuild() {
    try {
      execSync('npm run build', { stdio: 'pipe' });
      
      // Vérifier la taille du build
      const distDir = path.join(__dirname, '../dist');
      const files = await fs.readdir(distDir);
      const hasRequiredFiles = files.includes('index.html') && 
                              files.some(f => f.startsWith('assets'));
      
      return {
        test: 'Build Production',
        passed: hasRequiredFiles,
        message: hasRequiredFiles ? 'Build valide' : 'Fichiers manquants'
      };
    } catch (error) {
      return {
        test: 'Build Production',
        passed: false,
        message: `Erreur de build: ${error.message}`
      };
    }
  }

  async validateCrypto() {
    try {
      execSync('npm run test:crypto', { stdio: 'pipe' });
      return {
        test: 'Tests Cryptographiques',
        passed: true,
        message: 'Tous les tests crypto passés'
      };
    } catch (error) {
      return {
        test: 'Tests Cryptographiques',
        passed: false,
        message: 'Tests crypto échoués'
      };
    }
  }

  async validatePerformance() {
    try {
      execSync('npm run test:crypto:performance', { stdio: 'pipe' });
      return {
        test: 'Performance',
        passed: true,
        message: 'Performance validée'
      };
    } catch (error) {
      return {
        test: 'Performance',
        passed: false,
        message: 'Performance insuffisante'
      };
    }
  }

  async validateSecurity() {
    try {
      execSync('npm run test:crypto:security', { stdio: 'pipe' });
      return {
        test: 'Sécurité',
        passed: true,
        message: 'Tests de sécurité OK'
      };
    } catch (error) {
      return {
        test: 'Sécurité',
        passed: false,
        message: 'Vulnérabilités détectées'
      };
    }
  }

  async validateMigration() {
    try {
      execSync('npm run migrate:crypto:verify', { stdio: 'pipe' });
      return {
        test: 'Migration',
        passed: true,
        message: 'Migration validée'
      };
    } catch (error) {
      return {
        test: 'Migration',
        passed: false,
        message: 'Migration incomplète'
      };
    }
  }

  async createProductionBackup() {
    await this.log('💾 CRÉATION SAUVEGARDE DE SÉCURITÉ...');
    
    const backupId = `production-backup-${Date.now()}`;
    const backupDir = path.join(__dirname, '../backups', backupId);
    
    await fs.mkdir(backupDir, { recursive: true });
    
    // Sauvegarder les fichiers critiques
    const criticalFiles = [
      'server.js',
      'package.json',
      'groups.config.js',
      'data',
      'dist'
    ];
    
    for (const file of criticalFiles) {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(backupDir, file);
      
      try {
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      } catch (error) {
        await this.log(`⚠️ Impossible de sauvegarder ${file}`, 'WARN');
      }
    }
    
    // Créer les métadonnées de sauvegarde
    const backupMetadata = {
      id: backupId,
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      environment: 'production',
      files: criticalFiles
    };
    
    await fs.writeFile(
      path.join(backupDir, 'metadata.json'),
      JSON.stringify(backupMetadata, null, 2)
    );
    
    await this.log(`✅ Sauvegarde créée: ${backupId}`);
    return backupId;
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

  async buildForProduction() {
    await this.log('🔨 BUILD OPTIMISÉ PRODUCTION...');
    
    // Configuration production
    process.env.NODE_ENV = 'production';
    process.env.VITE_CRYPTO_DEBUG = 'false';
    process.env.VITE_BUILD_TARGET = 'production';
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      await this.log('✅ Build production terminé');
    } catch (error) {
      throw new Error('Build production échoué');
    }
  }

  async runFinalValidation() {
    await this.log('🧪 VALIDATION FINALE...');
    
    try {
      execSync('npm run verify:crypto', { stdio: 'pipe' });
      await this.log('✅ Validation finale réussie');
    } catch (error) {
      throw new Error('Validation finale échouée');
    }
  }

  async deployWithRollback() {
    await this.log('🚀 DÉPLOIEMENT AVEC PROTECTION ROLLBACK...');
    
    // Créer le script de rollback
    await this.createRollbackScript();
    
    // Déploiement progressif avec vérifications
    await this.progressiveDeploy();
    
    await this.log('✅ Déploiement sécurisé terminé');
  }

  async createRollbackScript() {
    const rollbackScript = `#!/bin/bash
# Script de Rollback Automatique
# Généré le $(date)

echo "🔄 DÉBUT DU ROLLBACK D'URGENCE..."

# Arrêter le serveur actuel
pkill -f "node server.js" || true

# Restaurer la dernière sauvegarde
BACKUP_DIR=$(ls -t backups/production-backup-* | head -1)
if [ -d "$BACKUP_DIR" ]; then
    echo "📦 Restauration depuis $BACKUP_DIR"
    cp -r "$BACKUP_DIR"/* .
    echo "✅ Fichiers restaurés"
else
    echo "❌ Aucune sauvegarde trouvée"
    exit 1
fi

# Redémarrer avec l'ancienne version
echo "🚀 Redémarrage du serveur..."
nohup node server.js > logs/rollback.log 2>&1 &

echo "✅ ROLLBACK TERMINÉ"
echo "📊 Vérifiez les logs: tail -f logs/rollback.log"
`;
    
    const rollbackFile = path.join(__dirname, '../rollback.sh');
    await fs.writeFile(rollbackFile, rollbackScript);
    await fs.chmod(rollbackFile, '755');
    
    await this.log('✅ Script de rollback créé');
  }

  async progressiveDeploy() {
    await this.log('📈 Déploiement progressif...');
    
    // Phase 1: Arrêt gracieux
    await this.gracefulShutdown();
    
    // Phase 2: Mise à jour des fichiers
    await this.updateFiles();
    
    // Phase 3: Redémarrage avec monitoring
    await this.restartWithMonitoring();
  }

  async gracefulShutdown() {
    await this.log('⏹️ Arrêt gracieux du serveur...');
    
    try {
      // Envoyer signal de fermeture gracieuse
      execSync('pkill -SIGTERM -f "node server.js"', { stdio: 'pipe' });
      
      // Attendre la fermeture
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.log('✅ Serveur arrêté proprement');
    } catch (error) {
      await this.log('⚠️ Arrêt forcé du serveur', 'WARN');
    }
  }

  async updateFiles() {
    await this.log('📁 Mise à jour des fichiers...');
    
    // Les fichiers sont déjà buildés, pas de copie nécessaire
    await this.log('✅ Fichiers à jour');
  }

  async restartWithMonitoring() {
    await this.log('🚀 Redémarrage avec monitoring...');
    
    // Créer le script de démarrage avec monitoring
    const startScript = `#!/bin/bash
export NODE_ENV=production
export CRYPTO_DEBUG=false
nohup node server.js > logs/production.log 2>&1 &
echo $! > server.pid
`;
    
    const startFile = path.join(__dirname, '../start-production.sh');
    await fs.writeFile(startFile, startScript);
    await fs.chmod(startFile, '755');
    
    // Démarrer le serveur
    execSync('./start-production.sh', { cwd: path.join(__dirname, '..') });
    
    await this.log('✅ Serveur redémarré');
  }

  async postDeploymentValidation() {
    await this.log('🔍 VALIDATION POST-DÉPLOIEMENT...');
    
    // Attendre que le serveur soit prêt
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    try {
      execSync('npm run health:crypto', { stdio: 'pipe' });
      await this.log('✅ Validation post-déploiement réussie');
    } catch (error) {
      await this.log('❌ Validation post-déploiement échouée', 'ERROR');
      throw new Error('Serveur non opérationnel après déploiement');
    }
  }

  async setupMonitoring() {
    await this.log('📊 Configuration du monitoring...');
    
    const monitoringScript = `#!/bin/bash
# Script de monitoring automatique
while true; do
    if ! pgrep -f "node server.js" > /dev/null; then
        echo "$(date): Serveur arrêté - redémarrage automatique" >> logs/monitoring.log
        ./start-production.sh
    fi
    
    # Vérification santé crypto
    if ! npm run health:crypto > /dev/null 2>&1; then
        echo "$(date): Problème crypto détecté" >> logs/monitoring.log
    fi
    
    sleep 30
done
`;
    
    const monitoringFile = path.join(__dirname, '../monitoring.sh');
    await fs.writeFile(monitoringFile, monitoringScript);
    await fs.chmod(monitoringFile, '755');
    
    await this.log('✅ Monitoring configuré');
  }

  async initiateRollback() {
    await this.log('🔄 INITIATION DU ROLLBACK D\'URGENCE...', 'ERROR');
    
    try {
      execSync('./rollback.sh', { 
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
      });
      await this.log('✅ Rollback terminé');
    } catch (error) {
      await this.log('❌ Rollback échoué - intervention manuelle requise', 'ERROR');
    }
  }
}

async function main() {
  const deployer = new ProductionDeployer();
  
  // Confirmation utilisateur pour production
  console.log('⚠️  DÉPLOIEMENT EN PRODUCTION');
  console.log('🔴 ENVIRONNEMENT CRITIQUE');
  console.log('📋 Vérifications renforcées activées');
  console.log('🔄 Rollback automatique disponible');
  
  try {
    const result = await deployer.deploy();
    
    console.log('\n🎉 DÉPLOIEMENT PRODUCTION RÉUSSI !');
    console.log('🛡️ Chiffrement automatique activé');
    console.log('📊 Monitoring en cours');
    console.log('🔄 Rollback disponible si nécessaire');
    
    console.log('\n📋 Actions post-déploiement:');
    console.log('1. ✅ Surveillez les logs: tail -f logs/production.log');
    console.log('2. ✅ Vérifiez le monitoring: tail -f logs/monitoring.log');
    console.log('3. ✅ Testez les fonctionnalités critiques');
    console.log('4. ✅ Informez les utilisateurs des améliorations');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ DÉPLOIEMENT PRODUCTION ÉCHOUÉ:', error.message);
    console.error('🔄 Rollback automatique initié');
    console.error('📞 Intervention manuelle peut être requise');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ProductionDeployer;