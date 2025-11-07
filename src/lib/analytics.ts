import { supabase } from "@/integrations/supabase/client";

/**
 * Get or create a session ID for analytics tracking
 */
const getSessionId = (): string => {
  const STORAGE_KEY = 'dashboard_session_id';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  
  const stored = localStorage.getItem(STORAGE_KEY);
  const storedData = stored ? JSON.parse(stored) : null;
  
  // Check if session is still valid
  if (storedData && Date.now() - storedData.timestamp < SESSION_DURATION) {
    return storedData.sessionId;
  }
  
  // Create new session
  const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sessionId,
    timestamp: Date.now()
  }));
  
  return sessionId;
};

type DashboardEventType = 'view' | 'filter' | 'submission';

interface TrackEventOptions {
  demandSignalId?: string;
  filtersApplied?: Record<string, any>;
  timeOnPage?: number;
  resultedInSubmission?: boolean;
}

/**
 * Track dashboard events to analytics table
 */
export const trackDashboardEvent = async (
  eventType: DashboardEventType,
  options: TrackEventOptions = {}
): Promise<void> => {
  try {
    const sessionId = getSessionId();
    
    const { error } = await supabase
      .from('dashboard_analytics')
      .insert({
        event_type: eventType,
        session_id: sessionId,
        demand_signal_id: options.demandSignalId || null,
        filters_applied: options.filtersApplied || null,
        time_on_page: options.timeOnPage || null,
        resulted_in_submission: options.resultedInSubmission || null,
      });
    
    if (error) {
      console.error('Analytics tracking error:', error);
    }
  } catch (error) {
    // Fail silently - analytics should not break user experience
    console.error('Failed to track event:', error);
  }
};
