'use client';

import React, { useState, useEffect } from 'react';

interface EditKeyFormProps {
  keyId: number;
  currentProvider: string;
  onUpdateKey: (keyId: number, apiKey: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EditKeyForm({ 
  keyId, 
  currentProvider, 
  onUpdateKey, 
  onCancel, 
  isLoading 
}: EditKeyFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const getPlaceholder = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'sk-...';
      case 'anthropic':
        return 'sk-ant-...';
      case 'google':
        return 'AIza...';
      case 'cohere':
        return 'co_...';
      default:
        return 'Enter your API key';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      await onUpdateKey(keyId, apiKey.trim());
      // Reset form on success
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h3
          style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#111827',
          }}
        >
          Edit {currentProvider.toUpperCase()} API Key
        </h3>
        <p
          style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '0.875rem',
          }}
        >
          Update your encrypted API key. The new key will replace the existing one.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="apiKey"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            New API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={getPlaceholder(currentProvider)}
            disabled={isLoading}
            autoComplete="new-password"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              background: isLoading ? '#f9fafb' : 'white',
              color: isLoading ? '#6b7280' : 'inherit',
            }}
          />
          <p
            style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            Your API key will be encrypted before storage. We never store keys in plain text.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '4px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'white',
              color: '#374151',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !apiKey.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              border: '1px solid #f59e0b',
              cursor: (isLoading || !apiKey.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#f59e0b',
              color: 'white',
              opacity: (isLoading || !apiKey.trim()) ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Updating...' : 'Update API Key'}
          </button>
        </div>
      </form>
    </div>
  );
}