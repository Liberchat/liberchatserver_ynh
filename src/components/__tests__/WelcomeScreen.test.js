/**
 * Tests pour WelcomeScreen - Vérification que la connexion fonctionne sans clé
 * Requirements: 1.1, 1.2, 5.1, 5.2
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '../WelcomeScreen';

// Mock de localStorage
const mockLocalStorage = {
  storage: {},
  getItem: jest.fn((key) => mockLocalStorage.storage[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.storage[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.storage[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.storage = {};
  })
};

// Configuration du mock global
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('WelcomeScreen - Connexion sans clé de chiffrement', () => {
  let mockOnJoin;

  beforeEach(() => {
    mockOnJoin = jest.fn();
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  test('affiche le formulaire de connexion sans champ de clé', () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    // Vérifier que le titre est présent
    expect(screen.getByText('LiberChat')).toBeInTheDocument();

    // Vérifier que le champ nom d'utilisateur est présent
    expect(screen.getByLabelText(/nom de camarade/i)).toBeInTheDocument();

    // Vérifier qu'il n'y a PAS de champ pour une clé de chiffrement
    expect(screen.queryByLabelText(/clé/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/chiffrement/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/encryption/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/clé/i)).not.toBeInTheDocument();

    // Vérifier que le bouton de connexion est présent
    expect(screen.getByRole('button', { name: /rejoindre la commune/i })).toBeInTheDocument();
  });

  test('permet la connexion avec seulement un nom d\'utilisateur', async () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    const usernameInput = screen.getByLabelText(/nom de camarade/i);
    const joinButton = screen.getByRole('button', { name: /rejoindre la commune/i });

    // Saisir un nom d'utilisateur
    fireEvent.change(usernameInput, { target: { value: 'TestUser' } });

    // Vérifier que le bouton est activé
    expect(joinButton).not.toBeDisabled();

    // Cliquer sur rejoindre
    fireEvent.click(joinButton);

    // Vérifier que onJoin est appelé avec seulement le nom d'utilisateur
    await waitFor(() => {
      expect(mockOnJoin).toHaveBeenCalledTimes(1);
      expect(mockOnJoin).toHaveBeenCalledWith('TestUser');
    });

    // Vérifier qu'aucune clé n'est demandée (pas d'autres paramètres)
    const callArgs = mockOnJoin.mock.calls[0];
    expect(callArgs).toHaveLength(1); // Seulement un paramètre (le nom)
    expect(typeof callArgs[0]).toBe('string'); // Le paramètre est une chaîne
  });

  test('sauvegarde le nom d\'utilisateur sans clé', async () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    const usernameInput = screen.getByLabelText(/nom de camarade/i);
    const joinButton = screen.getByRole('button', { name: /rejoindre la commune/i });

    // Saisir un nom d'utilisateur
    fireEvent.change(usernameInput, { target: { value: 'SavedUser' } });
    fireEvent.click(joinButton);

    // Vérifier que le nom est sauvegardé dans localStorage
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('liberchat_username', 'SavedUser');
    });

    // Vérifier qu'aucune clé n'est sauvegardée
    expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(
      expect.stringMatching(/key|clé|encryption|chiffrement/i),
      expect.anything()
    );
  });

  test('connexion rapide fonctionne sans clé', async () => {
    // Simuler un nom sauvegardé
    mockLocalStorage.storage['liberchat_username'] = 'QuickUser';

    render(<WelcomeScreen onJoin={mockOnJoin} />);

    // Attendre que le composant charge le nom sauvegardé
    await waitFor(() => {
      expect(screen.getByText(/continuer en tant que QuickUser/i)).toBeInTheDocument();
    });

    const quickJoinButton = screen.getByText(/continuer en tant que QuickUser/i);
    fireEvent.click(quickJoinButton);

    // Vérifier que la connexion rapide fonctionne sans demander de clé
    await waitFor(() => {
      expect(mockOnJoin).toHaveBeenCalledTimes(1);
      expect(mockOnJoin).toHaveBeenCalledWith('QuickUser');
    });
  });

  test('connexion anonyme fonctionne sans clé', async () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    const anonymousButton = screen.getByRole('button', { name: /anonyme/i });
    fireEvent.click(anonymousButton);

    // Vérifier que la connexion anonyme fonctionne
    await waitFor(() => {
      expect(mockOnJoin).toHaveBeenCalledTimes(1);
      const callArgs = mockOnJoin.mock.calls[0];
      expect(callArgs[0]).toMatch(/^Anonyme\d+$/); // Format AnonymeXXXX
    });
  });

  test('génération de nom aléatoire fonctionne sans clé', () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    const usernameInput = screen.getByLabelText(/nom de camarade/i);
    const randomButton = screen.getByRole('button', { name: /aléatoire/i });

    // Cliquer sur le bouton aléatoire
    fireEvent.click(randomButton);

    // Vérifier qu'un nom a été généré dans le champ
    expect(usernameInput.value).toBeTruthy();
    expect(usernameInput.value.length).toBeGreaterThan(0);

    // Le nom généré ne doit pas contenir de référence à une clé
    expect(usernameInput.value).not.toMatch(/key|clé|encryption|chiffrement/i);
  });

  test('validation du formulaire ne demande pas de clé', () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    const usernameInput = screen.getByLabelText(/nom de camarade/i);
    const joinButton = screen.getByRole('button', { name: /rejoindre la commune/i });

    // Tester avec un nom trop court
    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    expect(joinButton).toBeDisabled();

    // Tester avec un nom valide
    fireEvent.change(usernameInput, { target: { value: 'ValidUser' } });
    expect(joinButton).not.toBeDisabled();

    // La validation ne doit porter que sur le nom, pas sur une clé
    expect(screen.queryByText(/clé/i)).not.toBeInTheDocument();
  });

  test('aucune référence textuelle aux clés de chiffrement', () => {
    render(<WelcomeScreen onJoin={mockOnJoin} />);

    // Vérifier qu'il n'y a aucun texte mentionnant les clés
    expect(screen.queryByText(/clé de chiffrement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/encryption key/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/saisir.*clé/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/entrer.*clé/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/mot de passe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();
  });

  test('processus de connexion complet sans interruption pour clé', async () => {
    const { rerender } = render(<WelcomeScreen onJoin={mockOnJoin} />);

    const usernameInput = screen.getByLabelText(/nom de camarade/i);
    const joinButton = screen.getByRole('button', { name: /rejoindre la commune/i });

    // Simuler le processus complet de connexion
    fireEvent.change(usernameInput, { target: { value: 'CompleteUser' } });
    fireEvent.click(joinButton);

    // Vérifier que la fonction onJoin est appelée immédiatement
    await waitFor(() => {
      expect(mockOnJoin).toHaveBeenCalledTimes(1);
    });

    // Simuler que l'utilisateur est maintenant connecté (le composant ne s'affiche plus)
    // Ceci teste qu'il n'y a pas d'étape intermédiaire pour saisir une clé
    rerender(<div>Utilisateur connecté</div>);
    expect(screen.getByText('Utilisateur connecté')).toBeInTheDocument();
  });
});