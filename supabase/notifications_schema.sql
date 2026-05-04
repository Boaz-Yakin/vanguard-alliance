-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'deal_status', 'order_status', 'announcement', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT, -- Optional link to redirect user (e.g. /my-deals)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage notifications"
ON public.notifications FOR ALL
USING (true)
WITH CHECK (true);
