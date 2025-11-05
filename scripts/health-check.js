#!/usr/bin/env node

/**
 * Script de Vérification de Santé
 * Vérifie l'état du système de chiffrement automatique
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class HealthChecker {
  constructor() {
    this.checks = [];
    this.startTime = Date.now();
  }

  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [HEALTH] [${level}] ${message}`);
  }

  async runHealthCheck() {
    await this.log('🏥 Début de la vérification de santé...');
    
    const healthChecks = [
      this.checkServerStatus(),
      this.checkCryptoSystem(),
      this.checkPerformance(),
      this.checkStorage(),
      this.checkLogs(),
      this.checkResources()
    ];
    
    const results = await Promise.all(healthChecks);
    const overallHealth = this.calculateOverallHealth(results);
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      overallHealth: overallHealth,
      checks: results,
      recommendations: this.generateRecommendations(results)
    };
    
    await this.saveHealthReport(report);
    await this.displayResults(report);
    
    return report;
  }

  async checkServerStatus() {
    return new Promise((resolve) => {
      const req = http.get('http://localhost:3000/', (res) => {
        resolve({
          name: 'Statut du serveur',
          status: res.statusCode === 200 ? 'HEALTHY' : 'WARNING',
          message: `HTTP ${res.statusCode}`,
          details: { statusCode: res.statusCode }
        });
      });
      
      req.on('error', () => {
        resolve({
          name: 'Statut du serveur',
          status: 'CRITICAL',
          message: 'Serveur inaccessible',
          details: { error: 'Connection refused' }
        });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          name: 'Statut du serveur',
          status: 'CRITICAL',
          message: 'Timeout de connexion',
          details: { error: 'Timeout' }
        });
      });
    });
  }

  async checkCryptoSystem() {
    try {
      // Vérifier la présence des composants crypto
      const cryptoFiles = [
        'src/utils/CryptoManager.ts',
        'src/utils/SecureStorage.ts',
        'src/utils/KeyExchanger.ts'
      ];
      
      let existingFiles = 0;
      for (const file of cryptoFiles) {
        try {
          await fs.access(path.join(__dirname, '..', file));
          existingFiles++;
        } catch (error) {
          // Fichier manquant
        }
      }
      
      const status = existingFiles === cryptoFiles.length ? 'HEALTHY' : 'WARNING';
      
      return {
        name: 'Système cryptographique',
        status: status,
        message: `${existingFiles}/${cryptoFiles.length} composants présents`,
        details: { 
          totalComponents: cryptoFiles.length,
          existingComponents: existingFiles
        }
      };
    } catch (error) {
      return {
        name: 'Système cryptographique',
        status: 'CRITICAL',
        message: `Erreur: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async checkPerformance() {
    const startTime = Date.now();
    
    // Simulation d'opérations crypto
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const responseTime = Date.now() - startTime;
    const status = responseTime < 100 ? 'HEALTHY' : responseTime < 500 ? 'WARNING' : 'CRITICAL';
    
    return {
      name: 'Performance',
      status: status,
      message: `Temps de réponse: ${responseTime}ms`,
      details: { 
        responseTime: responseTime,
        threshold: { healthy: 100, warning: 500 }
      }
    };
  }

  async checkStorage() {
    try {
      // Vérifier l'espace disque
      const dataDir = path.join(__dirname, '../data');
      const backupDir = path.join(__dirname, '../backups');
      
      let dataSize = 0;
      let backupSize = 0;
      
      try {
        const dataFiles = await fs.readdir(dataDir);
        for (const file of dataFiles) {
          const stat = await fs.stat(path.join(dataDir, file));
          dataSize += stat.size;
        }
      } catch (error) {
        // Répertoire data n'existe pas
      }
      
      try {
        const backupFiles = await fs.readdir(backupDir);
        for (const file of backupFiles) {
          const stat = await fs.stat(path.join(backupDir, file));
          if (stat.isDirectory()) {
            // Calculer la taille du répertoire de sauvegarde
            backupSize += await this.getDirectorySize(path.join(backupDir, file));
          } else {
            backupSize += stat.size;
          }
        }
      } catch (error) {
        // Répertoire backup n'existe pas
      }
      
      const totalSize = dataSize + backupSize;
      const sizeMB = Math.round(totalSize / (1024 * 1024));
      
      const status = sizeMB < 100 ? 'HEALTHY' : sizeMB < 500 ? 'WARNING' : 'CRITICAL';
      
      return {
        name: 'Stockage',
        status: status,
        message: `Utilisation: ${sizeMB}MB`,
        details: {
          dataSize: Math.round(dataSize / (1024 * 1024)),
          backupSize: Math.round(backupSize / (1024 * 1024)),
          totalSize: sizeMB
        }
      };
    } catch (error) {
      return {
        name: 'Stockage',
        status: 'WARNING',
        message: `Erreur de vérification: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async getDirectorySize(dirPath) {
    let size = 0;
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      // Erreur d'accès au répertoire
    }
    return size;
  }

  async checkLogs() {
    try {
      const logsDir = path.join(__dirname, '../logs');
      
      let logFiles = [];
      try {
        logFiles = await fs.readdir(logsDir);
      } catch (error) {
        // Répertoire logs n'existe pas
      }
      
      const recentLogs = [];
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        const stat = await fs.stat(filePath);
        if (stat.mtime.getTime() > oneDayAgo) {
          recentLogs.push(file);
        }
      }
      
      const status = recentLogs.length > 0 ? 'HEALTHY' : 'WARNING';
      
      return {
        name: 'Logs système',
        status: status,
        message: `${recentLogs.length} logs récents`,
        details: {
          totalLogs: logFiles.length,
          recentLogs: recentLogs.length,
          files: recentLogs
        }
      };
    } catch (error) {
      return {
        name: 'Logs système',
        status: 'WARNING',
        message: `Erreur: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async checkResources() {
    try {
      // Vérifier l'utilisation mémoire (simulation)
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / (1024 * 1024));
      
      const status = memoryMB < 100 ? 'HEALTHY' : memoryMB < 200 ? 'WARNING' : 'CRITICAL';
      
      return {
        name: 'Ressources système',
        status: status,
        message: `Mémoire: ${memoryMB}MB`,
        details: {
          heapUsed: memoryMB,
          heapTotal: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
          external: Math.round(memoryUsage.external / (1024 * 1024))
        }
      };
    } catch (error) {
      return {
        name: 'Ressources système',
        status: 'WARNING',
        message: `Erreur: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  calculateOverallHealth(results) {
    const statusPriority = { 'HEALTHY': 0, 'WARNING': 1, 'CRITICAL': 2 };
    const worstStatus = results.reduce((worst, result) => {
      return statusPriority[result.status] > statusPriority[worst] ? result.status : worst;
    }, 'HEALTHY');
    
    return worstStatus;
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    results.forEach(result => {
      switch (result.status) {
        case 'CRITICAL':
          recommendations.push(`🚨 CRITIQUE - ${result.name}: ${result.message}`);
          break;
        case 'WARNING':
          recommendations.push(`⚠️ ATTENTION - ${result.name}: ${result.message}`);
          break;
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Système en bonne santé - aucune action requise');
    }
    
    return recommendations;
  }

  async saveHealthReport(report) {
    const reportFile = path.join(__dirname, '../logs/health-report.json');
    await fs.mkdir(path.dirname(reportFile), { recursive: true });
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  }

  async displayResults(report) {
    const statusEmoji = {
      'HEALTHY': '✅',
      'WARNING': '⚠️',
      'CRITICAL': '🚨'
    };
    
    console.log('\n📊 RAPPORT DE SANTÉ SYSTÈME');
    console.log(`${statusEmoji[report.overallHealth]} État général: ${report.overallHealth}`);
    console.log(`⏱️ Durée de vérification: ${report.duration}ms`);
    
    console.log('\n🔍 Détails des vérifications:');
    report.checks.forEach(check => {
      console.log(`${statusEmoji[check.status]} ${check.name}: ${check.message}`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommandations:');
      report.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
  }
}

async function main() {
  const healthChecker = new HealthChecker();
  
  try {
    const report = await healthChecker.runHealthCheck();
    
    const exitCode = report.overallHealth === 'CRITICAL' ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de santé:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = HealthChecker;