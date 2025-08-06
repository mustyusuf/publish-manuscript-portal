import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendFinalDocumentsRequest {
  manuscriptId: string;
  documents: Array<{
    name: string;
    path: string;
    url: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { manuscriptId, documents }: SendFinalDocumentsRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get manuscript and author details
    const { data: manuscript, error: manuscriptError } = await supabase
      .from('manuscripts')
      .select(`
        id,
        title,
        author_id,
        status
      `)
      .eq('id', manuscriptId)
      .single();

    if (manuscriptError || !manuscript) {
      console.error('Manuscript query error:', manuscriptError);
      throw new Error('Manuscript not found');
    }

    // Get author profile separately
    const { data: authorProfile, error: authorError } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', manuscript.author_id)
      .single();

    if (authorError || !authorProfile) {
      console.error('Author profile query error:', authorError);
      throw new Error('Author profile not found');
    }

    const authorEmail = authorProfile.email;
    const authorName = `${authorProfile.first_name} ${authorProfile.last_name}`;

    // Create document links for email
    const documentLinks = documents.map(doc => 
      `<li><a href="${doc.url}" style="color: #2754C5; text-decoration: underline;">${doc.name}</a></li>`
    ).join('');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; margin-bottom: 20px;">Final Documents Ready for "${manuscript.title}"</h2>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Dear ${authorName},
        </p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your manuscript "<strong>${manuscript.title}</strong>" has completed the review process, and the final documents are now available for download.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0; margin-bottom: 15px;">Final Documents:</h3>
          <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
            ${documentLinks}
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please download and review the final documents. If you have any questions, please don't hesitate to contact our editorial team.
        </p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Thank you for your submission to our journal.
        </p>
        
        <p style="color: #333; line-height: 1.6;">
          Best regards,<br>
          Editorial Team
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Editorial Team <noreply@aipmed.org>",
      to: [authorEmail],
      subject: `Final Documents Ready - ${manuscript.title}`,
      html: emailHtml,
    });

    console.log("Final documents email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Final documents sent to author successfully",
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-final-documents function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);