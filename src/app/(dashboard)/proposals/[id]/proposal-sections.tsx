"use client";

import { useState, useTransition } from "react";
import {
  PencilSimple,
  FloppyDisk,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SectionData = {
  id: string;
  title: string;
  content: string;
  type: string;
  order: number;
};

export function ProposalSections({
  proposalId,
  sections,
  isEditable,
}: {
  proposalId: string;
  sections: SectionData[];
  isEditable: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [localSections, setLocalSections] = useState(sections);

  function startEdit(section: SectionData) {
    setEditing(section.id);
    setEditTitle(section.title);
    setEditContent(section.content);
  }

  function cancelEdit() {
    setEditing(null);
    setEditTitle("");
    setEditContent("");
  }

  function saveEdit(sectionId: string) {
    startTransition(async () => {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          sectionTitle: editTitle,
          sectionContent: editContent,
        }),
      });

      if (res.ok) {
        setLocalSections((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? { ...s, title: editTitle, content: editContent }
              : s
          )
        );
        setEditing(null);
      }
    });
  }

  if (localSections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No sections yet. Sections will appear here once added to this proposal.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Sections</h2>
      {localSections.map((section) => (
        <Card key={section.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            {editing === section.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="max-w-sm text-base font-semibold"
              />
            ) : (
              <CardTitle className="text-base">{section.title}</CardTitle>
            )}
            {isEditable && (
              <div className="flex gap-1">
                {editing === section.id ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveEdit(section.id)}
                      disabled={isPending}
                    >
                      <FloppyDisk size={16} className="mr-1" />
                      {isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      disabled={isPending}
                    >
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(section)}
                  >
                    <PencilSimple size={16} className="mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editing === section.id ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-foreground/80">
                {section.content || (
                  <span className="italic text-muted-foreground">
                    No content
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
