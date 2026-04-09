"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  FileText,
  ArrowLeft,
  FloppyDisk,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProposal, getClientsAndTemplates } from "../actions";

type ClientOption = { id: string; name: string };
type TemplateOption = { id: string; name: string; description: string | null };

export default function NewProposalPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [totalValue, setTotalValue] = useState("");

  useEffect(() => {
    getClientsAndTemplates().then((data) => {
      setClients(data.clients);
      setTemplates(data.templates);
      setLoading(false);
    });
  }, []);

  function handleSubmit() {
    if (!title.trim() || !clientId) return;

    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("clientId", clientId);
    formData.set("templateId", templateId);
    formData.set("priority", priority);
    formData.set("dueDate", dueDate);
    formData.set("totalValue", totalValue);

    startTransition(() => {
      createProposal(formData);
    });
  }

  const isValid = title.trim().length > 0 && clientId.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/proposals" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft size={18} className="mr-1" />
          Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Proposal</h1>
          <p className="text-muted-foreground">
            Create a new proposal for your client
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={20} weight="duotone" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter proposal title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the proposal"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>
              Client <span className="text-destructive">*</span>
            </Label>
            {loading ? (
              <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ) : clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clients found.{" "}
                <Link href="/clients/new" className="text-primary underline">
                  Create one first
                </Link>
                .
              </p>
            ) : (
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Template */}
          <div className="space-y-2">
            <Label>Template</Label>
            {loading ? (
              <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <Select value={templateId} onValueChange={(v) => setTemplateId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Priority & Due Date row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v ?? "medium")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Estimated Value */}
          <div className="space-y-2">
            <Label htmlFor="totalValue">Estimated Value ($)</Label>
            <Input
              id="totalValue"
              type="number"
              placeholder="0"
              min="0"
              step="100"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/proposals" className={buttonVariants({ variant: "outline" })}>Cancel</Link>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isPending}
        >
          {isPending ? (
            "Creating..."
          ) : (
            <>
              <FloppyDisk size={18} className="mr-2" />
              Create Proposal
              <ArrowRight size={16} className="ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
