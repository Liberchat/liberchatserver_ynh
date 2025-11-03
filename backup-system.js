import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
const BACKUP_DIR = join(__dirname, 'backups');
const GROUPS_FILE = join(DATA_DIR, 'groups.json');
const MESSAGES_FILE = join(DATA_DIR, 'messages.json');

// Créer les dossiers s'ils n'existent pas
if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

// Fonction de sauvegarde
export const createBackup = () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolder = join(BACKUP_DIR, `backup-${timestamp}`);
    
    mkdirSync(backupFolder, { recursive: true });
    
    // Sauvegarder les groupes
    if (existsSync(GROUPS_FILE)) {
      const groupsData = readFileSync(GROUPS_FILE, 'utf8');
      writeFileSync(join(backupFolder, 'groups.json'), groupsData);
    }
    
    // Sauvegarder les messages
    if (existsSync(MESSAGES_FILE)) {
      const messagesData = readFileSync(MESSAGES_FILE, 'utf8');
      writeFileSync(join(backupFolder, 'messages.json'), messagesData);
    }
    
    // Créer un fichier de métadonnées
    const metadata = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      description: 'Sauvegarde automatique des groupes et messages'
    };
    
    writeFileSync(join(backupFolder, 'metadata.json'), JSON.stringify(metadata, null, 2));
    
    console.log(`Sauvegarde créée: ${backupFolder}`);
    return backupFolder;
  } catch (error) {
    console.error('Erreur lors de la création de la sauvegarde:', error);
    return null;
  }
};

// Fonction de restauration
export const restoreBackup = (backupPath) => {
  try {
    const groupsBackup = join(backupPath, 'groups.json');
    const messagesBackup = join(backupPath, 'messages.json');
    
    if (existsSync(groupsBackup)) {
      const groupsData = readFileSync(groupsBackup, 'utf8');
      writeFileSync(GROUPS_FILE, groupsData);
    }
    
    if (existsSync(messagesBackup)) {
      const messagesData = readFileSync(messagesBackup, 'utf8');
      writeFileSync(MESSAGES_FILE, messagesData);
    }
    
    console.log(`Sauvegarde restaurée depuis: ${backupPath}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la restauration:', error);
    return false;
  }
};

// Nettoyage des anciennes sauvegardes (garde les 10 plus récentes)
export const cleanOldBackups = async () => {
  try {
    if (!existsSync(BACKUP_DIR)) return;
    
    const { readdirSync, rmSync } = await import('fs');
    const backups = readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('backup-'))
      .map(dirent => ({
        name: dirent.name,
        path: join(BACKUP_DIR, dirent.name),
        timestamp: dirent.name.replace('backup-', '')
      }))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    
    // Garder seulement les 10 plus récentes
    const toDelete = backups.slice(10);
    
    for (const backup of toDelete) {
      try {
        rmSync(backup.path, { recursive: true, force: true });
        console.log(`Ancienne sauvegarde supprimée: ${backup.name}`);
      } catch (error) {
        console.error(`Erreur lors de la suppression de ${backup.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des sauvegardes:', error);
  }
};

// Sauvegarde automatique si ce script est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackup();
  await cleanOldBackups();
}