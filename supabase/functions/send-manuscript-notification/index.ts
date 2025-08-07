import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ManuscriptNotificationRequest {
  manuscriptId: string;
  authorName: string;
  manuscriptTitle: string;
  authorEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { manuscriptId, authorName, manuscriptTitle, authorEmail }: ManuscriptNotificationRequest = body;

    console.log("Processing manuscript notification:", { manuscriptId, authorName, manuscriptTitle, authorEmail });

    // Input validation
    if (!manuscriptId || typeof manuscriptId !== 'string') {
      throw new Error('Manuscript ID is required');
    }
    
    if (!authorName || typeof authorName !== 'string') {
      throw new Error('Author name is required');
    }
    
    if (!manuscriptTitle || typeof manuscriptTitle !== 'string') {
      throw new Error('Manuscript title is required');
    }
    
    if (!authorEmail || typeof authorEmail !== 'string' || !authorEmail.includes('@')) {
      throw new Error('Valid author email is required');
    }

    // Get admin emails from profiles where user has admin role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log("Getting admin users...");
    
    // Get admin users by first getting user_ids from user_roles
    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admin user roles:", adminError);
      return new Response(JSON.stringify({ error: "Failed to fetch admin users" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Admin users found:", adminUsers?.length || 0);

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ message: "No admin users found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get admin profiles
    const adminUserIds = adminUsers.map(user => user.user_id);
    const { data: adminProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .in("user_id", adminUserIds);

    if (profileError) {
      console.error("Error fetching admin profiles:", profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch admin profiles" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      console.log("No admin profiles found");
      return new Response(JSON.stringify({ message: "No admin profiles found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email to all admins
    console.log("Sending emails to admin profiles:", adminProfiles.length);
    const emailPromises = adminProfiles.map(async (adminProfile: any) => {
      const adminEmail = adminProfile.email;
      const adminName = adminProfile.first_name && adminProfile.last_name 
        ? `${adminProfile.first_name} ${adminProfile.last_name}` 
        : 'Admin';

      console.log("Sending email to:", adminEmail);

      return resend.emails.send({
        from: "AIPM System <noreply@aipmed.org>",
        to: [adminEmail],
        subject: `New Manuscript Submission: ${manuscriptTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Manuscript Submission</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center;">
                  <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/email-assets/aipm-logo.png" alt="AIPM Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">New Manuscript Submitted</h1>
                  <p style="color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px;">Annals of Ibadan Postgraduate Medicine</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${adminName},</h2>
                  
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    A new manuscript has been submitted to AIPM and requires your review.
                  </p>
                  
                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Manuscript Details:</h3>
                    <p style="margin: 8px 0; color: #4b5563;"><strong>Title:</strong> ${manuscriptTitle}</p>
                    <p style="margin: 8px 0; color: #4b5563;"><strong>Author:</strong> ${authorName}</p>
                    <p style="margin: 8px 0; color: #4b5563;"><strong>Author Email:</strong> ${authorEmail}</p>
                    <p style="margin: 8px 0; color: #4b5563;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
                  </div>
                  
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Please log in to the AIPM system to review the manuscript and assign reviewers.
                  </p>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://aipmedportal.vercel.app/dashboard" 
                       style="background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; display: inline-block;">
                      Review Manuscript
                    </a>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    This is an automated notification from the AIPM manuscript management system.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => result.status === 'fulfilled').length;
    const failureCount = emailResults.filter(result => result.status === 'rejected').length;

    console.log(`Manuscript submission notification sent: ${successCount} successful, ${failureCount} failed`);

    return new Response(JSON.stringify({ message: 'Notifications sent successfully' }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-manuscript-notification function:", error);
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