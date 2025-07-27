import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName }: WelcomeEmailRequest = await req.json();
    const name = firstName && lastName ? `${firstName} ${lastName}` : 'User';

    const emailResponse = await resend.emails.send({
      from: "AIP.Med <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to AIPM Manuscript Portal - Please Verify Your Email",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to AIPM</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with Logo -->
            <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center;">
              <img src="https://lidbuempjyklxoutmwrv.supabase.co/storage/v1/object/public/email-assets/aipm-logo.png" alt="AIPM Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to AIPM</h1>
              <p style="color: #f0fdf4; margin: 10px 0 0 0; font-size: 16px;">Annals of Ibadan Postgraduate Medicine</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${name}!</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                Thank you for joining the AIPM Manuscript Portal. Your account has been created successfully!
              </p>
              
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                To complete your registration and start submitting manuscripts, please verify your email address by clicking the verification link that will be sent to you separately.
              </p>
              
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #065f46; margin: 0; font-size: 14px; font-weight: 500;">
                  <strong>Next Steps:</strong><br>
                  1. Check your email for the verification link<br>
                  2. Complete your profile setup<br>
                  3. Start submitting your manuscripts
                </p>
              </div>
              
              <p style="color: #6b7280; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
                If you have any questions or need assistance, please don't hesitate to contact our support team.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Best regards,<br>
                <strong style="color: #059669;">The AIPM Team</strong>
              </p>
              <p style="color: #9ca3af; margin: 20px 0 0 0; font-size: 12px;">
                Annals of Ibadan Postgraduate Medicine<br>
                ARD, U.C.H.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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