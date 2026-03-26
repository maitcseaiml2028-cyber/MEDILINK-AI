import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, UserCheck, Clock, CheckCircle2, HeartPulse, UserPlus, ShieldPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

const DEPARTMENTS = [
    "General Medicine", "Cardiology", "Neurology", "Orthopedics", 
    "Pediatrics", "Oncology", "Dermatology", "Gynaecology", "Psychiatry"
];

const addStaffSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.string().min(1, "Please select a role"),
    specialization: z.string().optional(),
    licenseNumber: z.string().optional(),
});

export default function HospitalStaff() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

    const form = useForm<z.infer<typeof addStaffSchema>>({
        resolver: zodResolver(addStaffSchema),
        defaultValues: {
            name: "",
            email: "",
            username: "",
            password: "",
            role: "doctor",
            specialization: "",
            licenseNumber: "",
        },
    });

    const addStaffMutation = useMutation({
        mutationFn: async (values: z.infer<typeof addStaffSchema>) => {
            const r = await apiRequest("POST", "/api/hospitals/add-staff", values);
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hospitals/staff"] });
            toast({ title: "Staff added", description: "The new staff member has been created successfully." });
            setIsAddStaffOpen(false);
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Failed to add staff", description: err.message || "An error occurred", variant: "destructive" });
        },
    });

    const onSubmit = (values: z.infer<typeof addStaffSchema>) => {
        addStaffMutation.mutate(values);
    };

    const { data: staff, isLoading: staffLoading } = useQuery({
        queryKey: ["/api/hospitals/staff"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/hospitals/staff"); return r.json(); }
    });

    const { data: requests, isLoading: reqLoading } = useQuery({
        queryKey: ["/api/hospitals/doctor-requests"],
        queryFn: async () => { const r = await apiRequest("GET", "/api/hospitals/doctor-requests"); return r.json(); }
    });

    const approveMutation = useMutation({
        mutationFn: async (staffId: number) => {
            const r = await apiRequest("POST", `/api/hospitals/approve-staff/${staffId}`);
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/hospitals/staff"] });
            queryClient.invalidateQueries({ queryKey: ["/api/hospitals/doctor-requests"] });
            toast({ title: "Doctor approved", description: "Doctor has been added to your hospital." });
        },
        onError: () => toast({ title: "Approval failed", variant: "destructive" }),
    });

    const roleColors: Record<string, string> = {
        doctor: "bg-blue-100 text-blue-700",
        nurse: "bg-pink-100 text-pink-700",
        lab: "bg-purple-100 text-purple-700",
        receptionist: "bg-amber-100 text-amber-700",
        technician: "bg-green-100 text-green-700",
    };

    return (
        <AppLayout>
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900">Staff Management</h1>
                    <p className="text-slate-500 mt-1">Manage hospital staff and doctor join requests</p>
                </div>
                <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6 shadow-md shadow-teal-600/20 font-bold"
                        >
                            <UserPlus className="w-5 h-5 mr-2" />
                            Add New Staff
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] rounded-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-display font-bold">Add New Staff Member</DialogTitle>
                            <DialogDescription>
                                Create a new user account for your hospital staff.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Full Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John Doe" {...field} className="rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="john@example.com" {...field} className="rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Username</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="johndoe123" {...field} className="rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="••••••••" {...field} className="rounded-xl" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="role"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Role</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="rounded-xl">
                                                        <SelectValue placeholder="Select a role" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="doctor">Doctor</SelectItem>
                                                    <SelectItem value="nurse">Nurse</SelectItem>
                                                    <SelectItem value="lab">Lab Technician</SelectItem>
                                                    <SelectItem value="receptionist">Receptionist</SelectItem>
                                                    <SelectItem value="technician">Technician</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {form.watch("role") === "doctor" && (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                                        <FormField
                                            control={form.control}
                                            name="specialization"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-teal-900">Specialization</FormLabel>
                                                    <FormControl>
                                                        <div>
                                                            <Input list="specializations" placeholder="Cardiology" {...field} className="rounded-xl bg-white border-teal-200" />
                                                            <datalist id="specializations">
                                                                {DEPARTMENTS.map(dept => (
                                                                    <option key={dept} value={dept} />
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="licenseNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-teal-900">License Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="DOC12345" {...field} className="rounded-xl bg-white border-teal-200" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 font-bold mt-2"
                                    disabled={addStaffMutation.isPending}
                                >
                                    {addStaffMutation.isPending ? "Adding..." : "Confirm & Add Staff"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Pending Doctor Requests */}
            {
                !!requests?.length && (
                    <div className="mb-10">
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Pending Doctor Requests
                            <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{requests.length}</span>
                        </h2>
                        <div className="grid gap-4">
                            {requests.map((req: any) => (
                                <Card key={req.id} className="rounded-2xl border-0 shadow-md shadow-amber-500/5 border border-amber-100">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                                <UserCheck className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{req.user?.name}</h3>
                                                <p className="text-sm text-slate-500">{req.doctor?.specialization} • {req.doctor?.doctorId}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">Requested {req.requestedAt ? format(new Date(req.requestedAt), "MMM d, yyyy") : "recently"}</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => approveMutation.mutate(req.id)}
                                            disabled={approveMutation.isPending}
                                            className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Current Staff */}
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-teal-600" /> Current Staff
                </h2>
                {staffLoading ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
                ) : !staff?.filter((s: any) => s.status === "approved").length ? (
                    <Card className="border-dashed border-2 border-slate-200 bg-transparent shadow-none">
                        <CardContent className="flex flex-col items-center py-16 text-center">
                            <Building2 className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">No approved staff yet</h3>
                            <p className="text-slate-500 text-sm">Approve doctor and staff requests above.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staff?.filter((s: any) => s.status === "approved").map((member: any) => (
                            <Card key={member.id} className="rounded-2xl border-0 shadow-md shadow-slate-200/50">
                                <CardContent className="p-5 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 font-bold text-lg">
                                        {member.user?.name?.charAt(0) || "?"}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-900">{member.user?.name}</h3>
                                        <p className="text-sm text-slate-500">{member.user?.email}</p>
                                        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold capitalize ${roleColors[member.role] || "bg-slate-100 text-slate-700"}`}>
                                            {member.role}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
