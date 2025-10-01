import assert from 'node:assert/strict';

import { evaluateAlertStatus, type AlertThreshold } from '../src/components/CostAlerts';

const baseThreshold: AlertThreshold = {
  id: 'zero-budget',
  type: 'daily',
  amount: 0,
  enabled: true,
};

const disabledThreshold: AlertThreshold = {
  ...baseThreshold,
  id: 'disabled',
  enabled: false,
};

{
  const result = evaluateAlertStatus(baseThreshold, 0);
  assert.equal(result.status, 'safe');
  assert.equal(result.percentage, 0);
  assert.match(result.message, /budget above \$0/i);
}

{
  const result = evaluateAlertStatus(disabledThreshold, 123);
  assert.equal(result.status, 'safe');
  assert.equal(result.percentage, 0);
  assert.equal(result.message, 'Alert disabled');
}

{
  const threshold: AlertThreshold = { ...baseThreshold, amount: 100, enabled: true };
  const result = evaluateAlertStatus(threshold, 90);
  assert.equal(result.status, 'warning');
  assert.equal(Math.round(result.percentage), 90);
  assert.match(result.message, /10% budget remaining/i);
}

{
  const threshold: AlertThreshold = { ...baseThreshold, amount: 100, enabled: true };
  const result = evaluateAlertStatus(threshold, 150);
  assert.equal(result.status, 'danger');
  assert.equal(Math.round(result.percentage), 150);
  assert.match(result.message, /\$50.00/);
}

console.log('costAlerts tests passed');
