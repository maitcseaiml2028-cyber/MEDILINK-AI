import { AppLayout } from "@/components/layout/AppLayout";
import { HealthJourney } from "@/components/HealthJourney";

export default function MedicalTimeline() {
    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Medical History Timeline</h1>
                <p className="text-slate-500 mt-1">Complete chronological view of your health journey</p>
            </div>

            <HealthJourney />
        </AppLayout>
    );
}
