import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phptszwirorxbeosbsxc.supabase.co'
const supabaseAnonKey = 'sb_publishable_NCaD55eHG0S6HKz_-KM4VA_MMuNtrzg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)