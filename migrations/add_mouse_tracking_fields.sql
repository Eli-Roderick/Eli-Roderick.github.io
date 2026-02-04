-- Migration: Add mouse tracking fields to session_activity table
-- This adds detailed mouse position, event type, and delta tracking

ALTER TABLE public.session_activity
ADD COLUMN IF NOT EXISTS mouse_x INTEGER,
ADD COLUMN IF NOT EXISTS mouse_y INTEGER,
ADD COLUMN IF NOT EXISTS mouse_event TEXT,
ADD COLUMN IF NOT EXISTS scroll_delta INTEGER,
ADD COLUMN IF NOT EXISTS movement_delta_x INTEGER,
ADD COLUMN IF NOT EXISTS movement_delta_y INTEGER,
ADD COLUMN IF NOT EXISTS monotonic_timestamp BIGINT;

-- Add index for querying by monotonic timestamp
CREATE INDEX IF NOT EXISTS idx_session_activity_monotonic_ts 
ON public.session_activity(session_id, monotonic_timestamp);

-- Add comment to document the new fields
COMMENT ON COLUMN public.session_activity.mouse_x IS 'X coordinate of mouse position at time of event';
COMMENT ON COLUMN public.session_activity.mouse_y IS 'Y coordinate of mouse position at time of event';
COMMENT ON COLUMN public.session_activity.mouse_event IS 'Type of mouse event (e.g., WM_MOUSEMOVE, WM_MOUSEWHEEL, WM_LBUTTONDOWN)';
COMMENT ON COLUMN public.session_activity.scroll_delta IS 'Scroll wheel delta value (typically -120 or +120 per notch)';
COMMENT ON COLUMN public.session_activity.movement_delta_x IS 'Change in X position from previous mouse event';
COMMENT ON COLUMN public.session_activity.movement_delta_y IS 'Change in Y position from previous mouse event';
COMMENT ON COLUMN public.session_activity.monotonic_timestamp IS 'High-resolution monotonic timestamp in milliseconds using performance.now()';
