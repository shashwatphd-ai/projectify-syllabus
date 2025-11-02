# University-Industry Project Generator

A full-stack web application that automates the generation of industry-sponsored project proposals for university courses by analyzing syllabi and matching them with real companies.

## Project Overview

This application helps university instructors:
1. Upload course syllabi to extract learning outcomes and requirements
2. Configure project generation preferences (industries, companies, team size)
3. Generate AI-powered project proposals matched to real companies
4. Review and evaluate generated project briefs with detailed forms

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend (Lovable Cloud/Supabase)
- **PostgreSQL** database
- **Supabase Auth** for authentication
- **Edge Functions** (Deno) for serverless logic
- **Row Level Security (RLS)** for data access control

### AI Integration
- **Lovable AI Gateway** (Google Gemini & OpenAI models)
- Syllabus parsing and analysis
- Company matching and project generation
- Learning outcome alignment scoring

## Database Schema

### Tables
- **profiles** - User profile information
- **course_profiles** - Course details (title, level, outcomes, schedule)
- **company_profiles** - Enriched company data (sector, technologies, needs)
- **projects** - Generated project proposals with scores
- **project_forms** - Detailed project forms (6 sections + milestones)
- **evaluations** - Project feedback from instructors
- **user_roles** - Role-based access control

## Edge Functions

### 1. `parse-syllabus`
- Extracts structured data from uploaded syllabus PDFs
- Uses AI to identify learning outcomes, schedule, and requirements
- Returns course metadata for profile creation

### 2. `generate-projects`
- Fetches companies from database based on location/industry
- Falls back to AI company search if database is empty
- Generates detailed project proposals with:
  - Tasks and deliverables
  - Budget estimates
  - Alignment scores (LO, feasibility, mutual benefit)
  - Six-form structured briefs

### 3. `data-enrichment-pipeline`
- Enriches company profiles with external data
- Analyzes business needs using AI
- Upserts enriched data to `company_profiles` table
- **Status**: Currently not integrated into main workflow

## Application Flow

### 1. Authentication (`/auth`)
- Email/password sign-up and login
- Requires `.edu` email addresses
- Auto-confirm enabled for development

### 2. Upload Syllabus (`/upload`)
- Upload course syllabus (PDF)
- Auto-detect location from email domain
- Parse syllabus using AI edge function
- Store course profile in database

### 3. Configure Generation (`/configure`)
- Set industry preferences
- Specify target companies (optional)
- Choose number of project teams
- Trigger project generation

### 4. View Projects (`/projects`)
- Browse generated project proposals
- Filter by tier (Gold/Silver/Bronze)
- Sort by various scores
- Mark projects for review

### 5. Project Details (`/project/:id`)
- **Overview**: Description, objectives, tasks, deliverables
- **Academic**: Learning outcomes alignment
- **Logistics**: Timeline, milestones, team structure
- **Contact**: Company information and collaboration details
- Provide feedback and evaluations

## Known Issues & Pipeline Gaps

### Critical Issues
1. **Data Enrichment Not Triggered**: `data-enrichment-pipeline` edge function is never called, leaving `company_profiles` table empty
2. **AI Fallback Dependency**: Project generation relies entirely on AI company search instead of real data
3. **No Error Handling**: Silent failures in project generation with no user feedback

### Medium Priority
- Location auto-detection inconsistent
- No validation for duplicate course uploads
- Missing loading states during long operations

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables
The following are auto-configured by Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Function Secrets
Required secrets (configured via Lovable Cloud):
- `LOVABLE_API_KEY` - Auto-provisioned for AI functionality

## Development Workflow

### Making Database Changes
Use the Supabase migration tool via Lovable interface:
1. Never edit `src/integrations/supabase/types.ts` directly
2. Use migration tool for schema changes
3. Always include RLS policies for new tables

### Adding Edge Functions
1. Create function in `supabase/functions/<function-name>/index.ts`
2. Update `supabase/config.toml` with function configuration
3. Functions auto-deploy on code changes

### Testing Edge Functions
```bash
# View logs for specific function
# Use Lovable Cloud backend interface or debugging tools
```

## Deployment

### Via Lovable
1. Click **Publish** button (top-right on desktop)
2. App deploys to `*.lovable.app` subdomain
3. Custom domains available on paid plans

### Manual Deployment
```bash
# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
.
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── ProjectFeedback.tsx
│   │   └── project-detail/ # Project detail tabs
│   ├── pages/              # Route components
│   │   ├── Landing.tsx
│   │   ├── Auth.tsx
│   │   ├── Upload.tsx
│   │   ├── Configure.tsx
│   │   ├── Projects.tsx
│   │   └── ProjectDetail.tsx
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External service integrations
│   │   └── supabase/
│   ├── lib/               # Utilities
│   └── index.css          # Global styles & design tokens
├── supabase/
│   ├── functions/         # Edge functions
│   │   ├── parse-syllabus/
│   │   ├── generate-projects/
│   │   └── data-enrichment-pipeline/
│   ├── migrations/        # Database migrations (auto-managed)
│   └── config.toml        # Supabase configuration
└── public/               # Static assets
```

## Contributing

### Key Principles
1. **Security First**: Always implement RLS policies
2. **Type Safety**: Leverage TypeScript fully
3. **Design System**: Use semantic tokens from `index.css`
4. **Component Reusability**: Create focused, single-purpose components

### Code Style
- Use functional components with hooks
- Prefer `const` over `let`
- Use meaningful variable names
- Keep functions small and focused

## Future Improvements

1. **Integrate Data Enrichment**: Call `data-enrichment-pipeline` before project generation
2. **Real-time Updates**: Add progress indicators for long-running operations
3. **Batch Operations**: Support multiple course uploads
4. **Export Functionality**: Download project briefs as PDFs
5. **Analytics Dashboard**: Track project success metrics
6. **Role Management**: Implement instructor/admin/student roles

## Support & Resources

- **Project URL**: https://lovable.dev/projects/db2da809-30b7-405b-aa5b-093df17ab66c
- **Documentation**: https://docs.lovable.dev
- **Community**: https://discord.com/channels/1119885301872070706

## License

[Add your license here]
