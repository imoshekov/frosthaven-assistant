import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ItemSlot } from '../types/item-types';
import { CharacterRow, CraftableItemRow } from '../types/db-types';


const url = 'https://ymlekirbwjanuxrclsgf.supabase.co';
//client-key, meant to be in code
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGVraXJid2phbnV4cmNsc2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjk4OTUsImV4cCI6MjA3MTY0NTg5NX0._a0-aMgphg5_bFCzy7oHhPRkP9Q54dRWGrZN4rzVnHM';

const g = globalThis as any;
const supabase: SupabaseClient = g.__supabaseClient ?? createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
g.__supabaseClient = supabase;

/** --- SERVICE USING THE SINGLETON --- */
@Injectable({ providedIn: 'root' })
export class DbService {
  async getCharacter(): Promise<CharacterRow[]> {
    const { data, error } = await supabase
      .from('character')
      .select('id,name,type,level')
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CharacterRow[];
  }

  async getUnlockedCraftableItems(): Promise<CraftableItemRow[]> {
    let query = supabase
      .from('craftable_item')
      .select('id')
      .eq('unlocked', true)
      .neq('type', ItemSlot.Small)
      .order('id', { ascending: true });

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as CraftableItemRow[];
  }

  async getUnlockedPotions(): Promise<CraftableItemRow[]> {
    let query = supabase
      .from('craftable_item')
      .select('id')
      .eq('unlocked', true)
      .eq('type', ItemSlot.Small)
      .eq('sub_type', 'potion')
      .order('id', { ascending: true });
    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as CraftableItemRow[];
  }

}
