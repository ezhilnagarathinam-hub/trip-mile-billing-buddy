import { createServerFn } from "@tanstack/react-start";

const DEMO = {
  admin: { email: "admin@ramantravels.demo", password: "RamanAdmin@123", name: "Raman (Admin)", phone: "9942409322" },
  driver: { email: "driver@ramantravels.demo", password: "RamanDriver@123", name: "Kumar (Demo Driver)", phone: "9786129527" },
} as const;

// Creates / refreshes the two fixed demo accounts only. Never accepts arbitrary input.
export const ensureDemoAccount = createServerFn({ method: "POST" })
  .inputValidator((input: { role: "admin" | "driver" }) => {
    if (input?.role !== "admin" && input?.role !== "driver") throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const d = DEMO[data.role];
    let userId: string | undefined;
    const created = await supabaseAdmin.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.name, phone: d.phone },
    });
    if (created.data.user) userId = created.data.user.id;
    else {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
      userId = list.users.find((u) => u.email === d.email)?.id;
    }
    if (!userId) throw new Error("Could not prepare demo account");
    await supabaseAdmin.from("profiles").update({ status: "approved" }).eq("id", userId);
    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "driver");
    }
    return { email: d.email, password: d.password };
  });
