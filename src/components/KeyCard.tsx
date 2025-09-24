'use client';

import React, { useState } from 'react';

interface ProviderKey {
  id: number;
  provider: string;
  maskedKey?: string;
  createdAt: string;
}

interface KeyCardProps {
  providerKey: ProviderKey;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function KeyCard({ providerKey, onEdit, onDelete }: KeyCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(providerKey.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return '🤖';
      case 'anthropic':
        return '🧠';
      case 'google':
        return '🔍';
      case 'cohere':
        return '💫';
      default:
        return '🔑';
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e1e5e9',
        borderRadius: '8px',
        padding: '1.5rem',
        background: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>
            {getProviderIcon(providerKey.provider)}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#374151',
            }}
          >
            {providerKey.provider.toUpperCase()}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onEdit(providerKey.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'white',
              color: '#374151',
              opacity: isDeleting ? 0.5 : 1,
            }}
            disabled={isDeleting}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: '1px solid #ef4444',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: '#ef4444',
              color: 'white',
              opacity: isDeleting ? 0.5 : 1,
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          color: '#6b7280',
        }}
      >
        {providerKey.maskedKey && (
          <p
            style={{
              margin: '0 0 0.5rem 0',
              fontFamily: 'monospace',
              background: '#f3f4f6',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              display: 'inline-block',
            }}
          >
            Key: {providerKey.maskedKey}
          </p>
        )}
        <p style={{ margin: 0 }}>
          Added: {formatDate(providerKey.createdAt)}
        </p>
      </div>
    </div>
  );
}