"use server";

import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createClient(formData: FormData) {
  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string | null;
  const contactName = formData.get("contactName") as string | null;
  const contactEmail = formData.get("contactEmail") as string | null;
  const contactPhone = formData.get("contactPhone") as string | null;
  const website = formData.get("website") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!name || name.trim() === "") {
    throw new Error("Client name is required");
  }

  await prisma.client.create({
    data: {
      name: name.trim(),
      industry: industry?.trim() || null,
      contactName: contactName?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      website: website?.trim() || null,
      notes: notes?.trim() || null,
    },
  });

  revalidatePath("/clients");
  redirect("/clients");
}

export async function deleteClient(id: string) {
  await prisma.client.delete({
    where: { id },
  });

  revalidatePath("/clients");
  redirect("/clients");
}
