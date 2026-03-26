import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, Shield } from "lucide-react";
import { format } from "date-fns";

export default function AdminDashboard() {
  const { data: users, isLoading } = useQuery({
    queryKey: [api.users.list.path],
    queryFn: async () => {
      const res = await apiRequest("GET", api.users.list.path);
      return res.json();
    }
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-900">System Administration</h1>
        <p className="text-slate-500 mt-1">Platform overview and user management</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="rounded-3xl border-0 shadow-sm border border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><Users className="w-8 h-8"/></div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900">{users?.length || 0}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 shadow-sm border border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-teal-50 p-4 rounded-2xl text-teal-600"><Activity className="w-8 h-8"/></div>
            <div>
              <p className="text-slate-500 font-medium text-sm">System Status</p>
              <h3 className="text-2xl font-bold text-slate-900">Healthy</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-0 shadow-sm border border-slate-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-purple-50 p-4 rounded-2xl text-purple-600"><Shield className="w-8 h-8"/></div>
            <div>
              <p className="text-slate-500 font-medium text-sm">Security Level</p>
              <h3 className="text-2xl font-bold text-slate-900">Maximum</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-0 shadow-lg shadow-slate-200/50 bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-lg text-slate-900">Registered Users</h2>
        </div>
        <div className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Loading directory...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-sm text-slate-500">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Username</th>
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u: any) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{u.name}</td>
                      <td className="p-4 text-slate-600">{u.username}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                          'bg-teal-100 text-teal-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-sm">
                        {u.createdAt ? format(new Date(u.createdAt), "PP") : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </AppLayout>
  );
}
