import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Buildings,
  MapPin,
  User,
  Link as LinkIcon,
  Star,
  FileText,
  Tag,
  Clock,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  saveOpportunity,
  dismissOpportunity,
  activateOpportunity,
  updateOpportunityNotes,
  createProposalFromOpportunity,
} from "../actions";

// ─── Helpers ─────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const statusColorMap: Record<string, string> = {
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  saved: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  dismissed: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  archived: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

const typeColorMap: Record<string, string> = {
  presolicitation: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  solicitation: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  award: "bg-green-100 text-green-800 hover:bg-green-100",
  combined: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

function formatDate(date: Date | null | undefined): string {
  if (!date) return "N/A";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return "N/A";
  }
}

function parseJson<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// ─── Types ───────────────────────────────────────────────

interface PointOfContact {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
}

interface ResourceLink {
  url: string;
  label?: string;
}

// ─── Page ────────────────────────────────────────────────

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      matchedClient: { select: { id: true, name: true } },
    },
  });

  if (!opportunity) {
    notFound();
  }

  const contact = parseJson<PointOfContact>(opportunity.pointOfContact);
  const links = parseJson<ResourceLink[]>(opportunity.resourceLinks);

  // Bind server actions
  const handleSave = saveOpportunity.bind(null, id);
  const handleDismiss = dismissOpportunity.bind(null, id);
  const handleActivate = activateOpportunity.bind(null, id);
  const handleCreateProposal = createProposalFromOpportunity.bind(null, id);

  async function handleNotesUpdate(formData: FormData) {
    "use server";
    const notes = formData.get("notes") as string;
    await updateOpportunityNotes(id, notes ?? "");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Back Link */}
      <Link
        href="/opportunities"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft size={18} className="mr-1" />
        Back to Opportunities
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Main Content (2 cols) ─── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title & Meta */}
          <Card>
            <CardHeader>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={statusColorMap[opportunity.status] ?? ""}
                  >
                    {opportunity.status.charAt(0).toUpperCase() +
                      opportunity.status.slice(1)}
                  </Badge>
                  {opportunity.type && (
                    <Badge
                      variant="secondary"
                      className={
                        typeColorMap[opportunity.type.toLowerCase()] ?? ""
                      }
                    >
                      {opportunity.type}
                    </Badge>
                  )}
                  {opportunity.setAside && (
                    <Badge variant="secondary">
                      <Tag size={12} className="mr-1" />
                      {opportunity.setAside}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {opportunity.title}
                </h1>
                {opportunity.solicitationNum && (
                  <p className="text-sm text-muted-foreground">
                    Solicitation #{opportunity.solicitationNum}
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {opportunity.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">
                      {opportunity.department}
                    </span>
                  </div>
                )}
                {opportunity.agency && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Agency:</span>
                    <span className="font-medium">{opportunity.agency}</span>
                  </div>
                )}
                {opportunity.office && (
                  <div className="flex items-center gap-2 text-sm">
                    <Buildings size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Office:</span>
                    <span className="font-medium">{opportunity.office}</span>
                  </div>
                )}
                {opportunity.naicsCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">NAICS:</span>
                    <span className="font-medium">{opportunity.naicsCode}</span>
                  </div>
                )}
                {opportunity.classificationCode && (
                  <div className="flex items-center gap-2 text-sm">
                    <Tag size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Classification:
                    </span>
                    <span className="font-medium">
                      {opportunity.classificationCode}
                    </span>
                  </div>
                )}
                {opportunity.placeOfPerformance && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {opportunity.placeOfPerformance}
                    </span>
                  </div>
                )}
                {opportunity.estimatedValue != null && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-muted-foreground" />
                    <span className="text-muted-foreground">Est. Value:</span>
                    <span className="font-medium">
                      {currencyFormatter.format(opportunity.estimatedValue)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {opportunity.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-muted-foreground">
                  {opportunity.description}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar size={18} className="text-muted-foreground" />
                Key Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Posted Date
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(opportunity.postedDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Response Deadline
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(opportunity.responseDeadline)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Archive Date
                  </p>
                  <p className="text-sm font-medium">
                    {formatDate(opportunity.archiveDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Point of Contact */}
          {contact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User size={18} className="text-muted-foreground" />
                  Point of Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-muted-foreground" />
                    <span className="font-medium">{contact.name}</span>
                    {contact.title && (
                      <span className="text-muted-foreground">
                        - {contact.title}
                      </span>
                    )}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon size={14} className="text-muted-foreground" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-primary hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resource Links */}
          {links && links.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LinkIcon size={18} className="text-muted-foreground" />
                  Resource Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {links.map((link, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <LinkIcon
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {link.label || link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Award Info */}
          {(opportunity.awardDate ||
            opportunity.awardee ||
            opportunity.awardAmount != null) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star
                    size={18}
                    weight="fill"
                    className="text-yellow-500"
                  />
                  Award Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {opportunity.awardDate && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Award Date
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(opportunity.awardDate)}
                      </p>
                    </div>
                  )}
                  {opportunity.awardee && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Awardee
                      </p>
                      <p className="text-sm font-medium">
                        {opportunity.awardee}
                      </p>
                    </div>
                  )}
                  {opportunity.awardAmount != null && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Award Amount
                      </p>
                      <p className="text-sm font-medium">
                        {currencyFormatter.format(opportunity.awardAmount)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Sidebar (1 col) ─── */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star size={18} className="text-muted-foreground" />
                Match & Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Match Score */}
              {opportunity.matchScore != null && (
                <div className="space-y-1">
                  <Progress value={opportunity.matchScore}>
                    <ProgressLabel>Match Score</ProgressLabel>
                    <ProgressValue />
                  </Progress>
                </div>
              )}

              {/* Matched Client */}
              {opportunity.matchedClient && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Matched Client
                  </p>
                  <Link
                    href={`/clients/${opportunity.matchedClient.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Buildings size={14} />
                    {opportunity.matchedClient.name}
                  </Link>
                </div>
              )}

              <Separator />

              {/* Create Proposal */}
              {opportunity.matchedClientId && (
                <form action={handleCreateProposal}>
                  <Button type="submit" className="w-full">
                    <FileText size={16} className="mr-2" />
                    Create Proposal
                  </Button>
                </form>
              )}

              {!opportunity.matchedClientId && (
                <Link
                  href={`/proposals/new`}
                  className={buttonVariants({ className: "w-full" })}
                >
                  <FileText size={16} className="mr-2" />
                  Create Proposal
                </Link>
              )}

              <Separator />

              {/* Status Actions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status Actions
                </p>
                <div className="flex flex-col gap-2">
                  {opportunity.status !== "saved" && (
                    <form action={handleSave}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Star size={14} className="mr-1.5" />
                        Save
                      </Button>
                    </form>
                  )}
                  {opportunity.status !== "dismissed" && (
                    <form action={handleDismiss}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Dismiss
                      </Button>
                    </form>
                  )}
                  {(opportunity.status === "saved" ||
                    opportunity.status === "dismissed") && (
                    <form action={handleActivate}>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Activate
                      </Button>
                    </form>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <form action={handleNotesUpdate} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Notes
                </p>
                <Textarea
                  name="notes"
                  defaultValue={opportunity.notes ?? ""}
                  placeholder="Add notes about this opportunity..."
                  rows={4}
                  className="resize-none text-sm"
                />
                <Button type="submit" variant="outline" size="sm">
                  Save Notes
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
