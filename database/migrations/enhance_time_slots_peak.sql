-- Migration: add is_peak column to time_slots so facility owners can customize peak slots

ALTER TABLE public.time_slots
  ADD COLUMN IF NOT EXISTS is_peak BOOLEAN;

UPDATE public.time_slots
SET is_peak = (
  EXTRACT(HOUR FROM start_time) >= 17
  AND EXTRACT(HOUR FROM start_time) < 21
)
WHERE is_peak IS NULL;

ALTER TABLE public.time_slots
  ALTER COLUMN is_peak SET DEFAULT FALSE,
  ALTER COLUMN is_peak SET NOT NULL;

