/**
 * KeyBackupManager - Interface utilisateur pour l'export/import de clés
 * 
 * Ce composant fournit:
 * - Interface pour la sauvegarde des clés cryptographiques
 * - Possibilité de restaurer les clés depuis une sauvegarde
 * - Validation des fichiers de sauvegarde
 * - Gestion sécurisée des opérations d'import/export
 * 
 * Requirements: 4.3, 10.3
 */

import { useState, useRef } from 'react';
import { Download, Upload, Shield, AlertTriangle, CheckCircle, FileText, Key, Clock, X } from 'lucide-react';
import { cryptoManager } from '../utils/CryptoManager';
import type { ExportedKeys } from '../utils/SecureStorage';

interface BackupInfo {
  version: string;
  timestamp: number;
  keyCount: number;
  size: string;
}

interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export function KeyBackupManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupInfo | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportKeys = async () => {
    setIsExporting(true);
    try {
      const exportedKeys = await cryptoManager.exportKeys();
      
      // Créer le fichier de sauvegarde
      const backupData = {
        ...exportedKeys,
        exportedBy: 'LiberChat',
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent.substring(0, 100) // Limité pour la sécurité
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json' 
      });
      
      // Calculer la taille
      const sizeKB = Math.round(blob.size / 1024);
      
      // Créer le lien de téléchargement
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liberchat-keys-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Mettre à jour les informations de sauvegarde
      setLastBackup({
        version: exportedKeys.version,
        timestamp: exportedKeys.timestamp,
        keyCount: exportedKeys.keys.length,
        size: `${sizeKB} KB`
      });

      console.log(`Sauvegarde créée: ${exportedKeys.keys.length} clés exportées`);
    } catch (error) {
      console.error('Erreur lors de l\'export des clés:', error);
      alert('Erreur lors de la création de la sauvegarde. Consultez la console pour plus de détails.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Veuillez sélectionner un fichier JSON de sauvegarde.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backupData = JSON.parse(content);
        
        // Valider la structure du fichier de sauvegarde
        if (!validateBackupFile(backupData)) {
          alert('Le fichier sélectionné n\'est pas une sauvegarde valide de LiberChat.');
          return;
        }

        await importKeys(backupData);
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        alert('Impossible de lire le fichier de sauvegarde. Vérifiez qu\'il s\'agit d\'un fichier JSON valide.');
      }
    };

    reader.readAsText(file);
  };

  const validateBackupFile = (data: any): boolean => {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.timestamp &&
      Array.isArray(data.keys) &&
      data.keys.every((key: any) => 
        key.context && 
        key.keyData && 
        key.metadata &&
        key.metadata.id &&
        key.metadata.algorithm
      )
    );
  };

  const importKeys = async (backupData: ExportedKeys) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      // Demander confirmation à l'utilisateur
      const confirmMessage = `Voulez-vous restaurer ${backupData.keys.length} clés depuis cette sauvegarde ?\n\n` +
        `Version: ${backupData.version}\n` +
        `Date: ${new Date(backupData.timestamp).toLocaleString('fr-FR')}\n\n` +
        `⚠️ Cette opération peut remplacer vos clés existantes.`;

      if (!confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }

      // Effectuer l'import
      await cryptoManager.importKeys(backupData);

      // Simuler le résultat (le CryptoManager ne retourne pas de détails)
      const result: ImportResult = {
        success: true,
        importedCount: backupData.keys.length,
        skippedCount: 0,
        errors: []
      };

      setImportResult(result);
      console.log(`Import terminé: ${result.importedCount} clés importées`);
      
      // Fermer le dialog d'import
      setShowImportDialog(false);
      
    } catch (error) {
      console.error('Erreur lors de l\'import des clés:', error);
      
      const result: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: [error instanceof Error ? error.message : 'Erreur inconnue']
      };
      
      setImportResult(result);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const jsonFile = files.find(file => file.name.endsWith('.json'));
    
    if (jsonFile) {
      handleFileSelect(jsonFile);
    } else {
      alert('Veuillez déposer un fichier JSON de sauvegarde.');
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <Shield className="w-6 h-6 text-green-400" />
        <h3 className="text-xl font-bold">Sauvegarde et Restauration</h3>
      </div>

      {/* Description */}
      <div className="bg-blue-900/20 border border-blue-400/30 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <div className="font-medium text-blue-300 mb-1">À propos des sauvegardes</div>
            <div className="text-sm text-blue-200">
              Les sauvegardes contiennent toutes vos clés de chiffrement dans un format sécurisé. 
              Conservez-les dans un endroit sûr pour pouvoir restaurer vos clés en cas de besoin.
            </div>
          </div>
        </div>
      </div>

      {/* Actions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-400" />
            Créer une Sauvegarde
          </h4>
          
          <p className="text-sm text-gray-300 mb-4">
            Exporte toutes vos clés cryptographiques dans un fichier sécurisé.
          </p>
          
          <button
            onClick={exportKeys}
            disabled={isExporting}
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Export en cours...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Créer la sauvegarde
              </>
            )}
          </button>

          {lastBackup && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Dernière sauvegarde:</div>
              <div className="text-xs space-y-1">
                <div>📅 {formatTimestamp(lastBackup.timestamp)}</div>
                <div>🔑 {lastBackup.keyCount} clés</div>
                <div>📦 {lastBackup.size}</div>
              </div>
            </div>
          )}
        </div>

        {/* Import */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-400" />
            Restaurer une Sauvegarde
          </h4>
          
          <p className="text-sm text-gray-300 mb-4">
            Restaure vos clés depuis un fichier de sauvegarde précédent.
          </p>
          
          <button
            onClick={() => setShowImportDialog(true)}
            disabled={isImporting}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isImporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Restaurer les clés
              </>
            )}
          </button>
        </div>
      </div>

      {/* Résultat de l'import */}
      {importResult && (
        <div className={`p-4 rounded-lg border-l-4 ${
          importResult.success 
            ? 'bg-green-900/20 border-green-400' 
            : 'bg-red-900/20 border-red-400'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {importResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">
              {importResult.success ? 'Import réussi' : 'Erreur lors de l\'import'}
            </span>
          </div>
          
          <div className="text-sm">
            {importResult.success ? (
              <div>
                ✅ {importResult.importedCount} clés importées avec succès
                {importResult.skippedCount > 0 && (
                  <div className="text-yellow-300">
                    ⚠️ {importResult.skippedCount} clés ignorées (déjà existantes)
                  </div>
                )}
              </div>
            ) : (
              <div>
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-red-300">❌ {error}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog d'import */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Sélectionner une Sauvegarde
              </h3>
              <button
                onClick={() => setShowImportDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Zone de drop */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-900/20' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-300 mb-2">
                Glissez votre fichier de sauvegarde ici
              </div>
              <div className="text-xs text-gray-400 mb-4">
                ou cliquez pour sélectionner
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Parcourir les fichiers
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </div>

            {/* Avertissement */}
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-400/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <div className="font-medium mb-1">Attention</div>
                  <div>
                    La restauration peut remplacer vos clés existantes. 
                    Assurez-vous d'avoir une sauvegarde récente avant de continuer.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conseils de sécurité */}
      <div className="bg-gray-700 p-4 rounded-lg">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Key className="w-5 h-5 text-yellow-400" />
          Conseils de Sécurité
        </h4>
        
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2" />
            <div>Conservez vos sauvegardes dans un endroit sûr et accessible uniquement par vous</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2" />
            <div>Créez des sauvegardes régulières, surtout après avoir rejoint de nouveaux groupes</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2" />
            <div>Ne partagez jamais vos fichiers de sauvegarde avec d'autres personnes</div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2" />
            <div>Testez vos sauvegardes périodiquement pour vous assurer qu'elles fonctionnent</div>
          </div>
        </div>
      </div>
    </div>
  );
}