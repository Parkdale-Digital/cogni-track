'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      await onAddKey(provider, apiKey.trim());
      setApiKey('');
      setProvider('openai');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add API key');
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Add new API key</CardTitle>
        <CardDescription>
          Securely store your LLM provider keys. Keys are encrypted before being saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={setProvider} disabled={isLoading}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                providers.find((p) => p.value === provider)?.placeholder ?? 'Enter your API key'
              }
              disabled={isLoading}
              autoComplete="new-password"
            />
            <p className="text-sm text-muted-foreground">
              Your key is encrypted at rest. We never store plain text keys.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <CardFooter className="flex justify-end gap-3 px-0">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !apiKey.trim()}>
              {isLoading ? 'Adding…' : 'Add API key'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
