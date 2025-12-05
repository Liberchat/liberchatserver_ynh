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
  defaultSrc: ["'self'", "https:", "data:", "blob:"],
  mediaSrc: ["'self'", "data:", "blob:"],
  imgSrc: ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://emoji-cdn.jsdelivr.net", "https://cdn.jsdelivr.net/npm/emoji-picker-react@*"],
  scriptSrc: ["'self'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  connectSrc: ["'self'", "https:", "wss:", "ws:", "ws://localhost:3000", "wss://liberchat-3-0-1.onrender.com", "wss://liberchat.onrender.com"],
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
// Ajout de LibreTranslate pour la traduction
defaultCsp.connectSrc.push('https://libretranslate.unionlibertaireanarchiste.org');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: defaultCsp
    }
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

    // Nettoie l'origin en enlevant le path si présent
    const cleanOrigin = origin.replace(/\/[^/]*$/, '');

    // Autorise si dans la liste (avec ou sans path)
    if (allowedOrigins.includes(origin) || allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Autorise tous les domaines HTTPS (pour YunoHost et autres déploiements)
    if (origin.startsWith('https://') || cleanOrigin.startsWith('https://')) {
      return callback(null, true);
    }

    // Autorise localhost sur n'importe quel port
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/) || cleanOrigin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }

    console.log('CORS refusé pour origin:', origin);
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
      // Autorise tout en HTTPS ou sans origin
      if (!origin || origin.startsWith('https://') || origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

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

// Routes pour LibreTranslate (proxy pour éviter CORS)
app.get(`${basePath}/api/translate/languages`, async (req, res) => {
  try {
    const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/languages');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération des langues:', error);
    res.status(500).json({ error: 'Service de traduction indisponible' });
  }
});

app.post(`${basePath}/api/translate`, async (req, res) => {
  try {
    const { q, source, target, format } = req.body;
    const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, source, target, format })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la traduction:', error);
    res.status(500).json({ error: 'Erreur de traduction' });
  }
});

app.post(`${basePath}/api/translate/detect`, async (req, res) => {
  try {
    const { q } = req.body;
    const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la détection de langue:', error);
    res.status(500).json({ error: 'Erreur de détection de langue' });
  }
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
  // Routes de traduction sur la racine
  app.get('/api/translate/languages', async (req, res) => {
    try {
      const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/languages');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Erreur lors de la récupération des langues:', error);
      res.status(500).json({ error: 'Service de traduction indisponible' });
    }
  });

  app.post('/api/translate', async (req, res) => {
    try {
      const { q, source, target, format } = req.body;
      const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q, source, target, format })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Erreur lors de la traduction:', error);
      res.status(500).json({ error: 'Erreur de traduction' });
    }
  });

  app.post('/api/translate/detect', async (req, res) => {
    try {
      const { q } = req.body;
      const response = await fetch('https://libretranslate.unionlibertaireanarchiste.org/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q })
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Erreur lors de la détection de langue:', error);
      res.status(500).json({ error: 'Erreur de détection de langue' });
    }
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
      } catch { }
      if (!image) image = '/liberchat-logo.svg';
      res.json({ title, description, image });
    } catch (e) {
      res.status(500).json({ error: 'Impossible de récupérer le lien' });
    }
  });
}

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

  const pendingPrivateMessages = new Map(); // Stockage des messages en attente

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

      // Délivrer les messages privés en attente
      if (pendingPrivateMessages.has(username)) {
        const pending = pendingPrivateMessages.get(username);
        pending.forEach(msg => {
          socket.emit('private message', msg);
        });
        pendingPrivateMessages.delete(username); // Une fois livrés, on supprime
      }

      socket.broadcast.emit('userJoined', username);
      io.emit('users', Array.from(users.values()));

      logger.info(`Utilisateur enregistré: ${encodeURIComponent(username)}`);
    } catch (error) {
      logger.error(`Erreur d'enregistrement pour ${encodeURIComponent(username)}:`, error);
      socket.emit('registrationError', error.message);
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      usersByName.delete(user.username);
      io.emit('userLeft', user.username); // Correction event name standard
      socket.broadcast.emit('userLeft', user.username); // Broadcast pour legacy ? userJoined est broadcast.
      // App.tsx écoute socket.on('users') pour la liste. userLeft pour notification ?
      // App.tsx n'écoute pas userLeft ligne 216 view_file ? Si socket.on('userLeft'...)

      io.emit('users', Array.from(users.values()));
      logger.info(`Déconnexion: ${user.username}`);
    }
    console.log('Déconnexion socket:', socket.id);
  });

  socket.on('chat message', (msg) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: nextMessageId++,
      type: msg.type || 'text',
      content: msg.content,
      username: user.username,
      timestamp: Date.now(),
      fileData: msg.fileData,
      fileType: msg.fileType,
      fileName: msg.fileName,
      gifUrl: msg.gifUrl,
      replyTo: msg.replyTo,
      encrypted: msg.encrypted,
      reactions: []
    };

    messages.push(message);
    if (messages.length > MAX_MESSAGES) {
      messages.shift();
    }

    io.emit('chat message', message);
    logger.info(`Message envoyé par ${user.username}`);
  });

  socket.on('typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('typing', { username: user.username });
    }
  });

  socket.on('stop typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('stop typing', { username: user.username });
    }
  });

  socket.on('delete message', (id) => {
    const user = users.get(socket.id);
    if (!user) return;

    const index = messages.findIndex(m => m.id === id);
    if (index !== -1) {
      const msg = messages[index];
      if (msg.username === user.username) {
        messages.splice(index, 1);
        io.emit('message deleted', id);
      }
    }
  });

  socket.on('edit message', (data) => {
    const user = users.get(socket.id);
    if (!user) {
      console.log('Edit refused: Not logged in');
      return;
    }

    console.log(`Edit request for msg ${data.id} from ${user.username}`);

    const msg = messages.find(m => m.id === data.id);
    if (!msg) {
      console.log(`Edit refused: Message ${data.id} not found in history`);
      // Si le message n'est pas trouvé (ex: trop vieux et serveur redémarré), on pourrait peut-être renvoyer une erreur explicite au client ?
      // socket.emit('error', 'Message introuvable (peut-être trop ancien)');
      return;
    }

    console.log(`Message found. Owner: ${msg.username}. Requestor: ${user.username}`);

    if (msg.username === user.username) {
      msg.content = data.content;
      if (data.fileData) msg.fileData = data.fileData;
      if (data.fileType) msg.fileType = data.fileType;
      if (data.fileName) msg.fileName = data.fileName;
      msg.edited = true;
      io.emit('message edited', data);
      console.log('Edit success & broadcast');
    } else {
      console.log('Edit refused: Username mismatch');
    }
  });

  // Gestion des messages privés
  socket.on('private message', ({ to, message }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    // Créer le message privé
    const privateMessage = {
      id: nextMessageId++,
      type: message.type || 'text',
      content: message.content,
      username: sender.username,
      timestamp: Date.now(),
      isPrivate: true,
      to: to,
      from: sender.username,
      fileData: message.fileData,
      fileType: message.fileType,
      fileName: message.fileName,
      encrypted: message.encrypted
    };

    // Renvoyer au sender pour confirmation (et affichage optimiste confirmé)
    socket.emit('private message', privateMessage);

    // Trouver le destinataire
    const recipientSocketId = usersByName.get(to);

    if (recipientSocketId) {
      // Utilisateur en ligne : envoi direct
      io.to(recipientSocketId).emit('private message', privateMessage);
    } else {
      // Utilisateur hors ligne : stockage en attente
      if (!pendingPrivateMessages.has(to)) {
        pendingPrivateMessages.set(to, []);
      }
      pendingPrivateMessages.get(to).push(privateMessage);

      // On pourrait notifier l'expéditeur que le message est en attente
      // socket.emit('message status', { id: privateMessage.id, status: 'pending' });
    }

    logger.info(`Message privé de ${encodeURIComponent(sender.username)} à ${encodeURIComponent(to)}`);
  });

  // Notification de frappe dans un chat privé
  socket.on('private typing', ({ to }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const recipientSocketId = usersByName.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private typing', { from: sender.username });
    }
  });

  socket.on('private stop typing', ({ to }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const recipientSocketId = usersByName.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private stop typing', { from: sender.username });
    }
  });

  // Réaction à un message privé
  socket.on('private reaction', ({ to, messageId, emoji }) => {
    const sender = users.get(socket.id);
    if (!sender) return;

    const reactionData = {
      messageId,
      emoji,
      from: sender.username,
      to: to
    };

    const recipientSocketId = usersByName.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private reaction', reactionData);
    }

    // Optionnel : persister si on stockait l'historique privé complet sur serveur (ce qui n'est pas le cas ici, on stocke en RAM que le pending)
    // Si le message est dans pendingPrivateMessages[to], on pourrait essayer de lui ajouter la réaction ?
    // Trop complexe pour l'instant sans base de données.
  });

  // Gestion des réactions publiques (E2EE opaque)
  socket.on('react message', ({ messageId, encrypted }) => {
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      // On stocke le payload chiffré (append-only log)
      msg.reactions.push(encrypted);
      // On diffuse la mise à jour
      io.emit('react message', { messageId, reactions: msg.reactions });
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  console.log(`Serveur démarré sur le port ${PORT}`);
});

export default app;
