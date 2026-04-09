import Link from "next/link";
import { format } from "date-fns";
import {
  BookOpen,
  Plus,
  Tag,
  FileArrowUp,
} from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const typeColorMap: Record<string, string> = {
  proposal: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  case_study: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  template: "bg-green-100 text-green-800 hover:bg-green-100",
  guideline: "bg-orange-100 text-orange-800 hover:bg-orange-100",
};

function formatType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ReferencesPage() {
  const references = await prisma.reference.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen size={28} weight="duotone" />
            Reference Library
          </h1>
          <p className="text-muted-foreground">
            Upload reference documents for AI training and proposal generation
          </p>
        </div>
        <Link href="/references/new" className={buttonVariants()}>
          <Plus size={18} className="mr-2" />
          Add Reference
        </Link>
      </div>

      {/* Reference List */}
      {references.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileArrowUp
              size={48}
              weight="duotone"
              className="mx-auto mb-4 text-muted-foreground"
            />
            <p className="text-lg font-medium">No references yet</p>
            <p className="text-muted-foreground">
              Upload reference proposals and documents to improve AI-generated
              content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {references.map((ref) => {
            const tags = ref.tags
              ? ref.tags.split(",").map((t) => t.trim())
              : [];

            return (
              <Card key={ref.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <BookOpen
                        size={22}
                        weight="duotone"
                        className="text-blue-600"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{ref.title}</p>
                      {ref.description && (
                        <p className="text-sm text-muted-foreground">
                          {ref.description}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <Tag
                            size={14}
                            className="text-muted-foreground"
                          />
                          {tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(ref.createdAt), "MMM d, yyyy")}
                    </span>
                    <Badge
                      variant="secondary"
                      className={typeColorMap[ref.type] ?? ""}
                    >
                      {formatType(ref.type)}
                    </Badge>
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
