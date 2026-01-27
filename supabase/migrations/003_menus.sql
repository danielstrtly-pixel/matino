-- Migration: Add menus and recipes tables
-- Run this in Supabase SQL Editor

-- Saved menus
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT, -- Optional name like "Vecka 5" 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true -- Current active menu
);

-- Menu items (recipes)
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL, -- 0=Monday, 6=Sunday
  day_name TEXT NOT NULL, -- "Måndag", "Tisdag", etc.
  meal TEXT NOT NULL DEFAULT 'dinner', -- 'lunch' or 'dinner'
  
  -- Recipe data (stored as JSON for flexibility)
  recipe JSONB NOT NULL,
  
  -- Matched offers at time of generation
  matched_offers JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_menus_user_id ON menus(user_id);
CREATE INDEX IF NOT EXISTS idx_menus_active ON menus(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON menu_items(menu_id);

-- RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own menus
CREATE POLICY "Users can view their own menus"
  ON menus FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own menus"
  ON menus FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own menus"
  ON menus FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own menus"
  ON menus FOR DELETE
  USING (auth.uid() = user_id);

-- Menu items inherit access from parent menu
CREATE POLICY "Users can view their menu items"
  ON menu_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their menu items"
  ON menu_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their menu items"
  ON menu_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their menu items"
  ON menu_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM menus 
      WHERE menus.id = menu_items.menu_id 
      AND menus.user_id = auth.uid()
    )
  );
