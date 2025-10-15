import type {SidebarsConfig} from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  guides: [
    'intro',
    {
      type: 'category',
      label: 'Product',
      items: [
        'product/prd',
        'product/vision-and-personas',
        'product/anthropic-integration-roadmap',
        'product/beta-readiness-tracker',
        'product/docusaurus-adoption-plan',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/usage-ingestion-pipeline',
        'architecture/openai-admin-migration-design',
        'architecture/telemetry-and-observability',
        'architecture/environment-configuration',
        'architecture/openapi-reference',
      ],
    },
    {
      type: 'category',
      label: 'Operations',
      items: [
        {
          type: 'category',
          label: 'Runbooks',
          items: [
            'operations/runbooks',
            'operations/deployment-checklist',
            'operations/cost-anomaly-investigation',
            'operations/integrations-monitoring',
            'operations/daily-usage-cron-runbook',
          ],
        },
        {
          type: 'category',
          label: 'Security & Compliance',
          items: ['operations/security/openai-admin-security-controls'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Contributing',
      items: ['contributing/documentation'],
    },
  ],
}

export default sidebars
