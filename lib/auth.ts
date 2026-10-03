// ============================================================
// Helpers de autenticación y rol (lado servidor).
// Usan el cliente de servidor con sesión (@supabase/ssr), por lo que
// respetan RLS y la sesión del usuario autenticado.
// ============================================================
import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Perfil, RolUsuario } from "@/lib/types";

/** Devuelve el usuario autenticado o null. */
export async function getUsuario() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Devuelve el perfil (con rol) del usuario autenticado, o null. */
export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

/**
 * Exige sesión con perfil de staff (empleado o admin).
 * Redirige a /login si no hay sesión. Devuelve el perfil.
 */
export async function requireStaff(): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  return perfil;
}

/**
 * Exige rol admin. Redirige a /login si no hay sesión y a /panel
 * si el usuario es staff pero no admin.
 */
export async function requireAdmin(): Promise<Perfil> {
  const perfil = await getPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol !== "admin") redirect("/panel");
  return perfil;
}

/** Comprueba si un rol tiene privilegios de admin. */
export function esAdmin(rol: RolUsuario | undefined | null): boolean {
  return rol === "admin";
}
