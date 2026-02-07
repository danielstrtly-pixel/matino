-- Change default meals_per_week from 5 to 7 (full week incl. weekends)
ALTER TABLE user_preferences ALTER COLUMN meals_per_week SET DEFAULT 7;
UPDATE user_preferences SET meals_per_week = 7 WHERE meals_per_week = 5;
