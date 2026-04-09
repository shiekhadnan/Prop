"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitReview, addComment } from "../actions";

export default function ReviewForm({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState("");
  const [score, setScore] = useState("7");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [commentContent, setCommentContent] = useState("");
  const [commentType, setCommentType] = useState("general");
  const [addingComment, setAddingComment] = useState(false);

  async function handleSubmitReview() {
    if (!decision || !summary.trim()) return;
    setSubmitting(true);
    try {
      await submitReview(proposalId, decision, parseInt(score), summary);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddComment() {
    if (!commentContent.trim()) return;
    setAddingComment(true);
    try {
      await addComment(proposalId, null, commentContent, commentType);
      setCommentContent("");
      router.refresh();
    } finally {
      setAddingComment(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Comment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={commentType} onValueChange={(v) => setCommentType(v ?? "general")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="praise">Praise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea
              placeholder="Write your comment..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={addingComment || !commentContent.trim()}
          >
            {addingComment ? "Adding..." : "Add Comment"}
          </Button>
        </CardContent>
      </Card>

      {/* Submit Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(v) => setDecision(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select decision..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="needs_changes">Needs Changes</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Score (1-10)</Label>
              <Select value={score} onValueChange={(v) => setScore(v ?? "7")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea
              placeholder="Provide your review summary..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={handleSubmitReview}
            disabled={submitting || !decision || !summary.trim()}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
