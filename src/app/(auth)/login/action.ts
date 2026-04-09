"use server";

import { login } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const result = await login(email, password);

  if (!result.success) {
    return { error: result.error };
  }

  return { success: true };
}
