import { useState, useRef } from "react";

// Safely parse SQLite createdAt — handles Unix seconds, ms, or ISO string
function safeDate(val: any): Date | null {
    if (!val) return null;
    if (typeof val === "string") { const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
    const n = Number(val);
    if (isNaN(n)) return null;
    const d = new Date(n < 1e10 ? n * 1000 : n);
    return isNaN(d.getTime()) ? null : d;
}
import { AppLayout } from "@/components/layout/AppLayout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileImage, FileText, X, CheckCircle, Activity, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export default function LabUpload() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [form, setForm] = useState({ title: "", reportType: "lab", description: "" });

    const { data: records } = useQuery({
        queryKey: ["/api/records"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/records"); return r.json(); },
    });

    const uploadMutation = useMutation({
        mutationFn: async () => {
            const token = localStorage.getItem("auth_token");
            const authHeaders: Record<string, string> = {};
            if (token) authHeaders["Authorization"] = `Bearer ${token}`;


            if (file) {
                // Real multipart upload
                const formData = new FormData();
                formData.append("file", file);
                formData.append("title", form.title || file.name);
                formData.append("reportType", form.reportType);
                formData.append("description", form.description);
                const r = await fetch("/api/upload-report", { method: "POST", headers: authHeaders, body: formData });
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error(err.message || "Upload failed");
                }
                return r.json();
            } else {
                // Text-only (no file) record
                const r = await apiRequest("POST", "/api/records", {
                    title: form.title,
                    type: form.reportType,
                    description: form.description,
                    reportType: form.reportType,
                });
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error(err.message || "Failed to save record");
                }
                return r.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/records"] });
            setFile(null); setPreview(null); setForm({ title: "", reportType: "lab", description: "" });
            toast({ title: "Lab report uploaded!", description: "Record saved to your medical history." });
        },
        onError: (err: any) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
    });

    const handleFile = (f: File) => {
        if (f.size > MAX_SIZE) { toast({ title: "File too large", description: "Max 50MB allowed.", variant: "destructive" }); return; }
        setFile(f);
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else { setPreview(null); }
        if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") }));
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const labRecords = (records || []).filter((r: any) => ["lab", "scan", "report"].includes(r.type)).reverse();

    return (
        <AppLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">Lab Report Upload</h1>
                <p className="text-slate-500 mt-1">Upload PDFs, images, and lab reports to your medical records</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-3xl border-0 shadow-xl shadow-slate-200/40">
                        <CardContent className="p-8">
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-teal-400 bg-teal-50" : "border-slate-200 hover:border-teal-300 hover:bg-teal-50/50"}`}
                            >
                                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.svg" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                                {file ? (
                                    <div className="flex items-center gap-3 justify-center">
                                        <div className="bg-teal-100 p-3 rounded-xl"><CheckCircle className="w-7 h-7 text-teal-600" /></div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-900">{file.name}</p>
                                            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }} className="ml-2 p-1 text-slate-400 hover:text-red-500">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p className="font-bold text-slate-700">Drag & drop or click to upload</p>
                                        <p className="text-sm text-slate-400 mt-1">PDF, JPG, PNG, WebP — max 50MB</p>
                                    </>
                                )}
                            </div>

                            {preview && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 max-h-48">
                                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700 mb-2 block">Report Title *</label>
                                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Blood Test Report - Oct 2024" className="h-11 rounded-xl" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-2 block">Report Type</label>
                                    <Select value={form.reportType} onValueChange={v => setForm({ ...form, reportType: v })}>
                                        <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="lab">Lab Report</SelectItem>
                                            <SelectItem value="scan">Scan / X-Ray / MRI</SelectItem>
                                            <SelectItem value="report">Medical Report</SelectItem>
                                            <SelectItem value="ecg">ECG</SelectItem>
                                            <SelectItem value="blood-test">Blood Test</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-slate-700 mb-2 block">Notes / Description</label>
                                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Any additional notes about this report..." className="rounded-xl resize-none" rows={3} />
                                </div>
                            </div>

                            <Button
                                onClick={() => uploadMutation.mutate()}
                                disabled={uploadMutation.isPending || !form.title}
                                className="mt-6 w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-500/25"
                            >
                                <Upload className="w-5 h-5 mr-2" />
                                {uploadMutation.isPending ? "Uploading..." : "Upload Lab Report"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <h2 className="font-bold text-slate-900 mb-4 text-lg">Lab Reports</h2>
                    <div className="space-y-3">
                        {labRecords.map((r: any) => (
                            <div key={r.id} className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                                <div className="bg-amber-100 p-2.5 rounded-xl shrink-0">
                                    {r.type === "scan" ? <Activity className="w-5 h-5 text-amber-600" /> : <FileText className="w-5 h-5 text-amber-600" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-900 text-sm truncate">{r.title}</p>
                                    <p className="text-xs text-slate-400">{safeDate(r.createdAt) ? format(safeDate(r.createdAt)!, "MMM d, yyyy") : "Just now"}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${r.type === "lab" ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"}`}>{r.reportType || r.type}</span>
                                    {r.fileUrl && (
                                        <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-700">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!labRecords.length && (
                            <div className="text-center py-10 text-slate-400"><FileImage className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No lab reports yet</p></div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
