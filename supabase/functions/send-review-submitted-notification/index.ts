import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewSubmittedRequest {
  reviewId: string;
  manuscriptTitle: string;
  reviewerName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewId, manuscriptTitle, reviewerName }: ReviewSubmittedRequest = await req.json();

    console.log("Processing review submission notification:", { reviewId, manuscriptTitle, reviewerName });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get admin users by joining user_roles and profiles tables
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

    // Send email to each admin
    const emailPromises = adminProfiles.map(async (adminProfile: any) => {
      
      return await resend.emails.send({
        from: "AIPM System <onboarding@resend.dev>",
        to: [adminProfile.email],
        subject: `Review Submitted for "${manuscriptTitle}"`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
              Review Submitted
            </h2>
            
            <p>Dear ${adminProfile.first_name} ${adminProfile.last_name},</p>
            
            <p>A review has been submitted for the manuscript:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #007bff;">Manuscript Details</h3>
              <p><strong>Title:</strong> ${manuscriptTitle}</p>
              <p><strong>Reviewer:</strong> ${reviewerName}</p>
            </div>
            
            <p>Please log in to the AIPM system to review the submission and take appropriate action.</p>
            
            <div style="margin: 30px 0;">
              <a href="https://lidbuempjyklxoutmwrv.supabase.co" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access AIPM System
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from the AIPM system.
            </p>
          </div>
        `,
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => result.status === 'fulfilled').length;
    const failureCount = emailResults.filter(result => result.status === 'rejected').length;

    console.log(`Email notifications sent: ${successCount} successful, ${failureCount} failed`);

    return new Response(JSON.stringify({ 
      message: "Review submission notifications processed",
      sent: successCount,
      failed: failureCount
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-review-submitted-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);