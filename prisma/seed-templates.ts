import { PrismaClient } from '../generated/prisma/client';
import { CardPriority, TemplateCategory } from '../generated/prisma/enums';

interface TemplateCardSeed {
  title: string;
  description?: string;
  priority?: CardPriority;
  checklist?: { title: string; items: string[] };
}

interface TemplateListSeed {
  title: string;
  cards?: TemplateCardSeed[];
}

interface TemplateSeed {
  category: TemplateCategory;
  name: string;
  description: string;
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

const TEMPLATES: TemplateSeed[] = [
  // BUSINESS
  {
    category: TemplateCategory.BUSINESS,
    name: 'Sales Pipeline CRM',
    description: 'Track leads from first contact to closed deal.',
    lists: [
      {
        title: 'Leads',
        cards: [
          {
            title: 'Acme Corp - Website Redesign',
            description: 'Inbound lead from contact form.',
            priority: CardPriority.LOW,
          },
        ],
      },
      {
        title: 'Qualified',
        cards: [
          {
            title: 'Globex Inc - Cloud Migration',
            priority: CardPriority.MEDIUM,
          },
        ],
      },
      'Proposal Sent',
      'Negotiation',
      {
        title: 'Won',
        cards: [
          {
            title: 'Initech - Annual Support Contract',
            priority: CardPriority.HIGH,
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Startup Roadmap',
    description: 'Plan and track your startup from idea to launch.',
    lists: ['Ideas', 'Validating', 'Building', 'Launched'],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Meeting Agenda Tracker',
    description: 'Keep discussion topics organized across meetings.',
    lists: ['Backlog', 'This Week', 'In Discussion', 'Resolved'],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Vendor Management',
    description: 'Track vendors from prospecting to active contract.',
    lists: ['Prospecting', 'Evaluating', 'Contracted', 'Active'],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'Budget Planning',
    description: 'Review and approve budget requests by team.',
    lists: ['Requests', 'Under Review', 'Approved', 'Rejected'],
  },
  {
    category: TemplateCategory.BUSINESS,
    name: 'OKR Tracker',
    description: 'Track objectives and key results each quarter.',
    lists: ['Objectives', 'Key Results', 'In Progress', 'Achieved'],
  },

  // DESIGN
  {
    category: TemplateCategory.DESIGN,
    name: 'Design Sprint',
    description: 'Run a 4-phase design sprint from research to test.',
    lists: [
      {
        title: 'Research',
        cards: [
          { title: 'Interview 5 target users', priority: CardPriority.MEDIUM },
        ],
      },
      {
        title: 'Ideate',
        cards: [{ title: 'Sketch 3 concepts', priority: CardPriority.MEDIUM }],
      },
      'Prototype',
      {
        title: 'Test',
        cards: [
          {
            title: 'Run usability test with prototype',
            priority: CardPriority.HIGH,
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Brand Style Guide',
    description: 'Draft and finalize your brand guidelines.',
    lists: ['Backlog', 'Drafting', 'Review', 'Finalized'],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'UI Component Library',
    description: 'Track design and delivery of reusable UI components.',
    lists: ['To Design', 'In Progress', 'In Review', 'Shipped'],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Portfolio Tracker',
    description: 'Manage freelance design projects end to end.',
    lists: ['Concepts', 'In Progress', 'Client Review', 'Completed'],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Design Feedback Board',
    description: 'Collect and triage feedback on design work.',
    lists: ['New Feedback', 'Triaged', 'In Revision', 'Resolved'],
  },
  {
    category: TemplateCategory.DESIGN,
    name: 'Illustration Pipeline',
    description: 'Track illustrations from sketch to final art.',
    lists: ['Sketches', 'Linework', 'Coloring', 'Final'],
  },

  // EDUCATION
  {
    category: TemplateCategory.EDUCATION,
    name: 'Course Curriculum Planner',
    description: 'Plan and publish course topics and materials.',
    lists: [
      {
        title: 'Topics',
        cards: [
          {
            title: 'Introduction to Algorithms',
            priority: CardPriority.MEDIUM,
          },
        ],
      },
      {
        title: 'Drafting',
        cards: [
          { title: 'Data Structures Deep Dive', priority: CardPriority.MEDIUM },
        ],
      },
      'Reviewing',
      {
        title: 'Published',
        cards: [
          { title: 'Getting Started Module', priority: CardPriority.LOW },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Student Project Tracker',
    description: 'Track student projects from assignment to grading.',
    lists: ['Assigned', 'In Progress', 'Submitted', 'Graded'],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Classroom Task Board',
    description: 'A simple board for classroom activities and tasks.',
    lists: ['To Do', 'Doing', 'Done'],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Study Planner',
    description: 'Organize subjects and review progress weekly.',
    lists: ['Subjects', 'This Week', 'Reviewing', 'Mastered'],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'Thesis Research Tracker',
    description: 'Track sources, reading, and writing for your thesis.',
    lists: ['Sources', 'Reading', 'Writing', 'Cited'],
  },
  {
    category: TemplateCategory.EDUCATION,
    name: 'School Event Planning',
    description: 'Plan school events from idea to completion.',
    lists: ['Ideas', 'Planning', 'Confirmed', 'Completed'],
  },

  // ENGINEERING
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Sprint Board',
    description: 'A classic agile sprint board for engineering teams.',
    lists: [
      {
        title: 'Backlog',
        cards: [{ title: 'Add dark mode support', priority: CardPriority.LOW }],
      },
      {
        title: 'To Do',
        cards: [
          {
            title: 'Fix pagination bug in reports',
            description: 'Page size is ignored when filters are applied.',
            priority: CardPriority.MEDIUM,
            checklist: {
              title: 'Steps',
              items: ['Reproduce bug', 'Write fix', 'Add test'],
            },
          },
        ],
      },
      {
        title: 'In Progress',
        cards: [
          { title: 'Implement OAuth login', priority: CardPriority.HIGH },
        ],
      },
      'In Review',
      {
        title: 'Done',
        cards: [
          { title: 'Upgrade Node to v20', priority: CardPriority.MEDIUM },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Bug Tracker',
    description: 'Track bugs from report to fix.',
    lists: ['Reported', 'Confirmed', 'In Progress', 'Fixed'],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'API Roadmap',
    description: 'Plan and track API endpoints from proposal to release.',
    lists: ['Proposed', 'Designing', 'Building', 'Released'],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Code Review Queue',
    description: 'Track pull requests through the review process.',
    lists: ['Open PRs', 'In Review', 'Changes Requested', 'Approved'],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Incident Response',
    description: 'Coordinate incident response from triage to resolution.',
    lists: ['Triage', 'Investigating', 'Mitigating', 'Resolved'],
  },
  {
    category: TemplateCategory.ENGINEERING,
    name: 'Release Planning',
    description: 'Plan and track features for upcoming releases.',
    lists: ['Backlog', 'Next Release', 'In QA', 'Shipped'],
  },

  // MARKETING
  {
    category: TemplateCategory.MARKETING,
    name: 'Content Calendar',
    description: 'Plan and publish content across channels.',
    lists: [
      {
        title: 'Ideas',
        cards: [
          { title: '10 tips for remote work', priority: CardPriority.LOW },
        ],
      },
      {
        title: 'Writing',
        cards: [
          {
            title: 'Q3 product update blog post',
            priority: CardPriority.MEDIUM,
          },
        ],
      },
      'Editing',
      {
        title: 'Published',
        cards: [
          {
            title: 'How we redesigned our onboarding',
            priority: CardPriority.LOW,
          },
        ],
      },
    ],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Campaign Launch Tracker',
    description: 'Track marketing campaigns from planning to launch.',
    lists: ['Planning', 'In Production', 'Scheduled', 'Live'],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Social Media Planner',
    description: 'Plan, schedule, and analyze social media posts.',
    lists: ['Drafts', 'Scheduled', 'Posted', 'Analyzed'],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Email Marketing Pipeline',
    description: 'Track email campaigns from idea to send.',
    lists: ['Ideas', 'Drafting', 'In Review', 'Sent'],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'Event Marketing Plan',
    description:
      'Plan marketing activities before, during, and after an event.',
    lists: ['Pre-Event', 'Promotion', 'Day-Of', 'Post-Event'],
  },
  {
    category: TemplateCategory.MARKETING,
    name: 'SEO Task Board',
    description: 'Track SEO tasks from research to monitoring.',
    lists: ['Research', 'In Progress', 'Published', 'Monitoring'],
  },

  // PRODUCT_MANAGEMENT
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Product Roadmap',
    description: 'Plan product priorities across time horizons.',
    lists: ['Now', 'Next', 'Later', 'Shipped'],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Feature Request Tracker',
    description: 'Collect and prioritize feature requests from users.',
    lists: ['Submitted', 'Reviewing', 'Planned', 'In Development'],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Sprint Planning',
    description: 'Plan and track work for the current sprint.',
    lists: ['Backlog', 'This Sprint', 'In Progress', 'Done'],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Product Launch Checklist',
    description: 'Coordinate tasks before, during, and after a launch.',
    lists: ['Pre-Launch', 'Launch Day', 'Post-Launch'],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'User Feedback Board',
    description: 'Capture and act on feedback from users.',
    lists: ['New Feedback', 'Categorized', 'Actioned'],
  },
  {
    category: TemplateCategory.PRODUCT_MANAGEMENT,
    name: 'Competitive Analysis',
    description: 'Track and document research on competitors.',
    lists: ['Competitors', 'Researching', 'Documented'],
  },

  // REMOTE_WORK
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'New Hire Onboarding',
    description: 'Help new remote hires get set up and settled in.',
    lists: [
      {
        title: 'Before Day 1',
        cards: [
          {
            title: 'Send welcome email and laptop',
            priority: CardPriority.MEDIUM,
          },
        ],
      },
      {
        title: 'Week 1',
        cards: [
          {
            title: 'Complete security training',
            priority: CardPriority.MEDIUM,
          },
        ],
      },
      'Week 2',
      {
        title: 'Ongoing',
        cards: [{ title: '1:1 with manager', priority: CardPriority.LOW }],
      },
    ],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Remote Team Standup',
    description: 'Async daily standup for distributed teams.',
    lists: ['Yesterday', 'Today', 'Blockers'],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Home Office Setup Guide',
    description: 'Track equipment needed for a new home office.',
    lists: ['To Buy', 'Ordered', 'Received', 'Set Up'],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Async Communication Hub',
    description: 'Organize announcements and decisions for remote teams.',
    lists: ['Announcements', 'Discussions', 'Decisions', 'Archived'],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Team Retrospective Board',
    description: 'Reflect on what went well and plan improvements.',
    lists: ['Went Well', 'To Improve', 'Action Items'],
  },
  {
    category: TemplateCategory.REMOTE_WORK,
    name: 'Time Zone Meeting Planner',
    description: 'Coordinate meeting times across time zones.',
    lists: ['Proposed Times', 'Confirmed', 'Rescheduled', 'Done'],
  },
];

function normalizeList(list: string | TemplateListSeed): TemplateListSeed {
  return typeof list === 'string' ? { title: list } : list;
}

export async function seedTemplates(prisma: PrismaClient, ownerId: string) {
  await prisma.board.deleteMany({ where: { isTemplate: true } });

  for (let i = 0; i < TEMPLATES.length; i++) {
    const template = TEMPLATES[i];

    const background = TEMPLATE_BACKGROUNDS[i % TEMPLATE_BACKGROUNDS.length];

    await prisma.board.create({
      data: {
        name: template.name,
        background: background,
        ownerId,
        isTemplate: true,
        templateCategory: template.category,
        templateDescription: template.description,
        lists: {
          create: template.lists.map((rawList, listIndex) => {
            const list = normalizeList(rawList);
            return {
              title: list.title,
              order: (listIndex + 1) * 1000,
              cards: {
                create: (list.cards ?? []).map((card, cardIndex) => ({
                  title: card.title,
                  description: card.description,
                  priority: card.priority ?? CardPriority.MEDIUM,
                  order: (cardIndex + 1) * 1000,
                  checklists: card.checklist
                    ? {
                        create: [
                          {
                            title: card.checklist.title,
                            order: 1000,
                            items: {
                              create: card.checklist.items.map(
                                (content, itemIndex) => ({
                                  content,
                                  order: (itemIndex + 1) * 1000,
                                  isDone: false,
                                }),
                              ),
                            },
                          },
                        ],
                      }
                    : undefined,
                })),
              },
            };
          }),
        },
      },
    });
  }

  console.log(`Seeded ${TEMPLATES.length} templates`);
}
