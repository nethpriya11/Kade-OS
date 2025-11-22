import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars manually since we are not in Vite
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Checking profiles table...');
    const { data, error } = await supabase.from('profiles').select('*').limit(5);

    if (error) {
        console.error('Error fetching profiles:', error.message);
    } else {
        console.log('Success! Profiles found:', data.length);
        console.log(data);
    }
}

verify();
