import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Users, Settings, Upload, Eye, MessageSquare } from 'lucide-react';

const UserManual = () => {
  const { userRole } = useAuth();

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
            <Badge variant="secondary" className="text-sm">
              Current Role: {userRole}
            </Badge>
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