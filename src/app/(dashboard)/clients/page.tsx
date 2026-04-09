import { prisma } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Buildings,
  Plus,
  Envelope,
  Globe,
  User,
} from "@phosphor-icons/react/dist/ssr";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: { proposals: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your clients and their proposals.
          </p>
        </div>
        <Link href="/clients/new" className={buttonVariants()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Buildings className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first client.
            </p>
            <Link href="/clients/new" className={buttonVariants()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Buildings className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{client.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">
                      {client._count.proposals}{" "}
                      {client._count.proposals === 1 ? "proposal" : "proposals"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.industry && (
                    <p className="text-sm text-muted-foreground">
                      {client.industry}
                    </p>
                  )}
                  {client.contactName && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{client.contactName}</span>
                    </div>
                  )}
                  {client.contactEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Envelope className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{client.contactEmail}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{client.website}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
