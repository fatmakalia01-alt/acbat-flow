import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Plays a short beep via Web Audio API
function playBeep() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
    } catch {
        // silently fail if audio not available
    }
}

/**
 * Polls every `intervalMs` ms to check for overdue workflow steps.
 * When found: plays a beep + calls the Supabase function to mark them delayed
 * and send notifications to management.
 */
export function useDeadlineMonitor(intervalMs = 60_000) {
    const { user, roles } = useAuth();
    const alertedStepIds = useRef<Set<string>>(new Set());

    const checkOverdue = useCallback(async () => {
        if (!user) return;

        try {
            // Fetch in-progress steps whose due_date has passed and not yet notified
            const { data: overdueSteps } = await supabase
                .from("order_workflow_steps")
                .select("id, step_name, order_id, due_date, client_orders!inner(reference)")
                .eq("status", "in_progress")
                .lt("due_date", new Date().toISOString())
                .not("due_date", "is", null);

            if (!overdueSteps || overdueSteps.length === 0) return;

            for (const step of overdueSteps) {
                if (alertedStepIds.current.has(step.id)) continue;
                alertedStepIds.current.add(step.id);

                // Play beep
                playBeep();

                // Let the DB function mark as delayed + notify management
                await supabase.rpc("check_overdue_workflow_steps" as any);

                // Also notify the current user (if they're the one responsible for this step)
                await supabase.from("notifications").insert({
                    user_id: user.id,
                    title: `⚠️ Délai dépassé`,
                    message: `L'étape "${step.step_name.replace(/_/g, " ")}" de la commande ${(step as any).client_orders?.reference || ""} a dépassé son délai. Veuillez signaler le retard.`,
                    type: "depassement",
                    related_order_id: step.order_id,
                    related_step_id: step.id,
                    action_required: true,
                    action_type: "report_delay",
                    read: false,
                } as any);
            }
        } catch (err) {
            console.error("[DeadlineMonitor]", err);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;
        // Run immediately on mount, then on interval
        checkOverdue();
        const timer = setInterval(checkOverdue, intervalMs);
        return () => clearInterval(timer);
    }, [user, checkOverdue, intervalMs]);
}
