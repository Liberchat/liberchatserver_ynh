import { Translation } from './translations';

export const es: Translation = {
  appName: "LiberChat",
  slogan: "La comuna para todos",

  welcome: {
    title: "Ni dioses, ni amos, ni jefes, ni estado",
    subtitle: "Chat libre, seguro y autogestionado",
    encryptionKey: "Clave de cifrado compartida",
    encryptionKeyPlaceholder: "Ingresa la clave secreta común...",
    username: "Nombre de usuario",
    usernamePlaceholder: "Elige tu nombre de compañero...",
    connect: "Unirse a la Comuna",
    keyRequired: "Se requiere una clave de cifrado",
    usernameRequired: "Se requiere un nombre de usuario"
  },

  chat: {
    typing: "revolución social",
    typingSingle: "está preparando una revolución social...",
    typingMultiple: "están preparando una revolución social...",
    messageInput: "Escribe tu mensaje...",
    sendMessage: "Enviar mensaje",
    voiceMessage: "Mensaje de voz",
    sendFile: "Enviar archivo",
    emoji: "Emojis",
    mention: "Mencionar",
    reply: "Responder",
    edit: "Editar",
    delete: "Eliminar",
    react: "Reaccionar",
    cancel: "Cancelar",
    confirm: "Confirmar",
    deleteConfirm: "¿Eliminar este mensaje?",
    edited: "editado",
    voiceMessageLabel: "Mensaje de voz",
    fileNotSupported: "Archivo no soportado",
    audioNotSupported: "Reproducción de voz no soportada en este navegador/dispositivo"
  },

  privateChat: {
    title: "Mensaje privado",
    noMessages: "Sin mensajes. ¡Inicia la conversación!",
    newMessages: "nuevos",
    startConversation: "Haz clic para enviar un mensaje privado",
    typing: "escribiendo...",
    read: "Leído",
    delivered: "Enviado"
  },

  users: {
    online: "en línea",
    you: "Tú",
    companions: "Compañeros presentes"
  },

  translation: {
    title: "TRADUCCIÓN LIBRE",
    enable: "Activar traducción automática",
    disable: "Desactivar traducción automática",
    translateTo: "Traducir a:",
    translating: "Traduciendo...",
    translate: "Traducir",
    translated: "Traducción",
    error: "Error de traducción",
    unavailable: "Servicio de traducción no disponible",
    noTranslation: "Sin traducción",
    serviceStatus: "Estado del servicio",
    available: "Servicio disponible",
    checking: "Verificando...",
    test: "Prueba",
    original: "Texto original",
    copy: "Copiar",
    copied: "Copiado",
    close: "Cerrar",
    messagesTranslatedIn: "Mensajes traducidos a",
    translationDisabled: "Traducción desactivada"
  },

  accessibility: {
    title: "Accesibilidad",
    highContrast: "Alto contraste",
    fontSize: "Tamaño de fuente",
    dyslexiaFont: "Fuente para dislexia",
    reduceAnimations: "Reducir animaciones",
    screenReader: "Lector de pantalla",
    keyboardNavigation: "Navegación por teclado",
    fontSizes: {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
      extraLarge: "Muy grande"
    },
    tip: "Consejo:",
    settingsSavedLocally: "Estos ajustes se guardan localmente y se aplican inmediatamente."
  },

  themes: {
    title: "Temas",
    dark: "Oscuro",
    light: "Claro",
    custom: "Personalizado",
    anarchist: "Rojo Anarquista",
    cyberpunk: "Cyberpunk",
    blueLight: "Azul Claro",
    createCustom: "Crear tema",
    customCSS: "CSS personalizado",
    apply: "Aplicar",
    reset: "Restablecer",
    anarchistRed: "Anarquismo",
    equalitySolidarity: "Igualdad Solidaridad",
    lightBlue: "Azul Claro",
    greenSolidarity: "Verde Solidario",
    feministAnarchism: "Anarquismo Feminista",
    solidarity: "Solidaridad",
    oceanBlue: "Azul Océano",
    sunset: "Atardecer"
  },

  header: {
    title: "Encabezado LiberChat",
    appName: "LiberChat",
    commune: "Comuna",
    logoAlt: "Logo LiberChat",
    settings: "Configuración",
    logout: "Cerrar sesión",
    logoutConfirm: "¿Quieres cerrar sesión?",
    keepData: "Mantener datos",
    clearData: "Borrar datos",
    language: "Idioma",
    languageSelector: "Selector de idioma",
    languageTitle: "IDIOMA / LANGUAGE",
    multilingualInterface: "Interfaz multilingüe libre"
  },

  messages: {
    connectionError: "Error de conexión",
    reconnecting: "Reconectando...",
    connected: "Conectado",
    disconnected: "Desconectado",
    fileTooLarge: "Archivo demasiado grande",
    fileError: "Error de archivo",
    networkError: "Error de red",
    selectLanguage: "Seleccionar idioma",
    enterUsername: "Ingresa tu nombre de usuario para unirte al chat",
    clickToJoinChat: "Haz clic para unirte al chat",
    onlyImagesAccepted: "Solo se aceptan imágenes",
    audioNotSupportedAndroid: "Grabación de audio no soportada en este navegador Android. Prueba Chrome o Firefox móvil.",
    noCompatibleAudioFormat: "No se encontró formato de audio compatible en este navegador. Prueba actualizar tu navegador o usar otro.",
    microphoneAccessDenied: "No se puede acceder al micrófono.",
    audioRecordingFailed: "No se puede iniciar la grabación de audio en este navegador. Prueba Chrome o Firefox móvil.",
    translationUnavailable: "Traducción no disponible",
    copyError: "Error al copiar",
    thumbnail: "Miniatura",
    confirmEdit: "Confirmar edición",
    preview: "Vista previa",
    open: "Abrir",
    clickToConfirm: "Haz clic de nuevo para confirmar",
    resetAllThemes: "Restablecer todos los temas",
    clickToReact: "Haz clic para reaccionar",
    connectionNotEstablished: "Conexión al servidor no establecida.",
    noEncryptionMethodFiles: "No hay método de cifrado disponible para archivos.",
    noEncryptionMethodText: "No hay método de cifrado disponible para mensajes de texto.",
    noEncryptionMethodAvailable: "No hay método de cifrado disponible",
    encryptionKeyNotInitialized: "Clave de cifrado no inicializada.",
    unknownError: "Error desconocido",
    testError: "Error de prueba"
  },

  languages: {
    fr: "Francés",
    en: "Inglés",
    es: "Español",
    de: "Alemán",
    it: "Italiano",
    pt: "Portugués",
    ru: "Ruso",
    zh: "Chino",
    ja: "Japonés",
    ar: "Árabe",
    eo: "Esperanto"
  },

  media: {
    camera: "Cámara",
    microphone: "Micrófono"
  },

  errors: {
    encryptionKeyNotInitialized: "Clave de cifrado no inicializada"
  }
};