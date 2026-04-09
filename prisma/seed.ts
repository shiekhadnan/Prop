import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@propflow.dev" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@propflow.dev",
      password: "admin123",
      role: "admin",
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@propflow.dev" },
    update: {},
    create: {
      name: "Team Member",
      email: "member@propflow.dev",
      password: "member123",
      role: "member",
    },
  });

  const client1 = await prisma.client.create({
    data: {
      name: "Acme Corporation",
      industry: "Technology",
      contactName: "John Smith",
      contactEmail: "john@acme.com",
      website: "https://acme.com",
      documentStyle: JSON.stringify({ primaryColor: "#2563eb", fontFamily: "Inter", headerStyle: "modern" }),
      diagramStyle: JSON.stringify({ theme: "blue", layout: "top-down", rounded: true }),
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Global Retail Inc",
      industry: "Retail",
      contactName: "Sarah Johnson",
      contactEmail: "sarah@globalretail.com",
      website: "https://globalretail.com",
      documentStyle: JSON.stringify({ primaryColor: "#059669", fontFamily: "Helvetica", headerStyle: "classic" }),
      diagramStyle: JSON.stringify({ theme: "green", layout: "left-right", rounded: false }),
    },
  });

  await prisma.template.create({
    data: {
      name: "Standard Proposal",
      description: "Default proposal template with all standard sections",
      type: "proposal",
      isDefault: true,
      content: JSON.stringify({
        sections: [
          { title: "Executive Summary", type: "text", order: 1 },
          { title: "Problem Statement", type: "text", order: 2 },
          { title: "Proposed Solution", type: "text", order: 3 },
          { title: "Architecture Overview", type: "diagram", order: 4 },
          { title: "Implementation Plan", type: "text", order: 5 },
          { title: "Team & Resources", type: "team", order: 6 },
          { title: "Pricing", type: "pricing", order: 7 },
          { title: "Timeline", type: "table", order: 8 },
          { title: "Terms & Conditions", type: "text", order: 9 },
        ],
      }),
    },
  });

  await prisma.proposal.create({
    data: {
      title: "Cloud Migration Strategy for Acme Corp",
      description: "Comprehensive cloud migration proposal",
      status: "in_review",
      priority: "high",
      totalValue: 150000,
      version: 1,
      clientId: client1.id,
      authorId: admin.id,
      sections: {
        create: [
          { title: "Executive Summary", content: "This proposal outlines a comprehensive cloud migration strategy for Acme Corporation.", type: "text", order: 1 },
          { title: "Architecture Overview", content: "", type: "diagram", order: 2, diagramData: JSON.stringify({ type: "mermaid", code: "graph TD\n  A[Legacy] --> B[Migration]\n  B --> C[Cloud]" }) },
        ],
      },
    },
  });

  await prisma.proposal.create({
    data: {
      title: "E-Commerce Platform Redesign",
      description: "Complete redesign of Global Retail's e-commerce platform",
      status: "draft",
      priority: "medium",
      totalValue: 85000,
      version: 1,
      clientId: client2.id,
      authorId: member.id,
    },
  });

  console.log("Seed data created successfully!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
