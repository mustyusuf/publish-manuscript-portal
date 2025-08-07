import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmissionConfirmationRequest {
  authorEmail: string;
  authorName: string;
  manuscriptTitle: string;
  submissionDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorEmail, authorName, manuscriptTitle, submissionDate }: SubmissionConfirmationRequest = await req.json();

    console.log("Processing author submission confirmation:", { authorEmail, authorName, manuscriptTitle });

    const emailResponse = await resend.emails.send({
      from: "AIPM System <noreply@aipmed.org>",
      to: [authorEmail],
      subject: `Manuscript Submission Confirmed: "${manuscriptTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Manuscript Submission Confirmed
          </h2>
          
          <p>Dear ${authorName},</p>
          
          <p>Thank you for submitting your manuscript to our journal. We have successfully received your submission.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">Submission Details</h3>
            <p><strong>Title:</strong> ${manuscriptTitle}</p>
            <p><strong>Submission Date:</strong> ${new Date(submissionDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> Submitted</p>
          </div>
          
          <p>Your manuscript is now under review. You will receive email notifications when:</p>
          <ul>
            <li>The manuscript status changes</li>
            <li>Reviews and feedback become available</li>
            <li>Final documents are ready for download</li>
          </ul>
          
          <p>You can track the progress of your submission by logging into the AIPM system.</p>
          
          <div style="margin: 30px 0;">
            <a href="https://aipmedportal.vercel.app/" 
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

    console.log("Submission confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-author-submission-confirmation function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);