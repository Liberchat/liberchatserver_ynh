import 'dotenv/config';
import express from 'express';
import { createServer } from 'http'; // Remplacer par https avec certificat pour prod
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import xss from 'xss';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Winston/logging désactivé pour confidentialité totale
const logger = { info: () => { }, error: () => { }, warn: () => { }, debug: () => { } };

const app = express();

// Helmet pour sécuriser les headers HTTP
const allowedDomains = (process.env.ALLOWED_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);
const onionDomains = allowedDomains.filter(d => d.includes('.onion'));
const localDomains = allowedDomains.filter(d => /^(http:\/\/)?(\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(d));

// Détection automatique du domaine pour YunoHost et autres déploiements
const getOriginFromRequest = (req) => {
  const host = req.get('host');
  const protocol = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'http');
  return host ? `${protocol}://${host}` : null;
};
const defaultCsp = {
  defaultSrc: ["'self'"],
  mediaSrc: ["'self'", "data:", "blob:"],
  imgSrc: ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://emoji-cdn.jsdelivr.net", "https://cdn.jsdelivr.net/npm/emoji-picker-react@*"],
  scriptSrc: ["'self'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: ["'self'", "ws://localhost:3000", "wss://liberchat-3-0-1.onrender.com", "wss://liberchat.onrender.com", "wss://*", "ws://*"],
  frameSrc: ["*"]
};
defaultCsp.workerSrc = ["'self'"];
if (allowedDomains.length > 0) {
  defaultCsp.connectSrc = defaultCsp.connectSrc.concat(allowedDomains);
  defaultCsp.imgSrc = defaultCsp.imgSrc.concat(allowedDomains);
  defaultCsp.frameSrc = defaultCsp.frameSrc.concat(allowedDomains);
  defaultCsp.workerSrc = defaultCsp.workerSrc.concat(allowedDomains);
}
// Ajout automatique des .onion et IP locales pour union
if (onionDomains.length > 0) {
  defaultCsp.connectSrc = defaultCsp.connectSrc.concat(onionDomains);
  defaultCsp.imgSrc = defaultCsp.imgSrc.concat(onionDomains);
  defaultCsp.frameSrc = defaultCsp.frameSrc.concat(onionDomains);
  defaultCsp.workerSrc = defaultCsp.workerSrc.concat(onionDomains);
}
if (localDomains.length > 0) {
  defaultCsp.connectSrc = defaultCsp.connectSrc.concat(localDomains);
  defaultCsp.imgSrc = defaultCsp.imgSrc.concat(localDomains);
  defaultCsp.frameSrc = defaultCsp.frameSrc.concat(localDomains);
  defaultCsp.workerSrc = defaultCsp.workerSrc.concat(localDomains);
}
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: defaultCsp,
    },
  })
);

// Configuration trust proxy pour YunoHost/Nginx
app.set('trust proxy', 1);

// Détection du chemin de base pour YunoHost (ex: /liberchat)
const basePath = process.env.YNH_APP_ARG_PATH || '';
console.log('Base path détecté:', basePath);
console.log('Variables d\'environnement:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
  YNH_APP_ARG_PATH: process.env.YNH_APP_ARG_PATH,
  MAX_MESSAGES: process.env.MAX_MESSAGES,
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
  PING_TIMEOUT: process.env.PING_TIMEOUT,
  PING_INTERVAL: process.env.PING_INTERVAL
});

// Limiteur de requêtes désactivé pour YunoHost (Nginx gère déjà)
// const limiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 100 });
// app.use(limiter);

// CORS : autorise tous les domaines déclarés, .onion, IP locales, union + détection auto
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://liberchat-3-0-1.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://liberchat.onrender.com',
      'capacitor://localhost',
      'http://localhost',
      ...allowedDomains,
      ...onionDomains,
      ...localDomains
    ];

    // Autorise les requêtes sans origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Autorise si dans la liste
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Autorise tous les domaines HTTPS (pour YunoHost et autres déploiements)
    if (origin.startsWith('https://')) return callback(null, true);

    // Autorise localhost sur n'importe quel port
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) return callback(null, true);

    callback(new Error('Non autorisé par CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = createServer(app);

const io = new Server(server, {
  path: basePath ? `${basePath}/socket.io/` : '/socket.io/',
  serveClient: false,
  pingTimeout: parseInt(process.env.PING_TIMEOUT) || 60000,
  pingInterval: parseInt(process.env.PING_INTERVAL) || 25000,
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://liberchat-3-0-1.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://liberchat.onrender.com',
        'capacitor://localhost',
        'http://localhost',
        ...allowedDomains,
        ...onionDomains,
        ...localDomains
      ];

      // Autorise les requêtes sans origin
      if (!origin) return callback(null, true);

      // Autorise si dans la liste
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Autorise tous les domaines HTTPS (pour YunoHost et autres déploiements)
      if (origin.startsWith('https://')) return callback(null, true);

      // Autorise localhost sur n'importe quel port
      if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) return callback(null, true);

      callback(null, true); // Plus permissif pour Socket.IO
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Servir les fichiers statiques avec le bon chemin de base
const distPath = join(__dirname, 'dist');
if (basePath) {
  app.use(basePath, express.static(distPath));
  // Servir aussi sur la racine pour compatibilité avec proxy Nginx
  app.use('/', express.static(distPath));
} else {
  app.use(express.static(distPath));
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes API pour les groupes
app.get(`${basePath}/api/groups`, (req, res) => {
  const groupsList = Array.from(groups.values()).map(group => 
    groupUtils.formatGroupForAPI(group)
  );
  res.json(groupsList);
});

app.post(`${basePath}/api/groups`, express.json(), (req, res) => {
  const { name, creatorUsername } = req.body;
  
  // Validation du nom avec la configuration
  const validation = validateGroupName(name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const groupId = groupUtils.generateGroupId(groups);
  const newGroup = {
    id: groupId,
    name: xss(name.trim()),
    members: new Set(),
    messages: [],
    createdAt: Date.now(),
    createdBy: creatorUsername
  };
  
  groups.set(groupId, newGroup);
  saveData();
  
  res.json(groupUtils.formatGroupForAPI(newGroup));
});

// Route pour créer une sauvegarde manuelle
app.post(`${basePath}/api/backup`, (req, res) => {
  try {
    const backupPath = createBackup();
    if (backupPath) {
      res.json({ 
        success: true, 
        message: 'Sauvegarde créée avec succès',
        backupPath: backupPath.split('/').pop() // Retourner seulement le nom du dossier
      });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde' });
  }
});

// Route pour obtenir les statistiques
app.get(`${basePath}/api/stats`, (req, res) => {
  const stats = {
    totalGroups: groups.size,
    totalMessages: messages.length,
    connectedUsers: users.size,
    groupsWithMessages: Array.from(groups.values()).filter(g => g.messages.length > 0).length,
    lastBackup: new Date().toISOString() // Approximation
  };
  res.json(stats);
});

// Routes API pour l'échange de clés sécurisé
app.post(`${basePath}/api/keys/register`, express.json(), (req, res) => {
  const { userId, publicKey } = req.body;
  
  if (!userId || !publicKey) {
    return res.status(400).json({ error: 'userId et publicKey requis' });
  }

  const success = keyExchangeService.registerPublicKey(userId, publicKey, req.ip);
  
  if (success) {
    res.json({ success: true, message: 'Clé publique enregistrée' });
  } else {
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la clé' });
  }
});

app.get(`${basePath}/api/keys/public/:userId`, (req, res) => {
  const { userId } = req.params;
  const publicKey = keyExchangeService.getPublicKey(userId);
  
  if (publicKey) {
    res.json({ publicKey });
  } else {
    res.status(404).json({ error: 'Clé publique non trouvée' });
  }
});

app.get(`${basePath}/api/keys/public`, (req, res) => {
  const { exclude } = req.query;
  const publicKeys = keyExchangeService.getAllPublicKeys(exclude);
  res.json({ publicKeys });
});

app.post(`${basePath}/api/keys/group`, express.json(), (req, res) => {
  const { groupId, groupKeyData, creatorId } = req.body;
  
  if (!groupId || !groupKeyData || !creatorId) {
    return res.status(400).json({ error: 'groupId, groupKeyData et creatorId requis' });
  }

  const success = keyExchangeService.registerGroupKey(groupId, groupKeyData, creatorId);
  
  if (success) {
    res.json({ success: true, message: 'Clé de groupe enregistrée' });
  } else {
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de la clé de groupe' });
  }
});

app.get(`${basePath}/api/keys/group/:groupId/:userId`, (req, res) => {
  const { groupId, userId } = req.params;
  const groupKeyData = keyExchangeService.getGroupKey(groupId, userId);
  
  if (groupKeyData) {
    res.json({ groupKeyData });
  } else {
    res.status(404).json({ error: 'Clé de groupe non trouvée ou accès non autorisé' });
  }
});

app.get(`${basePath}/api/keys/audit`, (req, res) => {
  const filter = {
    userId: req.query.userId,
    groupId: req.query.groupId,
    action: req.query.action,
    since: req.query.since ? parseInt(req.query.since) : undefined
  };
  
  const auditLog = keyExchangeService.getAuditLog(filter);
  res.json({ auditLog });
});

// Route pour récupérer les métadonnées d'un lien (titre, description, image)
app.get(`${basePath}/api/link-preview`, async (req, res) => {
  const url = req.query.url;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL manquante' });
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': url
      },
      redirect: 'follow'
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const title = doc.querySelector('title')?.textContent || url;
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    let imageRaw = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    // Si pas d'og:image, chercher la première image significative de la page
    if (!imageRaw) {
      const imgs = Array.from(doc.querySelectorAll('img'));
      // Filtrer les images trop petites ou typiquement des logos/icônes
      const imgCandidate = imgs.find(img => {
        const src = img.getAttribute('src') || '';
        if (!src) return false;
        if (/logo|icon|favicon|sprite|blank|pixel/i.test(src)) return false;
        // Optionnel : ignorer les images trop petites (si width/height dispo)
        const w = parseInt(img.getAttribute('width') || '0', 10);
        const h = parseInt(img.getAttribute('height') || '0', 10);
        if ((w && w < 64) || (h && h < 64)) return false;
        return true;
      });
      if (imgCandidate) imageRaw = imgCandidate.getAttribute('src') || '';
    }
    let image = imageRaw;
    try {
      if (imageRaw && !/^https?:\/\//i.test(imageRaw)) {
        const u = new URL(url);
        image = u.origin + (imageRaw.startsWith('/') ? imageRaw : '/' + imageRaw);
      }
    } catch { }
    // Image par défaut si rien trouvé
    if (!image) image = '/liberchat-logo.svg';
    res.json({ title, description, image });
  } catch (e) {
    res.status(500).json({ error: 'Impossible de récupérer le lien' });
  }
});

// Routes API aussi sur la racine pour compatibilité proxy
if (basePath) {
  app.get('/api/groups', (req, res) => {
    const groupsList = Array.from(groups.entries()).map(([id, group]) => ({
      id,
      name: group.name,
      memberCount: group.members.size,
      createdAt: group.createdAt,
      createdBy: group.createdBy
    }));
    res.json(groupsList);
  });

  app.post('/api/groups', express.json(), (req, res) => {
    const { name, creatorUsername } = req.body;
    
    if (!name || name.length < 3 || name.length > 50) {
      return res.status(400).json({ error: 'Le nom du groupe doit contenir entre 3 et 50 caractères' });
    }
    
    const groupId = nextGroupId++;
    const newGroup = {
      id: groupId,
      name: xss(name),
      members: new Set(),
      messages: [],
      createdAt: Date.now(),
      createdBy: creatorUsername
    };
    
    groups.set(groupId, newGroup);
    saveData();
    
    res.json({ id: groupId, name: newGroup.name });
  });

  app.get('/api/link-preview', async (req, res) => {
    const url = req.query.url;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'URL manquante' });
    // SSRF protection: validate the URL before proceeding
    try {
      // Reject non-HTTP(S) protocol
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (e) {
        return res.status(400).json({ error: 'URL invalide' });
      }
      if (!/^https?:$/i.test(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Seules les URLs http(s) sont autorisées' });
      }
      // Disallow localhost, loopback, or private IPs/domains
      const net = await import('net');
      const dns = await import('dns').then(mod => mod.promises);
      const hostname = parsedUrl.hostname;
      // Forbid localhost and obvious local patterns
      const forbiddenHosts = ['localhost', '127.0.0.1', '::1'];
      if (forbiddenHosts.includes(hostname) || hostname.endsWith('.local')) {
        return res.status(400).json({ error: 'Hôte non autorisé' });
      }
      // Attempt DNS resolution to IP to check private ranges
      let addresses = [];
      try {
        addresses = await dns.lookup(hostname, { all: true });
      } catch (e) {
        return res.status(400).json({ error: 'Hôte introuvable' });
      }
      // Check if any IP address is private/reserved
      for (const addr of addresses) {
        if (net.isIP(addr.address)) {
          // IPv4 Private Ranges
          if (
            addr.address.startsWith('10.') ||
            addr.address.startsWith('192.168.') ||
            (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr.address)) ||
            addr.address === '127.0.0.1'
          ) {
            return res.status(400).json({ error: 'Accès à des adresses privées interdit' });
          }
          // IPv6 local/loopback
          if (addr.address === '::1' || addr.address.startsWith('fe80:') || addr.address.startsWith('fc') || addr.address.startsWith('fd')) {
            return res.status(400).json({ error: 'Accès à des adresses locales interdit' });
          }
        }
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': url
        },
        redirect: 'follow'
      });
      const html = await response.text();
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const title = doc.querySelector('title')?.textContent || url;
      const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      let imageRaw = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      if (!imageRaw) {
        const imgs = Array.from(doc.querySelectorAll('img'));
        const imgCandidate = imgs.find(img => {
          const src = img.getAttribute('src') || '';
          if (!src) return false;
          if (/logo|icon|favicon|sprite|blank|pixel/i.test(src)) return false;
          const w = parseInt(img.getAttribute('width') || '0', 10);
          const h = parseInt(img.getAttribute('height') || '0', 10);
          if ((w && w < 64) || (h && h < 64)) return false;
          return true;
        });
        if (imgCandidate) imageRaw = imgCandidate.getAttribute('src') || '';
      }
      let image = imageRaw;
      try {
        if (imageRaw && !/^https?:\/\//i.test(imageRaw)) {
          const u = new URL(url);
          image = u.origin + (imageRaw.startsWith('/') ? imageRaw : '/' + imageRaw);
        }
      } catch {}
      if (!image) image = '/liberchat-logo.svg';
      res.json({ title, description, image });
    } catch (e) {
      res.status(500).json({ error: 'Impossible de récupérer le lien' });
    }
  });

}

// Routes API toujours disponibles (avec ou sans basePath)
app.get('/api/stats', (req, res) => {
  const stats = {
    totalGroups: groups.size,
    totalMessages: messages.length,
    connectedUsers: users.size,
    groupsWithMessages: Array.from(groups.values()).filter(g => g.messages.length > 0).length,
    lastBackup: new Date().toISOString() // Approximation
  };
  res.json(stats);
});

app.post('/api/backup', (req, res) => {
  try {
    const backupPath = createBackup();
    if (backupPath) {
      res.json({ 
        success: true, 
        message: 'Sauvegarde créée avec succès',
        backupPath: backupPath.split('/').pop() // Retourner seulement le nom du dossier
      });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la sauvegarde' });
  }
});

// Route catch-all pour SPA
// Define rate limiter for static file routes
const staticFileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

if (basePath) {
  app.get(`${basePath}/*`, staticFileLimiter, (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
  app.get(`${basePath}`, staticFileLimiter, (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
} else {
  app.get('*', staticFileLimiter, (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

const users = new Map();
const usersByName = new Map();
const messages = [];
const MAX_MESSAGES = parseInt(process.env.MAX_MESSAGES) || 100;
let nextMessageId = 1;

// Système de groupes
const groups = new Map(); // groupId -> { name, members: Set, messages: [], createdAt, createdBy }
const userGroups = new Map(); // socketId -> Set of groupIds
let nextGroupId = 1;

// Sauvegarde des données
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join as pathJoin } from 'path';

const DATA_DIR = pathJoin(__dirname, 'data');
const GROUPS_FILE = pathJoin(DATA_DIR, 'groups.json');
const MESSAGES_FILE = pathJoin(DATA_DIR, 'messages.json');

// Créer le dossier data s'il n'existe pas
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Charger les données sauvegardées
const loadData = () => {
  try {
    if (existsSync(GROUPS_FILE)) {
      const groupsData = JSON.parse(readFileSync(GROUPS_FILE, 'utf8'));
      groupsData.forEach(group => {
        groups.set(group.id, {
          ...group,
          members: new Set(group.members)
        });
      });
      nextGroupId = Math.max(...Array.from(groups.keys()), 0) + 1;
    }
    
    if (existsSync(MESSAGES_FILE)) {
      const messagesData = JSON.parse(readFileSync(MESSAGES_FILE, 'utf8'));
      messages.push(...messagesData.messages);
      nextMessageId = messagesData.nextMessageId || 1;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
  }
};

// Sauvegarder les données
const saveData = () => {
  try {
    const groupsData = Array.from(groups.entries()).map(([id, group]) => ({
      ...group,
      members: Array.from(group.members)
    }));
    
    writeFileSync(GROUPS_FILE, JSON.stringify(groupsData, null, 2));
    writeFileSync(MESSAGES_FILE, JSON.stringify({
      messages: messages.slice(-MAX_MESSAGES),
      nextMessageId
    }, null, 2));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
  }
};

// Charger les données au démarrage
loadData();

// Sauvegarde automatique toutes les 5 minutes
setInterval(saveData, 5 * 60 * 1000);

// Système de sauvegarde avancé
import { createBackup, cleanOldBackups } from './backup-system.js';
import { GROUPS_CONFIG, validateGroupName, groupUtils } from './groups.config.js';
import { keyExchangeService } from './key-exchange-service.js';

// Sauvegarde complète toutes les heures
setInterval(() => {
  createBackup();
  cleanOldBackups();
}, 60 * 60 * 1000);

// Sauvegarde au démarrage
createBackup();

const cleanOldMessages = () => {
  if (messages.length > MAX_MESSAGES) {
    messages.splice(0, messages.length - MAX_MESSAGES);
  }
};
setInterval(cleanOldMessages, 300000);

const validateUsername = (username) => {
  if (!username || username.length < 3 || username.length > 20) {
    throw new Error('Username must be between 3 and 20 characters');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }
};

io.engine.on("connection_error", (err) => {
  console.error('Erreur de connexion Socket.IO:', err);
  logger.error('Erreur de connexion Socket.IO:', err);
});

io.on('connection', (socket) => {
  console.log('Nouvelle connexion socket:', socket.id);
  logger.info('Nouvelle connexion:', socket.id);

  socket.on('reconnect_attempt', () => {
    console.log('Tentative de reconnexion:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Erreur socket:', error);
    logger.error('Socket error:', error);
  });

  socket.on('register', (username) => {
    try {
      validateUsername(username);

      if (usersByName.has(username)) {
        socket.emit('registrationError', 'Ce nom est déjà pris');
        return;
      }

      const user = { username, socketId: socket.id, isInCall: false };
      users.set(socket.id, user);
      usersByName.set(username, socket.id);

      // Correction : inclure les réactions dans les messages envoyés à l'init
      socket.emit('init', {
        messages: messages.slice(-50).map(m => ({ ...m, reactions: m.reactions || {} })),
        users: Array.from(users.values())
      });

      socket.broadcast.emit('userJoined', username);
      io.emit('users', Array.from(users.values()));

      logger.info(`Utilisateur enregistré: ${encodeURIComponent(username)}`);
    } catch (error) {
      logger.error(`Erreur d'enregistrement pour ${encodeURIComponent(username)}:`, error);
      socket.emit('registrationError', error.message);
    }
  });

  // Événements pour l'échange de clés sécurisé
  socket.on('register_public_key', (data) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit('key_error', 'Utilisateur non authentifié');
        return;
      }

      const { publicKey } = data;
      const success = keyExchangeService.registerPublicKey(user.username, publicKey, socket.id);
      
      if (success) {
        socket.emit('public_key_registered', { success: true });
        
        // Notifier les autres utilisateurs qu'une nouvelle clé est disponible
        socket.broadcast.emit('new_public_key_available', { 
          userId: user.username,
          publicKey 
        });
      } else {
        socket.emit('key_error', 'Erreur lors de l\'enregistrement de la clé publique');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la clé publique:', error);
      socket.emit('key_error', 'Erreur serveur lors de l\'enregistrement de la clé');
    }
  });

  socket.on('request_public_keys', () => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit('key_error', 'Utilisateur non authentifié');
        return;
      }

      const publicKeys = keyExchangeService.getAllPublicKeys(user.username);
      socket.emit('public_keys_response', { publicKeys });
    } catch (error) {
      console.error('Erreur lors de la récupération des clés publiques:', error);
      socket.emit('key_error', 'Erreur lors de la récupération des clés publiques');
    }
  });

  socket.on('register_group_key', (data) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit('key_error', 'Utilisateur non authentifié');
        return;
      }

      const { groupId, groupKeyData } = data;
      const success = keyExchangeService.registerGroupKey(groupId, groupKeyData, user.username);
      
      if (success) {
        socket.emit('group_key_registered', { success: true, groupId });
        
        // Notifier les membres du groupe
        groupKeyData.authorizedUsers.forEach(userId => {
          const userSocketId = usersByName.get(userId);
          if (userSocketId && userSocketId !== socket.id) {
            io.to(userSocketId).emit('new_group_key_available', { 
              groupId,
              groupKeyData 
            });
          }
        });
      } else {
        socket.emit('key_error', 'Erreur lors de l\'enregistrement de la clé de groupe');
      }
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la clé de groupe:', error);
      socket.emit('key_error', 'Erreur serveur lors de l\'enregistrement de la clé de groupe');
    }
  });

  socket.on('request_group_key', (data) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit('key_error', 'Utilisateur non authentifié');
        return;
      }

      const { groupId } = data;
      const groupKeyData = keyExchangeService.getGroupKey(groupId, user.username);
      
      if (groupKeyData) {
        socket.emit('group_key_response', { groupId, groupKeyData });
      } else {
        socket.emit('key_error', 'Clé de groupe non trouvée ou accès non autorisé');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la clé de groupe:', error);
      socket.emit('key_error', 'Erreur lors de la récupération de la clé de groupe');
    }
  });

  socket.on('disconnect', (reason) => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      usersByName.delete(user.username);
      io.emit('userLeft', user.username);
      io.emit('users', Array.from(users.values()));
      console.log('Utilisateur déconnecté:', encodeURIComponent(user.username));
    }
  });

  // Gestion des messages texte avec nettoyage XSS
  socket.on('chat message', (message) => {
    try {
      const user = users.get(socket.id);
      if (!user) return;

      // Validation de base du message
      if (!message || (typeof message !== 'object' && typeof message !== 'string')) {
        console.error('Message invalide reçu:', typeof message);
        return;
      }

      // Si le message est une chaîne JSON, on le parse
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch (e) {
          logger.error('Erreur de parsing JSON:', e);
          console.error('Erreur de parsing JSON:', e);
          return;
        }
      }

      // Validation des propriétés requises
      if (!message.type) {
        console.error('Message manque du type:', message);
        return;
      }

      // Ajouter timestamp si manquant
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      message.username = user.username;
      message.id = nextMessageId++;

      if (message.type === 'text') {
        if (!message.content || typeof message.content !== 'string') {
          console.error('Contenu de message texte invalide');
          return;
        }
        // Ne pas appliquer XSS sur les messages chiffrés (JSON)
        if (!message.content.trim().startsWith('{')) {
          message.content = xss(message.content);
        }
      } else if (message.type === 'file') {
        if (!message.fileData) {
          console.error('Données de fichier manquantes');
          return;
        }
        // Vérification de la taille du fichier
        const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE) || 50) * 1024 * 1024;
        if (message.fileData.length > maxFileSize) {
          socket.emit('error', `Fichier trop volumineux (max ${Math.floor(maxFileSize / 1024 / 1024)}MB)`);
          return;
        }
        // Vérification du type de fichier
        const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        if (message.fileType && !allowedTypes.includes(message.fileType)) {
          socket.emit('error', 'Type de fichier non autorisé');
          return;
        }
        // Nettoyage XSS du nom de fichier
        message.fileName = message.fileName ? xss(message.fileName) : undefined;
      }

      messages.push(message);
      io.emit('chat message', message);
      logger.info(`Message ${message.type} reçu de ${encodeURIComponent(user.username)}`);
    } catch (error) {
      console.error('Erreur lors du traitement du message:', error);
      socket.emit('error', 'Erreur lors du traitement du message');
    }
  });

  // Suppression sécurisée d'un message
  socket.on('delete message', ({ id }) => {
    const user = users.get(socket.id);
    console.log('[SUPPRESSION] Demande de suppression id:', id, 'par', user?.username);
    if (!user || !id) return;
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) {
      console.log('[SUPPRESSION] Message non trouvé pour id:', id);
      return;
    }
    if (messages[msgIndex].username !== user.username) {
      console.log('[SUPPRESSION] Refusé :', user.username, 'n\'est pas l\'auteur du message', id);
      return;
    }
    messages.splice(msgIndex, 1);
    io.emit('message deleted', { id });
    logger.info(`Message supprimé par ${encodeURIComponent(user.username)}: ${id}`);
    console.log('[SUPPRESSION] Message supprimé id:', id);
  });

  // Modification d'un message
  socket.on('edit message', ({ id, content }) => {
    const user = users.get(socket.id);
    if (!user || !id) return;
    const msgIndex = messages.findIndex(m => m.id === id);
    if (msgIndex === -1) return;
    if (messages[msgIndex].username !== user.username) return;
    // Stocke le contenu tel quel, sans aucun traitement
    messages[msgIndex].content = content;
    messages[msgIndex].edited = true;
    io.emit('message edited', { id, content: messages[msgIndex].content });
    logger.info(`Message modifié par ${encodeURIComponent(user.username)}: ${id}`);
  });

  // Réactions emoji sur les messages
  socket.on('react message', ({ messageId, encrypted }) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const msg = messages[msgIndex];
    if (!msg.reactions) msg.reactions = [];
    // Ajoute la réaction chiffrée (pas de déchiffrement côté serveur)
    msg.reactions.push(encrypted);
    // Diffuse l'état complet des réactions chiffrées
    io.emit('react message', { messageId, reactions: [...msg.reactions] });
  });

  // Indicateur "en train d'écrire"
  socket.on('typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('typing', user.username);
    }
  });
  socket.on('stop typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('stop typing', user.username);
    }
  });

  socket.on('userJoined', (username) => {
    const systemMessage = {
      id: nextMessageId++,
      type: 'system',
      content: `${username} a rejoint le chat`,
      timestamp: Date.now()
    };
    messages.push(systemMessage);
    io.emit('chat message', systemMessage);
  });

  socket.on('userLeft', (username) => {
    const systemMessage = {
      id: nextMessageId++,
      type: 'system',
      content: `${username} a quitté le chat`,
      timestamp: Date.now()
    };
    messages.push(systemMessage);
    io.emit('chat message', systemMessage);
  });

  // Gestion des groupes
  socket.on('get groups', () => {
    try {
      const groupsList = Array.from(groups.values()).map(group => 
        groupUtils.formatGroupForAPI(group)
      );
      socket.emit('groups list', groupsList);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la liste des groupes:', error);
      socket.emit('groups list', []);
    }
  });

  socket.on('create group', (data) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        socket.emit('group creation error', { message: 'Utilisateur non authentifié' });
        return;
      }

      const { name, creatorUsername } = data;
      
      // Validation du nom avec la configuration
      const validation = validateGroupName(name);
      if (!validation.valid) {
        socket.emit('group creation error', { message: validation.error });
        return;
      }
      
      const groupId = groupUtils.generateGroupId(groups);
      const newGroup = {
        id: groupId,
        name: xss(name.trim()),
        members: new Set(),
        messages: [],
        createdAt: Date.now(),
        createdBy: creatorUsername || user.username
      };
      
      groups.set(groupId, newGroup);
      saveData();
      
      socket.emit('group created', groupUtils.formatGroupForAPI(newGroup));
      
      // Notifier tous les clients de la création du nouveau groupe
      io.emit('group list updated');
      
      logger.info(`Groupe créé: ${encodeURIComponent(newGroup.name)} par ${encodeURIComponent(user.username)}`);
    } catch (error) {
      console.error('Erreur lors de la création du groupe:', error);
      socket.emit('group creation error', { message: 'Erreur lors de la création de la cellule' });
    }
  });

  socket.on('join group', (groupId) => {
    const user = users.get(socket.id);
    if (!user || !groups.has(groupId)) return;

    const group = groups.get(groupId);
    group.members.add(socket.id);
    
    if (!userGroups.has(socket.id)) {
      userGroups.set(socket.id, new Set());
    }
    userGroups.get(socket.id).add(groupId);

    socket.join(`group_${groupId}`);
    
    // Envoyer l'historique des messages du groupe
    socket.emit('group messages', {
      groupId,
      messages: group.messages.slice(-50)
    });

    // Notifier les autres membres du groupe
    socket.to(`group_${groupId}`).emit('user joined group', {
      groupId,
      username: user.username
    });

    saveData();
  });

  socket.on('leave group', (groupId) => {
    const user = users.get(socket.id);
    if (!user || !groups.has(groupId)) return;

    const group = groups.get(groupId);
    group.members.delete(socket.id);
    
    if (userGroups.has(socket.id)) {
      userGroups.get(socket.id).delete(groupId);
    }

    socket.leave(`group_${groupId}`);
    
    // Notifier les autres membres du groupe
    socket.to(`group_${groupId}`).emit('user left group', {
      groupId,
      username: user.username
    });

    saveData();
  });

  socket.on('group message', (data) => {
    try {
      const user = users.get(socket.id);
      if (!user) {
        console.error('Utilisateur non trouvé pour le socket:', socket.id);
        return;
      }

      // Validation des données
      if (!data || typeof data !== 'object') {
        console.error('Données de message de groupe invalides:', typeof data);
        return;
      }

      if (!data.groupId || !groups.has(data.groupId)) {
        console.error('Groupe non trouvé:', data.groupId);
        return;
      }

      const group = groups.get(data.groupId);
      if (!group.members.has(socket.id)) {
        console.error('Utilisateur pas membre du groupe:', user.username, data.groupId);
        return;
      }

      // Validation du type de message
      if (!data.type) {
        data.type = 'text';
      }

      // Validation du contenu selon le type
      if (data.type === 'text' && (!data.content || typeof data.content !== 'string')) {
        console.error('Contenu de message texte invalide pour le groupe');
        return;
      }

      const message = {
        id: nextMessageId++,
        type: data.type,
        username: user.username,
        content: data.type === 'text' ? (
          // Ne pas appliquer XSS sur les messages chiffrés (JSON)
          data.content.trim().startsWith('{') ? data.content : xss(data.content)
        ) : data.content,
        fileData: data.fileData,
        fileType: data.fileType,
        fileName: data.fileName ? xss(data.fileName) : undefined,
        timestamp: data.timestamp || Date.now(),
        groupId: data.groupId,
        degradedMode: data.degradedMode || false
      };

      group.messages.push(message);
      
      // Limiter le nombre de messages par groupe
      if (group.messages.length > MAX_MESSAGES) {
        group.messages.splice(0, group.messages.length - MAX_MESSAGES);
      }

      io.to(`group_${data.groupId}`).emit('group message', message);
      saveData();
      
      logger.info(`Message de groupe ${message.type} reçu de ${encodeURIComponent(user.username)} dans le groupe ${data.groupId}`);
    } catch (error) {
      console.error('Erreur lors du traitement du message de groupe:', error);
      socket.emit('error', 'Erreur lors du traitement du message de groupe');
    }
  });

  // Gestion des événements d'échange de clés pour les groupes
  socket.on('key-exchange-request', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Validation des données d'échange de clés
    if (!data.groupId || !data.fromUserId || !data.publicKey || !data.timestamp || !data.nonce) {
      console.warn('Demande d\'échange de clés invalide:', data);
      socket.emit('key-exchange-error', { error: 'Données d\'échange invalides' });
      return;
    }

    // Vérifier que le timestamp n'est pas trop ancien (protection contre replay)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - data.timestamp > maxAge) {
      console.warn('Demande d\'échange de clés expirée:', data.timestamp);
      socket.emit('key-exchange-error', { error: 'Demande expirée' });
      return;
    }

    // Vérifier que l'utilisateur correspond
    if (data.fromUserId !== user.username) {
      console.warn('Nom d\'utilisateur incorrect dans la demande d\'échange:', data.fromUserId, 'vs', user.username);
      socket.emit('key-exchange-error', { error: 'Utilisateur non autorisé' });
      return;
    }

    // Vérifier que l'utilisateur fait partie du groupe
    const groupId = parseInt(data.groupId);
    if (!groups.has(groupId)) {
      console.warn('Groupe inexistant pour l\'échange de clés:', groupId);
      socket.emit('key-exchange-error', { error: 'Groupe inexistant' });
      return;
    }

    const group = groups.get(groupId);
    if (!group.members.has(socket.id)) {
      console.warn('Utilisateur non membre du groupe pour l\'échange de clés:', user.username, groupId);
      socket.emit('key-exchange-error', { error: 'Non membre du groupe' });
      return;
    }

    // Validation de la taille de la clé publique (P-256 = 65 bytes)
    if (!Array.isArray(data.publicKey) || data.publicKey.length !== 65) {
      console.warn('Clé publique invalide:', data.publicKey?.length);
      socket.emit('key-exchange-error', { error: 'Clé publique invalide' });
      return;
    }

    // Relayer la demande aux autres membres du groupe
    socket.to(`group_${groupId}`).emit('key-exchange-request', {
      ...data,
      fromUserId: user.username // S'assurer que le nom d'utilisateur est correct
    });

    console.log(`Demande d'échange de clés relayée pour le groupe ${groupId} par ${user.username}`);
  });

  socket.on('key-exchange-response', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Validation des données de réponse
    if (!data.groupId || !data.toUserId || !data.publicKey || !data.timestamp || !data.nonce) {
      console.warn('Réponse d\'échange de clés invalide:', data);
      socket.emit('key-exchange-error', { error: 'Données de réponse invalides' });
      return;
    }

    // Vérifier que le timestamp n'est pas trop ancien
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - data.timestamp > maxAge) {
      console.warn('Réponse d\'échange de clés expirée:', data.timestamp);
      socket.emit('key-exchange-error', { error: 'Réponse expirée' });
      return;
    }

    const groupId = parseInt(data.groupId);
    if (!groups.has(groupId)) {
      console.warn('Groupe inexistant pour la réponse d\'échange:', groupId);
      socket.emit('key-exchange-error', { error: 'Groupe inexistant' });
      return;
    }

    const group = groups.get(groupId);
    if (!group.members.has(socket.id)) {
      console.warn('Utilisateur non membre du groupe pour la réponse d\'échange:', user.username, groupId);
      socket.emit('key-exchange-error', { error: 'Non membre du groupe' });
      return;
    }

    // Validation de la taille de la clé publique
    if (!Array.isArray(data.publicKey) || data.publicKey.length !== 65) {
      console.warn('Clé publique invalide dans la réponse:', data.publicKey?.length);
      socket.emit('key-exchange-error', { error: 'Clé publique invalide' });
      return;
    }

    // Trouver le socket du destinataire dans le groupe
    const targetUser = Array.from(users.entries()).find(([socketId, userData]) => 
      userData.username === data.toUserId && group.members.has(socketId)
    );

    if (targetUser) {
      const [targetSocketId] = targetUser;
      io.to(targetSocketId).emit('key-exchange-response', {
        ...data,
        fromUserId: user.username
      });
      console.log(`Réponse d'échange de clés envoyée de ${user.username} vers ${data.toUserId} pour le groupe ${groupId}`);
    } else {
      console.warn('Utilisateur destinataire non trouvé pour la réponse d\'échange:', data.toUserId);
      socket.emit('key-exchange-error', { error: 'Destinataire non trouvé' });
    }
  });

  socket.on('key-distribution', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Validation des données de distribution
    if (!data.groupId || !data.publicKey || !data.timestamp || !data.nonce) {
      console.warn('Distribution de clé invalide:', data);
      socket.emit('key-exchange-error', { error: 'Données de distribution invalides' });
      return;
    }

    // Vérifier que le timestamp n'est pas trop ancien
    const maxAge = 5 * 60 * 1000; // 5 minutes
    if (Date.now() - data.timestamp > maxAge) {
      console.warn('Distribution de clé expirée:', data.timestamp);
      socket.emit('key-exchange-error', { error: 'Distribution expirée' });
      return;
    }

    const groupId = parseInt(data.groupId);
    if (!groups.has(groupId)) {
      console.warn('Groupe inexistant pour la distribution de clé:', groupId);
      socket.emit('key-exchange-error', { error: 'Groupe inexistant' });
      return;
    }

    const group = groups.get(groupId);
    if (!group.members.has(socket.id)) {
      console.warn('Utilisateur non membre du groupe pour la distribution:', user.username, groupId);
      socket.emit('key-exchange-error', { error: 'Non membre du groupe' });
      return;
    }

    // Validation de la taille des données de clé (peut être plus grande pour les clés chiffrées)
    if (!Array.isArray(data.publicKey) || data.publicKey.length === 0) {
      console.warn('Données de clé invalides dans la distribution:', data.publicKey?.length);
      socket.emit('key-exchange-error', { error: 'Données de clé invalides' });
      return;
    }

    // Si c'est une distribution ciblée
    if (data.toUserId) {
      const targetUser = Array.from(users.entries()).find(([socketId, userData]) => 
        userData.username === data.toUserId && group.members.has(socketId)
      );

      if (targetUser) {
        const [targetSocketId] = targetUser;
        io.to(targetSocketId).emit('key-distribution', {
          ...data,
          fromUserId: user.username
        });
        console.log(`Distribution de clé envoyée de ${user.username} vers ${data.toUserId} pour le groupe ${groupId}`);
      } else {
        console.warn('Utilisateur destinataire non trouvé pour la distribution:', data.toUserId);
        socket.emit('key-exchange-error', { error: 'Destinataire non trouvé' });
      }
    } else {
      // Distribution à tous les membres du groupe
      socket.to(`group_${groupId}`).emit('key-distribution', {
        ...data,
        fromUserId: user.username
      });
      console.log(`Distribution de clé diffusée par ${user.username} pour le groupe ${groupId}`);
    }
  });

  // Nettoyage lors de la déconnexion
  const originalDisconnectHandler = socket.listeners('disconnect')[0];
  socket.removeAllListeners('disconnect');
  
  socket.on('disconnect', (reason) => {
    // Nettoyer les groupes
    if (userGroups.has(socket.id)) {
      const userGroupSet = userGroups.get(socket.id);
      userGroupSet.forEach(groupId => {
        const group = groups.get(groupId);
        if (group) {
          group.members.delete(socket.id);
        }
      });
      userGroups.delete(socket.id);
    }
    
    // Appeler le gestionnaire original
    if (originalDisconnectHandler) {
      originalDisconnectHandler.call(socket, reason);
    }
    
    saveData();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default app;
