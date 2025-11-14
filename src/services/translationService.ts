// Service de traduction utilisant LibreTranslate
export interface TranslationLanguage {
  code: string;
  name: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
}

class TranslationService {
  private baseUrl = 'https://libretranslate.unionlibertaireanarchiste.org';
  private fallbackUrls = [
    'https://libretranslate.com',
    'https://translate.argosopentech.com',
    'https://libretranslate.de'
  ];
  private supportedLanguages: TranslationLanguage[] = [];
  private currentBaseUrl = this.baseUrl;
  private apiKey: string | null = null; // Certaines instances peuvent nécessiter une clé API

  constructor() {
    this.loadSupportedLanguages();
  }

  // Charge la liste des langues supportées
  async loadSupportedLanguages(): Promise<void> {
    // Essayer d'abord l'URL principale, puis les fallbacks
    const urlsToTry = [this.baseUrl, ...this.fallbackUrls];

    for (const url of urlsToTry) {
      try {
        console.log(`🌐 Tentative de connexion à: ${url}`);

        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };

        // Ajouter la clé API si disponible
        if (this.apiKey && url === this.baseUrl) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        console.log(`🌐 Headers utilisés:`, headers);

        const response = await fetch(`${url}/languages`, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
        });

        console.log(`🌐 Réponse de ${url}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (response.ok) {
          const languages = await response.json();
          this.supportedLanguages = languages;
          this.currentBaseUrl = url;
          console.log(`🌐 Connexion réussie à ${url}, langues chargées:`, languages.length, languages);
          return;
        } else {
          const errorText = await response.text();
          console.warn(`🌐 Erreur HTTP ${response.status} pour ${url}:`, errorText);
        }
      } catch (error) {
        console.warn(`🌐 Échec de connexion à ${url}:`, error);
        if (error instanceof Error) {
          console.warn(`🌐 Détails de l'erreur:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }
        continue;
      }
    }

    console.warn('🌐 Aucun service de traduction disponible, utilisation des langues par défaut');
    this.setDefaultLanguages();
  }

  private setDefaultLanguages(): void {
    this.supportedLanguages = [
      { code: 'fr', name: 'Français' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ru', name: 'Русский' },
      { code: 'zh', name: '中文' },
      { code: 'ja', name: '日本語' },
      { code: 'ar', name: 'العربية' }
    ];
  }

  // Détecte la langue d'un texte
  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await fetch(`${this.currentBaseUrl}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ q: text }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const result = await response.json();
        return result[0]?.language || 'auto';
      }
    } catch (error) {
      console.error('🌐 Erreur lors de la détection de langue:', error);
    }
    return 'auto';
  }

  // Traduit un texte avec fallback sur plusieurs services
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<TranslationResult> {
    // Essayer d'abord le service actuel, puis les fallbacks
    const urlsToTry = [this.currentBaseUrl, ...this.fallbackUrls.filter(url => url !== this.currentBaseUrl)];

    for (const url of urlsToTry) {
      try {
        console.log(`🌐 Tentative traduction via ${url}: "${text}" (${sourceLanguage} → ${targetLanguage})`);

        const requestBody = {
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text'
        };

        // Ajouter la clé API si nécessaire
        if (this.apiKey && url === this.baseUrl) {
          (requestBody as any).api_key = this.apiKey;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // Certaines instances utilisent l'en-tête Authorization
        if (this.apiKey && url === this.baseUrl) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${url}/translate`, {
          method: 'POST',
          mode: 'cors',
          headers,
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000) // Timeout de 10 secondes
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`🌐 Traduction réussie via ${url}:`, result.translatedText);

          // Mettre à jour le service actuel si ce n'était pas le premier essayé
          if (url !== this.currentBaseUrl) {
            this.currentBaseUrl = url;
            console.log(`🌐 Service mis à jour vers: ${url}`);
          }

          return {
            translatedText: result.translatedText,
            detectedLanguage: result.detectedLanguage
          };
        } else {
          const errorText = await response.text();
          console.warn(`🌐 Erreur ${response.status} avec ${url}:`, errorText);
        }
      } catch (error) {
        console.warn(`🌐 Échec traduction avec ${url}:`, error);
        continue;
      }
    }

    // Si tous les services échouent, retourner une traduction simulée ou le texte original
    console.error('🌐 Tous les services de traduction ont échoué');
    return this.getFallbackTranslation(text, targetLanguage, sourceLanguage);
  }

  // Traduction de fallback simple (simulation ou texte original)
  private getFallbackTranslation(text: string, targetLanguage: string, sourceLanguage: string): TranslationResult {
    // Pour certaines traductions simples, on peut avoir des fallbacks
    const simpleTranslations: Record<string, Record<string, string>> = {
      'en': {
        'bonjour': 'hello',
        'merci': 'thank you',
        'oui': 'yes',
        'non': 'no'
      },
      'fr': {
        'hello': 'bonjour',
        'thank you': 'merci',
        'yes': 'oui',
        'no': 'non'
      }
    };

    const lowerText = text.toLowerCase().trim();
    const translation = simpleTranslations[targetLanguage]?.[lowerText];

    if (translation) {
      return {
        translatedText: translation,
        detectedLanguage: sourceLanguage
      };
    }

    // Sinon, retourner le texte original avec une indication
    return {
      translatedText: `${text} [Service de traduction indisponible]`,
      detectedLanguage: sourceLanguage
    };
  }

  // Retourne les langues supportées
  getSupportedLanguages(): TranslationLanguage[] {
    return this.supportedLanguages;
  }

  // Vérifie si le service est disponible
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.currentBaseUrl}/languages`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Obtient l'URL du service actuellement utilisé
  getCurrentServiceUrl(): string {
    return this.currentBaseUrl;
  }

  // Configure une clé API (optionnel)
  setApiKey(apiKey: string | null): void {
    this.apiKey = apiKey;
  }

  // Test de connectivité simple
  async testConnection(url: string = this.currentBaseUrl): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${url}/languages`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
}

export const translationService = new TranslationService();