// src/app/services/supabase-character.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface CharacterRow {
  id: number;
  name: string;
  type: string;
  level: number;
}

const url  = 'https://ymlekirbwjanuxrclsgf.supabase.co';
//client-key, meant to be in code
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGVraXJid2phbnV4cmNsc2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNjk4OTUsImV4cCI6MjA3MTY0NTg5NX0._a0-aMgphg5_bFCzy7oHhPRkP9Q54dRWGrZN4rzVnHM';

const g = globalThis as any;
const supabase: SupabaseClient = g.__supabaseClient ?? createClient(url, anon, {
  auth: {
    persistSession: false,     // no token stored
    autoRefreshToken: false,   // nothing to refresh
    detectSessionInUrl: false, // skip parsing tokens from URL
  },
});
g.__supabaseClient = supabase;

/** --- SERVICE USING THE SINGLETON --- */
@Injectable({ providedIn: 'root' })
export class DbService {
  async list(): Promise<CharacterRow[]> {
    const { data, error } = await supabase
      .from('character')
      .select('id,name,type,level')
      .order('id', { ascending: true });
    if (error) throw error;
    return (data ?? []) as CharacterRow[];
  }

  async updateById(id: number, patch: Partial<Omit<CharacterRow, 'id'>>) {
    if (patch.level != null) {
      patch.level = Math.max(1, Math.min(8, Math.floor(+patch.level)));
    }
    const { error } = await supabase.from('character').update(patch).eq('id', id);
    if (error) throw error;
  }

  async insert(row: Omit<CharacterRow, 'id'>) {
    const safe = { ...row, level: Math.max(1, Math.min(8, Math.floor(+row.level))) };
    const { error } = await supabase.from('character').insert(safe);
    if (error) throw error;
  }

  async remove(id: number) {
    const { error } = await supabase.from('character').delete().eq('id', id);
    if (error) throw error;
  }
}
