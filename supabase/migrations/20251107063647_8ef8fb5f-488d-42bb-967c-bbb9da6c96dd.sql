-- WARN FIX: Risk-005 - Restrict SELECT on dashboard_analytics to admins only
-- This prevents non-admin authenticated users from viewing analytics data
CREATE POLICY "Admins can view analytics"
ON public.dashboard_analytics
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- WARN FIX: Risk-006 - Restrict UPDATE/DELETE on demand_signals to admins only
-- This prevents non-admin users from modifying or deleting demand signals
CREATE POLICY "Admins can update demand signals"
ON public.demand_signals
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete demand signals"
ON public.demand_signals
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));