import { authUser, cors, readJson } from "../_shared/http.ts";

/**
 * Elimina l'account e, a cascata, screening, visite, integratori, note e registri.
 * Serve la conferma esplicita { confirm: "ELIMINA" } dal client.
 */
Deno.serve(async (req: Request) => {
  const { json, early } = cors(req);
  if (early) return early;
  try {
    const auth = await authUser(req);
    if (!auth) return json({ status: "unauthorized" }, 401);
    const body = await readJson(req, 1_000);
    if (body?.confirm !== "ELIMINA") return json({ status: "bad_request" }, 400);
    // Le tabelle legate all'account si svuotano a cascata; queste sono legate solo all'email.
    const email = auth.user.email!.toLowerCase();
    await auth.admin.from("usage_sessions").delete().eq("email", email);
    await auth.admin.from("email_signups").delete().ilike("email", email);
    await auth.admin.from("pregnancies").delete().eq("owner_id", auth.user.id);
    const { error } = await auth.admin.auth.admin.deleteUser(auth.user.id);
    if (error) {
      console.error("delete", error.message);
      return json({ status: "unavailable" }, 503);
    }
    return json({ status: "ok" });
  } catch (e) {
    console.error("delete", e);
    return json({ status: "unavailable" }, 503);
  }
});
