import { db } from "./db";
import { visits } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "./index";

export function setupCronJobs() {
    log("[Cron] Background tasks initialized. Auto Check-out scheduled for 17:00 (5:00 PM).");

    setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Run only precisely at 17:00 (5:00 PM)
        if (hour === 17 && minute === 0) {
            try {
                // Find all active visits
                const activeVisits = await db.query.visits.findMany({
                    where: eq(visits.visitStatus, 'active'),
                });

                if (activeVisits.length > 0) {
                    log(`[Cron] Found ${activeVisits.length} active visits at 5:00 PM. Auto-checking out...`);

                    for (const visit of activeVisits) {
                        await db.update(visits)
                            .set({ 
                                visitStatus: 'completed',
                                checkOutTime: new Date()
                            })
                            .where(eq(visits.id, visit.id));
                    }

                    log(`[Cron] Successfully checked out ${activeVisits.length} patients.`);
                }
            } catch (error) {
                console.error("[Cron] Auto check-out failed:", error);
            }
        }
    }, 60 * 1000); // Check every 60 seconds
}
