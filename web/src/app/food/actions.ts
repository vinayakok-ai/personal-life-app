"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addItemForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const parsed = parseFloat(String(formData.get("qty") ?? "1"));
  const quantity = Number.isFinite(parsed) ? parsed : 1;

  const existing = await prisma.pantryItem.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    await prisma.pantryItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.pantryItem.create({ data: { name, quantity } });
  }
  revalidatePath("/food");
}

export async function adjust(id: string, delta: number) {
  const item = await prisma.pantryItem.findUnique({ where: { id } });
  if (!item) return;
  const next = Math.max(0, Math.round((item.quantity + delta) * 100) / 100);
  await prisma.pantryItem.update({ where: { id }, data: { quantity: next } });
  revalidatePath("/food");
}

export async function remove(id: string) {
  await prisma.pantryItem.delete({ where: { id } });
  revalidatePath("/food");
}
