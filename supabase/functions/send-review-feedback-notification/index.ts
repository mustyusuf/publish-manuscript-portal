import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewFeedbackRequest {
  authorEmail: string;
  authorName: string;
  manuscriptTitle: string;
  reviewCount: number;
  feedbackDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { authorEmail, authorName, manuscriptTitle, reviewCount, feedbackDate }: ReviewFeedbackRequest = await req.json();

    console.log("Processing review feedback notification:", { authorEmail, authorName, manuscriptTitle, reviewCount });

    const emailResponse = await resend.emails.send({
      from: "AIPM System <noreply@aipmed.org>",
      to: [authorEmail],
      subject: `Reviews Available for "${manuscriptTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            Reviews and Feedback Available
          </h2>
          
          <p>Dear ${authorName},</p>
          
          <p>The administrative team has made reviews and feedback available for your manuscript.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">Manuscript Details</h3>
            <p><strong>Title:</strong> ${manuscriptTitle}</p>
            <p><strong>Number of Reviews:</strong> ${reviewCount}</p>
            <p><strong>Feedback Date:</strong> ${new Date(feedbackDate).toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
            <p style="margin: 0;"><strong>Next Steps:</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
              <li>Review the feedback and reviewer comments</li>
              <li>Download any review documents provided</li>
              <li>Check for final documents if your manuscript has been accepted</li>
              <li>Follow any revision instructions if applicable</li>
            </ul>
          </div>
          
          <p>Please log in to the AIPM system to access the reviews and any additional feedback from the editorial team.</p>
          
          <div style="margin: 30px 0;">
            <a href="https://lidbuempjyklxoutmwrv.lovableproject.com" 
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

    console.log("Review feedback notification email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-review-feedback-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);