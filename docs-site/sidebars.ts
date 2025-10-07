import type {SidebarsConfig} from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  guides: [
    'intro',
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/overview'],
    },
    {
      type: 'category',
      label: 'Operations',
      items: ['operations/runbooks'],
    },
  ],
}

export default sidebars
