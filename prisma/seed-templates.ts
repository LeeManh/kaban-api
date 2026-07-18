import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, TemplateCategory } from '../generated/prisma/enums';

interface TemplateChecklistItemSeed {
  content: string;
  isDone?: boolean;
}

interface TemplateChecklistSeed {
  title: string;
  items: (string | TemplateChecklistItemSeed)[];
}

interface TemplateAttachmentSeed {
  filename: string;
  url: string;
  mimeType?: string;
}

interface TemplateCardSeed {
  title: string;
  description?: string;
  priority?: CardPriority;
  isDone?: boolean;
  cover?: string;
  labelNames?: string[];
  assignOwner?: boolean;
  checklist?: TemplateChecklistSeed;
  attachments?: TemplateAttachmentSeed[];
}

interface TemplateListSeed {
  title: string;
  cards?: TemplateCardSeed[];
}

interface TemplateLabelSeed {
  name: string;
  color: string;
}

interface TemplateSeed {
  category: TemplateCategory;
  name: string;
  description: string;
  labels?: TemplateLabelSeed[];
  lists: (string | TemplateListSeed)[];
}

const TEMPLATE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1782332576250-4241b7763180?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1780321100374-f10cd7172e77?q=80&w=2371&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1774711268987-a56e0de1d79d?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1777799589789-fa55d10cf81d?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1471899236350-e3016bf1e69e?q=80&w=2371&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1776942010620-ebd77b749e22?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1781791430194-7b591b4e8196?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1781889507466-7deb49983f35?q=80&w=2371&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1780173563428-dd319c97c181?q=80&w=2370&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1780995174343-00fd9e4c45e5?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1780259106571-a868700d818b?q=80&w=2298&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

function attachmentAt(index: number, filename: string): TemplateAttachmentSeed {
  return {
    filename,
    url: TEMPLATE_BACKGROUNDS[index % TEMPLATE_BACKGROUNDS.length],
    mimeType: 'image/jpeg',
  };
}

const TEMPLATES: TemplateSeed[] = [
  // BUSINESS
  {
    category: TemplateCategory.BUSINESS,
    name: 'Sales Pipeline CRM',
    description: 'Track leads from first contact to closed deal.',
    labels: [
      { name: 'Hot Lead', color: '#ef4444' },
      { name: 'Enterprise', color: '#a855f7' },
      { name: 'At Risk', color: '#f97316' },
    ],
    lists: [
      {
        title: 'Leads',
        cards: [
          {
            title: 'Acme Corp - Website Redesign',
            description:
              'Inbound lead from contact form. Wants a full redesign of their marketing site.',
            priority: CardPriority.LOW,
            cover: TEMPLATE_BACKGROUNDS[0],
            labelNames: ['Hot Lead'],
            checklist: {
              title: 'Qualification',
              items: [
                { content: 'Confirm decision maker', isDone: true },
                { content: 'Send intro deck', isDone: false },
              ],
            },
            attachments: [attachmentAt(1, 'homepage-mockup.jpg')],
          },
          {
            title: 'Wayne Enterprises - Internal Tools',
            description:
              'Referral from an existing customer, needs an internal ops dashboard.',
            priority: CardPriority.LOW,
            labelNames: ['Hot Lead'],
            checklist: {
              title: 'Qualification',
              items: ['Confirm budget', 'Schedule discovery call'],
            },
          },
        ],
      },
      {
        title: 'Qualified',
        cards: [
          {
            title: 'Globex Inc - Cloud Migration',
            description:
              'Budget confirmed, evaluating a 12-month migration plan.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Enterprise'],
            assignOwner: true,
            checklist: {
              title: 'Discovery',
              items: [
                { content: 'Send questionnaire', isDone: true },
                { content: 'Schedule technical call', isDone: true },
                { content: 'Confirm budget range', isDone: false },
              ],
            },
            attachments: [attachmentAt(2, 'discovery-notes.jpg')],
          },
        ],
      },
      {
        title: 'Proposal Sent',
        cards: [
          {
            title: 'Umbrella Corp - Security Audit',
            description:
              'Sent proposal for a full infrastructure security audit.',
            priority: CardPriority.HIGH,
            labelNames: ['Enterprise', 'Hot Lead'],
            assignOwner: true,
            checklist: {
              title: 'Proposal steps',
              items: [
                { content: 'Draft sent', isDone: true },
                { content: 'Follow-up call', isDone: false },
                { content: 'Get signature', isDone: false },
              ],
            },
            attachments: [attachmentAt(3, 'security-audit-proposal.jpg')],
          },
        ],
      },
      {
        title: 'Negotiation',
        cards: [
          {
            title: 'Stark Industries - Platform License',
            description:
              'Negotiating seat count and annual pricing. Champion went quiet.',
            priority: CardPriority.HIGH,
            labelNames: ['Enterprise', 'At Risk'],
            assignOwner: true,
            checklist: {
              title: 'Next steps',
              items: [
                'Re-engage champion',
                'Offer annual discount',
                'Set decision deadline',
              ],
            },
          },
        ],
      },
      {
        title: 'Won',
        cards: [
          {
            title: 'Initech - Annual Support Contract',
            description:
              'Signed! Annual support contract renewed for another year.',
            priority: CardPriority.HIGH,
            isDone: true,
            cover: TEMPLATE_BACKGROUNDS[1],
            labelNames: ['Enterprise'],
            assignOwner: true,
            checklist: {
              title: 'Closing steps',
              items: [
                { content: 'Contract signed', isDone: true },
                { content: 'Kickoff scheduled', isDone: true },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Startup Roadmap',
    description: 'Plan and track your startup from idea to launch.',
    labels: [
      { name: 'Must Have', color: '#ef4444' },
      { name: 'Nice to Have', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Ideas',
        cards: [
          {
            title: 'Freemium tier with usage limits',
            description:
              'Let users try core features free, upsell to paid once they hit limits.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Nice to Have'],
            checklist: {
              title: 'Explore',
              items: ['List competitor pricing', 'Draft limit tiers'],
            },
          },
          {
            title: 'Referral program',
            priority: CardPriority.LOW,
            labelNames: ['Nice to Have'],
          },
        ],
      },
      {
        title: 'Validating',
        cards: [
          {
            title: 'Interview 15 target customers',
            description: 'Validate willingness to pay before building the MVP.',
            priority: CardPriority.HIGH,
            labelNames: ['Must Have'],
            assignOwner: true,
            checklist: {
              title: 'Interview plan',
              items: [
                { content: 'Write interview script', isDone: true },
                { content: 'Book 15 calls', isDone: false },
                { content: 'Summarize findings', isDone: false },
              ],
            },
            attachments: [attachmentAt(4, 'interview-script.jpg')],
          },
        ],
      },
      {
        title: 'Building',
        cards: [
          {
            title: 'Build MVP core workflow',
            description: 'Single happy-path flow, no edge cases yet.',
            priority: CardPriority.HIGH,
            labelNames: ['Must Have'],
            assignOwner: true,
            checklist: {
              title: 'MVP scope',
              items: ['Auth', 'Core CRUD flow', 'Basic billing'],
            },
          },
        ],
      },
      {
        title: 'Launched',
        cards: [
          {
            title: 'Public launch on Product Hunt',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Must Have'],
            checklist: {
              title: 'Launch day',
              items: [
                { content: 'Prepare assets', isDone: true },
                { content: 'Post at 12:01am PT', isDone: true },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Meeting Agenda Tracker',
    description: 'Keep discussion topics organized across meetings.',
    labels: [
      { name: 'Decision Needed', color: '#f97316' },
      { name: 'FYI', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Q3 hiring plan',
            description: 'Discuss headcount for engineering and sales.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Decision Needed'],
            checklist: {
              title: 'Prep',
              items: ['Pull current headcount', 'Draft 2 scenarios'],
            },
          },
          {
            title: 'New PTO policy rollout',
            priority: CardPriority.LOW,
            labelNames: ['FYI'],
          },
        ],
      },
      {
        title: 'This Week',
        cards: [
          {
            title: 'Vendor contract renewal',
            description:
              'Decide whether to renew or switch providers before month-end.',
            priority: CardPriority.HIGH,
            labelNames: ['Decision Needed'],
            assignOwner: true,
            checklist: {
              title: 'Before meeting',
              items: ['Compare 2 alternative vendors', 'Get finance sign-off'],
            },
          },
        ],
      },
      {
        title: 'In Discussion',
        cards: [
          {
            title: 'Office relocation options',
            description:
              'Ongoing thread across 3 meetings now, needs a final decision.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Decision Needed'],
            checklist: {
              title: 'Options',
              items: [
                { content: 'Downtown lease', isDone: true },
                { content: 'Remote-first, no office', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Resolved',
        cards: [
          {
            title: 'Switched standup to async',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['FYI'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Vendor Management',
    description: 'Track vendors from prospecting to active contract.',
    labels: [
      { name: 'Preferred', color: '#22c55e' },
      { name: 'Under Budget Review', color: '#f97316' },
    ],
    lists: [
      {
        title: 'Prospecting',
        cards: [
          {
            title: 'Cloud hosting provider shortlist',
            description: 'Compare 3 providers for our next hosting contract.',
            priority: CardPriority.MEDIUM,
            checklist: { title: 'Shortlist', items: ['AWS', 'GCP', 'Hetzner'] },
          },
        ],
      },
      {
        title: 'Evaluating',
        cards: [
          {
            title: 'Design agency for rebrand',
            description:
              'Evaluating 2 agencies against our budget and timeline.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Under Budget Review'],
            assignOwner: true,
            checklist: {
              title: 'Evaluation criteria',
              items: [
                { content: 'Portfolio review', isDone: true },
                { content: 'Reference calls', isDone: false },
              ],
            },
            attachments: [attachmentAt(5, 'agency-portfolios.jpg')],
          },
        ],
      },
      {
        title: 'Contracted',
        cards: [
          {
            title: 'Payroll processing vendor',
            priority: CardPriority.LOW,
            labelNames: ['Preferred'],
            checklist: {
              title: 'Onboarding',
              items: ['Sign contract', 'Set up integration'],
            },
          },
        ],
      },
      {
        title: 'Active',
        cards: [
          {
            title: 'Customer support outsourcing partner',
            description: 'Live for 6 months, quarterly review scheduled.',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Preferred'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Budget Planning',
    description: 'Review and approve budget requests by team.',
    labels: [
      { name: 'Capex', color: '#a855f7' },
      { name: 'Opex', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Requests',
        cards: [
          {
            title: 'New laptops for design team',
            description: '5 laptops due for refresh this quarter.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Capex'],
            checklist: {
              title: 'Request',
              items: ['Get quotes', 'Submit request form'],
            },
          },
          {
            title: 'Additional marketing ad spend',
            priority: CardPriority.MEDIUM,
            labelNames: ['Opex'],
          },
        ],
      },
      {
        title: 'Under Review',
        cards: [
          {
            title: 'Conference sponsorship budget',
            description: 'Reviewing ROI from last year before approving again.',
            priority: CardPriority.LOW,
            labelNames: ['Opex'],
            assignOwner: true,
            checklist: {
              title: 'Review',
              items: ['Pull last year ROI', 'Get stakeholder input'],
            },
          },
        ],
      },
      {
        title: 'Approved',
        cards: [
          {
            title: 'Engineering tooling subscriptions',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Opex'],
          },
        ],
      },
      {
        title: 'Rejected',
        cards: [
          {
            title: 'Office renovation project',
            description:
              'Deferred to next fiscal year due to budget constraints.',
            priority: CardPriority.LOW,
            labelNames: ['Capex'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'OKR Tracker',
    description: 'Track objectives and key results each quarter.',
    labels: [
      { name: 'Company', color: '#a855f7' },
      { name: 'Team', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Objectives',
        cards: [
          {
            title: 'Increase monthly active users by 25%',
            priority: CardPriority.HIGH,
            labelNames: ['Company'],
            checklist: {
              title: 'Key results',
              items: [
                'KR1: Launch referral program',
                'KR2: Reduce onboarding drop-off by 15%',
              ],
            },
          },
        ],
      },
      {
        title: 'Key Results',
        cards: [
          {
            title: 'Ship self-serve onboarding flow',
            description: 'Key result supporting the activation objective.',
            priority: CardPriority.HIGH,
            labelNames: ['Team'],
            assignOwner: true,
            checklist: {
              title: 'Milestones',
              items: [
                { content: 'Design finalized', isDone: true },
                { content: 'Build in progress', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Reduce onboarding drop-off by 15%',
            priority: CardPriority.MEDIUM,
            labelNames: ['Team'],
            assignOwner: true,
          },
        ],
      },
      {
        title: 'Achieved',
        cards: [
          {
            title: 'Improve NPS from 32 to 40',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Company'],
          },
        ],
      },
    ],
  },

  // DESIGN
  {
    category: TemplateCategory.DESIGN,
    name: 'Design Sprint',
    description: 'Run a 4-phase design sprint from research to test.',
    labels: [
      { name: 'Must Solve', color: '#ef4444' },
      { name: 'Stretch Goal', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Research',
        cards: [
          {
            title: 'Interview 5 target users',
            description: 'Understand current pain points before ideating.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Must Solve'],
            checklist: {
              title: 'Interview plan',
              items: ['Recruit participants', 'Write script'],
            },
          },
          {
            title: 'Review analytics for drop-off points',
            priority: CardPriority.LOW,
          },
        ],
      },
      {
        title: 'Ideate',
        cards: [
          {
            title: 'Sketch 3 concepts',
            description: 'Crazy 8s session, then narrow down to 3 directions.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Must Solve'],
            checklist: {
              title: 'Concepts',
              items: ['Concept A', 'Concept B', 'Concept C'],
            },
            attachments: [attachmentAt(6, 'sketch-concepts.jpg')],
          },
        ],
      },
      {
        title: 'Prototype',
        cards: [
          {
            title: 'Build clickable Figma prototype',
            priority: CardPriority.HIGH,
            labelNames: ['Must Solve'],
            assignOwner: true,
            checklist: {
              title: 'Prototype scope',
              items: ['Cover happy path only', 'Add basic transitions'],
            },
          },
        ],
      },
      {
        title: 'Test',
        cards: [
          {
            title: 'Run usability test with prototype',
            description: 'Test with 5 users, record sessions for the team.',
            priority: CardPriority.HIGH,
            labelNames: ['Must Solve'],
            checklist: {
              title: 'Test day',
              items: [
                { content: 'Recruit 5 testers', isDone: true },
                { content: 'Run sessions', isDone: false },
                { content: 'Summarize insights', isDone: false },
              ],
            },
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Brand Style Guide',
    description: 'Draft and finalize your brand guidelines.',
    labels: [
      { name: 'Core', color: '#a855f7' },
      { name: 'Optional', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Define brand voice and tone',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core'],
            checklist: {
              title: 'Voice',
              items: ['Write 3 example snippets', 'Get feedback'],
            },
          },
          {
            title: 'Icon set style exploration',
            priority: CardPriority.LOW,
            labelNames: ['Optional'],
          },
        ],
      },
      {
        title: 'Drafting',
        cards: [
          {
            title: 'Color palette and typography',
            description:
              'Primary, secondary, and semantic colors plus font pairing.',
            priority: CardPriority.HIGH,
            labelNames: ['Core'],
            assignOwner: true,
            checklist: {
              title: 'Draft checklist',
              items: [
                { content: 'Primary palette', isDone: true },
                { content: 'Typography scale', isDone: false },
              ],
            },
            attachments: [attachmentAt(7, 'color-palette-draft.jpg')],
          },
        ],
      },
      {
        title: 'Review',
        cards: [
          {
            title: 'Logo usage guidelines',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core'],
            checklist: {
              title: 'Review',
              items: ['Clear space rules', "Do/don't examples"],
            },
          },
        ],
      },
      {
        title: 'Finalized',
        cards: [
          {
            title: 'Brand guideline PDF v1.0',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Core'],
            attachments: [attachmentAt(8, 'brand-guidelines-v1.jpg')],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'UI Component Library',
    description: 'Track design and delivery of reusable UI components.',
    labels: [
      { name: 'Core Component', color: '#a855f7' },
      { name: 'Needs Design', color: '#f97316' },
    ],
    lists: [
      {
        title: 'To Design',
        cards: [
          {
            title: 'Data table with sorting',
            priority: CardPriority.MEDIUM,
            labelNames: ['Needs Design'],
            checklist: {
              title: 'States',
              items: ['Empty state', 'Loading state', 'Error state'],
            },
          },
          {
            title: 'Toast notification variants',
            priority: CardPriority.LOW,
            labelNames: ['Needs Design'],
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Modal / dialog component',
            description:
              'Base modal with size variants and focus trap behavior.',
            priority: CardPriority.HIGH,
            labelNames: ['Core Component'],
            assignOwner: true,
            checklist: {
              title: 'Component checklist',
              items: [
                { content: 'Figma component', isDone: true },
                { content: 'Dev handoff notes', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Review',
        cards: [
          {
            title: 'Button component variants',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core Component'],
            checklist: {
              title: 'Review',
              items: ['Accessibility check', 'Dark mode check'],
            },
          },
        ],
      },
      {
        title: 'Shipped',
        cards: [
          {
            title: 'Input & form field components',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Core Component'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Portfolio Tracker',
    description: 'Manage freelance design projects end to end.',
    labels: [
      { name: 'Paid', color: '#22c55e' },
      { name: 'Unpaid Invoice', color: '#ef4444' },
    ],
    lists: [
      {
        title: 'Concepts',
        cards: [
          {
            title: 'Coffee shop rebrand pitch',
            priority: CardPriority.LOW,
            checklist: {
              title: 'Pitch prep',
              items: ['Mood board', 'Sample logo direction'],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'E-commerce site UI kit',
            description:
              "Full UI kit for a client's Shopify storefront redesign.",
            priority: CardPriority.HIGH,
            assignOwner: true,
            checklist: {
              title: 'Deliverables',
              items: [
                { content: 'Homepage design', isDone: true },
                { content: 'Product page design', isDone: false },
                { content: 'Checkout flow design', isDone: false },
              ],
            },
            attachments: [attachmentAt(9, 'ecommerce-homepage.jpg')],
          },
        ],
      },
      {
        title: 'Client Review',
        cards: [
          {
            title: 'Restaurant menu redesign',
            priority: CardPriority.MEDIUM,
            labelNames: ['Unpaid Invoice'],
            checklist: { title: 'Awaiting', items: ['Client feedback on v2'] },
          },
        ],
      },
      {
        title: 'Completed',
        cards: [
          {
            title: 'Fitness app onboarding illustrations',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Paid'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Design Feedback Board',
    description: 'Collect and triage feedback on design work.',
    labels: [
      { name: 'Blocking', color: '#ef4444' },
      { name: 'Nitpick', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'New Feedback',
        cards: [
          {
            title: 'Contrast too low on secondary buttons',
            priority: CardPriority.MEDIUM,
            labelNames: ['Blocking'],
            checklist: { title: 'Repro', items: ['Check against WCAG AA'] },
          },
          {
            title: 'Spacing inconsistent on cards',
            priority: CardPriority.LOW,
            labelNames: ['Nitpick'],
          },
        ],
      },
      {
        title: 'Triaged',
        cards: [
          {
            title: 'Empty states missing illustrations',
            description:
              'Affects 4 different screens, prioritize for next sprint.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Blocking'],
            assignOwner: true,
            checklist: {
              title: 'Screens affected',
              items: [
                { content: 'Boards list', isDone: false },
                { content: 'Search results', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Revision',
        cards: [
          {
            title: 'Mobile nav overlaps content',
            priority: CardPriority.HIGH,
            labelNames: ['Blocking'],
            checklist: {
              title: 'Fix',
              items: ['Adjust z-index', 'Test on iOS Safari'],
            },
          },
        ],
      },
      {
        title: 'Resolved',
        cards: [
          {
            title: 'Typo in confirmation modal',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Nitpick'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Illustration Pipeline',
    description: 'Track illustrations from sketch to final art.',
    labels: [
      { name: 'Hero Art', color: '#a855f7' },
      { name: 'Icon', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Sketches',
        cards: [
          {
            title: 'Onboarding welcome illustration',
            priority: CardPriority.MEDIUM,
            labelNames: ['Hero Art'],
            checklist: {
              title: 'Sketch options',
              items: ['Option A: character based', 'Option B: abstract shapes'],
            },
          },
        ],
      },
      {
        title: 'Linework',
        cards: [
          {
            title: '404 error page illustration',
            priority: CardPriority.LOW,
            labelNames: ['Hero Art'],
            assignOwner: true,
          },
        ],
      },
      {
        title: 'Coloring',
        cards: [
          {
            title: 'Empty state icon set (8 icons)',
            description: 'Consistent color palette matching brand guidelines.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Icon'],
            checklist: {
              title: 'Icons',
              items: [
                { content: 'No results', isDone: true },
                { content: 'No notifications', isDone: true },
                { content: 'No attachments', isDone: false },
              ],
            },
            attachments: [attachmentAt(10, 'icon-set-progress.jpg')],
          },
        ],
      },
      {
        title: 'Final',
        cards: [
          {
            title: 'Loading spinner animation frames',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Icon'],
          },
        ],
      },
    ],
  },

  // EDUCATION
  {
    category: TemplateCategory.EDUCATION,
    name: 'Course Curriculum Planner',
    description: 'Plan and publish course topics and materials.',
    labels: [
      { name: 'Core Module', color: '#a855f7' },
      { name: 'Bonus Content', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Topics',
        cards: [
          {
            title: 'Introduction to Algorithms',
            description:
              'Big-O notation, common patterns, and complexity trade-offs.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core Module'],
            checklist: {
              title: 'Outline',
              items: ['Define learning objectives', 'List prerequisite topics'],
            },
          },
          {
            title: 'Recursion and backtracking',
            priority: CardPriority.LOW,
            labelNames: ['Bonus Content'],
          },
        ],
      },
      {
        title: 'Drafting',
        cards: [
          {
            title: 'Data Structures Deep Dive',
            description:
              'Arrays, linked lists, trees, and hash maps with exercises.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core Module'],
            assignOwner: true,
            checklist: {
              title: 'Draft sections',
              items: [
                { content: 'Arrays & lists', isDone: true },
                { content: 'Trees & graphs', isDone: false },
                { content: 'Hash maps', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Reviewing',
        cards: [
          {
            title: 'Sorting algorithms module',
            priority: CardPriority.MEDIUM,
            labelNames: ['Core Module'],
            checklist: {
              title: 'Review',
              items: ['Check code examples run', 'Proofread slides'],
            },
          },
        ],
      },
      {
        title: 'Published',
        cards: [
          {
            title: 'Getting Started Module',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Core Module'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Student Project Tracker',
    description: 'Track student projects from assignment to grading.',
    labels: [
      { name: 'Group Project', color: '#a855f7' },
      { name: 'Individual', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Assigned',
        cards: [
          {
            title: 'Final capstone project brief',
            priority: CardPriority.MEDIUM,
            labelNames: ['Group Project'],
            checklist: {
              title: 'Requirements',
              items: ['Groups of 3-4', 'Present in week 12'],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Team Alpha - E-commerce clone',
            description:
              'Building a simplified shopping cart app with checkout flow.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Group Project'],
            assignOwner: true,
            checklist: {
              title: 'Milestones',
              items: [
                { content: 'Project proposal', isDone: true },
                { content: 'Midpoint check-in', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Submitted',
        cards: [
          {
            title: 'Individual essay - AI ethics',
            priority: CardPriority.LOW,
            labelNames: ['Individual'],
            checklist: { title: 'Grading', items: ['Check plagiarism report'] },
          },
        ],
      },
      {
        title: 'Graded',
        cards: [
          {
            title: 'Team Beta - Weather dashboard',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Group Project'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Classroom Task Board',
    description: 'A simple board for classroom activities and tasks.',
    labels: [
      { name: 'Homework', color: '#3b82f6' },
      { name: 'In-Class', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'To Do',
        cards: [
          {
            title: 'Read chapter 4 before Monday',
            priority: CardPriority.MEDIUM,
            labelNames: ['Homework'],
          },
          {
            title: 'Group discussion: renewable energy',
            priority: CardPriority.LOW,
            labelNames: ['In-Class'],
            checklist: {
              title: 'Prep',
              items: ['Split into groups of 4', 'Prepare discussion questions'],
            },
          },
        ],
      },
      {
        title: 'Doing',
        cards: [
          {
            title: 'Science fair poster draft',
            priority: CardPriority.MEDIUM,
            labelNames: ['Homework'],
            assignOwner: true,
            checklist: {
              title: 'Poster sections',
              items: [
                { content: 'Hypothesis', isDone: true },
                { content: 'Results & graphs', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Vocabulary quiz - unit 3',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['In-Class'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Study Planner',
    description: 'Organize subjects and review progress weekly.',
    labels: [
      { name: 'Exam Soon', color: '#ef4444' },
      { name: 'Ongoing', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Subjects',
        cards: [
          {
            title: 'Linear Algebra',
            priority: CardPriority.MEDIUM,
            labelNames: ['Ongoing'],
            checklist: {
              title: 'Topics',
              items: ['Matrices', 'Eigenvalues', 'Vector spaces'],
            },
          },
          {
            title: 'Organic Chemistry',
            priority: CardPriority.HIGH,
            labelNames: ['Exam Soon'],
          },
        ],
      },
      {
        title: 'This Week',
        cards: [
          {
            title: 'Practice problem set - Chapter 5',
            description: 'Focus on eigenvalue decomposition problems.',
            priority: CardPriority.HIGH,
            labelNames: ['Exam Soon'],
            assignOwner: true,
            checklist: {
              title: 'Problems',
              items: [
                { content: 'Problems 1-10', isDone: true },
                { content: 'Problems 11-20', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Reviewing',
        cards: [
          {
            title: 'Flashcards - reaction mechanisms',
            priority: CardPriority.MEDIUM,
            labelNames: ['Exam Soon'],
          },
        ],
      },
      {
        title: 'Mastered',
        cards: [
          {
            title: 'Basic differentiation rules',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Ongoing'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Thesis Research Tracker',
    description: 'Track sources, reading, and writing for your thesis.',
    labels: [
      { name: 'Primary Source', color: '#a855f7' },
      { name: 'Secondary Source', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Sources',
        cards: [
          {
            title: 'Survey responses from field study',
            priority: CardPriority.MEDIUM,
            labelNames: ['Primary Source'],
          },
          {
            title: 'Literature review papers (12)',
            priority: CardPriority.MEDIUM,
            labelNames: ['Secondary Source'],
          },
        ],
      },
      {
        title: 'Reading',
        cards: [
          {
            title: 'Read and annotate 5 key papers',
            description: 'Focus on methodology sections for comparison.',
            priority: CardPriority.HIGH,
            labelNames: ['Secondary Source'],
            assignOwner: true,
            checklist: {
              title: 'Papers',
              items: [
                { content: 'Paper 1 - annotated', isDone: true },
                { content: 'Paper 2 - annotated', isDone: true },
                { content: 'Paper 3 - annotated', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Writing',
        cards: [
          {
            title: 'Draft literature review chapter',
            priority: CardPriority.HIGH,
            labelNames: ['Secondary Source'],
            checklist: {
              title: 'Sections',
              items: ['Intro', 'Theme 1', 'Theme 2', 'Gaps in research'],
            },
          },
        ],
      },
      {
        title: 'Cited',
        cards: [
          {
            title: 'Methodology chapter references',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Primary Source'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'School Event Planning',
    description: 'Plan school events from idea to completion.',
    labels: [
      { name: 'Budget Approved', color: '#22c55e' },
      { name: 'Needs Volunteers', color: '#f97316' },
    ],
    lists: [
      {
        title: 'Ideas',
        cards: [
          {
            title: 'Annual science fair',
            priority: CardPriority.MEDIUM,
            checklist: {
              title: 'Initial planning',
              items: ['Pick a date', 'Estimate budget'],
            },
          },
        ],
      },
      {
        title: 'Planning',
        cards: [
          {
            title: 'Spring fundraising gala',
            description:
              'Venue booked, need volunteers for setup and check-in.',
            priority: CardPriority.HIGH,
            labelNames: ['Needs Volunteers'],
            assignOwner: true,
            checklist: {
              title: 'Planning tasks',
              items: [
                { content: 'Book venue', isDone: true },
                { content: 'Recruit 10 volunteers', isDone: false },
                { content: 'Order catering', isDone: false },
              ],
            },
            attachments: [attachmentAt(0, 'gala-venue-photos.jpg')],
          },
        ],
      },
      {
        title: 'Confirmed',
        cards: [
          {
            title: 'Parent-teacher conference week',
            priority: CardPriority.MEDIUM,
            labelNames: ['Budget Approved'],
          },
        ],
      },
      {
        title: 'Completed',
        cards: [
          {
            title: 'Winter holiday concert',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Budget Approved'],
          },
        ],
      },
    ],
  },

  // ENGINEERING
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Sprint Board',
    description: 'A classic agile sprint board for engineering teams.',
    labels: [
      { name: 'Bug', color: '#ef4444' },
      { name: 'Feature', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Add dark mode support',
            description:
              'System-wide dark theme with a manual toggle in settings.',
            priority: CardPriority.LOW,
            labelNames: ['Feature'],
            checklist: {
              title: 'Scope',
              items: ['Design tokens for dark theme', 'Toggle in settings'],
            },
          },
        ],
      },
      {
        title: 'To Do',
        cards: [
          {
            title: 'Fix pagination bug in reports',
            description: 'Page size is ignored when filters are applied.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Bug'],
            checklist: {
              title: 'Steps',
              items: [
                { content: 'Reproduce bug', isDone: true },
                { content: 'Write fix', isDone: false },
                { content: 'Add test', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Implement OAuth login',
            description:
              'Google and GitHub OAuth as alternatives to email/password.',
            priority: CardPriority.HIGH,
            labelNames: ['Feature'],
            assignOwner: true,
            checklist: {
              title: 'Providers',
              items: [
                { content: 'Google OAuth', isDone: true },
                { content: 'GitHub OAuth', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Review',
        cards: [
          {
            title: 'Refactor auth middleware',
            priority: CardPriority.MEDIUM,
            labelNames: ['Feature'],
            checklist: {
              title: 'Review',
              items: ['Check test coverage', 'Verify no breaking changes'],
            },
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Upgrade Node to v20',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Feature'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Bug Tracker',
    description: 'Track bugs from report to fix.',
    labels: [
      { name: 'Critical', color: '#ef4444' },
      { name: 'Minor', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Reported',
        cards: [
          {
            title: 'Checkout button unresponsive on iOS',
            description: 'Multiple user reports, seems specific to iOS Safari.',
            priority: CardPriority.HIGH,
            labelNames: ['Critical'],
            checklist: {
              title: 'Triage',
              items: ['Confirm device/browser', 'Check error logs'],
            },
          },
          {
            title: 'Typo in email footer',
            priority: CardPriority.LOW,
            labelNames: ['Minor'],
          },
        ],
      },
      {
        title: 'Confirmed',
        cards: [
          {
            title: 'Memory leak in websocket connection',
            description: 'Server memory grows steadily under sustained load.',
            priority: CardPriority.HIGH,
            labelNames: ['Critical'],
            assignOwner: true,
            checklist: {
              title: 'Investigation',
              items: [
                { content: 'Reproduce under load test', isDone: true },
                { content: 'Profile heap snapshots', isDone: false },
              ],
            },
            attachments: [attachmentAt(1, 'heap-snapshot.jpg')],
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Timezone off-by-one in due dates',
            priority: CardPriority.MEDIUM,
            labelNames: ['Minor'],
            checklist: {
              title: 'Fix',
              items: ['Normalize to UTC on save', 'Add regression test'],
            },
          },
        ],
      },
      {
        title: 'Fixed',
        cards: [
          {
            title: 'Broken avatar upload on Firefox',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Minor'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'API Roadmap',
    description: 'Plan and track API endpoints from proposal to release.',
    labels: [
      { name: 'Breaking Change', color: '#ef4444' },
      { name: 'Backwards Compatible', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Proposed',
        cards: [
          {
            title: 'GraphQL endpoint for search',
            priority: CardPriority.MEDIUM,
            labelNames: ['Backwards Compatible'],
            checklist: {
              title: 'Proposal',
              items: ['Draft schema', 'Get team feedback'],
            },
          },
        ],
      },
      {
        title: 'Designing',
        cards: [
          {
            title: 'v2 pagination format',
            description: 'Cursor-based pagination replacing offset-based.',
            priority: CardPriority.HIGH,
            labelNames: ['Breaking Change'],
            assignOwner: true,
            checklist: {
              title: 'Design tasks',
              items: [
                { content: 'Write RFC', isDone: true },
                { content: 'Review with FE team', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Building',
        cards: [
          {
            title: 'Bulk export endpoint',
            priority: CardPriority.MEDIUM,
            labelNames: ['Backwards Compatible'],
            checklist: {
              title: 'Implementation',
              items: ['CSV format', 'JSON format'],
            },
          },
        ],
      },
      {
        title: 'Released',
        cards: [
          {
            title: 'Rate limiting headers',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Backwards Compatible'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Code Review Queue',
    description: 'Track pull requests through the review process.',
    labels: [
      { name: 'Needs 2 Reviewers', color: '#f97316' },
      { name: 'Quick Fix', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Open PRs',
        cards: [
          {
            title: '#412 - Add rate limiting to auth endpoints',
            priority: CardPriority.HIGH,
            labelNames: ['Needs 2 Reviewers'],
            checklist: {
              title: 'Before review',
              items: ['CI passing', 'No merge conflicts'],
            },
          },
          {
            title: '#415 - Fix typo in README',
            priority: CardPriority.LOW,
            labelNames: ['Quick Fix'],
          },
        ],
      },
      {
        title: 'In Review',
        cards: [
          {
            title: '#409 - Migrate to Prisma 7',
            description: 'Large diff, touches most of the data layer.',
            priority: CardPriority.HIGH,
            labelNames: ['Needs 2 Reviewers'],
            assignOwner: true,
            checklist: {
              title: 'Review checklist',
              items: [
                { content: 'Reviewer 1 approved', isDone: true },
                { content: 'Reviewer 2 pending', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Changes Requested',
        cards: [
          {
            title: '#403 - New notification preferences UI',
            priority: CardPriority.MEDIUM,
            checklist: {
              title: 'Requested changes',
              items: ['Extract shared component', 'Add loading state'],
            },
          },
        ],
      },
      {
        title: 'Approved',
        cards: [
          {
            title: '#398 - Add board archiving',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Quick Fix'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Incident Response',
    description: 'Coordinate incident response from triage to resolution.',
    labels: [
      { name: 'SEV1', color: '#ef4444' },
      { name: 'SEV2', color: '#f97316' },
    ],
    lists: [
      {
        title: 'Triage',
        cards: [
          {
            title: 'Elevated 500 errors on checkout API',
            priority: CardPriority.HIGH,
            labelNames: ['SEV1'],
            checklist: {
              title: 'First response',
              items: ['Page on-call', 'Check recent deploys'],
            },
          },
        ],
      },
      {
        title: 'Investigating',
        cards: [
          {
            title: 'Database connection pool exhaustion',
            description:
              "Started after last night's traffic spike, connections not releasing.",
            priority: CardPriority.HIGH,
            labelNames: ['SEV1'],
            assignOwner: true,
            checklist: {
              title: 'Investigation',
              items: [
                { content: 'Check connection pool metrics', isDone: true },
                { content: 'Identify leaking query', isDone: false },
              ],
            },
            attachments: [attachmentAt(2, 'connection-pool-graph.jpg')],
          },
        ],
      },
      {
        title: 'Mitigating',
        cards: [
          {
            title: 'Increase pool size as temporary fix',
            priority: CardPriority.HIGH,
            labelNames: ['SEV1'],
            checklist: {
              title: 'Mitigation',
              items: ['Bump pool size config', 'Deploy and monitor'],
            },
          },
        ],
      },
      {
        title: 'Resolved',
        cards: [
          {
            title: 'CDN cache misconfiguration',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['SEV2'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Release Planning',
    description: 'Plan and track features for upcoming releases.',
    labels: [
      { name: 'v2.0', color: '#a855f7' },
      { name: 'v2.1', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Multi-language support',
            priority: CardPriority.LOW,
            labelNames: ['v2.1'],
          },
        ],
      },
      {
        title: 'Next Release',
        cards: [
          {
            title: 'Board templates feature',
            description:
              'Let users create and browse boards from public templates.',
            priority: CardPriority.HIGH,
            labelNames: ['v2.0'],
            assignOwner: true,
            checklist: {
              title: 'Release checklist',
              items: [
                { content: 'Feature complete', isDone: true },
                { content: 'QA sign-off', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In QA',
        cards: [
          {
            title: 'Real-time collaborative cursors',
            priority: CardPriority.MEDIUM,
            labelNames: ['v2.0'],
            checklist: {
              title: 'QA',
              items: [
                'Test with 5+ concurrent users',
                'Test reconnect behavior',
              ],
            },
          },
        ],
      },
      {
        title: 'Shipped',
        cards: [
          {
            title: 'Card attachments feature',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['v2.0'],
          },
        ],
      },
    ],
  },

  // MARKETING
  {
    category: TemplateCategory.MARKETING,
    name: 'Content Calendar',
    description: 'Plan and publish content across channels.',
    labels: [
      { name: 'Blog', color: '#3b82f6' },
      { name: 'Social', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Ideas',
        cards: [
          {
            title: '10 tips for remote work',
            priority: CardPriority.LOW,
            labelNames: ['Blog'],
            checklist: {
              title: 'Outline',
              items: ['List 10 tips', 'Find supporting stats'],
            },
          },
          {
            title: 'Behind the scenes team video',
            priority: CardPriority.LOW,
            labelNames: ['Social'],
          },
        ],
      },
      {
        title: 'Writing',
        cards: [
          {
            title: 'Q3 product update blog post',
            description:
              'Recap of everything shipped this quarter for the newsletter.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Blog'],
            assignOwner: true,
            checklist: {
              title: 'Sections',
              items: [
                { content: 'Intro & highlights', isDone: true },
                { content: 'Feature breakdown', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Editing',
        cards: [
          {
            title: 'Customer success story - Acme Corp',
            priority: CardPriority.MEDIUM,
            labelNames: ['Blog'],
            checklist: {
              title: 'Edit pass',
              items: ['Fact-check quotes', 'Add customer photo'],
            },
          },
        ],
      },
      {
        title: 'Published',
        cards: [
          {
            title: 'How we redesigned our onboarding',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Blog'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Campaign Launch Tracker',
    description: 'Track marketing campaigns from planning to launch.',
    labels: [
      { name: 'Paid', color: '#ef4444' },
      { name: 'Organic', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Planning',
        cards: [
          {
            title: 'Black Friday campaign',
            description:
              'Cross-channel campaign with paid ads, email, and social.',
            priority: CardPriority.HIGH,
            labelNames: ['Paid'],
            checklist: {
              title: 'Planning',
              items: ['Set budget', 'Define target audience'],
            },
          },
        ],
      },
      {
        title: 'In Production',
        cards: [
          {
            title: 'New feature launch teaser video',
            priority: CardPriority.MEDIUM,
            labelNames: ['Organic'],
            assignOwner: true,
            checklist: {
              title: 'Production',
              items: [
                { content: 'Script written', isDone: true },
                { content: 'Filming scheduled', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Scheduled',
        cards: [
          {
            title: 'Instagram ad set - retargeting',
            priority: CardPriority.MEDIUM,
            labelNames: ['Paid'],
            checklist: {
              title: 'Pre-launch',
              items: ['Approve creatives', 'Set schedule'],
            },
          },
        ],
      },
      {
        title: 'Live',
        cards: [
          {
            title: 'Referral campaign - Give $10, Get $10',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Organic'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Social Media Planner',
    description: 'Plan, schedule, and analyze social media posts.',
    labels: [
      { name: 'Twitter/X', color: '#3b82f6' },
      { name: 'LinkedIn', color: '#a855f7' },
    ],
    lists: [
      {
        title: 'Drafts',
        cards: [
          {
            title: 'Thread: how we scaled to 10k users',
            priority: CardPriority.MEDIUM,
            labelNames: ['Twitter/X'],
            checklist: {
              title: 'Draft',
              items: ['Write hook tweet', 'Draft 8-tweet thread'],
            },
          },
        ],
      },
      {
        title: 'Scheduled',
        cards: [
          {
            title: 'Product update announcement',
            priority: CardPriority.MEDIUM,
            labelNames: ['LinkedIn'],
            assignOwner: true,
            checklist: {
              title: 'Ready to post',
              items: ['Copy approved', 'Graphic ready'],
            },
          },
        ],
      },
      {
        title: 'Posted',
        cards: [
          {
            title: 'Hiring announcement - 3 open roles',
            priority: CardPriority.LOW,
            labelNames: ['LinkedIn'],
          },
        ],
      },
      {
        title: 'Analyzed',
        cards: [
          {
            title: 'Weekly engineering tip thread',
            description:
              'Best performing post of the month, 3x average engagement.',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Twitter/X'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Email Marketing Pipeline',
    description: 'Track email campaigns from idea to send.',
    labels: [
      { name: 'Newsletter', color: '#3b82f6' },
      { name: 'Lifecycle', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Ideas',
        cards: [
          {
            title: 'Re-engagement series for dormant users',
            priority: CardPriority.MEDIUM,
            labelNames: ['Lifecycle'],
            checklist: {
              title: 'Brainstorm',
              items: ['3-email sequence idea', 'Define dormant criteria'],
            },
          },
        ],
      },
      {
        title: 'Drafting',
        cards: [
          {
            title: 'Monthly newsletter - July edition',
            description:
              'Feature roundup, top blog posts, and community highlight.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Newsletter'],
            assignOwner: true,
            checklist: {
              title: 'Draft',
              items: [
                { content: 'Feature roundup section', isDone: true },
                { content: 'Community highlight', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Review',
        cards: [
          {
            title: 'Onboarding drip - email 2 of 4',
            priority: CardPriority.MEDIUM,
            labelNames: ['Lifecycle'],
            checklist: {
              title: 'Review',
              items: ['Check links', 'Preview on mobile'],
            },
          },
        ],
      },
      {
        title: 'Sent',
        cards: [
          {
            title: 'June newsletter',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Newsletter'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Event Marketing Plan',
    description:
      'Plan marketing activities before, during, and after an event.',
    labels: [
      { name: 'Logistics', color: '#f97316' },
      { name: 'Promotion', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Pre-Event',
        cards: [
          {
            title: 'Book booth at industry conference',
            priority: CardPriority.HIGH,
            labelNames: ['Logistics'],
            checklist: {
              title: 'Booth prep',
              items: ['Reserve booth space', 'Order banner and swag'],
            },
          },
        ],
      },
      {
        title: 'Promotion',
        cards: [
          {
            title: 'Pre-event email + social teaser',
            description: 'Drive booth traffic with a 2-week promo push.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Promotion'],
            assignOwner: true,
            checklist: {
              title: 'Promo assets',
              items: [
                { content: 'Email teaser', isDone: true },
                { content: 'Social countdown posts', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Day-Of',
        cards: [
          {
            title: 'Live social coverage of the event',
            priority: CardPriority.MEDIUM,
            labelNames: ['Promotion'],
            checklist: {
              title: 'Day-of tasks',
              items: ['Post booth photos', 'Live-tweet keynote'],
            },
          },
        ],
      },
      {
        title: 'Post-Event',
        cards: [
          {
            title: 'Follow up with collected leads',
            priority: CardPriority.HIGH,
            isDone: true,
            labelNames: ['Logistics'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'SEO Task Board',
    description: 'Track SEO tasks from research to monitoring.',
    labels: [
      { name: 'Technical SEO', color: '#f97316' },
      { name: 'Content SEO', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Research',
        cards: [
          {
            title: 'Keyword research - project management niche',
            priority: CardPriority.MEDIUM,
            labelNames: ['Content SEO'],
            checklist: {
              title: 'Research',
              items: ['Pull competitor keywords', 'Identify content gaps'],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Fix duplicate meta descriptions',
            description: 'Affects around 40 pages flagged in the latest audit.',
            priority: CardPriority.HIGH,
            labelNames: ['Technical SEO'],
            assignOwner: true,
            checklist: {
              title: 'Fix plan',
              items: [
                { content: 'Export list of affected pages', isDone: true },
                { content: 'Write unique descriptions', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Published',
        cards: [
          {
            title: '"Best kanban tools 2026" comparison article',
            priority: CardPriority.MEDIUM,
            labelNames: ['Content SEO'],
          },
        ],
      },
      {
        title: 'Monitoring',
        cards: [
          {
            title: 'Site speed improvements rollout',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Technical SEO'],
          },
        ],
      },
    ],
  },

  // PRODUCT_MANAGEMENT
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Product Roadmap',
    description: 'Plan product priorities across time horizons.',
    labels: [
      { name: 'High Impact', color: '#ef4444' },
      { name: 'Quick Win', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Now',
        cards: [
          {
            title: 'Board templates gallery',
            description:
              'Let new users start from a curated template instead of a blank board.',
            priority: CardPriority.HIGH,
            labelNames: ['High Impact'],
            assignOwner: true,
            checklist: {
              title: 'Scope',
              items: [
                { content: 'Backend endpoints', isDone: true },
                { content: 'Gallery UI', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Next',
        cards: [
          {
            title: 'Real-time typing indicators',
            priority: CardPriority.MEDIUM,
            labelNames: ['Quick Win'],
          },
        ],
      },
      {
        title: 'Later',
        cards: [
          {
            title: 'Native mobile app',
            priority: CardPriority.MEDIUM,
            labelNames: ['High Impact'],
            checklist: {
              title: 'Considerations',
              items: ['React Native vs native', 'Offline support needs'],
            },
          },
        ],
      },
      {
        title: 'Shipped',
        cards: [
          {
            title: 'Board sharing via invite link',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Quick Win'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Feature Request Tracker',
    description: 'Collect and prioritize feature requests from users.',
    labels: [
      { name: 'Top Requested', color: '#ef4444' },
      { name: 'Under Consideration', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Submitted',
        cards: [
          {
            title: 'Dark mode support',
            priority: CardPriority.HIGH,
            labelNames: ['Top Requested'],
            checklist: { title: 'Votes', items: ['142 upvotes so far'] },
          },
          {
            title: 'Custom card fields',
            priority: CardPriority.LOW,
            labelNames: ['Under Consideration'],
          },
        ],
      },
      {
        title: 'Reviewing',
        cards: [
          {
            title: 'Recurring cards / repeat tasks',
            description:
              'Second most requested feature, evaluating implementation approaches.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Top Requested'],
            assignOwner: true,
            checklist: {
              title: 'Review',
              items: [
                { content: 'Assess technical complexity', isDone: true },
                { content: 'Estimate effort', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Planned',
        cards: [
          {
            title: 'Calendar view for due dates',
            priority: CardPriority.MEDIUM,
            labelNames: ['Top Requested'],
          },
        ],
      },
      {
        title: 'In Development',
        cards: [
          {
            title: 'Slack integration',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Top Requested'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Sprint Planning',
    description: 'Plan and track work for the current sprint.',
    labels: [
      { name: 'Must Ship', color: '#ef4444' },
      { name: 'If Time Allows', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Backlog',
        cards: [
          {
            title: 'Improve empty state illustrations',
            priority: CardPriority.LOW,
            labelNames: ['If Time Allows'],
          },
        ],
      },
      {
        title: 'This Sprint',
        cards: [
          {
            title: 'Ship attachment previews',
            description: 'Inline preview for images and PDFs on card detail.',
            priority: CardPriority.HIGH,
            labelNames: ['Must Ship'],
            assignOwner: true,
            checklist: {
              title: 'Sprint tasks',
              items: [
                { content: 'Backend presigned URL support', isDone: true },
                { content: 'FE preview component', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          {
            title: 'Fix drag-and-drop on mobile',
            priority: CardPriority.HIGH,
            labelNames: ['Must Ship'],
            checklist: {
              title: 'Fix',
              items: ['Test on iOS + Android', 'Fix touch event handling'],
            },
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Add card due date reminders',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Must Ship'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Product Launch Checklist',
    description: 'Coordinate tasks before, during, and after a launch.',
    labels: [
      { name: 'Engineering', color: '#3b82f6' },
      { name: 'Marketing', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Pre-Launch',
        cards: [
          {
            title: 'Final QA pass on staging',
            priority: CardPriority.HIGH,
            labelNames: ['Engineering'],
            checklist: {
              title: 'QA',
              items: [
                { content: 'Smoke test critical flows', isDone: true },
                { content: 'Load test', isDone: false },
              ],
            },
          },
          {
            title: 'Prepare launch announcement blog post',
            priority: CardPriority.MEDIUM,
            labelNames: ['Marketing'],
          },
        ],
      },
      {
        title: 'Launch Day',
        cards: [
          {
            title: 'Deploy to production',
            description: 'Deploy window: 9am PT, rollback plan ready.',
            priority: CardPriority.HIGH,
            labelNames: ['Engineering'],
            assignOwner: true,
            checklist: {
              title: 'Deploy steps',
              items: [
                { content: 'Final smoke test', isDone: true },
                { content: 'Flip feature flag', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Post-Launch',
        cards: [
          {
            title: 'Monitor error rates for 48h',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Engineering'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'User Feedback Board',
    description: 'Capture and act on feedback from users.',
    labels: [
      { name: 'Positive', color: '#22c55e' },
      { name: 'Pain Point', color: '#ef4444' },
    ],
    lists: [
      {
        title: 'New Feedback',
        cards: [
          {
            title: '"Love the real-time updates!"',
            priority: CardPriority.LOW,
            labelNames: ['Positive'],
          },
          {
            title: 'Confusing board sharing permissions',
            priority: CardPriority.MEDIUM,
            labelNames: ['Pain Point'],
            checklist: {
              title: 'Follow up',
              items: ['Ask user for more detail'],
            },
          },
        ],
      },
      {
        title: 'Categorized',
        cards: [
          {
            title: 'Multiple reports of slow search',
            description: 'Grouped 6 separate reports into one theme.',
            priority: CardPriority.HIGH,
            labelNames: ['Pain Point'],
            assignOwner: true,
            checklist: {
              title: 'Categorization',
              items: [
                { content: 'Group similar reports', isDone: true },
                { content: 'Assign to engineering', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Actioned',
        cards: [
          {
            title: 'Added bulk card move feature',
            priority: CardPriority.MEDIUM,
            isDone: true,
            labelNames: ['Positive'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Competitive Analysis',
    description: 'Track and document research on competitors.',
    labels: [
      { name: 'Direct Competitor', color: '#ef4444' },
      { name: 'Adjacent Player', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Competitors',
        cards: [
          {
            title: 'Trello',
            priority: CardPriority.MEDIUM,
            labelNames: ['Direct Competitor'],
          },
          {
            title: 'Linear',
            priority: CardPriority.LOW,
            labelNames: ['Adjacent Player'],
          },
        ],
      },
      {
        title: 'Researching',
        cards: [
          {
            title: 'Asana pricing and packaging deep dive',
            description:
              'Comparing tiers, seat pricing, and enterprise add-ons.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Direct Competitor'],
            assignOwner: true,
            checklist: {
              title: 'Research areas',
              items: [
                { content: 'Pricing tiers', isDone: true },
                { content: 'Feature comparison', isDone: false },
              ],
            },
            attachments: [attachmentAt(3, 'pricing-comparison.jpg')],
          },
        ],
      },
      {
        title: 'Documented',
        cards: [
          {
            title: 'Monday.com feature comparison sheet',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Direct Competitor'],
          },
        ],
      },
    ],
  },

  // REMOTE_WORK
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'New Hire Onboarding',
    description: 'Help new remote hires get set up and settled in.',
    labels: [
      { name: 'IT Setup', color: '#3b82f6' },
      { name: 'HR', color: '#a855f7' },
    ],
    lists: [
      {
        title: 'Before Day 1',
        cards: [
          {
            title: 'Send welcome email and laptop',
            priority: CardPriority.MEDIUM,
            labelNames: ['IT Setup'],
            checklist: {
              title: 'Shipping',
              items: ['Order laptop', 'Ship 3 days before start date'],
            },
          },
        ],
      },
      {
        title: 'Week 1',
        cards: [
          {
            title: 'Complete security training',
            priority: CardPriority.MEDIUM,
            labelNames: ['HR'],
            assignOwner: true,
            checklist: {
              title: 'Week 1 tasks',
              items: [
                { content: 'Security training', isDone: false },
                { content: 'Meet the team call', isDone: true },
              ],
            },
          },
        ],
      },
      {
        title: 'Week 2',
        cards: [
          {
            title: 'Shadow a support ticket',
            priority: CardPriority.LOW,
            labelNames: ['HR'],
          },
        ],
      },
      {
        title: 'Ongoing',
        cards: [
          {
            title: '1:1 with manager',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['HR'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Remote Team Standup',
    description: 'Async daily standup for distributed teams.',
    labels: [
      { name: 'Blocked', color: '#ef4444' },
      { name: 'On Track', color: '#22c55e' },
    ],
    lists: [
      {
        title: 'Yesterday',
        cards: [
          {
            title: 'Shipped the notification preferences page',
            priority: CardPriority.LOW,
            labelNames: ['On Track'],
          },
        ],
      },
      {
        title: 'Today',
        cards: [
          {
            title: 'Finish code review for PR #412',
            priority: CardPriority.MEDIUM,
            labelNames: ['On Track'],
            assignOwner: true,
            checklist: {
              title: "Today's plan",
              items: ['Review PR #412', 'Pair on the auth bug'],
            },
          },
        ],
      },
      {
        title: 'Blockers',
        cards: [
          {
            title: 'Waiting on design approval for onboarding flow',
            priority: CardPriority.HIGH,
            labelNames: ['Blocked'],
            checklist: {
              title: 'Blocker',
              items: ['Ping design in #product channel'],
            },
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Home Office Setup Guide',
    description: 'Track equipment needed for a new home office.',
    labels: [
      { name: 'Reimbursable', color: '#22c55e' },
      { name: 'Personal', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'To Buy',
        cards: [
          {
            title: 'Ergonomic chair',
            priority: CardPriority.MEDIUM,
            labelNames: ['Reimbursable'],
            checklist: {
              title: 'Research',
              items: ['Compare 3 options under $300'],
            },
          },
          {
            title: 'Standing desk',
            priority: CardPriority.LOW,
            labelNames: ['Reimbursable'],
          },
        ],
      },
      {
        title: 'Ordered',
        cards: [
          {
            title: '27" external monitor',
            description: 'Ordered from company IT store, arriving next week.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Reimbursable'],
            assignOwner: true,
            checklist: {
              title: 'Order tracking',
              items: [
                { content: 'Order placed', isDone: true },
                { content: 'Confirm delivery address', isDone: true },
              ],
            },
          },
        ],
      },
      {
        title: 'Received',
        cards: [
          {
            title: 'Noise-cancelling headset',
            priority: CardPriority.LOW,
            labelNames: ['Personal'],
          },
        ],
      },
      {
        title: 'Set Up',
        cards: [
          {
            title: 'Webcam and ring light',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Personal'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Async Communication Hub',
    description: 'Organize announcements and decisions for remote teams.',
    labels: [
      { name: 'Company-wide', color: '#a855f7' },
      { name: 'Team-only', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Announcements',
        cards: [
          {
            title: 'New holiday calendar for 2026',
            priority: CardPriority.LOW,
            labelNames: ['Company-wide'],
          },
        ],
      },
      {
        title: 'Discussions',
        cards: [
          {
            title: 'Should we adopt a 4-day work week trial?',
            description:
              'Open discussion thread, gathering opinions before a decision.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Company-wide'],
            assignOwner: true,
            checklist: {
              title: 'Discussion',
              items: [
                { content: 'Collect feedback from all teams', isDone: false },
                { content: 'Share results with leadership', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Decisions',
        cards: [
          {
            title: 'Standardized on Figma for all design work',
            priority: CardPriority.MEDIUM,
            labelNames: ['Team-only'],
            checklist: {
              title: 'Rollout',
              items: ['Migrate existing files', 'Cancel old tool subscription'],
            },
          },
        ],
      },
      {
        title: 'Archived',
        cards: [
          {
            title: 'Q1 remote work survey results',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['Company-wide'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Team Retrospective Board',
    description: 'Reflect on what went well and plan improvements.',
    labels: [
      { name: 'Process', color: '#3b82f6' },
      { name: 'Tooling', color: '#a855f7' },
    ],
    lists: [
      {
        title: 'Went Well',
        cards: [
          {
            title: 'Shipped the sprint on time',
            priority: CardPriority.LOW,
            labelNames: ['Process'],
          },
          {
            title: 'Great async communication this cycle',
            priority: CardPriority.LOW,
            labelNames: ['Process'],
          },
        ],
      },
      {
        title: 'To Improve',
        cards: [
          {
            title: 'Too many meetings interrupting deep work',
            description:
              'Multiple team members flagged this in the retro survey.',
            priority: CardPriority.MEDIUM,
            labelNames: ['Process'],
            checklist: {
              title: 'Ideas',
              items: [
                { content: 'No-meeting Wednesdays', isDone: false },
                { content: 'Default to async updates', isDone: false },
              ],
            },
          },
        ],
      },
      {
        title: 'Action Items',
        cards: [
          {
            title: 'Set up no-meeting Wednesdays',
            priority: CardPriority.MEDIUM,
            assignOwner: true,
            isDone: true,
            labelNames: ['Process'],
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Time Zone Meeting Planner',
    description: 'Coordinate meeting times across time zones.',
    labels: [
      { name: 'APAC Friendly', color: '#22c55e' },
      { name: 'US/EU Friendly', color: '#3b82f6' },
    ],
    lists: [
      {
        title: 'Proposed Times',
        cards: [
          {
            title: 'Quarterly all-hands - option A (9am PT)',
            priority: CardPriority.MEDIUM,
            labelNames: ['US/EU Friendly'],
          },
          {
            title: 'Quarterly all-hands - option B (7am PT)',
            priority: CardPriority.MEDIUM,
            labelNames: ['APAC Friendly'],
          },
        ],
      },
      {
        title: 'Confirmed',
        cards: [
          {
            title: 'Weekly design review - Tuesdays 8am PT',
            description: 'Works for US, EU morning, and APAC evening.',
            priority: CardPriority.LOW,
            labelNames: ['US/EU Friendly'],
            assignOwner: true,
            checklist: {
              title: 'Confirmed with',
              items: ['US team', 'EU team', 'APAC team'],
            },
          },
        ],
      },
      {
        title: 'Rescheduled',
        cards: [
          {
            title: 'Engineering sync moved to accommodate new APAC hire',
            priority: CardPriority.LOW,
            labelNames: ['APAC Friendly'],
          },
        ],
      },
      {
        title: 'Done',
        cards: [
          {
            title: 'Q2 all-hands - held at 9am PT',
            priority: CardPriority.LOW,
            isDone: true,
            labelNames: ['US/EU Friendly'],
          },
        ],
      },
    ],
  },
];

function normalizeList(list: string | TemplateListSeed): TemplateListSeed {
  return typeof list === 'string' ? { title: list } : list;
}

function normalizeChecklistItem(
  item: string | TemplateChecklistItemSeed,
): TemplateChecklistItemSeed {
  return typeof item === 'string' ? { content: item } : item;
}

export async function seedTemplates(prisma: PrismaClient, ownerId: string) {
  await prisma.board.deleteMany({ where: { isTemplate: true } });

  for (let i = 0; i < TEMPLATES.length; i++) {
    const template = TEMPLATES[i];
    const background = TEMPLATE_BACKGROUNDS[i % TEMPLATE_BACKGROUNDS.length];

    const board = await prisma.board.create({
      data: {
        name: template.name,
        background,
        ownerId,
        isTemplate: true,
        templateCategory: template.category,
        templateDescription: template.description,
        templateVisibility: 'PUBLIC',
        labels: template.labels ? { create: template.labels } : undefined,
      },
      include: { labels: true },
    });

    const labelIdByName = Object.fromEntries(
      board.labels.map((label) => [label.name, label.id]),
    );

    for (const [listIndex, rawList] of template.lists.entries()) {
      const list = normalizeList(rawList);
      const newList = await prisma.list.create({
        data: {
          title: list.title,
          order: (listIndex + 1) * 1000,
          boardId: board.id,
        },
      });

      for (const [cardIndex, card] of (list.cards ?? []).entries()) {
        await prisma.card.create({
          data: {
            title: card.title,
            description: card.description,
            priority: card.priority ?? CardPriority.MEDIUM,
            order: (cardIndex + 1) * 1000,
            isDone: card.isDone ?? false,
            cover: card.cover,
            listId: newList.id,
            labels: {
              connect: (card.labelNames ?? [])
                .map((name) => labelIdByName[name])
                .filter((id): id is string => Boolean(id))
                .map((id) => ({ id })),
            },
            assignees: card.assignOwner
              ? { connect: [{ id: ownerId }] }
              : undefined,
            checklists: card.checklist
              ? {
                  create: [
                    {
                      title: card.checklist.title,
                      order: 1000,
                      items: {
                        create: card.checklist.items.map(
                          (rawItem, itemIndex) => {
                            const item = normalizeChecklistItem(rawItem);
                            return {
                              content: item.content,
                              order: (itemIndex + 1) * 1000,
                              isDone: item.isDone ?? false,
                            };
                          },
                        ),
                      },
                    },
                  ],
                }
              : undefined,
            attachments: card.attachments
              ? {
                  create: card.attachments.map((att) => ({
                    filename: att.filename,
                    key: att.url,
                    mimeType: att.mimeType,
                    uploadedById: ownerId,
                  })),
                }
              : undefined,
          },
        });
      }
    }
  }

  console.log(`Seeded ${TEMPLATES.length} templates`);
}
