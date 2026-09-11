"use server";

import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { tenantService, TenantSyncData } from "@jairo/core";

/**
 * 🛰️ PONTE DE COMANDO (Server Actions)
 * Estas funções rodam exclusivamente no servidor, onde a chave Admin está visível.
 * Atualizado: Injeção de revalidatePath para destruir o Full Route Cache do Vercel.
 */

export async function getAllUsersAction() {
  // Impede o Vercel de usar uma "fotografia" antiga da triagem e do banco de dados
  noStore();
  
  // A Bomba Nuclear: Força o Vercel a recriar esta rota específica na mesma hora
  revalidatePath('/dashboard/tenants');
  
  return await tenantService.getAllUsers();
}

export async function getUserTenantManagementAction(userId: string) {
  // Garante que as configurações de módulos e vínculos do usuário sempre venham frescas
  noStore();
  return await tenantService.getUserTenantManagement(userId);
}

export async function syncUserTenantsAction(userId: string, tenants: TenantSyncData[], deletedIds: string[]) {
  // Mutações geralmente já ignoram cache, mas manter o noStore garante consistência
  noStore();
  
  const result = await tenantService.syncUserTenants(userId, tenants, deletedIds);
  
  // Após salvar, também expurgamos o cache para garantir que a lista reflita a mudança
  revalidatePath('/dashboard/tenants');
  
  return result;
}