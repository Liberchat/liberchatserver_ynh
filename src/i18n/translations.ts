// Système d'internationalisation pour Liberchat
export interface Translation {
  // Interface générale
  appName: string;
  slogan: string;

  // Écran de bienvenue
  welcome: {
    title: string;
    subtitle: string;
    encryptionKey: string;
    encryptionKeyPlaceholder: string;
    username: string;
    usernamePlaceholder: string;
    connect: string;
    keyRequired: string;
    usernameRequired: string;
  };

  // Chat
  chat: {
    typing: string;
    typingSingle: string;
    typingMultiple: string;
    messageInput: string;
    sendMessage: string;
    voiceMessage: string;
    sendFile: string;
    emoji: string;
    mention: string;
    reply: string;
    edit: string;
    delete: string;
    react: string;
    cancel: string;
    confirm: string;
    deleteConfirm: string;
    edited: string;
    voiceMessageLabel: string;
    fileNotSupported: string;
    audioNotSupported: string;
  };

  // Utilisateurs
  users: {
    online: string;
    you: string;
    companions: string;
  };

  // Traduction
  translation: {
    title: string;
    enable: string;
    disable: string;
    translateTo: string;
    translating: string;
    translate: string;
    translated: string;
    error: string;
    unavailable: string;
    noTranslation: string;
    serviceStatus: string;
    available: string;
    checking: string;
    test: string;
    original: string;
    copy: string;
    copied: string;
    close: string;
    messagesTranslatedIn: string;
    translationDisabled: string;
  };

  // Accessibilité
  accessibility: {
    title: string;
    highContrast: string;
    fontSize: string;
    dyslexiaFont: string;
    reduceAnimations: string;
    screenReader: string;
    keyboardNavigation: string;
    fontSizes: {
      small: string;
      medium: string;
      large: string;
      extraLarge: string;
    };
    tip: string;
    settingsSavedLocally: string;
  };

  // Thèmes
  themes: {
    title: string;
    dark: string;
    light: string;
    custom: string;
    anarchist: string;
    cyberpunk: string;
    blueLight: string;
    createCustom: string;
    customCSS: string;
    apply: string;
    reset: string;
    anarchistRed: string;
    equalitySolidarity: string;
    lightBlue: string;
    greenSolidarity: string;
    feministAnarchism: string;
    solidarity: string;
    oceanBlue: string;
    sunset: string;
  };

  // Header
  header: {
    title: string;
    appName: string;
    commune: string;
    logoAlt: string;
    settings: string;
    logout: string;
    logoutConfirm: string;
    keepData: string;
    clearData: string;
    language: string;
    languageSelector: string;
    languageTitle: string;
    multilingualInterface: string;
  };

  // Erreurs et messages
  messages: {
    connectionError: string;
    reconnecting: string;
    connected: string;
    disconnected: string;
    fileTooLarge: string;
    fileError: string;
    networkError: string;
    onlyImagesAccepted: string;
    audioNotSupportedAndroid: string;
    noCompatibleAudioFormat: string;
    microphoneAccessDenied: string;
    audioRecordingFailed: string;
    open: string;
    clickToConfirm: string;
    resetAllThemes: string;
    clickToReact: string;
    clickToJoinChat: string;
    enterUsername: string;
    confirmEdit: string;
    selectLanguage: string;
    preview: string;
    thumbnail: string;
    connectionNotEstablished: string;
    noEncryptionMethodFiles: string;
    noEncryptionMethodText: string;
    noEncryptionMethodAvailable: string;
    encryptionKeyNotInitialized: string;
    unknownError: string;
    testError: string;
    copyError: string;
    translationUnavailable: string;
  };

  // Langues
  languages: {
    fr: string;
    en: string;
    es: string;
    de: string;
    it: string;
    pt: string;
    ru: string;
    zh: string;
    ja: string;
    ar: string;
    eo: string; // Espéranto
  };

  // Média
  media: {
    camera: string;
    microphone: string;
  };

  // Erreurs
  errors: {
    encryptionKeyNotInitialized: string;
  };
}

// Traductions françaises (par défaut)
export const fr: Translation = {
  appName: "LiberChat",
  slogan: "La commune pour tous",

  welcome: {
    title: "Ni dieu, ni maître, ni patron, ni État",
    subtitle: "Chat libre, sécurisé et autogéré",
    encryptionKey: "Clé de chiffrement partagée",
    encryptionKeyPlaceholder: "Entrez la clé secrète commune...",
    username: "Nom d'utilisateur",
    usernamePlaceholder: "Choisissez votre nom de compagnon...",
    connect: "Rejoindre la Commune",
    keyRequired: "Une clé de chiffrement est requise",
    usernameRequired: "Un nom d'utilisateur est requis"
  },

  chat: {
    typing: "révolution sociale",
    typingSingle: "prépare une révolution sociale...",
    typingMultiple: "préparent une révolution sociale...",
    messageInput: "Écrivez votre message...",
    sendMessage: "Envoyer le message",
    voiceMessage: "Message vocal",
    sendFile: "Envoyer un fichier",
    emoji: "Emojis",
    mention: "Mentionner",
    reply: "Répondre",
    edit: "Modifier",
    delete: "Supprimer",
    react: "Réagir",
    cancel: "Annuler",
    confirm: "Confirmer",
    deleteConfirm: "Supprimer ce message ?",
    edited: "modifié",
    voiceMessageLabel: "Message vocal",
    fileNotSupported: "Fichier non supporté",
    audioNotSupported: "Lecture vocale non supportée sur ce navigateur/appareil"
  },

  users: {
    online: "en ligne",
    you: "Vous",
    companions: "Compagnons présent·e·s"
  },

  translation: {
    title: "TRADUCTION LIBRE",
    enable: "Activer la traduction automatique",
    disable: "Désactiver la traduction automatique",
    translateTo: "Traduire vers :",
    translating: "Traduction...",
    translate: "Traduire",
    translated: "Traduction",
    error: "Erreur de traduction",
    unavailable: "Service de traduction indisponible",
    noTranslation: "Pas de traduction",
    serviceStatus: "Statut du service",
    available: "Service disponible",
    checking: "Vérification...",
    test: "Test",
    original: "Texte original",
    copy: "Copier",
    copied: "Copié",
    close: "Fermer",
    messagesTranslatedIn: "Messages traduits en",
    translationDisabled: "Traduction désactivée"
  },

  accessibility: {
    title: "Accessibilité",
    highContrast: "Contraste élevé",
    fontSize: "Taille de police",
    dyslexiaFont: "Police dyslexie",
    reduceAnimations: "Réduire les animations",
    screenReader: "Lecteur d'écran",
    keyboardNavigation: "Navigation clavier",
    fontSizes: {
      small: "Petit",
      medium: "Moyen",
      large: "Grand",
      extraLarge: "Très grand"
    },
    tip: "Astuce :",
    settingsSavedLocally: "Ces paramètres sont sauvegardés localement et s'appliquent immédiatement."
  },

  themes: {
    title: "Thèmes",
    dark: "Sombre",
    light: "Clair",
    custom: "Personnalisé",
    anarchist: "Rouge Anarchiste",
    cyberpunk: "Cyberpunk",
    blueLight: "Bleu Clair",
    createCustom: "Créer un thème",
    customCSS: "CSS personnalisé",
    apply: "Appliquer",
    reset: "Réinitialiser",
    anarchistRed: "Anarchisme",
    equalitySolidarity: "Égalité Solidarité",
    lightBlue: "Bleu Clair",
    greenSolidarity: "Vert Solidaire",
    feministAnarchism: "Anarchisme Féministe",
    solidarity: "Solidarité",
    oceanBlue: "Bleu Océan",
    sunset: "Coucher de Soleil"
  },

  header: {
    title: "En-tête LiberChat",
    appName: "LiberChat",
    commune: "Commune",
    logoAlt: "Logo LiberChat",
    settings: "Paramètres",
    logout: "Déconnexion",
    logoutConfirm: "Voulez-vous vous déconnecter ?",
    keepData: "Garder les données",
    clearData: "Effacer les données",
    language: "Langue",
    languageSelector: "Sélecteur de langue",
    languageTitle: "LANGUE / LANGUAGE",
    multilingualInterface: "Interface multilingue libre"
  },

  messages: {
    connectionError: "Erreur de connexion",
    reconnecting: "Reconnexion...",
    connected: "Connecté",
    disconnected: "Déconnecté",
    fileTooLarge: "Fichier trop volumineux",
    fileError: "Erreur de fichier",
    networkError: "Erreur réseau",
    onlyImagesAccepted: "Seules les images sont acceptées",
    audioNotSupportedAndroid: "L'enregistrement audio n'est pas supporté sur ce navigateur Android. Essayez Chrome ou Firefox mobile.",
    noCompatibleAudioFormat: "Aucun format audio compatible trouvé sur ce navigateur. Essayez de mettre à jour votre navigateur ou d'en utiliser un autre.",
    microphoneAccessDenied: "Impossible d'accéder au micro.",
    audioRecordingFailed: "Impossible de démarrer l'enregistrement audio sur ce navigateur. Essayez Chrome ou Firefox mobile.",
    open: "Ouvrir",
    clickToConfirm: "Cliquez à nouveau pour confirmer",
    resetAllThemes: "Réinitialiser tous les thèmes",
    clickToReact: "Cliquez pour réagir",
    clickToJoinChat: "Cliquez pour rejoindre le chat avec le nom d'utilisateur saisi",
    enterUsername: "Entrez un nom d'utilisateur entre 3 et 24 caractères pour rejoindre le chat",
    confirmEdit: "Confirmer la modification",
    selectLanguage: "Sélectionner la langue",
    preview: "Aperçu",
    thumbnail: "miniature",
    connectionNotEstablished: "Connexion au serveur non établie.",
    noEncryptionMethodFiles: "Aucune méthode de chiffrement disponible pour les fichiers.",
    noEncryptionMethodText: "Aucune méthode de chiffrement disponible pour les messages texte.",
    noEncryptionMethodAvailable: "Aucune méthode de chiffrement disponible",
    encryptionKeyNotInitialized: "Clé de chiffrement non initialisée.",
    unknownError: "Erreur inconnue",
    testError: "Erreur de test",
    copyError: "Erreur lors de la copie",
    translationUnavailable: "Traduction indisponible"
  },

  languages: {
    fr: "Français",
    en: "English",
    es: "Español",
    de: "Deutsch",
    it: "Italiano",
    pt: "Português",
    ru: "Русский",
    zh: "中文",
    ja: "日本語",
    ar: "العربية",
    eo: "Esperanto"
  },

  media: {
    camera: "Caméra",
    microphone: "Microphone"
  },

  errors: {
    encryptionKeyNotInitialized: "Clé de chiffrement non initialisée."
  }
};