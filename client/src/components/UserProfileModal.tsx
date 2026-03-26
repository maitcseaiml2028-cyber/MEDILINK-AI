import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Shield, Save } from "lucide-react";

export function UserProfileModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Profile State
  const [formData, setFormData] = useState({
    name: user?.name || "",
    contactNumber: user?.patient?.contactNumber || "",
    emergencyContact: user?.patient?.emergencyContact || "",
    specialization: user?.doctor?.specialization || user?.hospital?.specializations || "",
    experience: user?.doctor?.experience || "",
    phone: user?.hospital?.phone || "",
    address: user?.hospital?.address || "",
  });

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", api.auth.updateProfile.path, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Profile updated successfully!" });
    },
    onError: (err: Error) => toast({ title: "Update Failed", description: err.message, variant: "destructive" })
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", api.auth.changePassword.path, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => toast({ title: "Password Change Failed", description: err.message, variant: "destructive" })
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast({ title: "Passwords do not match", variant: "destructive" });
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full bg-slate-50 border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" /> My Profile
          </DialogTitle>
          <DialogDescription>
            Manage your personal information and security settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-200/50">
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <Input value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} className="mt-1" />
              </div>

              {user.role === "patient" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Number</label>
                    <Input value={formData.contactNumber} onChange={e => setFormData(f => ({...f, contactNumber: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Emergency Contact</label>
                    <Input value={formData.emergencyContact} onChange={e => setFormData(f => ({...f, emergencyContact: e.target.value}))} className="mt-1" />
                  </div>
                </>
              )}

              {user.role === "doctor" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Specialization</label>
                    <Input value={formData.specialization} onChange={e => setFormData(f => ({...f, specialization: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience (Years)</label>
                    <Input value={formData.experience} onChange={e => setFormData(f => ({...f, experience: e.target.value}))} className="mt-1" />
                  </div>
                </>
              )}

              {user.role === "hospital" && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</label>
                    <Input value={formData.phone} onChange={e => setFormData(f => ({...f, phone: e.target.value}))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</label>
                    <Input value={formData.address} onChange={e => setFormData(f => ({...f, address: e.target.value}))} className="mt-1" />
                  </div>
                </>
              )}

              <Button type="submit" disabled={updateProfileMutation.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11">
                {updateProfileMutation.isPending ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="security">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="bg-orange-50 p-4 border border-orange-200 rounded-xl mb-4 flex gap-3 text-orange-800">
                <Shield className="w-5 h-5 shrink-0" />
                <p className="text-sm">We recommend using a strong password. It will log you out of other active sessions (if applicable).</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Password</label>
                <Input type="password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1" />
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Password</label>
                <Input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                <Input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1" />
              </div>

              <Button type="submit" disabled={changePasswordMutation.isPending} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11">
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
}
