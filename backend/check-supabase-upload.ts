import { uploadToSupabase, isSupabaseConfigured } from './src/config/supabase';
import fs from 'fs';

async function test() {
  console.log('\n=== Supabase Configuration Test ===\n');
  
  console.log('Is Supabase Configured?', isSupabaseConfigured());
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.SUPABASE_ANON_KEY.length + ')' : 'NOT SET');
  
  if (isSupabaseConfigured()) {
    console.log('\n✅ Supabase is configured, testing upload...\n');
    
    try {
      // Create a test file
      const testContent = Buffer.from('Test image content');
      const testPath = 'test/test-' + Date.now() + '.txt';
      
      const url = await uploadToSupabase(testContent, testPath, 'text/plain');
      console.log('✅ Upload successful!');
      console.log('   URL:', url);
    } catch (error: any) {
      console.error('❌ Upload failed:', error.message);
    }
  } else {
    console.log('\n❌ Supabase NOT configured\n');
    console.log('Add these to .env:');
    console.log('SUPABASE_URL=https://xljawtuavcznqigmbrpt.supabase.co');
    console.log('SUPABASE_ANON_KEY=your_key_here');
  }
}

test();
