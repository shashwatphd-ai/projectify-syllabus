import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders, createErrorResponse, createPreflightResponse } from '../_shared/cors.ts';

interface CompletedProject {
  id: string;
  title: string;
  company_name: string;
  description: string | null;
  duration_weeks: number;
  sector: string;
}

interface VerifiedCompetency {
  id: string;
  skill_name: string;
  verification_source: string | null;
  employer_rating: number | null;
  portfolio_evidence_url: string | null;
}

interface JobMatch {
  id: string;
  apollo_job_title: string | null;
  apollo_company_name: string | null;
  apollo_job_url: string | null;
  status: string;
}

interface PortfolioData {
  student_id: string;
  student_email: string;
  completed_projects: CompletedProject[];
  verified_competencies: VerifiedCompetency[];
  job_matches: JobMatch[];
  generated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with the user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized: Invalid or missing token');
    }

    const studentId = user.id;
    const studentEmail = user.email || 'N/A';

    console.log(`📋 Generating portfolio for student: ${studentId}`);

    // Fetch verified competencies (which link students to projects)
    const { data: competencies, error: competenciesError } = await supabaseClient
      .from('verified_competencies')
      .select('id, skill_name, verification_source, employer_rating, portfolio_evidence_url, project_id')
      .eq('student_id', studentId);

    if (competenciesError) {
      console.error('Error fetching competencies:', competenciesError);
      throw competenciesError;
    }

    // Get unique project IDs from competencies
    const projectIds = [...new Set((competencies || [])
      .map(c => c.project_id)
      .filter(id => id !== null))];

    console.log(`🔗 Found ${projectIds.length} unique projects for student`);

    // Fetch the projects that this student has completed
    let projects: CompletedProject[] = [];
    if (projectIds.length > 0) {
      const { data: projectsData, error: projectsError } = await supabaseClient
        .from('projects')
        .select('id, title, company_name, description, duration_weeks, sector')
        .in('id', projectIds);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        throw projectsError;
      }

      projects = projectsData || [];
    }

    // Fetch job matches
    const { data: jobMatches, error: jobMatchesError } = await supabaseClient
      .from('job_matches')
      .select('id, apollo_job_title, apollo_company_name, apollo_job_url, status')
      .eq('student_id', studentId);

    if (jobMatchesError) {
      console.error('Error fetching job matches:', jobMatchesError);
      throw jobMatchesError;
    }

    // Compile portfolio data
    const portfolioData: PortfolioData = {
      student_id: studentId,
      student_email: studentEmail,
      completed_projects: projects || [],
      verified_competencies: competencies || [],
      job_matches: jobMatches || [],
      generated_at: new Date().toISOString(),
    };

    console.log(`✅ Portfolio data compiled: ${portfolioData.completed_projects.length} projects, ${portfolioData.verified_competencies.length} competencies, ${portfolioData.job_matches.length} job matches`);

    // Generate PDF
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    const addText = (text: string, size: number, isBold = false) => {
      // Check if we need a new page
      if (yPosition < 50) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }
      
      // Wrap long text
      const maxWidth = width - 100;
      const words = text.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const textWidth = (isBold ? timesRomanBold : timesRomanFont).widthOfTextAtSize(testLine, size);
        
        if (textWidth > maxWidth && line !== '') {
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size,
            font: isBold ? timesRomanBold : timesRomanFont,
            color: rgb(0, 0, 0),
          });
          yPosition -= size + 5;
          line = word + ' ';
          
          // Check again for new page
          if (yPosition < 50) {
            page = pdfDoc.addPage([595, 842]);
            yPosition = height - 50;
          }
        } else {
          line = testLine;
        }
      }
      
      if (line.trim() !== '') {
        page.drawText(line.trim(), {
          x: 50,
          y: yPosition,
          size,
          font: isBold ? timesRomanBold : timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= size + 10;
      }
    };

    // Header
    addText('EduThree Student Portfolio', 24, true);
    yPosition -= 10;
    addText(`Generated: ${new Date().toLocaleDateString()}`, 10);
    addText(`Student Email: ${studentEmail}`, 12);
    yPosition -= 20;

    // Completed Projects Section
    addText('Completed Projects', 18, true);
    yPosition -= 5;
    
    if (portfolioData.completed_projects.length === 0) {
      addText('No completed projects yet.', 12);
    } else {
      portfolioData.completed_projects.forEach((project, idx) => {
        addText(`${idx + 1}. ${project.title}`, 14, true);
        addText(`   Company: ${project.company_name} | Sector: ${project.sector}`, 11);
        addText(`   Duration: ${project.duration_weeks} weeks`, 11);
        
        if (project.description) {
          const desc = project.description.length > 150 
            ? project.description.substring(0, 150) + '...' 
            : project.description;
          addText(`   ${desc}`, 10);
        }
        yPosition -= 10;
      });
    }

    yPosition -= 20;

    // Verified Competencies Section
    addText('Verified Skills & Competencies', 18, true);
    yPosition -= 5;
    
    if (portfolioData.verified_competencies.length === 0) {
      addText('No verified competencies yet.', 12);
    } else {
      // Group competencies by skill name to avoid duplicates
      const uniqueSkills = new Map<string, VerifiedCompetency>();
      portfolioData.verified_competencies.forEach(comp => {
        if (!uniqueSkills.has(comp.skill_name)) {
          uniqueSkills.set(comp.skill_name, comp);
        }
      });

      Array.from(uniqueSkills.values()).forEach((comp, idx) => {
        let skillText = `${idx + 1}. ${comp.skill_name}`;
        if (comp.employer_rating) {
          skillText += ` (Rating: ${comp.employer_rating}/5)`;
        }
        addText(skillText, 12);
        
        if (comp.verification_source) {
          addText(`   Verified via: ${comp.verification_source}`, 10);
        }
        yPosition -= 5;
      });
    }

    yPosition -= 20;

    // Job Matches Section
    addText('Job Opportunities & Matches', 18, true);
    yPosition -= 5;
    
    if (portfolioData.job_matches.length === 0) {
      addText('No job matches yet.', 12);
    } else {
      portfolioData.job_matches.forEach((match, idx) => {
        addText(`${idx + 1}. ${match.apollo_job_title || 'Untitled Position'}`, 12, true);
        
        if (match.apollo_company_name) {
          addText(`   Company: ${match.apollo_company_name}`, 11);
        }
        
        addText(`   Status: ${match.status === 'pending_notification' ? 'New Match' : 'Employer Notified'}`, 10);
        
        if (match.apollo_job_url) {
          addText(`   URL: ${match.apollo_job_url}`, 9);
        }
        yPosition -= 8;
      });
    }

    // Footer
    yPosition -= 20;
    addText('---', 10);
    addText('This portfolio was generated by EduThree, an AI-powered platform', 9);
    addText('connecting students with real-world project experience to employers.', 9);

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    console.log('📄 PDF generated successfully');

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="eduthree-portfolio-${studentId.substring(0, 8)}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('❌ Error in portfolio-export function:', error);
    return createErrorResponse(error.message || 'Portfolio export failed', 500, req);
  }
});
