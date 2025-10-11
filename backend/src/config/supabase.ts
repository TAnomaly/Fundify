// Supabase configuration
let supabase: any = null;
let createClient: any = null;

try {
  // Try to import Supabase (may not be available)
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

  if (supabaseUrl && supabaseKey && createClient) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase configured successfully');
  } else {
    console.log('⚠️  Supabase not configured (missing credentials)');
  }
} catch (error) {
  console.log('⚠️  Supabase module not available, using fallback storage');
  supabase = null;
}

export { supabase };

// Check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
};

// Upload file to Supabase Storage
export const uploadToSupabase = async (
  file: Buffer,
  path: string,
  contentType: string
): Promise<string> => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { data, error } = await supabase.storage
      .from('fundify-media')
      .upload(path, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('fundify-media')
      .getPublicUrl(data.path);

    return publicData.publicUrl;
  } catch (error: any) {
    console.error('Supabase upload failed:', error);
    throw error;
  }
};

export default supabase;

