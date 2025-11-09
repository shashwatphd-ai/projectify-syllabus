-- Add search_location column to course_profiles for Apollo-friendly location format
ALTER TABLE course_profiles 
  ADD COLUMN search_location TEXT;