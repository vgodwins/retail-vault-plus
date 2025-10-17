-- Promote the current user to admin (one-time bootstrap)
-- Uses the user ID seen in recent auth logs
INSERT INTO public.user_roles (user_id, role)
SELECT 'd85960b7-96d3-4837-acdf-cd68034a3b00'::uuid, 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'd85960b7-96d3-4837-acdf-cd68034a3b00'::uuid AND role = 'admin'
);

-- Optional safety: ensure app_role enum exists is assumed; no changes made here.
-- Note: No changes to reserved schemas; minimal bootstrap only.
