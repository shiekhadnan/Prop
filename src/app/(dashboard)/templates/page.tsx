import Link from "next/link";
import { format } from "date-fns";
import { Layout, Plus, Star } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const typeColorMap: Record<string, string> = {
  proposal: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  sow: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  rfp: "bg-green-100 text-green-800 hover:bg-green-100",
  quote: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true } },
      _count: { select: { proposals: true } },
    },
  });

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Layout size={28} weight="duotone" />
            Templates
          </h1>
          <p className="text-muted-foreground">
            Manage proposal templates for faster document creation
          </p>
        </div>
        <Link href="/templates/new" className={buttonVariants()}>
          <Plus size={18} className="mr-2" />
          New Template
        </Link>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Layout
              size={48}
              weight="duotone"
              className="mx-auto mb-4 text-muted-foreground"
            />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-muted-foreground">
              Create your first template to speed up proposal creation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            // Count sections from content JSON
            let sectionCount = 0;
            try {
              const parsed = JSON.parse(template.content);
              sectionCount = Array.isArray(parsed) ? parsed.length : 0;
            } catch {
              sectionCount = 0;
            }

            return (
              <Card
                key={template.id}
                className="transition-colors hover:bg-muted/50"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {template.name}
                    </CardTitle>
                    {template.isDefault && (
                      <Star
                        size={18}
                        weight="fill"
                        className="shrink-0 text-yellow-500"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {template.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={typeColorMap[template.type] ?? ""}
                    >
                      {template.type.charAt(0).toUpperCase() +
                        template.type.slice(1)}
                    </Badge>
                    {template.isDefault && (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {sectionCount} section{sectionCount !== 1 ? "s" : ""}
                    </span>
                    {template.client && (
                      <span>{template.client.name}</span>
                    )}
                    <span>
                      {format(new Date(template.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
