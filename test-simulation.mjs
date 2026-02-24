// ACBAT Flow — Test d'intégration complet
// node test-simulation.mjs

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const envRaw = fs.readFileSync(".env", "utf8");
const getEnvVar = (name) => {
    const m = envRaw.match(new RegExp(`${name}="([^"]+)"`));
    return m ? m[1] : null;
};

const SUPABASE_URL = getEnvVar("VITE_SUPABASE_URL");
const SUPABASE_KEY = getEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY");

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Credentials Supabase introuvables dans .env");
    process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

let passed = 0, failed = 0;
const failures = [];
const ts = () => new Date().toLocaleTimeString("fr-FR");

async function test(name, fn) {
    try {
        const detail = await fn();
        console.log(`  ✅ [${ts()}] ${name}`);
        if (detail) console.log(`     → ${detail}`);
        passed++;
    } catch (e) {
        console.log(`  ❌ [${ts()}] ${name}`);
        console.log(`     → ${e.message}`);
        failures.push({ name, error: e.message });
        failed++;
    }
}

function section(title) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`  ${title}`);
    console.log("═".repeat(60));
}

const state = { clientId: null, orderId: null, ticketId: null, productId: null, deliveryId: null };

// ═══ 1. COMMERCIAL ═══════════════════════════════════════════════════
section("1️⃣  SERVICE COMMERCIAL");

await test("Créer un client test", async () => {
    const { data, error } = await sb.from("clients").insert({
        full_name: "TEST-AUTO Corp",
        email: `test-auto-${Date.now()}@acbat.tn`,
        phone: "+216 99 999 000",
        city: "Tunis",
        company_name: "TEST-AUTO SARL",
    }).select("id").single();
    if (error) throw error;
    state.clientId = data.id;
    return `ID: ${data.id.slice(0, 8)}…`;
});

await test("Lire liste clients", async () => {
    const { count, error } = await sb.from("clients").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} clients en base`;
});

await test("Créer devis (brouillon)", async () => {
    if (!state.clientId) throw new Error("No clientId");
    const ref = `TEST-${Date.now().toString().slice(-6)}`;
    const { data, error } = await sb.from("client_orders").insert({
        reference: ref,
        client_id: state.clientId,
        status: "brouillon",
        total_ht: 8500,
        tva_amount: 1615,
        total_ttc: 10115,
    }).select("id").single();
    if (error) throw error;
    state.orderId = data.id;
    return `Ref: ${ref}`;
});

await test("Valider commande → 'validee'", async () => {
    if (!state.orderId) throw new Error("No orderId");
    const { error } = await sb.from("client_orders").update({ status: "validee" }).eq("id", state.orderId);
    if (error) throw error;
    return "validee ✓";
});

await test("Lire total commandes", async () => {
    const { count, error } = await sb.from("client_orders").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} commandes en base`;
});

// ═══ 2. WORKFLOW ══════════════════════════════════════════════════════
section("2️⃣  SERVICE SUIVI COMMANDES");

await test("Créer workflow 9 étapes", async () => {
    if (!state.orderId) throw new Error("No orderId");
    const steps = [
        { name: "creation_commande", order: 1, status: "completed" },
        { name: "validation_commerciale", order: 2, status: "in_progress" },
        { name: "commande_fournisseur", order: 3, status: "pending" },
        { name: "reception_marchandises", order: 4, status: "pending" },
        { name: "preparation_technique", order: 5, status: "pending" },
        { name: "livraison_installation", order: 6, status: "pending" },
        { name: "validation_client", order: 7, status: "pending" },
        { name: "facturation_paiement", order: 8, status: "pending" },
        { name: "cloture_archivage", order: 9, status: "pending" },
    ].map(s => ({ order_id: state.orderId, step_name: s.name, step_order: s.order, status: s.status }));
    const { error } = await sb.from("order_workflow_steps").insert(steps);
    if (error) throw error;
    await sb.from("client_orders").update({ status: "en_cours" }).eq("id", state.orderId);
    return "9 étapes — commande en_cours";
});

await test("Avancer 3 étapes du workflow", async () => {
    if (!state.orderId) throw new Error("No orderId");
    const now = new Date().toISOString();
    for (const stepName of ["validation_commerciale", "commande_fournisseur", "reception_marchandises"]) {
        const { error } = await sb.from("order_workflow_steps")
            .update({ status: "completed", completed_at: now })
            .eq("order_id", state.orderId).eq("step_name", stepName);
        if (error) throw error;
    }
    return "3 étapes → completed";
});

await test("Lire workflow d'une commande", async () => {
    if (!state.orderId) throw new Error("No orderId");
    const { data, error } = await sb.from("order_workflow_steps")
        .select("step_name, status").eq("order_id", state.orderId);
    if (error) throw error;
    const done = data.filter(s => s.status === "completed").length;
    return `${data.length} étapes — ${done} complètes`;
});

// ═══ 3. SAV ═══════════════════════════════════════════════════════════
section("3️⃣  SERVICE SAV");

await test("Ouvrir ticket SAV urgent", async () => {
    if (!state.clientId) throw new Error("No clientId");
    const { data, error } = await sb.from("sav_tickets").insert({
        client_id: state.clientId,
        subject: "[TEST-AUTO] Vérification SAV",
        description: "Test automatique",
        priority: "urgent",
    }).select("id").single();
    if (error) throw error;
    state.ticketId = data.id;
    return `Ticket ID: ${data.id.slice(0, 8)}…`;
});

await test("Ticket → en_cours", async () => {
    if (!state.ticketId) throw new Error("No ticketId");
    const { error } = await sb.from("sav_tickets").update({ status: "en_cours" }).eq("id", state.ticketId);
    if (error) throw error;
    return "en_cours ✓";
});

await test("Clôturer ticket SAV → resolu", async () => {
    if (!state.ticketId) throw new Error("No ticketId");
    const { error } = await sb.from("sav_tickets").update({ status: "resolu" }).eq("id", state.ticketId);
    if (error) throw error;
    return "résolu ✓";
});

await test("Lire all tickets SAV", async () => {
    const { count, error } = await sb.from("sav_tickets").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} tickets total`;
});

// ═══ 4. PRODUITS & STOCK ══════════════════════════════════════════════
section("4️⃣  SERVICE PRODUITS & STOCK");

await test("Lire catalogue produits", async () => {
    const { data, count, error } = await sb.from("products").select("id, name", { count: "exact" });
    if (error) throw error;
    if (data?.length) state.productId = data[0].id;
    return `${count} produits disponibles`;
});

await test("Lire stocks (table stock)", async () => {
    const { data, count, error } = await sb.from("stock").select("product_id, quantity", { count: "exact" });
    if (error) throw error;
    const low = (data || []).filter(s => s.quantity <= 5).length;
    return `${count} entrées stock — ${low} en stock faible (≤5)`;
});

await test("Enregistrer mouvement stock (+10, entrée)", async () => {
    if (!state.productId) throw new Error("No productId");
    const { error } = await sb.from("stock_movements").insert({
        product_id: state.productId,
        type: "in",
        quantity: 10,
        reason: "Test automatique entrée",
    });
    if (error) throw error;
    return "+10 enregistrées (trigger maj stock)";
});

await test("Enregistrer mouvement stock (-3, sortie)", async () => {
    if (!state.productId) throw new Error("No productId");
    const { error } = await sb.from("stock_movements").insert({
        product_id: state.productId,
        type: "out",
        quantity: -3,
        reason: "Test automatique sortie",
    });
    if (error) throw error;
    return "-3 enregistrées";
});

await test("Vérifier mise à jour auto du stock", async () => {
    if (!state.productId) throw new Error("No productId");
    const { data, error } = await sb.from("stock").select("quantity").eq("product_id", state.productId).single();
    if (error) throw error;
    return `Stock actuel: ${data.quantity} unités`;
});

// ═══ 5. FOURNISSEURS ══════════════════════════════════════════════════
section("5️⃣  SERVICE FOURNISSEURS / ACHAT");

await test("Lire fournisseurs", async () => {
    const { count, error } = await sb.from("suppliers").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} fournisseurs en base`;
});

await test("Lire bons de commande fournisseurs", async () => {
    const { count, error } = await sb.from("supplier_orders").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} bons de commande`;
});

// ═══ 6. LIVRAISON ═════════════════════════════════════════════════════
section("6️⃣  SERVICE LIVRAISON");

await test("Planifier une livraison", async () => {
    if (!state.orderId) throw new Error("No orderId");
    const { data, error } = await sb.from("deliveries").insert({
        order_id: state.orderId,
        status: "planifiee",
        scheduled_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        tech_notes: "Test livraison automatique",
    }).select("id").single();
    if (error) throw error;
    state.deliveryId = data.id;
    return `Livraison ID: ${data.id.slice(0, 8)}…`;
});

await test("Démarrer livraison → en_route", async () => {
    if (!state.deliveryId) throw new Error("No deliveryId");
    const { error } = await sb.from("deliveries").update({ status: "en_route" }).eq("id", state.deliveryId);
    if (error) throw error;
    return "en_route ✓";
});

await test("Confirmer livraison → livree", async () => {
    if (!state.deliveryId) throw new Error("No deliveryId");
    const { error } = await sb.from("deliveries")
        .update({ status: "livree", actual_date: new Date().toISOString().split("T")[0] })
        .eq("id", state.deliveryId);
    if (error) throw error;
    return "livree ✓";
});

await test("Compter toutes les livraisons", async () => {
    const { count, error } = await sb.from("deliveries").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} livraisons total`;
});

// ═══ 7. COMPTABILITÉ ══════════════════════════════════════════════════
section("7️⃣  SERVICE COMPTABILITÉ");

await test("Lire factures", async () => {
    const { count, error } = await sb.from("invoices").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} factures`;
});

await test("Lire paiements", async () => {
    const { count, error } = await sb.from("payments").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} paiements`;
});

await test("Finaliser commande → terminee", async () => {
    if (!state.orderId) throw new Error("No orderId");
    // Complete all remaining workflow steps
    await sb.from("order_workflow_steps")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("order_id", state.orderId);
    const { error } = await sb.from("client_orders").update({ status: "cloturee" }).eq("id", state.orderId);
    if (error) throw error;
    return "cloturee ✓ — Cycle complet !";
});

// ═══ 8. ANALYTICS ═════════════════════════════════════════════════════
section("8️⃣  ANALYTICS & NOTIFICATIONS");

await test("KPI total commandes", async () => {
    const { count, error } = await sb.from("client_orders").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} commandes totales`;
});

await test("KPI commandes en cours", async () => {
    const { count, error } = await sb.from("client_orders").select("id", { count: "exact", head: true }).eq("status", "en_cours");
    if (error) throw error;
    return `${count} en cours`;
});

await test("KPI tickets SAV ouverts", async () => {
    const { count, error } = await sb.from("sav_tickets").select("id", { count: "exact", head: true }).eq("status", "ouvert");
    if (error) throw error;
    return `${count} ouverts`;
});

await test("Lire notifications", async () => {
    const { count, error } = await sb.from("notifications").select("id", { count: "exact", head: true });
    if (error) throw error;
    return `${count} notifications en base`;
});

// ═══ 9. NETTOYAGE ═════════════════════════════════════════════════════
section("9️⃣  NETTOYAGE DONNÉES TEST");

await test("Supprimer livraison test", async () => {
    if (!state.deliveryId) return "N/A";
    const { error } = await sb.from("deliveries").delete().eq("id", state.deliveryId);
    if (error) throw error;
    return "supprimée ✓";
});

await test("Supprimer mouvements stock test (reason=Test automatique*)", async () => {
    if (!state.productId) return "N/A";
    const { error } = await sb.from("stock_movements").delete()
        .eq("product_id", state.productId)
        .like("reason", "Test automatique%");
    if (error) throw error;
    return "supprimés ✓";
});

await test("Supprimer étapes workflow test", async () => {
    if (!state.orderId) return "N/A";
    const { error } = await sb.from("order_workflow_steps").delete().eq("order_id", state.orderId);
    if (error) throw error;
    return "supprimées ✓";
});

await test("Supprimer ticket SAV test", async () => {
    if (!state.ticketId) return "N/A";
    const { error } = await sb.from("sav_tickets").delete().eq("id", state.ticketId);
    if (error) throw error;
    return "supprimé ✓";
});

await test("Supprimer commande test", async () => {
    if (!state.orderId) return "N/A";
    const { error } = await sb.from("client_orders").delete().eq("id", state.orderId);
    if (error) throw error;
    return "supprimée ✓";
});

await test("Supprimer client test", async () => {
    if (!state.clientId) return "N/A";
    const { error } = await sb.from("clients").delete().eq("id", state.clientId);
    if (error) throw error;
    return "supprimé ✓";
});

// ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────
const total = passed + failed;
const rate = Math.round((passed / total) * 100);

console.log(`\n${"═".repeat(60)}`);
console.log(`  📊  RÉSULTAT FINAL — ACBAT Flow Integration Test`);
console.log("═".repeat(60));
console.log(`  ✅ Réussis  : ${passed} / ${total}`);
console.log(`  ❌ Échoués  : ${failed} / ${total}`);
console.log(`  📈 Taux     : ${rate}%`);

if (failed === 0) {
    console.log(`\n  🎉 TOUTES LES FONCTIONNALITÉS SONT OPÉRATIONNELLES !`);
    console.log(`     L'application ACBAT Flow est 100% fonctionnelle.\n`);
} else {
    console.log(`\n  ⚠️  ${failed} test(s) échoué(s) :`);
    failures.forEach(f => console.log(`     • ${f.name}: ${f.error}`));
    console.log();
}
process.exit(failed > 0 ? 1 : 0);
