'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  isLoading,
}: EditKeyFormProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const placeholders: Record<string, string> = {
    openai: 'sk-...',
    anthropic: 'sk-ant-...',
    google: 'AIza...',
    cohere: 'co_...',
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }

    try {
      await onUpdateKey(keyId, apiKey.trim());
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update API key');
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle>Update {currentProvider.toUpperCase()} key</CardTitle>
        <CardDescription>
          Replace the encrypted API key stored for this provider. The previous value will be discarded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">New API key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                placeholders[currentProvider.toLowerCase()] ?? 'Enter your API key'
              }
              disabled={isLoading}
              autoComplete="new-password"
            />
            <p className="text-sm text-muted-foreground">
              The key is encrypted immediately and never stored in plain text.
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
              {isLoading ? 'Updating…' : 'Update key'}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
