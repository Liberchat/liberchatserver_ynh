# 🎨 Guide des Thèmes Personnalisés - Liberchat

## Vue d'ensemble

Liberchat propose un système de thèmes personnalisés permettant de modifier l'apparence de l'interface selon vos préférences. Vous pouvez créer, modifier et appliquer vos propres thèmes CSS.

## 🚀 Accès aux Thèmes

1. Cliquez sur l'icône **⚙️ Paramètres** dans l'en-tête
2. Sélectionnez l'onglet **🎨 Thèmes**
3. Explorez les options disponibles

## 🎯 Fonctionnalités

### Thèmes Prédéfinis

- **Rouge Anarchiste** : Thème militant aux couleurs rouge et noir
- **Cyberpunk** : Ambiance futuriste avec des néons verts
- **Bleu Clair** : Thème doux et apaisant

### Création de Thèmes Personnalisés

1. **Nouveau Thème** : Cliquez sur "Créer un nouveau thème"
2. **Nom du Thème** : Donnez un nom unique à votre thème
3. **CSS Personnalisé** : Écrivez votre CSS dans l'éditeur
4. **Aperçu** : Visualisez les changements en temps réel
5. **Sauvegarde** : Enregistrez votre thème localement

### Gestion des Thèmes

- **Modifier** : Éditez un thème existant
- **Supprimer** : Supprimez un thème personnalisé
- **Appliquer** : Activez un thème
- **Désactiver** : Revenez au thème par défaut

## 🛠️ Compatibilité

### Modes Supportés

- ✅ **Mode Sombre** : Tous les thèmes fonctionnent parfaitement
- ✅ **Mode Clair** : Compatibilité complète depuis la v6.1.20
- ✅ **Mode Accessibilité** : Les thèmes respectent les paramètres d'accessibilité

### CSS Ciblé

Les thèmes peuvent modifier :
- Couleurs de fond (`.bg-white`, `.bg-black`)
- Couleurs de texte
- Bordures et ombres
- Couleurs d'accentuation
- Animations et transitions

## 📝 Exemple de CSS Personnalisé

```css
/* Thème Rouge Anarchiste */
.bg-white, .bg-black {
  background: linear-gradient(135deg, #8B0000 0%, #000000 100%) !important;
}

.text-white, .text-black {
  color: #FFD700 !important;
}

.border-gray-300 {
  border-color: #FF0000 !important;
}

/* Messages */
.message-bubble {
  background: rgba(139, 0, 0, 0.8) !important;
  border: 1px solid #FF0000 !important;
}
```

## 🔧 Conseils Techniques

### Bonnes Pratiques

1. **Utilisez `!important`** pour surcharger les styles par défaut
2. **Ciblez les deux modes** : `.bg-white` ET `.bg-black`
3. **Testez la lisibilité** : vérifiez le contraste des couleurs
4. **Préservez l'accessibilité** : respectez les standards WCAG

### Classes CSS Importantes

```css
/* Arrière-plans principaux */
.bg-white, .bg-black { }

/* Textes */
.text-white, .text-black { }

/* Bordures */
.border-gray-300, .border-gray-600 { }

/* Boutons */
.bg-blue-500, .bg-red-500 { }

/* Messages */
.message-bubble { }

/* En-tête */
.header-bg { }
```

## 🐛 Résolution de Problèmes

### Thème ne s'applique pas

1. Vérifiez que le thème est bien activé
2. Actualisez la page (F5)
3. Vérifiez la syntaxe CSS
4. Assurez-vous d'utiliser `!important`

### Incompatibilité avec le mode clair

- **Problème résolu** dans la version 6.1.20
- Ciblez les deux classes : `.bg-white` ET `.bg-black`

### Thème disparaît après rechargement

- Les thèmes sont sauvegardés dans le localStorage
- Vérifiez que votre navigateur autorise le stockage local

## 📱 Responsive Design

Les thèmes s'adaptent automatiquement :
- **Desktop** : Interface complète
- **Mobile** : Optimisation tactile
- **Tablette** : Mise en page adaptative

## 🔄 Mises à Jour

### Version 6.1.20
- ✅ Correction compatibilité mode clair
- ✅ Optimisation des performances
- ✅ Amélioration de l'application des thèmes

### Versions Futures
- Support des thèmes partagés
- Import/export de thèmes
- Galerie de thèmes communautaires

## 💡 Inspiration

### Idées de Thèmes

- **Matrix** : Vert sur noir, style terminal
- **Sunset** : Dégradés orange/rose
- **Ocean** : Bleus profonds et turquoise
- **Forest** : Verts naturels
- **Neon** : Couleurs fluorescentes

### Ressources CSS

- [CSS Gradient Generator](https://cssgradient.io/)
- [Color Palette Generator](https://coolors.co/)
- [CSS Box Shadow Generator](https://box-shadow.dev/)

## 🤝 Contribution

Partagez vos thèmes avec la communauté :
1. Créez votre thème
2. Testez sur différents modes
3. Partagez le code CSS sur GitHub
4. Proposez l'ajout aux thèmes prédéfinis

---

**Fait avec ❤️ pour la Commune Numérique**

*Pour plus d'aide, consultez la [FAQ](FAQ.md) ou ouvrez une issue sur GitHub.*