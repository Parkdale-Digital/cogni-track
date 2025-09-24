'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import KeyCard from '../../components/KeyCard';
import AddKeyForm from '../../components/AddKeyForm';
import EditKeyForm from '../../components/EditKeyForm';

interface ProviderKey {
  id: number;
  provider: string;
  maskedKey?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKey, setEditingKey] = useState<ProviderKey | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user, router]);

  // Load API keys on component mount
  useEffect(() => {
    if (user) {
      loadKeys();
    }
  }, [user]);

  const loadKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/keys');
      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }
      const data = await response.json();
      setKeys(data.keys || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
      console.error('Error loading keys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async (provider: string, apiKey: string) => {
    try {
      setIsAdding(true);
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add API key');
      }

      // Reload keys and hide form
      await loadKeys();
      setShowAddForm(false);
      setError('');
    } catch (err) {
      throw err; // Re-throw to be handled by AddKeyForm
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditKey = async (keyId: number) => {
    const keyToEdit = keys.find(key => key.id === keyId);
    if (keyToEdit) {
      setEditingKey(keyToEdit);
      setShowAddForm(false); // Close add form if open
    }
  };

  const handleUpdateKey = async (keyId: number, apiKey: string) => {
    try {
      setIsEditing(true);
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }

      // Reload keys and close edit form
      await loadKeys();
      setEditingKey(null);
      setError('');
    } catch (err) {
      throw err; // Re-throw to be handled by EditKeyForm
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }

      // Reload keys
      await loadKeys();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
      console.error('Error deleting key:', err);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to sign-in
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: '2rem 0'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
        <header style={{ 
          marginBottom: '3rem', 
          textAlign: 'center' 
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            color: '#111827',
            margin: '0 0 1rem 0'
          }}>
            LLM API Usage Tracker
          </h1>
          <p style={{ 
            fontSize: '1.125rem', 
            color: '#6b7280',
            margin: 0
          }}>
            Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}! 
            Manage your API keys and track usage.
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            marginBottom: '2rem',
          }}>
            {error}
          </div>
        )}

        {/* Add Key Form */}
        {showAddForm && (
          <AddKeyForm
            onAddKey={handleAddKey}
            onCancel={() => setShowAddForm(false)}
            isLoading={isAdding}
          />
        )}

        {/* Edit Key Form */}
        {editingKey && (
          <EditKeyForm
            keyId={editingKey.id}
            currentProvider={editingKey.provider}
            onUpdateKey={handleUpdateKey}
            onCancel={() => setEditingKey(null)}
            isLoading={isEditing}
          />
        )}

        {/* API Keys Section */}
        <section>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ 
              fontSize: '1.875rem', 
              fontWeight: 600, 
              color: '#111827',
              margin: 0
            }}>
              Your API Keys
            </h2>
            {!showAddForm && !editingKey && (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  background: '#3b82f6',
                  color: 'white',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                + Add API Key
              </button>
            )}
          </div>

          {/* Keys Display */}
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3rem',
              color: '#6b7280'
            }}>
              Loading your API keys...
            </div>
          ) : keys.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'white',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              color: '#6b7280'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                marginBottom: '1rem',
                color: '#374151'
              }}>
                No API Keys Yet
              </h3>
              <p style={{ marginBottom: '2rem' }}>
                Add your first LLM provider API key to start tracking usage.
              </p>
              {!showAddForm && !editingKey && (
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    background: '#3b82f6',
                    color: 'white',
                  }}
                >
                  Add Your First API Key
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '1.5rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
            }}>
              {keys.map((key) => (
                <KeyCard
                  key={key.id}
                  providerKey={key}
                  onEdit={handleEditKey}
                  onDelete={handleDeleteKey}
                />
              ))}
            </div>
          )}
        </section>

        {/* Usage Analytics Placeholder */}
        {keys.length > 0 && (
          <section style={{ marginTop: '4rem' }}>
            <h2 style={{ 
              fontSize: '1.875rem', 
              fontWeight: 600, 
              color: '#111827',
              margin: '0 0 2rem 0'
            }}>
              Usage Analytics
            </h2>
            <div style={{
              background: 'white',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              padding: '3rem',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                marginBottom: '1rem',
                color: '#374151'
              }}>
                Coming Soon
              </h3>
              <p>
                Usage analytics and cost tracking will be available in Day 3-5 of development.
              </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}