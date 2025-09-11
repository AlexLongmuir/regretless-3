-- Create notification_preferences table
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  daily_reminders boolean NOT NULL DEFAULT true,
  reminder_time time NOT NULL DEFAULT '09:00:00',
  overdue_alerts boolean NOT NULL DEFAULT true,
  achievement_notifications boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can access own notification preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Add trigger for updated_at
CREATE TRIGGER trigger_notification_preferences_updated_at 
  BEFORE UPDATE ON notification_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
