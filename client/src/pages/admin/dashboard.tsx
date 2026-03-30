import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserRound, GraduationCap, Building2, Activity, ShieldCheck, TrendingUp, X } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

export default function AdminDashboard() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [api.admin.stats.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.admin.stats.path);
      return res.json();
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.users.list.path);
      return res.json();
    }
  });

  const filteredUsers = users?.filter((u: any) => !activeFilter || u.role === activeFilter);

  const isLoading = statsLoading || usersLoading;

  return (
    <AppLayout>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Control</h1>
          <p className="text-slate-500 mt-1 font-medium italic">MediLink-AI Infrastructure Overview</p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 animate-pulse">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Core Secured</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Patients" 
          value={stats?.patients || 0} 
          icon={UserRound} 
          color="blue" 
          label="Registered"
          isActive={activeFilter === 'patient'}
          onClick={() => setActiveFilter(activeFilter === 'patient' ? null : 'patient')}
        />
        <StatCard 
          title="Doctors" 
          value={stats?.doctors || 0} 
          icon={GraduationCap} 
          color="teal" 
          label="Verified"
          isActive={activeFilter === 'doctor'}
          onClick={() => setActiveFilter(activeFilter === 'doctor' ? null : 'doctor')}
        />
        <StatCard 
          title="Hospitals" 
          value={stats?.hospitals || 0} 
          icon={Building2} 
          color="indigo" 
          label="Active"
          isActive={activeFilter === 'hospital'}
          onClick={() => setActiveFilter(activeFilter === 'hospital' ? null : 'hospital')}
        />
        <StatCard 
          title="All Entities" 
          value={stats?.totalUsers || 0} 
          icon={Users} 
          color="purple" 
          label="Total Identity"
          isActive={!activeFilter}
          onClick={() => setActiveFilter(null)}
        />
      </div>

      {/* Main Content Split */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-[2.5rem] border-0 shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900">
                    {activeFilter ? `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}s` : "User Directory"}
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1 font-medium italic">
                    {activeFilter ? `Currently viewing only ${activeFilter} accounts` : "Full list of registered system entities"}
                  </p>
                </div>
                {activeFilter && (
                  <button 
                    onClick={() => setActiveFilter(null)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase transition-colors"
                  >
                    Clear <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Activity className="w-5 h-5 text-slate-300" />
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-20 text-center text-slate-400 font-medium italic">Synchronizing directory...</div>
              ) : filteredUsers?.length === 0 ? (
                <div className="p-20 text-center text-slate-400 font-medium italic">No accounts found for this category.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[11px] text-slate-400 uppercase tracking-[0.2em] font-black border-b border-slate-50">
                        <th className="p-6">Entity Name</th>
                        <th className="p-6">Identification</th>
                        {activeFilter === 'patient' && <th className="p-6">Health ID</th>}
                        {activeFilter === 'doctor' && <th className="p-6">Specialization</th>}
                        {activeFilter === 'hospital' && <th className="p-6">License No</th>}
                        <th className="p-6 text-center">Protocol Role</th>
                        <th className="p-6 text-right">Registered</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredUsers?.map((u: any) => (
                        <tr key={u.id} className="group hover:bg-slate-50/80 transition-all">
                          <td className="p-6 font-bold text-slate-900">
                            <div>
                               {u.name}
                               <p className="text-[10px] text-slate-400 font-normal">{u.email}</p>
                            </div>
                          </td>
                          <td className="p-6 text-slate-500 font-mono text-xs">{u.username}</td>
                          
                          {activeFilter === 'patient' && (
                            <td className="p-6">
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                {u.patient?.healthId || "N/A"}
                              </span>
                            </td>
                          )}
                          {activeFilter === 'doctor' && (
                            <td className="p-6 text-xs font-medium text-teal-700">
                              {u.doctor?.specialization || "N/A"}
                            </td>
                          )}
                          {activeFilter === 'hospital' && (
                            <td className="p-6 text-xs font-medium text-slate-600">
                              {u.hospital?.licenseNumber || "N/A"}
                            </td>
                          )}

                          <td className="p-6 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'doctor' ? 'bg-teal-100 text-teal-700' :
                              u.role === 'hospital' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-6 text-right text-slate-400 text-xs font-semibold">
                            {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] bg-slate-900 border-0 shadow-xl overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-bold">System Health</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-sm">Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Optimal
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-slate-400 text-sm">Latency</span>
                <span className="font-mono text-sm">24ms</span>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Growth Forecast</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  "System load is stable. New registrations up 12% this week across hospital partners."
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, label, isActive, onClick }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    teal: "bg-teal-50 text-teal-600 border-teal-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  const activeColors: any = {
    blue: "ring-2 ring-blue-500 bg-blue-50/50 shadow-blue-100 shadow-xl",
    teal: "ring-2 ring-teal-500 bg-teal-50/50 shadow-teal-100 shadow-xl",
    indigo: "ring-2 ring-indigo-500 bg-indigo-50/50 shadow-indigo-100 shadow-xl",
    purple: "ring-2 ring-purple-500 bg-purple-50/50 shadow-purple-100 shadow-xl",
  };

  return (
    <Card 
      onClick={onClick}
      className={`rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white cursor-pointer group ${isActive ? activeColors[color] : ""}`}
    >
      <CardContent className="p-8">
        <div className={`w-14 h-14 rounded-2xl ${colors[color]} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
          <Icon className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label} {title}</p>
          <h3 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
