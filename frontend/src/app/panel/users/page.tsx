'use client';

import { useEffect, useState } from 'react';
import { fetchAllUsers, updateUserQuota, adminCreateUser } from '@/lib/api';
import { useAuthStore, User } from '@/store/authStore';
import { useWorkflowStore } from '@/store/workflowStore';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, User as UserIcon, Shield, CreditCard, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuthStore();
  const { language } = useWorkflowStore();
  const t = useTranslation(language);

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error(t('loadUsersFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      toast.error(t('usernameMissing'));
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        username: newUsername,
        email: newEmail || undefined
      });
      toast.success(t('userCreatedSuccess'));
      setIsCreateOpen(false);
      setNewUsername('');
      setNewEmail('');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || t('userCreateFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleQuotaUpdate = async (userId: number, newQuota: number) => {
    try {
      await updateUserQuota(userId, newQuota);
      toast.success(t('quotaUpdated'));
      // Optimistic update
      setUsers(users.map(u => u.id === userId ? { ...u, quota: newQuota } : u));
    } catch (error) {
      toast.error(t('quotaUpdateFailed'));
      loadUsers(); // Revert on error
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('userManagementTitle')}</h1>
          <p className="text-slate-500">{t('userManagementDescDetailed')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('createUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('createNewUser')}</DialogTitle>
              <DialogDescription>
                {t('createUserDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('usernameRequired')}</Label>
                <Input 
                  id="username" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. johndoe" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('emailOptional')}</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleCreateUser} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700">
                {creating ? t('creating') : t('createUser')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>{t('usersDirectory')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('searchUsers')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 font-medium">{t('userInfo')}</th>
                  <th className="px-6 py-3 font-medium">{t('role')}</th>
                  <th className="px-6 py-3 font-medium">{t('quota')}</th>
                  <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-6 py-4">
                        <div className="h-6 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      {t('noUsersFound')}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{u.username}</div>
                            <div className="text-slate-500 text-xs">ID: {u.id} • {u.email || t('noEmail')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.is_admin 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {u.is_admin ? <Shield className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                          {u.is_admin ? t('admin') : t('user')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          <span className="font-mono text-slate-700">{u.quota}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex items-center gap-2 bg-white border rounded-md p-1 shadow-sm">
                            <Input
                              type="number"
                              className="w-20 h-7 text-xs border-none focus-visible:ring-0 px-2 text-right"
                              defaultValue={u.quota}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleQuotaUpdate(u.id, parseInt(e.currentTarget.value));
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-slate-100"
                              onClick={(e) => {
                                const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                handleQuotaUpdate(u.id, parseInt(input.value));
                              }}
                            >
                              <RefreshCcw className="w-3 h-3 text-slate-500" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
