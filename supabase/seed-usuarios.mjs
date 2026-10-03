// ============================================================
// Seed de usuarios de prueba para Supabase Auth LOCAL.
// Crea un empleado y un admin con email/password conocidos.
// El trigger handle_new_user crea el perfil; el rol se toma de
// raw_user_meta_data.rol (ver migración 0002).
//
// Uso:
//   node --env-file=.env.local supabase/seed-usuarios.mjs
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("FAIL: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const USUARIOS = [
  {
    email: "empleado@chiquihuite.local",
    password: "empleado123",
    nombre: "Empleado Demo",
    rol: "empleado",
  },
  {
    email: "admin@chiquihuite.local",
    password: "admin123",
    nombre: "Admin Demo",
    rol: "admin",
  },
];

async function upsertUsuario(u) {
  // ¿Ya existe? (listUsers y filtra por email)
  const { data: lista } = await admin.auth.admin.listUsers();
  const existente = lista?.users?.find((x) => x.email === u.email);

  if (existente) {
    // Asegura rol/nombre en el perfil.
    await admin
      .from("perfiles")
      .update({ nombre: u.nombre, rol: u.rol })
      .eq("id", existente.id);
    console.log(`= ya existe: ${u.email} (${u.rol})`);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { nombre: u.nombre, rol: u.rol },
  });

  if (error) {
    console.error(`FAIL creando ${u.email}: ${error.message}`);
    process.exit(1);
  }

  // El trigger crea el perfil con el rol de metadata; reforzamos por si acaso.
  await admin
    .from("perfiles")
    .update({ nombre: u.nombre, rol: u.rol })
    .eq("id", data.user.id);

  console.log(`+ creado: ${u.email} (${u.rol})`);
}

for (const u of USUARIOS) {
  await upsertUsuario(u);
}

console.log("Seed de usuarios OK");
