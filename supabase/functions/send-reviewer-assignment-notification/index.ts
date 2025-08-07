import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewerAssignmentRequest {
  manuscriptId: string;
  manuscriptTitle: string;
  reviewerId: string;
  dueDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { manuscriptId, manuscriptTitle, reviewerId, dueDate }: ReviewerAssignmentRequest = body;

    // Input validation
    if (!manuscriptId || typeof manuscriptId !== 'string') {
      throw new Error('Manuscript ID is required');
    }
    
    if (!manuscriptTitle || typeof manuscriptTitle !== 'string') {
      throw new Error('Manuscript title is required');
    }
    
    if (!reviewerId || typeof reviewerId !== 'string') {
      throw new Error('Reviewer ID is required');
    }
    
    if (!dueDate || typeof dueDate !== 'string') {
      throw new Error('Due date is required');
    }

    // Get reviewer details
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: reviewer, error: reviewerError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', reviewerId)
      .single();

    if (reviewerError || !reviewer) {
      console.error('Error fetching reviewer:', reviewerError);
      throw new Error('Reviewer not found');
    }

    const reviewerName = reviewer.first_name && reviewer.last_name 
      ? `${reviewer.first_name} ${reviewer.last_name}` 
      : 'Reviewer';

    // Format due date
    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send email to reviewer
    const emailResponse = await resend.emails.send({
      from: "AIPM System <noreply@aipmed.org>",
      to: [reviewer.email],
      subject: `Manuscript Review Assignment: ${manuscriptTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manuscript Review Assignment</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center;">
                <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/email-assets/aipm-logo.png" alt="AIPM Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Review Assignment</h1>
                <p style="color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px;">Annals of Ibadan Postgraduate Medicine</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${reviewerName},</h2>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  You have been assigned to review a manuscript for the Annals of Ibadan Postgraduate Medicine.
                </p>
                
                <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Assignment Details:</h3>
                  <p style="margin: 8px 0; color: #4b5563;"><strong>Manuscript Title:</strong> ${manuscriptTitle}</p>
                  <p style="margin: 8px 0; color: #4b5563;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
                  <p style="margin: 8px 0; color: #4b5563;"><strong>Review Due Date:</strong> ${formattedDueDate}</p>
                </div>
                
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                  Please log in to the AIPM system to access the manuscript and submit your review before the due date.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://aipmed-portal.lovable.app/dashboard" 
                     style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Access Manuscript
                  </a>
                </div>
                
                <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: bold;">
                    <strong>Important:</strong> Please ensure your review is completed by ${formattedDueDate}. 
                    Late submissions may delay the manuscript review process.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                  This is an automated notification from the AIPM manuscript management system.
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0 0 0;">
                  If you have any questions, please contact the editorial office.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('Reviewer assignment notification sent successfully:', emailResponse);

    return new Response(JSON.stringify({ message: 'Reviewer notification sent successfully' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-reviewer-assignment-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);