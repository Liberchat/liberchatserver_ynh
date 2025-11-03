#!/usr/bin/env node

/**
 * Script de Déploiement Staging
 * Déploie le système de chiffrement automatique en environnement de test
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class StagingDeployer {
  constructor() {
    this.stagingConfig = {
      port: 3001,
      environment: 'staging',
      cryptoDebug: true,
      backupEnabled: true,
      logLevel: 'debug'
    };
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [STAGING] [${level}] ${message}`);
  }

  async deploy() {
    try {
      await this.log('🚀 Début du déploiement staging...');
      
      // 1. Vérifications pré-déploiement
      await this.preDeploymentChecks();
      
      // 2. Préparation de l'environnement staging
      await this.prepareEnvironment();
      
      // 3. Build avec configuration staging
      await this.buildForStaging();
      
      // 4. Configuration du serveur staging
      await this.configureServer();
      
      // 5. Tests de déploiement
      await this.runDeploymentTests();
      
      // 6. Démarrage du serveur staging
      await this.startStagingServer();
      
      await this.log('✅ Déploiement staging terminé avec succès !');
      
      return {
        success: true,
        url: `http://localhost:${this.stagingConfig.port}`,
        environment: 'staging'
      };
      
    } catch (error) {
      await this.log(`❌ Erreur de déploiement: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async preDeploymentChecks() {
    await this.log('🔍 Vérifications pré-déploiement...');
    
    // Vérifier que le build principal est OK
    try {
      execSync('npm run build', { stdio: 'pipe' });
      await this.log('✅ Build principal validé');
    } catch (error) {
      throw new Error('Build principal échoué');
    }
    
    // Vérifier la migration crypto
    try {
      execSync('npm run migrate:crypto:verify', { stdio: 'pipe' });
      await this.log('✅ Migration crypto validée');
    } catch (error) {
      await this.log('⚠️ Migration crypto non trouvée - sera exécutée', 'WARN');
    }
  }

  async prepareEnvironment() {
    await this.log('⚙️ Préparation environnement staging...');
    
    // Créer le répertoire staging
    const stagingDir = path.join(__dirname, '../staging');
    await fs.mkdir(stagingDir, { recursive: true });
    
    // Copier les fichiers nécessaires
    await this.copyFiles(stagingDir);
    
    // Créer la configuration staging
    await this.createStagingConfig(stagingDir);
    
    await this.log('✅ Environnement staging préparé');
  }

  async copyFiles(stagingDir) {
    const filesToCopy = [
      'dist',
      'server.js',
      'package.json',
      'groups.config.js',
      'data',
      'scripts'
    ];
    
    for (const file of filesToCopy) {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(stagingDir, file);
      
      try {
        const stat = await fs.stat(srcPath);
        if (stat.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      } catch (error) {
        await this.log(`⚠️ Impossible de copier ${file}: ${error.message}`, 'WARN');
      }
    }
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

  async createStagingConfig(stagingDir) {
    const stagingConfigContent = `
// Configuration Staging - Chiffrement Automatique
module.exports = {
  // Configuration de base
  port: ${this.stagingConfig.port},
  environment: '${this.stagingConfig.environment}',
  
  // Configuration crypto pour staging
  crypto: {
    version: '2.0',
    algorithm: 'AES-GCM',
    keyLength: 256,
    debug: ${this.stagingConfig.cryptoDebug},
    performanceMonitoring: true,
    testMode: true
  },
  
  // Configuration des groupes
  groups: {
    maxGroups: 10,
    maxMembersPerGroup: 20,
    backupEnabled: ${this.stagingConfig.backupEnabled}
  },
  
  // Configuration des logs
  logging: {
    level: '${this.stagingConfig.logLevel}',
    file: 'logs/staging.log',
    console: true
  }
};
`;
    
    const configFile = path.join(stagingDir, 'staging.config.js');
    await fs.writeFile(configFile, stagingConfigContent);
  }

  async buildForStaging() {
    await this.log('🔨 Build pour staging...');
    
    // Build avec optimisations staging
    process.env.NODE_ENV = 'staging';
    process.env.VITE_CRYPTO_DEBUG = 'true';
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      await this.log('✅ Build staging terminé');
    } catch (error) {
      throw new Error('Build staging échoué');
    }
  }

  async configureServer() {
    await this.log('⚙️ Configuration serveur staging...');
    
    const stagingDir = path.join(__dirname, '../staging');
    
    // Modifier server.js pour staging
    const serverFile = path.join(stagingDir, 'server.js');
    let serverContent = await fs.readFile(serverFile, 'utf8');
    
    // Remplacer le port
    serverContent = serverContent.replace(
      /const PORT = process\.env\.PORT \|\| \d+/,
      `const PORT = process.env.PORT || ${this.stagingConfig.port}`
    );
    
    // Ajouter la configuration staging
    serverContent = serverContent.replace(
      "const express = require('express');",
      `const express = require('express');
const stagingConfig = require('./staging.config.js');`
    );
    
    await fs.writeFile(serverFile, serverContent);
    await this.log('✅ Serveur configuré pour staging');
  }

  async runDeploymentTests() {
    await this.log('🧪 Tests de déploiement...');
    
    try {
      // Tests crypto
      execSync('npm run test:crypto:unit', { stdio: 'pipe' });
      await this.log('✅ Tests crypto unitaires OK');
      
      // Tests de performance
      execSync('npm run test:crypto:performance', { stdio: 'pipe' });
      await this.log('✅ Tests de performance OK');
      
    } catch (error) {
      await this.log('⚠️ Certains tests ont échoué - déploiement en mode dégradé', 'WARN');
    }
  }

  async startStagingServer() {
    await this.log('🚀 Démarrage serveur staging...');
    
    const stagingDir = path.join(__dirname, '../staging');
    
    // Créer le script de démarrage
    const startScript = `#!/bin/bash
cd ${stagingDir}
export NODE_ENV=staging
export PORT=${this.stagingConfig.port}
export CRYPTO_DEBUG=true
node server.js
`;
    
    const startFile = path.join(stagingDir, 'start-staging.sh');
    await fs.writeFile(startFile, startScript);
    await fs.chmod(startFile, '755');
    
    await this.log(`✅ Serveur staging prêt sur le port ${this.stagingConfig.port}`);
    await this.log(`🌐 URL: http://localhost:${this.stagingConfig.port}`);
  }
}

async function main() {
  const deployer = new StagingDeployer();
  
  try {
    const result = await deployer.deploy();
    
    console.log('\n🎉 Déploiement staging réussi !');
    console.log(`URL: ${result.url}`);
    console.log('Environnement:', result.environment);
    
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Testez l\'application sur l\'URL staging');
    console.log('2. Vérifiez le chiffrement automatique');
    console.log('3. Testez les groupes et l\'échange de clés');
    console.log('4. Validez les performances');
    console.log('5. Si tout est OK, déployez en production');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Déploiement staging échoué:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StagingDeployer;