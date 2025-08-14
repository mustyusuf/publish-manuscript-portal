import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calculate the date 7 days from now
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
    const oneWeekDateStr = oneWeekFromNow.toISOString().split('T')[0];

    // Find reviews due in exactly 7 days that are still assigned
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        due_date,
        manuscripts!inner(title, id),
        profiles!reviewer_id(email, first_name, last_name)
      `)
      .eq('status', 'assigned')
      .gte('due_date', oneWeekDateStr)
      .lt('due_date', `${oneWeekDateStr}T23:59:59`)
      .not('profiles.email', 'is', null);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      throw new Error('Failed to fetch reviews');
    }

    console.log(`Found ${reviews?.length || 0} reviews due in 7 days`);

    if (!reviews || reviews.length === 0) {
      return new Response(JSON.stringify({ message: 'No reviews due in 7 days' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send reminder emails
    const emailPromises = reviews.map(async (review: any) => {
      const reviewer = review.profiles;
      const manuscript = review.manuscripts;
      
      if (!reviewer?.email) {
        console.warn(`No email found for reviewer in review ${review.id}`);
        return;
      }

      const reviewerName = reviewer.first_name && reviewer.last_name 
        ? `${reviewer.first_name} ${reviewer.last_name}` 
        : 'Reviewer';

      const formattedDueDate = new Date(review.due_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      try {
        const emailResponse = await resend.emails.send({
          from: "AIPM System <noreply@aipmed.org>",
          to: [reviewer.email],
          subject: `Reminder: Review Due in 1 Week - ${manuscript.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Review Reminder - 1 Week</title>
              </head>
              <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 40px 20px; text-align: center;">
                    <img src="${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/email-assets/aipm-logo.png" alt="AIPM Logo" style="width: 80px; height: 80px; margin-bottom: 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Review Reminder</h1>
                    <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">1 Week Until Due Date</p>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello ${reviewerName},</h2>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      This is a friendly reminder that your manuscript review is due in <strong>1 week</strong>.
                    </p>
                    
                    <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Review Details:</h3>
                      <p style="margin: 8px 0; color: #92400e;"><strong>Manuscript Title:</strong> ${manuscript.title}</p>
                      <p style="margin: 8px 0; color: #92400e;"><strong>Manuscript ID:</strong> ${manuscript.id}</p>
                      <p style="margin: 8px 0; color: #92400e;"><strong>Due Date:</strong> ${formattedDueDate}</p>
                    </div>
                    
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                      Please ensure you submit your review before the due date to help maintain our publication timeline.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://aipmedportal.vercel.app/" 
                         style="background: linear-gradient(135deg, #f59e0b, #f97316); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 6px; font-weight: bold; display: inline-block;">
                        Access Review System
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                      This is an automated reminder from the AIPM manuscript management system.
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

        console.log(`1-week reminder sent to ${reviewer.email} for review ${review.id}`);
        return emailResponse;
      } catch (error) {
        console.error(`Failed to send 1-week reminder for review ${review.id}:`, error);
        throw error;
      }
    });

    await Promise.all(emailPromises);

    return new Response(JSON.stringify({ 
      message: `1-week reminders sent for ${reviews.length} reviews` 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-week-reminder function:", error);
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