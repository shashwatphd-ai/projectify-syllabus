import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Downloads a PDF file from Supabase Storage
 * @param filePath - The path of the file in the storage bucket
 * @param filename - Optional custom filename for the download
 */
export async function downloadPdfFromStorage(filePath: string, filename?: string): Promise<void> {
  try {
    if (!filePath) {
      throw new Error("File path is required");
    }

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('syllabi')
      .download(filePath);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("No data returned from storage");
    }

    // Create a blob URL and trigger download
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || filePath.split('/').pop() || 'syllabus.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("PDF downloaded successfully");
  } catch (error) {
    console.error('Error downloading PDF:', error);
    toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    throw error;
  }
}

/**
 * Downloads a PDF for a specific course by its ID
 * @param courseId - The course profile ID
 */
export async function downloadCoursePdf(courseId: string): Promise<void> {
  try {
    // Fetch the course profile to get the file_path
    const { data: course, error } = await supabase
      .from('course_profiles')
      .select('file_path, title')
      .eq('id', courseId)
      .single();

    if (error) throw error;

    if (!course?.file_path) {
      throw new Error("No syllabus file found for this course");
    }

    // Generate a clean filename from course title
    const cleanFilename = course.title
      ? `${course.title.replace(/[^a-z0-9]/gi, '_')}_syllabus.pdf`
      : 'syllabus.pdf';

    await downloadPdfFromStorage(course.file_path, cleanFilename);
  } catch (error) {
    console.error('Error downloading course PDF:', error);
    throw error;
  }
}

/**
 * Downloads multiple PDFs as a zip (for batch downloads)
 * Note: This is a placeholder for future implementation
 */
export async function downloadMultiplePdfs(courseIds: string[]): Promise<void> {
  toast.info("Batch download coming soon! Downloading files individually...");
  
  for (const courseId of courseIds) {
    try {
      await downloadCoursePdf(courseId);
      // Add delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to download PDF for course ${courseId}:`, error);
    }
  }
}
