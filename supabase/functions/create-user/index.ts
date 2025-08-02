import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the request body with validation
    const body = await req.json();
    const { email, password, firstName, lastName, institution, role } = body;

    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    
    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!firstName || typeof firstName !== 'string' || firstName.trim().length === 0) {
      throw new Error('First name is required');
    }
    
    if (!lastName || typeof lastName !== 'string' || lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }
    
    if (!role || !['admin', 'author', 'reviewer'].includes(role)) {
      throw new Error('Valid role is required (admin, author, or reviewer)');
    }
    
    if (institution && typeof institution !== 'string') {
      throw new Error('Institution must be a string');
    }

    console.log('Creating user with email:', email);

    // Create user account using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    console.log('User created successfully:', authData.user.id);

    // Update profile with additional info
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        institution: institution || null
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      throw profileError;
    }

    // Assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: role })
      .eq('user_id', authData.user.id);

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw roleError;
    }

    console.log('User creation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: authData.user.id, 
          email: authData.user.email 
        } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create user' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});