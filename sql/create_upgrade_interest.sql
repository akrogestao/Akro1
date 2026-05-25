CREATE TABLE IF NOT EXISTS upgrade_interest (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text        NOT NULL,
  current_plan text,
  target_plan  text,
  message      text,
  created_at   timestamptz DEFAULT now()
);
