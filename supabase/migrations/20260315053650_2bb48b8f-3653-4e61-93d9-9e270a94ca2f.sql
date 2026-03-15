CREATE TABLE public.scoring_weight_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  culture_adj numeric NOT NULL DEFAULT 0,
  academic_adj numeric NOT NULL DEFAULT 0,
  cost_adj numeric NOT NULL DEFAULT 0,
  distance_adj numeric NOT NULL DEFAULT 0,
  admission_adj numeric NOT NULL DEFAULT 0,
  size_adj numeric NOT NULL DEFAULT 0,
  support_adj numeric NOT NULL DEFAULT 0,
  computed_from jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.scoring_weight_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own adjustments" ON public.scoring_weight_adjustments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage adjustments" ON public.scoring_weight_adjustments
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');