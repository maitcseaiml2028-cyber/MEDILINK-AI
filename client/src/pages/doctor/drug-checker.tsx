import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Bot, Send, AlertTriangle, Pill, CheckCircle, ClipboardList } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

export default function DrugInteractionChecker() {
    const { user } = useAuth();
    const [drug1, setDrug1] = useState("");
    const [drug2, setDrug2] = useState("");
    const [extraDrugs, setExtraDrugs] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
        { role: "ai", content: "👋 I'm your Drug Interaction Checker.\nEnter 2 or more medications to check for interactions, or ask me any pharmacology question." }
    ]);

    const { data: prescriptions } = useQuery({
        queryKey: ["/api/prescriptions"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/prescriptions"); return r.json(); },
    });

    const checkMutation = useMutation({
        mutationFn: async (drugs: string[]) => {
            const r = await apiRequest("POST", "/api/ai/chat", {
                message: `Drug Interaction Check: ${drugs.join(" + ")}. List: 1) Interaction type (major/moderate/minor/none), 2) Mechanism, 3) Clinical effect, 4) Management recommendation. Be concise and clear.`
            });
            return r.json();
        },
        onSuccess: (data) => { setResult(data.reply); },
    });

    const chatMutation = useMutation({
        mutationFn: async (msg: string) => {
            const r = await apiRequest("POST", "/api/ai/chat", { message: `Pharmacology/Drug question: ${msg}` });
            return r.json();
        },
        onSuccess: (data) => setMessages(p => [...p, { role: "ai", content: data.reply }]),
    });

    const handleCheck = () => {
        const drugs = [drug1, drug2, ...extraDrugs.split(",").map(d => d.trim())].filter(Boolean);
        if (drugs.length < 2) return;
        checkMutation.mutate(drugs);
    };

    const handleChat = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setMessages(p => [...p, { role: "user", content: chatInput }]);
        chatMutation.mutate(chatInput);
        setChatInput("");
    };

    const downloadReport = () => {
        if (!result) return;
        const doc = new jsPDF();
        doc.setFontSize(20); doc.setTextColor(20, 150, 130);
        doc.text("Drug Interaction Report", 20, 25);
        doc.setFontSize(11); doc.setTextColor(80, 80, 80);
        doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, 20, 33);
        doc.text(`Doctor: ${user?.name || ""}`, 20, 40);
        doc.line(20, 45, 190, 45);
        doc.setFontSize(12); doc.setTextColor(40, 40, 40);
        doc.text(`Drugs Checked: ${[drug1, drug2, extraDrugs].filter(Boolean).join(", ")}`, 20, 55);
        doc.setFontSize(11); let y = 68;
        const lines = doc.splitTextToSize(result, 165);
        lines.forEach((l: string) => { doc.text(l, 20, y); y += 7; });
        doc.save("Drug-Interaction-Report.pdf");
    };

    const hasMajor = result?.toLowerCase().includes("major");

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Drug Interaction Checker</h1>
                <p className="text-slate-500 mt-1">Check interactions between medications and get AI pharmacology guidance</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Checker */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-3xl border-0 shadow-xl shadow-blue-500/5">
                        <CardContent className="p-8">
                            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Pill className="w-5 h-5 text-blue-600" /> Enter Medications
                            </h2>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Drug 1 *</label>
                                    <Input value={drug1} onChange={e => setDrug1(e.target.value)} placeholder="e.g. Warfarin" className="h-12 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700 mb-2 block">Drug 2 *</label>
                                    <Input value={drug2} onChange={e => setDrug2(e.target.value)} placeholder="e.g. Aspirin" className="h-12 rounded-xl" />
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Additional Drugs (comma-separated, optional)</label>
                                <Input value={extraDrugs} onChange={e => setExtraDrugs(e.target.value)} placeholder="e.g. Metformin, Atorvastatin" className="h-11 rounded-xl" />
                            </div>
                            <Button onClick={handleCheck} disabled={checkMutation.isPending || !drug1 || !drug2} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/25">
                                {checkMutation.isPending ? "Checking..." : "Check Interactions"}
                            </Button>

                            {result && (
                                <div className={`mt-6 p-5 rounded-2xl border ${hasMajor ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {hasMajor ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
                                            <span className={`font-bold text-sm ${hasMajor ? "text-red-700" : "text-green-700"}`}>
                                                {hasMajor ? "⚠️ Significant Interaction Detected" : "✅ Interaction Analysis Complete"}
                                            </span>
                                        </div>
                                        <Button onClick={downloadReport} variant="outline" size="sm" className="rounded-xl text-xs border-slate-300">
                                            Download PDF
                                        </Button>
                                    </div>
                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${hasMajor ? "text-red-800" : "text-green-800"}`}>{result}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Chat */}
                    <Card className="rounded-3xl border-0 shadow-xl flex flex-col" style={{ minHeight: "350px" }}>
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-h-72">
                            {messages.map((m, i) => (
                                <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                                    {m.role === "ai" && <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-blue-600" /></div>}
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>{m.content}</div>
                                </div>
                            ))}
                            {chatMutation.isPending && <div className="flex gap-2"><div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center"><Bot className="w-4 h-4 text-blue-600" /></div><div className="bg-slate-100 px-4 py-3 rounded-2xl text-slate-500 text-sm">Analyzing...</div></div>}
                        </div>
                        <form onSubmit={handleChat} className="p-4 border-t border-slate-100 flex gap-2">
                            <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask a pharmacology question..." className="h-11 rounded-xl flex-1" />
                            <Button type="submit" disabled={!chatInput.trim()} className="h-11 px-4 rounded-xl bg-blue-600 text-white"><Send className="w-4 h-4" /></Button>
                        </form>
                    </Card>
                </div>

                {/* Sidebar - Patient prescriptions reference */}
                <div>
                    <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-blue-600" /> Recent Prescriptions</h2>
                    <div className="space-y-3">
                        {(prescriptions || []).slice(0, 5).map((rx: any) => (
                            <div key={rx.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <p className="font-semibold text-slate-800 text-sm">{rx.diagnosis || "Prescription"}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {JSON.parse(rx.medications || "[]").map((m: string, i: number) => (
                                        <button key={i} onClick={() => !drug1 ? setDrug1(m) : setDrug2(m)} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs hover:bg-blue-100 transition-colors cursor-pointer">{m}</button>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Click med to add to checker</p>
                            </div>
                        ))}
                        {!prescriptions?.length && <p className="text-slate-400 text-sm p-4 text-center">No prescriptions yet</p>}
                    </div>

                    <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mb-2" />
                        <p className="text-xs text-amber-800">This tool provides AI-based guidance. Always verify with official drug databases and clinical judgment before making prescribing decisions.</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
