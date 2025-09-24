'use client';

import React, { useState } from 'react';

interface AddKeyFormProps {
  onAddKey: (provider: string, apiKey: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AddKeyForm({ onAddKey, onCancel, isLoading }: AddKeyFormProps) {
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const providers = [
    { value: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
    { value: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
    { value: 'google', label: 'Google', placeholder: 'AIza...' },
    { value: 'cohere', label: 'Cohere', placeholder: 'co_...' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      await onAddKey(provider, apiKey.trim());
      // Reset form on success
      setApiKey('');
      setProvider('openai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add API key');
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
          Add New API Key
        </h3>
        <p
          style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '0.875rem',
          }}
        >
          Securely store your LLM provider API keys for usage tracking.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="provider"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '1rem',
              background: isLoading ? '#f9fafb' : 'white',
              color: isLoading ? '#6b7280' : 'inherit',
            }}
          >
            {providers.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

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
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={providers.find(p => p.value === provider)?.placeholder || 'Enter your API key'}
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
              border: '1px solid #3b82f6',
              cursor: (isLoading || !apiKey.trim()) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#3b82f6',
              color: 'white',
              opacity: (isLoading || !apiKey.trim()) ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Adding...' : 'Add API Key'}
          </button>
        </div>
      </form>
    </div>
  );
}