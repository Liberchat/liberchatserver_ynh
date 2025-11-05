import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EncryptionIndicator, GroupSecurityIndicator, SecurityNotification, useSecurityNotifications } from '../EncryptionIndicator';

describe('EncryptionIndicator', () => {
  test('renders encrypted status correctly', () => {
    render(<EncryptionIndicator status="encrypted" />);
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('aria-label', 'Message chiffré de bout en bout');
  });

  test('renders error status with click handler', () => {
    const mockOnClick = jest.fn();
    render(
      <EncryptionIndicator 
        status="error" 
        onClick={mockOnClick}
        errorMessage="Erreur de test"
      />
    );
    
    const indicator = screen.getByRole('button');
    expect(indicator).toHaveAttribute('aria-label', 'Erreur de test');
    
    fireEvent.click(indicator);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('renders encrypting status with animation', () => {
    render(<EncryptionIndicator status="encrypting" />);
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('aria-label', 'Chiffrement en cours...');
  });

  test('renders unsecured status', () => {
    render(<EncryptionIndicator status="unsecured" />);
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('aria-label', 'Message non chiffré');
  });
});

describe('GroupSecurityIndicator', () => {
  const mockSecurityStatus = {
    encrypted: true,
    keyExchanged: true,
    peersVerified: 3,
    algorithm: 'AES-GCM',
    strength: 'strong' as const
  };

  test('renders strong security status', () => {
    render(
      <GroupSecurityIndicator 
        status={mockSecurityStatus}
        groupName="Test Group"
        memberCount={4}
        showDetails={true}
      />
    );
    
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('aria-label', 'Sécurité du groupe: Très sécurisé');
    expect(screen.getByText('Très sécurisé')).toBeInTheDocument();
  });

  test('renders weak security status', () => {
    const weakStatus = {
      ...mockSecurityStatus,
      encrypted: false,
      strength: 'weak' as const
    };

    render(
      <GroupSecurityIndicator 
        status={weakStatus}
        groupName="Test Group"
        memberCount={4}
      />
    );
    
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('aria-label', 'Sécurité du groupe: Non sécurisé');
  });

  test('shows detailed tooltip information', () => {
    render(
      <GroupSecurityIndicator 
        status={mockSecurityStatus}
        groupName="Test Group"
        memberCount={4}
      />
    );
    
    const indicator = screen.getByRole('img');
    expect(indicator).toHaveAttribute('title');
    const title = indicator.getAttribute('title');
    expect(title).toContain('Groupe: Test Group');
    expect(title).toContain('Membres: 4');
    expect(title).toContain('Chiffrement: Activé');
    expect(title).toContain('Algorithme: AES-GCM');
  });
});

describe('SecurityNotification', () => {
  test('renders key rotation notification', () => {
    const mockNotification = {
      id: 'test-1',
      type: 'key-rotation' as const,
      message: 'Clés mises à jour',
      timestamp: Date.now()
    };

    const mockOnClose = jest.fn();

    render(
      <SecurityNotification 
        notification={mockNotification}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Clés mises à jour')).toBeInTheDocument();
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledWith('test-1');
  });

  test('renders error notification with correct styling', () => {
    const mockNotification = {
      id: 'test-2',
      type: 'error' as const,
      message: 'Erreur de chiffrement',
      timestamp: Date.now()
    };

    render(
      <SecurityNotification 
        notification={mockNotification}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('Erreur de chiffrement')).toBeInTheDocument();
  });
});

// Test du hook useSecurityNotifications
const TestComponent = () => {
  const { notifications, notifyKeyRotation, notifyError, removeNotification } = useSecurityNotifications();

  return (
    <div>
      <button onClick={() => notifyKeyRotation('Test Group')}>
        Notify Key Rotation
      </button>
      <button onClick={() => notifyError('Test Error')}>
        Notify Error
      </button>
      <div data-testid="notifications-count">
        {notifications.length}
      </div>
      {notifications.map(notification => (
        <div key={notification.id} data-testid={`notification-${notification.type}`}>
          {notification.message}
          <button onClick={() => removeNotification(notification.id)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

describe('useSecurityNotifications hook', () => {
  test('adds and removes notifications correctly', () => {
    render(<TestComponent />);

    expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');

    // Add key rotation notification
    fireEvent.click(screen.getByText('Notify Key Rotation'));
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
    expect(screen.getByTestId('notification-key-rotation')).toHaveTextContent('Clés de sécurité mises à jour pour Test Group');

    // Add error notification
    fireEvent.click(screen.getByText('Notify Error'));
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('2');
    expect(screen.getByTestId('notification-error')).toHaveTextContent('Test Error');

    // Remove notification
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
  });
});