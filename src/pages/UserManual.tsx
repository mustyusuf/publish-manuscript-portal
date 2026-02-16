import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, Users, Settings, Upload, Eye, MessageSquare, Download } from 'lucide-react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const UserManual = () => {
  const { userRole } = useAuth();

  const downloadManual = async (role: string, content: string) => {
    // Convert role-specific content to Word document format
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `AIPM System - ${role.charAt(0).toUpperCase() + role.slice(1)} User Manual`,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `Complete guide for ${role} functionality`,
            spacing: { after: 400 },
          }),
          ...generateDocxContent(role)
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${role}-user-manual-aipm.docx`);
  };

  const generateDocxContent = (role: string) => {
    const content = [];
    
    if (role === 'author') {
      content.push(
        new Paragraph({ text: '1. Manuscript Submission', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'How to submit your research manuscript:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Navigate to your Author Dashboard' }),
        new Paragraph({ text: '• Click "Submit New Manuscript" button' }),
        new Paragraph({ text: '• Fill in manuscript title and abstract' }),
        new Paragraph({ text: '• Upload your manuscript file (PDF, DOC, DOCX)' }),
        new Paragraph({ text: '• Select relevant keywords and categories' }),
        new Paragraph({ text: '• Review submission details' }),
        new Paragraph({ text: '• Click "Submit" to send for review' }),
        new Paragraph({ text: '• You\'ll receive a confirmation email', spacing: { after: 400 } }),
        
        new Paragraph({ text: '2. Track Manuscript Status', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Monitor your submission progress:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Check your dashboard for status updates' }),
        new Paragraph({ text: '• Status progression: Submitted → Under Review → Decision' }),
        new Paragraph({ text: '• Receive email notifications for status changes' }),
        new Paragraph({ text: '• View detailed feedback when available' }),
        new Paragraph({ text: '• Download reviewer comments and suggestions', spacing: { after: 400 } }),
        
        new Paragraph({ text: 'Important Guidelines', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '• Ensure manuscript follows journal formatting guidelines' }),
        new Paragraph({ text: '• Respond to revision requests within specified deadlines' }),
        new Paragraph({ text: '• Keep your contact information updated' }),
        new Paragraph({ text: '• Check your email regularly for notifications' })
      );
    } else if (role === 'reviewer') {
      content.push(
        new Paragraph({ text: '1. Accept Review Assignments', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Manage your review invitations:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Check your Reviewer Dashboard regularly' }),
        new Paragraph({ text: '• Review assignment notifications in email' }),
        new Paragraph({ text: '• Evaluate manuscript topic relevance to expertise' }),
        new Paragraph({ text: '• Accept or decline assignments promptly', spacing: { after: 400 } }),
        
        new Paragraph({ text: '2. Conduct Manuscript Review', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Thoroughly evaluate submitted work:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Download manuscript and related files' }),
        new Paragraph({ text: '• Read abstract and full paper carefully' }),
        new Paragraph({ text: '• Evaluate methodology and analysis' }),
        new Paragraph({ text: '• Prepare detailed feedback comments', spacing: { after: 400 } }),
        
        new Paragraph({ text: 'Review Quality Standards', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '• Maintain confidentiality of manuscript content' }),
        new Paragraph({ text: '• Provide constructive and respectful feedback' }),
        new Paragraph({ text: '• Meet all review deadlines promptly' })
      );
    } else if (role === 'admin') {
      content.push(
        new Paragraph({ text: '1. User Management', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Manage system users and roles:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Access Admin Dashboard for user overview' }),
        new Paragraph({ text: '• Add new users with appropriate roles' }),
        new Paragraph({ text: '• Assign roles: Author, Reviewer, Admin' }),
        new Paragraph({ text: '• Monitor user activity and engagement', spacing: { after: 400 } }),
        
        new Paragraph({ text: '2. Manuscript Management', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: 'Oversee submission workflow:', spacing: { after: 200 } }),
        new Paragraph({ text: '• Monitor new manuscript submissions' }),
        new Paragraph({ text: '• Assign manuscripts to appropriate reviewers' }),
        new Paragraph({ text: '• Track review progress and deadlines' }),
        new Paragraph({ text: '• Handle special cases and exceptions', spacing: { after: 400 } }),
        
        new Paragraph({ text: 'Critical Responsibilities', heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: '• Ensure fair and unbiased review process' }),
        new Paragraph({ text: '• Maintain confidentiality of all submissions' }),
        new Paragraph({ text: '• Respond to urgent issues within 24 hours' })
      );
    }
    
    return content;
  };

  const generateAuthorManualContent = () => `
    <h1>AIPM System - Author User Manual</h1>
    <p><strong>Complete guide for manuscript submission and management</strong></p>
    
    <h2>1. Manuscript Submission</h2>
    <div class="step-card">
      <div class="step-title">How to submit your research manuscript</div>
      <ul>
        <li>Navigate to your Author Dashboard</li>
        <li>Click 'Submit New Manuscript' button</li>
        <li>Fill in manuscript title and abstract</li>
        <li>Upload your manuscript file (PDF, DOC, DOCX)</li>
        <li>Select relevant keywords and categories</li>
        <li>Review submission details</li>
        <li>Click 'Submit' to send for review</li>
        <li>You'll receive a confirmation email</li>
      </ul>
    </div>

    <h2>2. Track Manuscript Status</h2>
    <div class="step-card">
      <div class="step-title">Monitor your submission progress</div>
      <ul>
        <li>Check your dashboard for status updates</li>
        <li>Status progression: Submitted → Under Review → Decision</li>
        <li>Receive email notifications for status changes</li>
        <li>View detailed feedback when available</li>
        <li>Download reviewer comments and suggestions</li>
        <li>Check for revision requests or acceptance letters</li>
      </ul>
    </div>

    <h2>3. Handle Revisions</h2>
    <div class="step-card">
      <div class="step-title">Respond to reviewer feedback</div>
      <ul>
        <li>Read all reviewer comments carefully</li>
        <li>Prepare revised manuscript addressing feedback</li>
        <li>Write a response letter explaining changes</li>
        <li>Upload revised files through the revision portal</li>
        <li>Submit revision with response letter</li>
        <li>Track revision review process</li>
      </ul>
    </div>

    <h2>4. Final Publication</h2>
    <div class="step-card">
      <div class="step-title">Complete the publication process</div>
      <ul>
        <li>Receive acceptance notification email</li>
        <li>Download final publication documents</li>
        <li>Review copyright and licensing terms</li>
        <li>Provide any additional requested information</li>
        <li>Receive publication confirmation</li>
        <li>Access published article details</li>
      </ul>
    </div>

    <div class="guidelines">
      <h3>Important Guidelines</h3>
      <ul>
        <li>Ensure manuscript follows journal formatting guidelines</li>
        <li>Respond to revision requests within specified deadlines</li>
        <li>Keep your contact information updated</li>
        <li>Check your email regularly for notifications</li>
        <li>Contact admin if you experience technical issues</li>
      </ul>
    </div>
  `;

  const generateReviewerManualContent = () => `
    <h1>AIPM System - Reviewer User Manual</h1>
    <p><strong>Comprehensive guide for manuscript review process</strong></p>
    
    <h2>1. Accept Review Assignments</h2>
    <div class="step-card">
      <div class="step-title">Manage your review invitations</div>
      <ul>
        <li>Check your Reviewer Dashboard regularly</li>
        <li>Review assignment notifications in email</li>
        <li>Evaluate manuscript topic relevance to expertise</li>
        <li>Check availability and deadline feasibility</li>
        <li>Accept or decline assignments promptly</li>
        <li>Notify admin of any conflicts of interest</li>
      </ul>
    </div>

    <h2>2. Conduct Manuscript Review</h2>
    <div class="step-card">
      <div class="step-title">Thoroughly evaluate submitted work</div>
      <ul>
        <li>Download manuscript and related files</li>
        <li>Read abstract and full paper carefully</li>
        <li>Evaluate methodology and analysis</li>
        <li>Check references and citations</li>
        <li>Assess novelty and significance</li>
        <li>Review writing quality and clarity</li>
        <li>Prepare detailed feedback comments</li>
      </ul>
    </div>

    <h2>3. Submit Review Report</h2>
    <div class="step-card">
      <div class="step-title">Provide comprehensive feedback</div>
      <ul>
        <li>Use the review form in your dashboard</li>
        <li>Provide overall recommendation (Accept/Reject/Revise)</li>
        <li>Write detailed comments for authors</li>
        <li>Include specific suggestions for improvement</li>
        <li>Upload any annotated files if needed</li>
        <li>Submit review before deadline</li>
        <li>Confirm submission completion</li>
      </ul>
    </div>

    <h2>4. Follow-up Reviews</h2>
    <div class="step-card">
      <div class="step-title">Handle revision reviews</div>
      <ul>
        <li>Receive notifications for manuscript revisions</li>
        <li>Review author response to feedback</li>
        <li>Evaluate revised manuscript sections</li>
        <li>Check if concerns were adequately addressed</li>
        <li>Provide final recommendation</li>
        <li>Submit follow-up review report</li>
      </ul>
    </div>

    <div class="guidelines">
      <h3>Review Quality Standards</h3>
      <ul>
        <li>Maintain confidentiality of manuscript content</li>
        <li>Provide constructive and respectful feedback</li>
        <li>Be thorough but focus on significant issues</li>
        <li>Meet all review deadlines promptly</li>
        <li>Declare any potential conflicts of interest</li>
        <li>Support recommendations with clear reasoning</li>
      </ul>
    </div>
  `;

  const generateAdminManualContent = () => `
    <h1>AIPM System - Admin User Manual</h1>
    <p><strong>Complete system administration guide</strong></p>
    
    <h2>1. User Management</h2>
    <div class="step-card">
      <div class="step-title">Manage system users and roles</div>
      <ul>
        <li>Access Admin Dashboard for user overview</li>
        <li>Add new users with appropriate roles</li>
        <li>Assign roles: Author, Reviewer, Admin</li>
        <li>Update user information and permissions</li>
        <li>Deactivate inactive user accounts</li>
        <li>Monitor user activity and engagement</li>
      </ul>
    </div>

    <h2>2. Manuscript Management</h2>
    <div class="step-card">
      <div class="step-title">Oversee submission workflow</div>
      <ul>
        <li>Monitor new manuscript submissions</li>
        <li>Assign manuscripts to appropriate reviewers</li>
        <li>Track review progress and deadlines</li>
        <li>Send reminder notifications to reviewers</li>
        <li>Manage manuscript status updates</li>
        <li>Handle special cases and exceptions</li>
      </ul>
    </div>

    <h2>3. Review Process Management</h2>
    <div class="step-card">
      <div class="step-title">Coordinate review activities</div>
      <ul>
        <li>Match manuscripts with qualified reviewers</li>
        <li>Send review assignment notifications</li>
        <li>Monitor review completion rates</li>
        <li>Manage reviewer workload distribution</li>
        <li>Handle review conflicts and disputes</li>
        <li>Ensure review quality standards</li>
      </ul>
    </div>

    <h2>4. System Administration</h2>
    <div class="step-card">
      <div class="step-title">Maintain system operations</div>
      <ul>
        <li>Configure system settings and parameters</li>
        <li>Manage email notification templates</li>
        <li>Monitor system performance and usage</li>
        <li>Handle technical support requests</li>
        <li>Backup and maintain data integrity</li>
        <li>Generate reports and analytics</li>
      </ul>
    </div>

    <h2>5. Decision Management</h2>
    <div class="step-card">
      <div class="step-title">Final manuscript decisions</div>
      <ul>
        <li>Review completed reviewer reports</li>
        <li>Evaluate overall recommendation consensus</li>
        <li>Make final acceptance/rejection decisions</li>
        <li>Communicate decisions to authors</li>
        <li>Manage revision request processes</li>
        <li>Coordinate final publication steps</li>
      </ul>
    </div>

    <h2>6. Quality Assurance</h2>
    <div class="step-card">
      <div class="step-title">Maintain system quality</div>
      <ul>
        <li>Monitor review quality and consistency</li>
        <li>Ensure timely processing of submissions</li>
        <li>Review system metrics and KPIs</li>
        <li>Address user feedback and complaints</li>
        <li>Implement process improvements</li>
        <li>Train new reviewers and users</li>
      </ul>
    </div>

    <div class="guidelines">
      <h3>Critical Responsibilities</h3>
      <ul>
        <li>Ensure fair and unbiased review process</li>
        <li>Maintain confidentiality of all submissions</li>
        <li>Respond to urgent issues within 24 hours</li>
        <li>Keep detailed records of all decisions</li>
        <li>Regularly backup system data</li>
        <li>Stay updated with system features and updates</li>
      </ul>
    </div>
  `;

  const StepCard = ({ icon: Icon, title, description, steps }: {
    icon: any;
    title: string;
    description: string;
    steps: string[];
  }) => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{step}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );

  const AuthorManual = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Author User Manual</h2>
        <p className="text-muted-foreground">Complete guide for manuscript submission and management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StepCard
          icon={Upload}
          title="Manuscript Submission"
          description="How to submit your research manuscript"
          steps={[
            "Navigate to your Author Dashboard",
            "Click 'Submit New Manuscript' button",
            "Fill in manuscript title and abstract",
            "Upload your manuscript file (PDF, DOC, DOCX)",
            "Select relevant keywords and categories",
            "Review submission details",
            "Click 'Submit' to send for review",
            "You'll receive a confirmation email"
          ]}
        />

        <StepCard
          icon={Eye}
          title="Track Manuscript Status"
          description="Monitor your submission progress"
          steps={[
            "Check your dashboard for status updates",
            "Status progression: Submitted → Under Review → Decision",
            "Receive email notifications for status changes",
            "View detailed feedback when available",
            "Download reviewer comments and suggestions",
            "Check for revision requests or acceptance letters"
          ]}
        />

        <StepCard
          icon={FileText}
          title="Handle Revisions"
          description="Respond to reviewer feedback"
          steps={[
            "Read all reviewer comments carefully",
            "Prepare revised manuscript addressing feedback",
            "Write a response letter explaining changes",
            "Upload revised files through the revision portal",
            "Submit revision with response letter",
            "Track revision review process"
          ]}
        />

        <StepCard
          icon={CheckCircle}
          title="Final Publication"
          description="Complete the publication process"
          steps={[
            "Receive acceptance notification email",
            "Download final publication documents",
            "Review copyright and licensing terms",
            "Provide any additional requested information",
            "Receive publication confirmation",
            "Access published article details"
          ]}
        />
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Important Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>• Ensure manuscript follows journal formatting guidelines</p>
          <p>• Respond to revision requests within specified deadlines</p>
          <p>• Keep your contact information updated</p>
          <p>• Check your email regularly for notifications</p>
          <p>• Contact admin if you experience technical issues</p>
        </CardContent>
      </Card>
    </div>
  );

  const ReviewerManual = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Reviewer User Manual</h2>
        <p className="text-muted-foreground">Comprehensive guide for manuscript review process</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StepCard
          icon={FileText}
          title="Accept Review Assignments"
          description="Manage your review invitations"
          steps={[
            "Check your Reviewer Dashboard regularly",
            "Review assignment notifications in email",
            "Evaluate manuscript topic relevance to expertise",
            "Check availability and deadline feasibility",
            "Accept or decline assignments promptly",
            "Notify admin of any conflicts of interest"
          ]}
        />

        <StepCard
          icon={Eye}
          title="Conduct Manuscript Review"
          description="Thoroughly evaluate submitted work"
          steps={[
            "Download manuscript and related files",
            "Read abstract and full paper carefully",
            "Evaluate methodology and analysis",
            "Check references and citations",
            "Assess novelty and significance",
            "Review writing quality and clarity",
            "Prepare detailed feedback comments"
          ]}
        />

        <StepCard
          icon={MessageSquare}
          title="Submit Review Report"
          description="Provide comprehensive feedback"
          steps={[
            "Use the review form in your dashboard",
            "Provide overall recommendation (Accept/Reject/Revise)",
            "Write detailed comments for authors",
            "Include specific suggestions for improvement",
            "Upload any annotated files if needed",
            "Submit review before deadline",
            "Confirm submission completion"
          ]}
        />

        <StepCard
          icon={CheckCircle}
          title="Follow-up Reviews"
          description="Handle revision reviews"
          steps={[
            "Receive notifications for manuscript revisions",
            "Review author response to feedback",
            "Evaluate revised manuscript sections",
            "Check if concerns were adequately addressed",
            "Provide final recommendation",
            "Submit follow-up review report"
          ]}
        />
      </div>

      <Card className="bg-secondary/5 border-secondary/20">
        <CardHeader>
          <CardTitle className="text-secondary">Review Quality Standards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>• Maintain confidentiality of manuscript content</p>
          <p>• Provide constructive and respectful feedback</p>
          <p>• Be thorough but focus on significant issues</p>
          <p>• Meet all review deadlines promptly</p>
          <p>• Declare any potential conflicts of interest</p>
          <p>• Support recommendations with clear reasoning</p>
        </CardContent>
      </Card>
    </div>
  );

  const AdminManual = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Admin User Manual</h2>
        <p className="text-muted-foreground">Complete system administration guide</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StepCard
          icon={Users}
          title="User Management"
          description="Manage system users and roles"
          steps={[
            "Access Admin Dashboard for user overview",
            "Add new users with appropriate roles",
            "Assign roles: Author, Reviewer, Admin",
            "Update user information and permissions",
            "Deactivate inactive user accounts",
            "Monitor user activity and engagement"
          ]}
        />

        <StepCard
          icon={FileText}
          title="Manuscript Management"
          description="Oversee submission workflow"
          steps={[
            "Monitor new manuscript submissions",
            "Assign manuscripts to appropriate reviewers",
            "Track review progress and deadlines",
            "Send reminder notifications to reviewers",
            "Manage manuscript status updates",
            "Handle special cases and exceptions"
          ]}
        />

        <StepCard
          icon={MessageSquare}
          title="Review Process Management"
          description="Coordinate review activities"
          steps={[
            "Match manuscripts with qualified reviewers",
            "Send review assignment notifications",
            "Monitor review completion rates",
            "Manage reviewer workload distribution",
            "Handle review conflicts and disputes",
            "Ensure review quality standards"
          ]}
        />

        <StepCard
          icon={Settings}
          title="System Administration"
          description="Maintain system operations"
          steps={[
            "Configure system settings and parameters",
            "Manage email notification templates",
            "Monitor system performance and usage",
            "Handle technical support requests",
            "Backup and maintain data integrity",
            "Generate reports and analytics"
          ]}
        />

        <StepCard
          icon={CheckCircle}
          title="Decision Management"
          description="Final manuscript decisions"
          steps={[
            "Review completed reviewer reports",
            "Evaluate overall recommendation consensus",
            "Make final acceptance/rejection decisions",
            "Communicate decisions to authors",
            "Manage revision request processes",
            "Coordinate final publication steps"
          ]}
        />

        <StepCard
          icon={Eye}
          title="Quality Assurance"
          description="Maintain system quality"
          steps={[
            "Monitor review quality and consistency",
            "Ensure timely processing of submissions",
            "Review system metrics and KPIs",
            "Address user feedback and complaints",
            "Implement process improvements",
            "Train new reviewers and users"
          ]}
        />
      </div>

      <Card className="bg-destructive/5 border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Critical Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>• Ensure fair and unbiased review process</p>
          <p>• Maintain confidentiality of all submissions</p>
          <p>• Respond to urgent issues within 24 hours</p>
          <p>• Keep detailed records of all decisions</p>
          <p>• Regularly backup system data</p>
          <p>• Stay updated with system features and updates</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 to-background">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">AIPM System User Manual</h1>
            <p className="text-xl text-muted-foreground mb-4">
              Comprehensive guides for Authors, Reviewers, and Administrators
            </p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Badge variant="secondary" className="text-sm">
                Current Role: {userRole}
              </Badge>
              <Button 
                onClick={() => {
                  const currentRole = userRole || 'author';
                  if (currentRole === 'author') {
                    downloadManual('author', generateAuthorManualContent());
                  } else if (currentRole === 'reviewer') {
                    downloadManual('reviewer', generateReviewerManualContent());
                  } else if (currentRole === 'admin') {
                    downloadManual('admin', generateAdminManualContent());
                  }
                }}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Manual
              </Button>
            </div>
          </div>

          <Tabs defaultValue={userRole || 'author'} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="author">Author Guide</TabsTrigger>
              <TabsTrigger value="reviewer">Reviewer Guide</TabsTrigger>
              <TabsTrigger value="admin">Admin Guide</TabsTrigger>
            </TabsList>

            <TabsContent value="author">
              <AuthorManual />
            </TabsContent>

            <TabsContent value="reviewer">
              <ReviewerManual />
            </TabsContent>

            <TabsContent value="admin">
              <AdminManual />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default UserManual;