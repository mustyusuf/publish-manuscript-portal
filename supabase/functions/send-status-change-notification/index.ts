import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeRequest {
  authorEmail: string;
  authorName: string;
  manuscriptTitle: string;
  oldStatus: string;
  newStatus: string;
  changeDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorEmail, authorName, manuscriptTitle, oldStatus, newStatus, changeDate }: StatusChangeRequest = await req.json();

    console.log("Processing status change notification:", { authorEmail, authorName, manuscriptTitle, oldStatus, newStatus });

    const getStatusMessage = (status: string) => {
      switch (status) {
        case 'submitted': return 'Your manuscript has been submitted and is awaiting initial review.';
        case 'under_review': return 'Your manuscript is currently under peer review.';
        case 'revision_requested': return 'Reviewers have requested revisions to your manuscript.';
        case 'accepted': return 'Congratulations! Your manuscript has been accepted for publication.';
        case 'rejected': return 'Unfortunately, your manuscript has not been accepted for publication.';
        default: return `Your manuscript status has been updated to: ${status}`;
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'accepted': return '#28a745';
        case 'rejected': return '#dc3545';
        case 'revision_requested': return '#ffc107';
        case 'under_review': return '#007bff';
        default: return '#6c757d';
      }
    };

    const emailResponse = await resend.emails.send({
      from: "AIPM System <noreply@aipmed.org>",
      to: [authorEmail],
      subject: `Manuscript Status Update: "${manuscriptTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Manuscript Status Update
          </h2>
          
          <p>Dear ${authorName},</p>
          
          <p>The status of your manuscript has been updated.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">Manuscript Details</h3>
            <p><strong>Title:</strong> ${manuscriptTitle}</p>
            <p><strong>Previous Status:</strong> <span style="color: #6c757d;">${oldStatus.replace('_', ' ').toUpperCase()}</span></p>
            <p><strong>New Status:</strong> <span style="color: ${getStatusColor(newStatus)}; font-weight: bold;">${newStatus.replace('_', ' ').toUpperCase()}</span></p>
            <p><strong>Date Changed:</strong> ${new Date(changeDate).toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${getStatusColor(newStatus)};">
            <p style="margin: 0;"><strong>Status Information:</strong></p>
            <p style="margin: 10px 0 0 0;">${getStatusMessage(newStatus)}</p>
          </div>
          
          <p>Please log in to the AIPM system to view detailed information about your manuscript and any available reviews or feedback.</p>
          
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

    console.log("Status change notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-status-change-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);