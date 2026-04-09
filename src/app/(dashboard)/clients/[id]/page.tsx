import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Buildings,
  ArrowLeft,
  Envelope,
  Globe,
  User,
  Phone,
  PencilSimple,
  Trash,
  FileText,
} from "@phosphor-icons/react/dist/ssr";
import { deleteClient } from "../actions";

const statusColors: Record<string, string> = {
  draft: "secondary",
  review: "outline",
  approved: "default",
  sent: "default",
  accepted: "default",
  rejected: "destructive",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      proposals: {
        orderBy: { updatedAt: "desc" },
        include: {
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  const deleteClientWithId = deleteClient.bind(null, client.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clients" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          {client.industry && (
            <p className="text-muted-foreground">{client.industry}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <PencilSimple className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <form action={deleteClientWithId}>
            <Button variant="destructive" type="submit">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Buildings className="h-5 w-5" />
              Client Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.contactName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium">{client.contactName}</p>
                </div>
              </div>
            )}
            {client.contactEmail && (
              <div className="flex items-center gap-3">
                <Envelope className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{client.contactEmail}</p>
                </div>
              </div>
            )}
            {client.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{client.contactPhone}</p>
                </div>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              </div>
            )}
            {client.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
            {!client.contactName &&
              !client.contactEmail &&
              !client.contactPhone &&
              !client.website &&
              !client.notes && (
                <p className="text-sm text-muted-foreground">
                  No additional details added.
                </p>
              )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Proposals
              </CardTitle>
              <Badge variant="secondary">
                {client.proposals.length}{" "}
                {client.proposals.length === 1 ? "proposal" : "proposals"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {client.proposals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No proposals for this client yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {client.proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{proposal.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>by {proposal.author.name}</span>
                        <span>-</span>
                        <span>
                          {new Date(proposal.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.totalValue && (
                        <span className="text-sm font-medium">
                          ${proposal.totalValue.toLocaleString()}
                        </span>
                      )}
                      <Badge
                        variant={
                          (statusColors[proposal.status] as
                            | "secondary"
                            | "outline"
                            | "default"
                            | "destructive") || "secondary"
                        }
                      >
                        {proposal.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
