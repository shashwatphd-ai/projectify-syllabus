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

### 3. `discover-companies`
- Discovers companies using Google Search + AI
- Enriches with Apollo.io contact & organization data
- Fetches market intelligence (job postings, technologies, funding)
- Tracks generation runs for audit trail
- Stores enriched data to `company_profiles` table
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

### Critical Issues (RESOLVED)
1. ✅ **Company Discovery Integrated**: `discover-companies` function now called automatically during project generation
2. ✅ **Real Company Data**: Uses Apollo.io enrichment with market intelligence (job postings, technologies)
3. ✅ **Generation Tracking**: Full audit trail with `generation_runs` table tracking statistics

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
│   │   ├── parse-syllabus/      # PDF parsing & course extraction
│   │   ├── discover-companies/  # Company discovery + Apollo enrichment
│   │   ├── generate-projects/   # AI project generation
│   │   ├── enrich-apollo/       # Batch Apollo enrichment
│   │   └── data-enrichment-pipeline/ # Legacy (being phased out)
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

1. ✅ **Data Enrichment Integrated**: `discover-companies` now called automatically with Apollo.io + market intelligence
2. **Real-time Updates**: Add progress indicators for long-running operations
3. **Batch Operations**: Support multiple course uploads
4. **Export Functionality**: Download project briefs as PDFs
5. **Auto-Refresh**: Automatically refresh stale company data (>90 days old)
6. **Generation History UI**: Dashboard showing run statistics and analytics
5. **Analytics Dashboard**: Track project success metrics
6. **Role Management**: Implement instructor/admin/student roles

## Project Generation Algorithm & Workflow

### Algorithm for Matching and Drafting Projects

**Step 1: Establish course context**
- Extract learning outcomes and course description from syllabus (e.g., MGT 471)
- Identify key competencies: strategic-management concepts, external/internal analysis, strategic alternatives, decision-making
- Note project duration (typically 3 months/12-13 weeks) to scope appropriately

**Step 2: Define search parameters**
- Identify geographical focus (e.g., Kansas City metropolitan area)
- Target diverse industries (health-tech, finance, consumer goods, agriculture, utilities, engineering, sports, manufacturing)
- Use search tools to scan regional business news and market reports for growth sectors and challenges
- Reference regional reports (e.g., KC Tech Council 2025 report on tech-sector growth)

**Step 3: Select potential companies and challenges**
- Compile list of notable area companies based on:
  - Local economic significance
  - Presence in business news
  - Known strategic transitions (digital transformation, renewable energy, market expansion)
- For each company, identify plausible strategic challenges:
  - Digital disruption
  - Regulatory changes
  - Competitive pressure
  - Diversification opportunities
  - International expansion

**Step 4: Draft project descriptions**
- Frame each challenge as a semester-long project requiring:
  - **External environment analysis**: market trends, competitors, regulations
  - **Internal resources assessment**: capabilities, resources, competencies
  - **Strategic alternatives evaluation**: business-level, corporate-level, international strategies
  - **Actionable recommendations**: deliverables companies can implement
- Estimate budgets reflecting modest investments for high-impact insights
- Ensure feasibility for student teams with limited proprietary data access

**Step 5: Populate Industry Project Creation Forms (Forms 1-6)**
- Complete all required fields: title, industry, description, company info, skills, timeline, logistics, academic preferences
- Use plausible contact details where specific information unavailable
- Choose appropriate team sizes (typically 3-5 students)
- Set realistic timelines (12-13 weeks) and weekly hour expectations (6-12 hours/week)

---

### Workflow for Verifying Learning Outcome Alignment

**Step 1: Extract learning outcomes**
- Document explicit learning outcomes from course syllabus
- Example (MGT 471 Strategic Management):
  1. Define strategic-management concepts and competitive advantage
  2. Analyse external environmental factors, including international considerations
  3. Analyse internal environmental factors (resources and capabilities)
  4. Compare business-level and corporate-level strategies, including international strategies
  5. Apply knowledge to make strategic management decisions

**Step 2: Create alignment rubric**
- Map each learning outcome to project activities:
  - External analysis ↔ market/industry research, regulatory/policy review
  - Internal analysis ↔ capabilities audit, resource assessment
  - Strategy comparison ↔ developing and evaluating alternative strategies
  - Application ↔ producing final recommendations and strategic plans

**Step 3: Evaluate each project**
- Assess whether project scope requires students to:
  - Perform both external and internal analyses
  - Consider multiple strategic options
  - Produce actionable recommendations
- Check that each learning outcome is addressed by at least one project element
- Adjust project descriptions if any outcome is missing (add international component, competitive analysis, etc.)
- Document alignment in mapping table

**Step 4: Ensure feasibility and educational value**
- Confirm strategic questions are complex enough to challenge students
- Verify projects are manageable within three months
- Ensure required skills match junior/senior/graduate business student level
- Validate projects allow practice of strategic frameworks taught in course

---

## Strategic Management Course Learning Outcomes Alignment

### Course Learning Outcomes (MGT 471)

The Strategic Management course expects students to:
1. **Define** strategic-management concepts and theories (such as competitive advantage)
2. **Analyse** external environmental factors (including international factors)
3. **Analyse** internal environmental factors (resources and capabilities)
4. **Compare** business-level and corporate-level strategies (including international strategies)
5. **Apply** knowledge to make strategic decisions

### Project-to-Learning-Outcome Mapping

| Project / Company | Alignment with Course Learning Outcomes |
|-------------------|----------------------------------------|
| **Oracle Health – Competitive Strategy Analysis** | Students examine the **external environment** by mapping the EHR market and cloud-based competitors (outcome 2). They assess Oracle Health's **internal resources** (legacy software, Oracle cloud integration) satisfying outcome 3. Comparing options such as partnerships, acquisitions or niche focus exercises outcome 4 (business vs. corporate-level strategies). Crafting recommendations applies strategic concepts to real decisions (outcome 5). |
| **Hallmark – Digital Diversification Strategy** | Evaluating digital-communication and media trends requires external analysis (outcome 2). Assessing Hallmark's brand equity, content-creation capabilities and distribution channels engages internal resource analysis (outcome 3). Students compare strategies like leveraging streaming content, mobile apps or partnerships (outcome 4), and recommend diversification moves (outcome 5). |
| **Garmin – Sustaining Advantage in Wearables** | Students analyse the **competitive landscape** of wearables (external factors, outcome 2). Reviewing Garmin's R&D, product portfolio and brand positioning engages internal assessment (outcome 3). They compare strategies such as focusing on niche athlete markets versus broad consumer markets (business-level) or partnering with fitness platforms (corporate-level), meeting outcome 4. Delivering a strategic plan demonstrates application (outcome 5). |
| **H&R Block – Digital Services Expansion** | Understanding threats from DIY tax software and free-filing initiatives requires **external environment** analysis (outcome 2). Assessing H&R Block's digital assets and customer-service network addresses internal capabilities (outcome 3). Students compare diversification options (financial-planning services, fintech partnerships) versus strengthening core tax services (outcome 4), and present strategic recommendations (outcome 5). |
| **Evergy – Renewable Energy Transition Plan** | Students evaluate regulatory changes and technology costs (external factors, outcome 2) and examine Evergy's generation portfolio and financial capacity (internal factors, outcome 3). They compare strategic choices—investing in solar/wind, continuing natural-gas plants, or diversifying into storage and demand-management (outcome 4)—and produce a long-term transition plan (outcome 5). |
| **Burns & McDonnell – International Renewable Services Expansion** | Analysing high-growth international markets (external environment) and internal engineering capabilities aligns with outcomes 2 and 3. Students evaluate entry strategies such as joint ventures, acquisitions or organic expansion (business vs. corporate-level strategies, outcome 4). Recommendations on market selection and entry approach require applying strategic concepts to decisions (outcome 5). |
| **Black & Veatch – Smart Grid Leadership** | Assessing market demand, technological trends and regulatory incentives for smart-grid projects exercises **external analysis** (outcome 2). Reviewing the company's power-transmission expertise and organisational structure engages internal analysis (outcome 3). Comparing strategic options—creating a dedicated smart-grid unit versus partnering with technology firms—covers outcome 4. Final recommendations apply strategic thinking to a new service line (outcome 5). |
| **Commerce Bank – Digital Banking Strategy** | Analysing fintech disruption, customer expectations and regulatory factors satisfies external analysis (outcome 2). Evaluating Commerce Bank's IT infrastructure and service capabilities addresses internal assessment (outcome 3). Students compare strategies such as partnering with fintechs, acquiring digital capabilities or building in-house (outcome 4) and develop actionable roadmaps (outcome 5). |
| **Dairy Farmers of America – Diversification & Sustainability** | Examining consumer shifts toward plant-based alternatives and supply-chain volatility involves external analysis (outcome 2). Assessing DFA's cooperative resources and production capabilities involves internal analysis (outcome 3). Students evaluate diversification strategies versus focus strategies (outcome 4) and propose sustainability and product-innovation recommendations (outcome 5). |
| **KC Chiefs / Royals – Fan Engagement & Revenue Diversification** | Researching fan-engagement trends and emerging digital platforms is an external analysis task (outcome 2). Reviewing each team's brand assets, community relations and digital capabilities touches internal assessment (outcome 3). Students compare strategies such as launching digital experiences, community events or merchandise expansions (business-level strategies, outcome 4) and deliver an integrated fan-engagement plan (outcome 5). |
| **Boulevard Brewing – Product Diversification Plan** | Analysing craft-beer market trends, consumer preferences for non-alcoholic or alternative beverages is external analysis (outcome 2). Reviewing the brewery's production capacity, brand equity and distribution strengths is internal analysis (outcome 3). Students evaluate strategic options—introducing ready-to-drink cocktails, hard seltzers, or non-alcoholic lines (outcome 4)—and present a diversification strategy (outcome 5). |

---

## Complete Industry Project Creation Forms

### 1. Oracle Health (formerly Cerner) – Competitive Strategy for EHR Market

**Form 1: Project Details**
- **Project Title**: Oracle Health Competitive-Strategy Analysis
- **Industry**: Healthcare Technology
- **Project Description**: Student team will analyse Oracle Health's competitive position in the electronic-health-record (EHR) market post-acquisition by Oracle. The project will assess emerging cloud-based EHR competitors, evaluate the company's resources and capabilities, and recommend strategic initiatives (partnerships, product innovations, market focus) to maintain competitive advantage.
- **Estimated Budget**: USD 4,000 (mainly covers student stipends, data sources and travel)

**Form 2: Company & Contact Info**
- **Company Name**: Oracle Health
- **Contact Person Name**: Director of Strategy (placeholder)
- **Contact Email**: strategy@oraclehealth.com
- **Contact Position/Title**: Director of Strategy & Partnerships
- **Contact Phone**: (555) 000-0001
- **Company Website**: https://www.oracle.com/industries/health/
- **Company Description**: Oracle Health (formerly Cerner), headquartered in North Kansas City, develops electronic-health-record software and health-information technology solutions.
- **Company Size**: Enterprise (1000+)
- **Industry Sector**: Healthcare
- **Preferred Communication Method**: Video Conference

**Form 3: Project Requirements**
- **Required Skills**: Strategic analysis, industry research, financial modeling, competitive intelligence, healthcare regulations
- **Recommended Team Size**: 5 students
- **Learning Objectives**: Apply strategic-management frameworks to analyse external and internal environments; develop recommendations that strengthen competitive advantage
- **Expected Deliverables**: Market landscape report, SWOT and resource analysis, strategic options matrix, final presentation with recommended strategies

**Form 4: Timeline & Schedule**
- **Project Start Date**: 20 January 2025
- **Project End Date**: 20 April 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Analysis
- **Project Scope**: Improvement (strategic planning)
- **Location Requirements**: Hybrid (onsite visits in North KC plus remote work)
- **Equipment Provided**: Yes (access to corporate databases)
- **Equipment Needed**: Student laptops, internet access
- **Software Requirements**: Data-analysis tools (Excel, PowerBI), report-writing software
- **Intellectual Property Terms**: Company Owns (the strategic analysis is proprietary)
- **Past Project Experience**: Oracle Health has collaborated with local universities on health-IT studies
- **Possible Follow-Up Opportunities**: Summer internships with strategy team

**Form 6: Academic Information**
- **Project Category**: Semester-long
- **Preferred Student Year**: Junior/Senior
- **Expected Hours Per Week**: 10 hours
- **Project Difficulty Level**: Advanced
- **Preferred Student Majors**: Business (strategy/management), Health Informatics
- **Faculty Expertise Needed**: Strategy, healthcare economics
- **Preferred Universities**: UMKC, KU, or Rockhurst University
- **Publication Possibilities**: Negotiable

---

### 2. Hallmark Cards – Digital Transformation Strategy

**Form 1: Project Details**
- **Project Title**: Hallmark Digital Diversification Strategy
- **Industry**: Media & Consumer Goods
- **Project Description**: Students will evaluate Hallmark's transition from physical greeting cards to digital products, streaming content and experiential offerings. They will analyse trends in digital communication and media consumption, assess Hallmark's capabilities (content creation, brand equity) and identify strategic partnerships or product innovations.
- **Estimated Budget**: USD 3,000 (research expenses and student stipends)

**Form 2: Company & Contact Info**
- **Company Name**: Hallmark Cards, Inc.
- **Contact Person Name**: Director of Innovation
- **Contact Email**: innovation@hallmark.com
- **Contact Position/Title**: Senior Director, Digital Strategy
- **Contact Phone**: (555) 000-0002
- **Company Website**: https://corporate.hallmark.com
- **Company Description**: Family-owned greeting-card and media company headquartered at Crown Center in Kansas City
- **Company Size**: Large (251-1000)
- **Industry Sector**: Media/Consumer Goods
- **Preferred Communication Method**: Email

**Form 3: Project Requirements**
- **Required Skills**: Market research, trend analysis, business-model innovation, digital-media knowledge
- **Recommended Team Size**: 4 students
- **Learning Objectives**: Analyse external factors (digital disruption), evaluate internal resources (brand, creative teams) and apply strategic frameworks to recommend diversification strategies
- **Expected Deliverables**: Trend analysis report; assessment of Hallmark's resources; strategic roadmap including potential partnerships and new product concepts

**Form 4: Timeline & Schedule**
- **Project Start Date**: 1 February 2025
- **Project End Date**: 30 April 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Consulting / Analysis
- **Project Scope**: Improvement / Extension
- **Location Requirements**: Remote with occasional onsite interviews
- **Equipment Provided**: Yes (access to consumer-insights data)
- **Equipment Needed**: Data-analysis tools
- **Software Requirements**: Survey platforms, analytics tools
- **Intellectual Property Terms**: Shared
- **Past Project Experience**: Hallmark has hosted MBA consulting projects in marketing
- **Possible Follow-Up Opportunities**: Internship with digital-strategy team

**Form 6: Academic Information**
- **Project Category**: Capstone / Semester-long
- **Preferred Student Year**: Senior or Graduate
- **Expected Hours Per Week**: 8-10
- **Project Difficulty Level**: Intermediate to Advanced
- **Preferred Student Majors**: Marketing, Strategic Management, Digital Media
- **Faculty Expertise Needed**: Marketing strategy, media innovation
- **Preferred Universities**: UMKC, Rockhurst
- **Publication Possibilities**: No

---

### 3. Garmin Ltd. – Wearable Tech Strategy

**Form 1: Project Details**
- **Project Title**: Sustaining Competitive Advantage in Wearables
- **Industry**: Consumer Electronics
- **Project Description**: Students will analyse Garmin's competitive position against major wearable manufacturers and explore strategic pathways—such as focusing on niche markets (athletics, aviation), partnerships or new features (AI health tracking)—to sustain differentiation.
- **Estimated Budget**: USD 4,500

**Form 2: Company & Contact Info**
- **Company Name**: Garmin Ltd.
- **Contact Person Name**: Senior Product Strategist
- **Contact Email**: strategy@garmin.com
- **Contact Position/Title**: Senior Manager, Product Strategy
- **Contact Phone**: (555) 000-0003
- **Company Website**: https://www.garmin.com
- **Company Description**: Global leader in GPS navigation and wearables; U.S. headquarters in Olathe (Kansas City metro)
- **Company Size**: Enterprise
- **Industry Sector**: Technology
- **Preferred Communication Method**: Video Conference

**Form 3: Project Requirements**
- **Required Skills**: Competitive analysis, market segmentation, product innovation, financial modeling
- **Recommended Team Size**: 5
- **Learning Objectives**: Evaluate internal capabilities (R&D, brand) and external competitive forces; develop business-level strategies for differentiation
- **Expected Deliverables**: Market and competitor analysis; segmentation and positioning recommendation; strategic plan detailing product or market focus

**Form 4: Timeline & Schedule**
- **Start Date**: 27 January 2025
- **End Date**: 27 April 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Analysis / Design
- **Project Scope**: Improvement / Product Strategy
- **Location Requirements**: Flexible (remote)
- **Equipment Provided**: Limited; product samples for testing
- **Software Requirements**: Market-analysis tools
- **IP Terms**: Company Owns
- **Possible Follow-Up Opportunities**: Product-strategy internships

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Junior/Senior
- **Hours Per Week**: 10
- **Difficulty Level**: Advanced
- **Preferred Majors**: Business Strategy, Marketing, Engineering Management
- **Faculty Expertise**: Strategy, product development
- **Publication Possibilities**: Negotiable

---

### 4. H&R Block – Strategy in a Changing Tax Landscape

**Form 1: Project Details**
- **Project Title**: H&R Block Digital Services Expansion
- **Industry**: Finance
- **Project Description**: This project explores H&R Block's options for competing with DIY tax-filing software and potential free e-filing initiatives. Students will analyse customer segments, evaluate the company's digital capabilities and propose strategic initiatives (subscription financial products, fintech partnerships).
- **Estimated Budget**: USD 3,500

**Form 2: Company & Contact Info**
- **Company Name**: H&R Block
- **Contact Person Name**: Product Manager
- **Contact Email**: innovation@hrblock.com
- **Contact Position/Title**: Manager, Digital Innovation
- **Contact Phone**: (555) 000-0004
- **Company Website**: https://www.hrblock.com
- **Company Description**: Provider of tax-preparation services headquartered in Kansas City
- **Company Size**: Large (251-1000)
- **Industry Sector**: Finance
- **Preferred Communication Method**: Email

**Form 3: Project Requirements**
- **Required Skills**: Market analysis, customer segmentation, digital-product design, financial modeling
- **Recommended Team Size**: 4 students
- **Learning Objectives**: Analyse external threats and internal capabilities; formulate strategic options (diversification vs. focus); understand regulatory influences
- **Expected Deliverables**: Market and segment analysis; digital-services roadmap; risk assessment; recommendations

**Form 4: Timeline & Schedule**
- **Start Date**: 10 February 2025
- **End Date**: 10 May 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Research/Analysis
- **Scope**: Improvement / Diversification
- **Location Requirements**: Remote
- **Equipment Provided**: Data analytics platform access
- **Software Requirements**: SPSS/Excel, user-research tools
- **IP Terms**: Shared
- **Past Collaboration**: H&R Block often partners with universities for case competitions
- **Follow-Up Opportunities**: Internship in product management

**Form 6: Academic Information**
- **Category**: Capstone
- **Preferred Student Year**: Senior
- **Hours per Week**: 8-10
- **Difficulty Level**: Intermediate-Advanced
- **Preferred Majors**: Finance, Business Analytics, Management Information Systems
- **Faculty Expertise**: Strategic Management, Fintech
- **Publication Possibilities**: No

---

### 5. Evergy Inc. – Renewable Energy Transition Strategy

**Form 1: Project Details**
- **Project Title**: Evergy's Renewable-Energy Transition Plan
- **Industry**: Energy & Utilities
- **Project Description**: Students will analyse Evergy's long-term strategies for adding renewable generation (solar, wind) versus natural-gas plants amid regulatory debates. They will evaluate policy changes, cost structures and stakeholder interests, then recommend strategic pathways to achieve sustainability goals while maintaining reliability and profitability.
- **Estimated Budget**: USD 4,000

**Form 2: Company & Contact Info**
- **Company Name**: Evergy, Inc.
- **Contact Person Name**: Strategic Planning Analyst
- **Contact Email**: strategy@evergy.com
- **Contact Position/Title**: Analyst, Strategic Planning
- **Contact Phone**: (555) 000-0005
- **Company Website**: https://www.evergy.com
- **Company Description**: Electric utility serving Kansas and Missouri customers; headquartered in Kansas City
- **Company Size**: Large
- **Industry Sector**: Energy
- **Preferred Communication Method**: Video Conference

**Form 3: Project Requirements**
- **Required Skills**: Policy analysis, energy economics, strategic planning, stakeholder analysis
- **Recommended Team Size**: 5
- **Learning Objectives**: Analyse external environment (regulation, technology costs); evaluate internal resources and capabilities; develop long-term corporate strategy
- **Expected Deliverables**: Policy and market analysis; cost-benefit model; strategic recommendations and scenario planning

**Form 4: Timeline & Schedule**
- **Start Date**: 3 February 2025
- **End Date**: 3 May 2025 (12 weeks)

**Form 5: Project Logistics**
- **Project Type**: Research / Analysis
- **Scope**: Full Implementation (strategic plan)
- **Location Requirements**: Hybrid (onsite interviews with energy planners)
- **Equipment Provided**: Access to energy-planning data (non-confidential)
- **Software Requirements**: Energy-modeling tools (e.g., NREL's ReEDS)
- **IP Terms**: Shared
- **Past Collaboration**: Evergy has hosted case competitions on rate design
- **Follow-Up Opportunities**: Internship in regulatory affairs

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Graduate or Senior
- **Hours per Week**: 12
- **Difficulty Level**: Advanced
- **Preferred Majors**: Economics, Public Policy, Engineering Management, Sustainability
- **Faculty Expertise**: Energy Policy, Sustainability
- **Publication Possibilities**: Yes (results could be presented at energy conferences)

---

### 6. Burns & McDonnell – International Expansion in Renewable Engineering

**Form 1: Project Details**
- **Project Title**: Global Expansion Strategy for Renewable-Energy Services
- **Industry**: Engineering & Construction
- **Project Description**: Students will evaluate global market opportunities for Burns & McDonnell's renewable-energy engineering services. They will assess the company's resources, identify high-growth international markets, analyse entry barriers and propose strategies (joint ventures, acquisitions, organic expansion).
- **Estimated Budget**: USD 5,000

**Form 2: Company & Contact Info**
- **Company Name**: Burns & McDonnell
- **Contact Person Name**: VP of Business Development
- **Contact Email**: businessdev@burnsmcd.com
- **Contact Position/Title**: Vice President, Global Business Development
- **Contact Phone**: (555) 000-0006
- **Company Website**: https://www.burnsmcd.com
- **Company Description**: Global engineering, architecture and construction firm headquartered in Kansas City
- **Company Size**: Enterprise
- **Industry Sector**: Engineering/Construction
- **Preferred Communication Method**: Video Conference

**Form 3: Project Requirements**
- **Required Skills**: International market analysis, competitive analysis, strategic planning, risk assessment
- **Recommended Team Size**: 5
- **Learning Objectives**: Compare strategies at business and corporate levels; analyse internal resources and external opportunities; design international expansion plans
- **Expected Deliverables**: Market attractiveness ranking; SWOT analysis; recommended market-entry strategies; risk mitigation plan

**Form 4: Timeline & Schedule**
- **Start Date**: 17 February 2025
- **End Date**: 17 May 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Consulting / Strategy
- **Scope**: Full Implementation
- **Location Requirements**: Remote
- **Equipment Provided**: Data subscriptions to international energy markets
- **Software Requirements**: Market research databases (e.g., Gartner, IHS)
- **IP Terms**: Company Owns
- **Past Collaboration**: Burns & McDonnell sponsors engineering capstones
- **Follow-Up Opportunities**: Summer internships abroad

**Form 6: Academic Information**
- **Category**: Capstone
- **Preferred Student Year**: Graduate
- **Hours per Week**: 12
- **Difficulty Level**: Advanced
- **Preferred Majors**: MBA (International Business), Engineering Management
- **Faculty Expertise**: International business, renewable energy
- **Publication Possibilities**: No

---

### 7. Black & Veatch – Smart Grid Services Strategy

**Form 1: Project Details**
- **Project Title**: Positioning Black & Veatch for Smart-Grid Leadership
- **Industry**: Infrastructure Consulting
- **Project Description**: This project explores how Black & Veatch can leverage its expertise in power-transmission engineering to lead in smart-grid modernisation projects. Students will analyse market demand, competitive landscape, regulatory incentives and internal capabilities to recommend strategic initiatives.
- **Estimated Budget**: USD 4,500

**Form 2: Company & Contact Info**
- **Company Name**: Black & Veatch
- **Contact Person Name**: Director of Strategy & Innovation
- **Contact Email**: strategy@bv.com
- **Contact Position/Title**: Director, Strategic Initiatives
- **Contact Phone**: (555) 000-0007
- **Company Website**: https://www.bv.com
- **Company Description**: Global engineering, procurement and construction company headquartered in Overland Park
- **Company Size**: Enterprise
- **Industry Sector**: Energy/Infrastructure
- **Preferred Communication Method**: Video Conference

**Form 3: Project Requirements**
- **Required Skills**: Infrastructure market research, policy analysis, strategic planning
- **Recommended Team Size**: 4-5
- **Learning Objectives**: Evaluate external environment (technology, regulation); analyse internal capabilities; propose business-level strategies
- **Expected Deliverables**: Market analysis; competitive benchmarking; strategic roadmap for smart-grid services

**Form 4: Timeline & Schedule**
- **Start Date**: 24 January 2025
- **End Date**: 24 April 2025 (12 weeks)

**Form 5: Project Logistics**
- **Project Type**: Analysis / Consulting
- **Scope**: Improvement / Expansion
- **Location Requirements**: Remote with one site tour
- **Equipment Provided**: Access to internal case studies
- **Software Requirements**: Analytical tools
- **IP Terms**: Shared
- **Follow-Up Opportunities**: Job interviews for high-performing students

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Senior / Graduate
- **Hours per Week**: 9-10
- **Difficulty Level**: Advanced
- **Preferred Majors**: Electrical Engineering, Business Strategy
- **Faculty Expertise**: Power systems, strategy
- **Publication Possibilities**: Negotiable

---

### 8. Commerce Bancshares – Digital Banking Strategy

**Form 1: Project Details**
- **Project Title**: Commerce Bank Digital-Strategy Roadmap
- **Industry**: Banking & Financial Services
- **Project Description**: Students will evaluate how Commerce Bank can compete with fintech and digital-banking disruptors. They will assess technology trends, customer expectations, regulatory factors and the bank's capabilities to propose digital-service strategies and partnership opportunities.
- **Estimated Budget**: USD 3,500

**Form 2: Company & Contact Info**
- **Company Name**: Commerce Bancshares, Inc.
- **Contact Person Name**: Digital Banking Manager
- **Contact Email**: digital@commercebank.com
- **Contact Position/Title**: Manager, Digital Strategy
- **Contact Phone**: (555) 000-0008
- **Company Website**: https://www.commercebank.com
- **Company Description**: Regional bank headquartered in Kansas City providing retail and commercial banking services
- **Company Size**: Medium
- **Industry Sector**: Finance
- **Preferred Communication Method**: Email

**Form 3: Project Requirements**
- **Required Skills**: Digital banking knowledge, competitor analysis, regulatory awareness, customer research
- **Recommended Team Size**: 4
- **Learning Objectives**: Analyse external environment (fintech disruption); evaluate internal resources; formulate strategies to sustain competitive advantage
- **Expected Deliverables**: Competitive landscape report; customer-persona analysis; recommended digital-service roadmap; risk assessment

**Form 4: Timeline & Schedule**
- **Start Date**: 31 January 2025
- **End Date**: 1 May 2025
- **Duration**: 13 weeks

**Form 5: Project Logistics**
- **Project Type**: Research / Analysis
- **Scope**: MVP / Implementation
- **Location Requirements**: Remote
- **Equipment Provided**: Limited
- **Software Requirements**: Survey tools, analytics
- **IP Terms**: Company Owns
- **Past Collaboration**: Commerce Bank has partnered with local universities on innovation challenges
- **Follow-Up Opportunities**: Internship interviews

**Form 6: Academic Information**
- **Category**: Capstone
- **Preferred Student Year**: Junior/Senior
- **Hours Per Week**: 8-9
- **Difficulty Level**: Intermediate
- **Preferred Majors**: Finance, Management Information Systems
- **Faculty Expertise**: Banking strategy, fintech
- **Publication Possibilities**: No

---

### 9. Dairy Farmers of America – Diversification Strategy

**Form 1: Project Details**
- **Project Title**: DFA Diversification and Sustainability Strategy
- **Industry**: Agriculture & Food
- **Project Description**: Students will assess how DFA can adapt to supply-chain disruptions and changing consumer preferences (plant-based and alternative dairy products). They will analyse external trends, evaluate DFA's cooperative resources and recommend diversification strategies or sustainability initiatives.
- **Estimated Budget**: USD 3,000

**Form 2: Company & Contact Info**
- **Company Name**: Dairy Farmers of America (DFA)
- **Contact Person Name**: Sustainability Officer
- **Contact Email**: sustainability@dfamilk.com
- **Contact Position/Title**: Director, Sustainability and Innovation
- **Contact Phone**: (555) 000-0009
- **Company Website**: https://www.dfamilk.com
- **Company Description**: National dairy cooperative headquartered in Kansas City
- **Company Size**: Large
- **Industry Sector**: Agriculture
- **Preferred Communication Method**: Email

**Form 3: Project Requirements**
- **Required Skills**: Market trend analysis, sustainability strategy, supply-chain mapping, financial assessment
- **Recommended Team Size**: 4
- **Learning Objectives**: Analyse external factors (consumer trends); evaluate internal resources; compare corporate strategies (diversification vs. specialization)
- **Expected Deliverables**: Trend report; resource analysis; strategic options with cost-benefit; sustainability roadmap

**Form 4: Timeline & Schedule**
- **Start Date**: 6 February 2025
- **End Date**: 6 May 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Research / Strategy
- **Scope**: Improvement / Diversification
- **Location Requirements**: Remote
- **Equipment Needed**: Data-analysis software
- **IP Terms**: Shared
- **Past Collaboration**: DFA sponsors case competitions on sustainability
- **Follow-Up Opportunities**: Internship in sustainability or marketing

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Junior/Senior
- **Hours per Week**: 8-10
- **Difficulty Level**: Intermediate
- **Preferred Majors**: Agribusiness, Environmental Studies, Marketing
- **Faculty Expertise**: Sustainable Business, Supply-Chain Management
- **Publication Possibilities**: Yes (if results are notable for sustainability journals)

---

### 10. Kansas City Chiefs / Royals – Fan Engagement & Revenue Diversification

**Form 1: Project Details**
- **Project Title**: Year-Round Fan Engagement Strategy for KC Sports Franchises
- **Industry**: Sports & Entertainment
- **Project Description**: Students will design strategies for the Chiefs or Royals to enhance fan engagement outside the season and diversify revenue streams (e.g., digital experiences, merchandise, community events). They will analyse fan-behaviour trends, benchmark other franchises and evaluate each team's brand assets.
- **Estimated Budget**: USD 2,500 (low cost to encourage community partnership)

**Form 2: Company & Contact Info**
- **Company Name**: Kansas City Chiefs / Kansas City Royals
- **Contact Person Name**: Director of Community Relations
- **Contact Email**: community@chiefs.com / community@royals.com
- **Contact Position/Title**: Director, Fan Engagement
- **Contact Phone**: (555) 000-0010
- **Company Website**: https://www.chiefs.com / https://www.royals.com
- **Company Description**: Professional NFL and MLB teams based in Kansas City
- **Company Size**: Large
- **Industry Sector**: Sports/Entertainment
- **Preferred Communication Method**: Email

**Form 3: Project Requirements**
- **Required Skills**: Marketing research, digital-engagement strategy, event planning, branding
- **Recommended Team Size**: 3-4 students
- **Learning Objectives**: Analyse external environment (fan engagement trends, technology), evaluate internal brand assets and propose business-level strategies
- **Expected Deliverables**: Market research on fan preferences; benchmarking of other teams' engagement tactics; strategy deck proposing engagement initiatives and revenue opportunities

**Form 4: Timeline & Schedule**
- **Start Date**: 1 March 2025
- **End Date**: 31 May 2025
- **Duration**: 13 weeks

**Form 5: Project Logistics**
- **Project Type**: Design / Consulting
- **Scope**: Improvement / Extension
- **Location Requirements**: Hybrid (stadium visits for research)
- **Equipment Provided**: Access to fan-experience data
- **Software Requirements**: Survey tools, social-media analytics
- **IP Terms**: Shared
- **Follow-Up Opportunities**: Internships with marketing departments

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Junior/Senior
- **Hours per Week**: 6-8
- **Difficulty Level**: Intermediate
- **Preferred Majors**: Sports Management, Marketing, Communication
- **Faculty Expertise**: Sports Marketing, Consumer Behaviour
- **Publication Possibilities**: No

---

### 11. Boulevard Brewing Co. – Product Diversification Strategy

**Form 1: Project Details**
- **Project Title**: Boulevard Brewing Product-Diversification Plan
- **Industry**: Food & Beverage (Craft Beer)
- **Project Description**: Students will analyse Boulevard Brewing's current market position and propose strategies to diversify its product portfolio (non-alcoholic beer, ready-to-drink cocktails, hard seltzers). The project includes market research on emerging consumer preferences and competitive analysis.
- **Estimated Budget**: USD 2,500

**Form 2: Company & Contact Info**
- **Company Name**: Boulevard Brewing Company
- **Contact Person Name**: Product Innovation Manager
- **Contact Email**: innovation@boulevard.com
- **Contact Position/Title**: Manager, Product Development
- **Contact Phone**: (555) 000-0011
- **Company Website**: https://www.boulevard.com
- **Company Description**: Craft brewery based in Kansas City known for its pale ales and wheat beers
- **Company Size**: Medium
- **Industry Sector**: Manufacturing/Consumer Goods
- **Preferred Communication Method**: In-Person Meetings and Email

**Form 3: Project Requirements**
- **Required Skills**: Market analysis, product development, consumer trend analysis, financial modeling
- **Recommended Team Size**: 3-4 students
- **Learning Objectives**: Analyse external market trends and internal capabilities; compare product diversification strategies; apply strategic decision-making
- **Expected Deliverables**: Consumer trend report; competitive analysis; feasibility studies for new product lines; strategic recommendations

**Form 4: Timeline & Schedule**
- **Start Date**: 14 February 2025
- **End Date**: 14 May 2025
- **Duration**: 12 weeks

**Form 5: Project Logistics**
- **Project Type**: Development / Analysis
- **Scope**: Prototype/POC (concept development)
- **Location Requirements**: Hybrid (brewery tours and remote work)
- **Equipment Provided**: Access to product development team
- **Software Requirements**: Market-analysis software
- **IP Terms**: Company Owns
- **Past Collaboration**: Boulevard has hosted case projects with local MBA programs
- **Follow-Up Opportunities**: Internship in product development

**Form 6: Academic Information**
- **Category**: Semester-long
- **Preferred Student Year**: Junior/Senior
- **Hours per Week**: 7-8
- **Difficulty Level**: Intermediate
- **Preferred Majors**: Business, Marketing, Food Science
- **Faculty Expertise**: Product Development, Strategic Marketing
- **Publication Possibilities**: No

---

## Value Proposition & Feasibility Assessment

Each project is scoped to fit a 12- to 13-week semester with 6-12 hours per week per student, aligning with Strategic Management course emphasis on analysing environments, assessing resources and recommending strategies. 

**Company Benefits**:
- Modest budgets ($2,500-$5,000) primarily cover student stipends and data access
- Receive well-researched strategic recommendations with external perspective
- Minimal time investment from company staff (primarily onboarding and final presentation)
- Potential pipeline for future talent recruitment

**Student Benefits**:
- Practical experience applying strategic frameworks in diverse sectors
- Portfolio-building opportunities with recognized regional companies
- Networking and potential internship/employment pathways
- Hands-on learning that reinforces classroom theory

**Academic Benefits**:
- Real-world application of course learning outcomes
- Enhanced course relevance and student engagement
- Potential for publishable case studies
- Strengthened industry-university partnerships

---

## Support & Resources

- **Project URL**: https://lovable.dev/projects/db2da809-30b7-405b-aa5b-093df17ab66c
- **Documentation**: https://docs.lovable.dev
- **Community**: https://discord.com/channels/1119885301872070706

## License

[Add your license here]
