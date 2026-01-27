-- Migration: Add Edamam-compatible preference fields
-- Run this in Supabase SQL Editor

-- Add new columns to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS health_labels TEXT[] DEFAULT '{}',      -- Edamam health labels (vegan, gluten-free, etc.)
ADD COLUMN IF NOT EXISTS diet_labels TEXT[] DEFAULT '{}',         -- Edamam diet labels (balanced, high-protein, etc.)
ADD COLUMN IF NOT EXISTS cuisine_types TEXT[] DEFAULT '{}',       -- Preferred cuisines (nordic, italian, etc.)
ADD COLUMN IF NOT EXISTS meals_per_week INTEGER DEFAULT 5,        -- Number of dinners to generate
ADD COLUMN IF NOT EXISTS max_cook_time INTEGER DEFAULT 45,        -- Max cooking time in minutes
ADD COLUMN IF NOT EXISTS include_lunch BOOLEAN DEFAULT false,     -- Generate lunch recipes too
ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false;      -- Affects recipe selection

-- Comment for clarity
COMMENT ON COLUMN user_preferences.health_labels IS 'Edamam API health labels: vegan, vegetarian, gluten-free, dairy-free, etc.';
COMMENT ON COLUMN user_preferences.diet_labels IS 'Edamam API diet labels: balanced, high-protein, low-carb, etc.';
COMMENT ON COLUMN user_preferences.cuisine_types IS 'Preferred cuisine types: nordic, italian, asian, etc.';
