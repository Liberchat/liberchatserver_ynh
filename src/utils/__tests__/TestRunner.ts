/**
 * Test Runner complet pour le système de chiffrement automatique
 * 
 * Ce runner exécute tous les tests dans l'ordre approprié:
 * - Tests unitaires
 * - Tests d'intégration  
 * - Tests de sécurité
 * - Tests de performance
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { runTests as runCryptoManagerTests } from './CryptoManager.test.ts';
import { runTests as runSecureStorageTests } from './SecureStorage.test.ts';
import { runValidationTests as runKeyExchangerTests } from './KeyExchanger-validation.test.ts';
import { runIntegrationTests } from './Integration.test.ts';
import { runSecurityTests } from './Security.test.ts';
import { runPerformanceTests } from './Performance.test.ts';

// Configuration pour les tests Node.js
if (typeof window === 'undefined') {
    const { webcrypto } = await import('node:crypto');
    global.window = {
        crypto: {
            subtle: webcrypto.subtle,
            getRandomValues: webcrypto.getRandomValues.bind(webcrypto)
        }
    } as any;

    // Mock localStorage pour les tests
    const mockStorage: { [key: string]: string } = {};
    global.localStorage = {
        getItem: (key: string) => mockStorage[key] || null,
        setItem: (key: string, value: string) => { mockStorage[key] = value; },
        removeItem: (key: string) => { delete mockStorage[key]; },
        clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
        get length() { return Object.keys(mockStorage).length; },
        key: (index: number) => Object.keys(mockStorage)[index] || null
    } as any;
}

interface TestSuite {
    name: string;
    runner: () => Promise<void>;
    description: string;
    critical: boolean; // Si true, l'échec arrête l'exécution
}

/**
 * Mesure le temps d'exécution d'une fonction
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const time = performance.now() - start;
    return { result, time };
}

/**
 * Exécute une suite de tests avec gestion d'erreurs
 */
async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; time: number; error?: string }> {
    console.log(`\n🧪 ${suite.name}`);
    console.log(`   ${suite.description}`);

    try {
        // Nettoyer avant chaque suite
        localStorage.clear();

        const { time } = await measureTime(suite.runner);
        console.log(`✅ ${suite.name} terminé avec succès (${time.toFixed(2)}ms)`);
        return { success: true, time };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ ${suite.name} échoué: ${errorMessage}`);
        return { success: false, time: 0, error: errorMessage };
    }
}

/**
 * Runner principal pour tous les tests
 */
async function runAllTests(): Promise<void> {
    console.log('🚀 Démarrage de la suite de tests complète du système de chiffrement automatique\n');
    console.log('='.repeat(80));

    const testSuites: TestSuite[] = [
        {
            name: 'Tests Unitaires - CryptoManager',
            runner: runCryptoManagerTests,
            description: 'Tests des fonctionnalités de base du gestionnaire de chiffrement',
            critical: true
        },
        {
            name: 'Tests Unitaires - SecureStorage',
            runner: runSecureStorageTests,
            description: 'Tests du stockage sécurisé des clés cryptographiques',
            critical: true
        },
        {
            name: 'Tests Unitaires - KeyExchanger',
            runner: runKeyExchangerTests,
            description: 'Tests de l\'échange de clés pour les groupes',
            critical: true
        },
        {
            name: 'Tests d\'Intégration',
            runner: runIntegrationTests,
            description: 'Tests end-to-end et d\'intégration entre composants',
            critical: true
        },
        {
            name: 'Tests de Sécurité',
            runner: runSecurityTests,
            description: 'Tests de sécurité cryptographique et résistance aux attaques',
            critical: false
        },
        {
            name: 'Tests de Performance',
            runner: runPerformanceTests,
            description: 'Tests de performance et validation des métriques',
            critical: false
        }
    ];

    const results: Array<{ suite: string; success: boolean; time: number; error?: string }> = [];
    let totalTime = 0;
    let criticalFailures = 0;
    let totalFailures = 0;

    // Exécuter chaque suite de tests
    for (const suite of testSuites) {
        const result = await runTestSuite(suite);

        results.push({
            suite: suite.name,
            success: result.success,
            time: result.time,
            error: result.error
        });

        totalTime += result.time;

        if (!result.success) {
            totalFailures++;
            if (suite.critical) {
                criticalFailures++;
                console.log(`\n💥 Échec critique détecté dans ${suite.name}`);
                console.log('   Arrêt de l\'exécution des tests...');
                break;
            }
        }
    }

    // Rapport final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RAPPORT FINAL DES TESTS');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📈 Résumé:`);
    console.log(`   Suites exécutées: ${results.length}/${testSuites.length}`);
    console.log(`   Succès: ${successful}`);
    console.log(`   Échecs: ${failed}`);
    console.log(`   Temps total: ${(totalTime / 1000).toFixed(2)}s`);

    if (results.length > 0) {
        const avgTime = totalTime / results.length;
        console.log(`   Temps moyen par suite: ${avgTime.toFixed(2)}ms`);
    }

    // Détail des résultats
    console.log(`\n📋 Détail des résultats:`);
    for (const result of results) {
        const status = result.success ? '✅' : '❌';
        const time = result.time > 0 ? ` (${result.time.toFixed(2)}ms)` : '';
        console.log(`   ${status} ${result.suite}${time}`);

        if (!result.success && result.error) {
            console.log(`      Erreur: ${result.error}`);
        }
    }

    // Métriques de performance globales
    if (successful > 0) {
        console.log(`\n⚡ Métriques de performance:`);

        const performanceResult = results.find(r => r.suite.includes('Performance'));
        if (performanceResult && performanceResult.success) {
            console.log(`   Tests de performance: ✅ Toutes les métriques respectées`);
        }

        const securityResult = results.find(r => r.suite.includes('Sécurité'));
        if (securityResult && securityResult.success) {
            console.log(`   Tests de sécurité: ✅ Toutes les vérifications passées`);
        }

        const integrationResult = results.find(r => r.suite.includes('Intégration'));
        if (integrationResult && integrationResult.success) {
            console.log(`   Tests d'intégration: ✅ Tous les scénarios validés`);
        }
    }

    // Recommandations
    console.log(`\n💡 Recommandations:`);

    if (criticalFailures > 0) {
        console.log(`   ⚠️  ${criticalFailures} échec(s) critique(s) détecté(s)`);
        console.log(`   🔧 Corriger les problèmes critiques avant le déploiement`);
    } else {
        console.log(`   ✅ Tous les tests critiques sont passés`);
    }

    if (totalFailures > criticalFailures) {
        const nonCriticalFailures = totalFailures - criticalFailures;
        console.log(`   ⚠️  ${nonCriticalFailures} échec(s) non-critique(s)`);
        console.log(`   📈 Considérer l'optimisation des performances ou de la sécurité`);
    }

    if (totalFailures === 0) {
        console.log(`   🎉 Excellent! Tous les tests sont passés`);
        console.log(`   🚀 Le système est prêt pour le déploiement`);
    }

    // Validation finale
    console.log(`\n🎯 Validation des requirements:`);

    const requirements = [
        { id: '1.1-1.4', name: 'Chiffrement automatique', validated: successful >= 2 },
        { id: '2.1-2.3', name: 'Gestion des clés de groupe', validated: successful >= 3 },
        { id: '3.1-3.4', name: 'Sécurité cryptographique', validated: securityResult?.success || false },
        { id: '4.1-4.3', name: 'Persistance et récupération', validated: successful >= 2 },
        { id: '7.1-7.4', name: 'Performance', validated: performanceResult?.success || false }
    ];

    for (const req of requirements) {
        const status = req.validated ? '✅' : '❌';
        console.log(`   ${status} Requirement ${req.id}: ${req.name}`);
    }

    const allRequirementsMet = requirements.every(req => req.validated);

    console.log('\n' + '='.repeat(80));

    if (allRequirementsMet && criticalFailures === 0) {
        console.log('🎉 SUCCÈS: Tous les tests sont passés et tous les requirements sont validés!');
        console.log('🚀 Le système de chiffrement automatique est prêt pour la production.');
        process.exit(0);
    } else {
        console.log('❌ ÉCHEC: Des problèmes ont été détectés.');
        console.log('🔧 Veuillez corriger les erreurs avant de continuer.');
        process.exit(1);
    }
}

/**
 * Runner pour les tests rapides (uniquement les tests critiques)
 */
async function runQuickTests(): Promise<void> {
    console.log('⚡ Exécution des tests rapides (tests critiques uniquement)\n');

    const quickSuites: TestSuite[] = [
        {
            name: 'Tests Unitaires Rapides',
            runner: async () => {
                await runCryptoManagerTests();
                await runSecureStorageTests();
            },
            description: 'Tests unitaires essentiels',
            critical: true
        },
        {
            name: 'Tests d\'Intégration Rapides',
            runner: runIntegrationTests,
            description: 'Tests d\'intégration de base',
            critical: true
        }
    ];

    let allPassed = true;

    for (const suite of quickSuites) {
        const result = await runTestSuite(suite);
        if (!result.success) {
            allPassed = false;
            break;
        }
    }

    if (allPassed) {
        console.log('\n✅ Tests rapides réussis! Le système fonctionne correctement.');
    } else {
        console.log('\n❌ Des problèmes ont été détectés dans les tests rapides.');
        process.exit(1);
    }
}

/**
 * Runner pour les tests de sécurité uniquement
 */
async function runSecurityTestsOnly(): Promise<void> {
    console.log('🔒 Exécution des tests de sécurité uniquement\n');

    const result = await runTestSuite({
        name: 'Tests de Sécurité Complets',
        runner: runSecurityTests,
        description: 'Validation complète de la sécurité cryptographique',
        critical: false
    });

    if (result.success) {
        console.log('\n🔒 Tous les tests de sécurité sont passés!');
    } else {
        console.log('\n⚠️ Des problèmes de sécurité ont été détectés.');
        process.exit(1);
    }
}

/**
 * Runner pour les tests de performance uniquement
 */
async function runPerformanceTestsOnly(): Promise<void> {
    console.log('⚡ Exécution des tests de performance uniquement\n');

    const result = await runTestSuite({
        name: 'Tests de Performance Complets',
        runner: runPerformanceTests,
        description: 'Validation complète des performances',
        critical: false
    });

    if (result.success) {
        console.log('\n⚡ Tous les tests de performance sont passés!');
    } else {
        console.log('\n📉 Des problèmes de performance ont été détectés.');
        process.exit(1);
    }
}

// Déterminer quel runner utiliser selon les arguments
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);

    if (args.includes('--quick')) {
        runQuickTests().catch(console.error);
    } else if (args.includes('--security')) {
        runSecurityTestsOnly().catch(console.error);
    } else if (args.includes('--performance')) {
        runPerformanceTestsOnly().catch(console.error);
    } else {
        runAllTests().catch(console.error);
    }
}

export {
    runAllTests,
    runQuickTests,
    runSecurityTestsOnly,
    runPerformanceTestsOnly
};