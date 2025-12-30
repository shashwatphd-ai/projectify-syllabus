/**
 * Centralized validation schemas for frontend forms and API parameters
 * Uses zod for type-safe validation with proper error messages
 */
import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

const EDUCATIONAL_DOMAINS = ['.edu', '.ac.uk', '.edu.au', '.ac.in', '.edu.cn', '.ac.jp', '.edu.sg'];

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be less than 128 characters');

export const roleSchema = z.enum(['student', 'faculty', 'employer'], {
  errorMap: () => ({ message: 'Please select a valid role' })
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  role: roleSchema
}).refine(
  (data) => {
    // Employers cannot use educational email domains
    if (data.role === 'employer') {
      const emailLower = data.email.toLowerCase();
      return !EDUCATIONAL_DOMAINS.some(domain => emailLower.endsWith(domain));
    }
    return true;
  },
  {
    message: 'Employers should use a company email address, not an educational institution domain',
    path: ['email']
  }
);

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const resetPasswordSchema = z.object({
  email: emailSchema
});

// ============================================================================
// Feedback & Rating Schemas
// ============================================================================

export const projectRatingSchema = z.object({
  rating: z.number().int().min(1, 'Please select a rating').max(5),
  feedback: z.string().max(2000, 'Feedback must be less than 2000 characters').trim().optional(),
  tags: z.array(z.string().max(50)).max(10).optional()
});

export const evaluationSchema = z.object({
  liked: z.boolean(),
  fit: z.number().int().min(1).max(5).nullable(),
  alignment: z.number().int().min(1).max(5).nullable(),
  feasibility: z.number().int().min(1).max(5).nullable(),
  comments: z.string().max(1000, 'Comments must be less than 1000 characters').trim().nullable()
});

export const studentRatingSchema = z.object({
  rating: z.number().int().min(1, 'Please select a rating').max(5)
});

// ============================================================================
// Project Configuration Schemas
// ============================================================================

export const configureProjectSchema = z.object({
  industries: z.string().max(500, 'Industries list too long').trim().optional(),
  companies: z.string().max(500, 'Companies list too long').trim().optional(),
  numTeams: z.number().int().min(1, 'Minimum 1 team').max(20, 'Maximum 20 teams')
});

// ============================================================================
// Syllabus Upload Schemas
// ============================================================================

export const locationSchema = z.object({
  city: z.string().max(100, 'City name too long').trim().optional(),
  state: z.string().max(100, 'State name too long').trim().optional(),
  zip: z.string().max(20, 'ZIP code too long').trim().optional(),
  country: z.string().max(100, 'Country name too long').trim().optional()
});

export const syllabusUploadSchema = z.object({
  cityZip: z.string().max(200, 'Location too long').trim().optional(),
  manualLocation: locationSchema.optional()
});

// ============================================================================
// Partnership Proposal Schemas
// ============================================================================

export const proposalSchema = z.object({
  message: z.string()
    .trim()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be less than 2000 characters'),
  pitchType: z.enum(['academic', 'industry', 'custom'], {
    errorMap: () => ({ message: 'Please select a pitch type' })
  })
});

// ============================================================================
// Employer Interest Schemas
// ============================================================================

export const employerInterestSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(255),
  contactEmail: z.string().trim().email('Invalid email address').max(255),
  contactName: z.string().trim().max(255).optional(),
  companyDomain: z.string().trim().max(255).optional(),
  proposedProjectTitle: z.string().trim().min(1, 'Project title is required').max(255),
  projectDescription: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  preferredTimeline: z.string().trim().max(100).optional(),
  referralSource: z.string().trim().max(100).optional()
});

// ============================================================================
// Admin Import Schemas
// ============================================================================

export const universityImportRowSchema = z.object({
  domain: z.string().trim().min(1, 'Domain is required').max(255),
  name: z.string().trim().min(1, 'University name is required').max(500),
  country: z.string().trim().max(100).default('United States'),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  zip: z.string().trim().max(20).optional(),
  formatted_location: z.string().trim().max(300).optional()
});

// ============================================================================
// Type Exports
// ============================================================================

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProjectRatingFormData = z.infer<typeof projectRatingSchema>;
export type EvaluationFormData = z.infer<typeof evaluationSchema>;
export type ConfigureProjectFormData = z.infer<typeof configureProjectSchema>;
export type ProposalFormData = z.infer<typeof proposalSchema>;
export type EmployerInterestFormData = z.infer<typeof employerInterestSchema>;
