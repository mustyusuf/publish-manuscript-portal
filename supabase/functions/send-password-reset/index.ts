import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  resetLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, resetLink }: PasswordResetRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "AIP.Med <noreply@aipm.org>",
      to: [email],
      subject: "Reset Your AIPM Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://97984668-ccf3-418e-9b81-22b47f17f49d.lovableproject.com/lovable-uploads/4f1bb596-8115-434e-b44d-9923671ada12.png" 
                 alt="AIPM Logo" style="width: 80px; height: 80px;">
            <h1 style="color: #22c55e; margin: 20px 0;">Password Reset Request</h1>
          </div>
          
          <div style="background-color: #f8fffe; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;">
              Hello,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 15px 0;">
              We received a request to reset your password for your AIPM Manuscript Portal account.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.5; margin: 0 0 20px 0;">
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin: 15px 0 0 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #22c55e; font-size: 14px; word-break: break-all; margin: 5px 0;">
              ${resetLink}
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
              ⚠️ Security Notice
            </p>
            <p style="color: #856404; font-size: 14px; margin: 5px 0 0 0;">
              This link will expire in 24 hours. If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              AIPM - Annals of Ibadan Postgraduate Medicine<br>
              Manuscript Portal System
            </p>
          </div>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, message: "Password reset email sent" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset function:", error);
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