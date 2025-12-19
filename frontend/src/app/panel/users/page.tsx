'use client';

import { useEffect, useState } from 'react';
import { fetchAllUsers, updateUserQuota, adminCreateUser } from '@/lib/api';
import { useAuthStore, User } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername.trim()) {
      toast.error('Username is required');
      return;
    }
    setCreating(true);
    try {
      await adminCreateUser({
        username: newUsername,
        email: newEmail || undefined
      });
      toast.success('User created successfully');
      setIsCreateOpen(false);
      setNewUsername('');
      setNewEmail('');
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleQuotaUpdate = async (userId: number, newQuota: number) => {
    try {
      await updateUserQuota(userId, newQuota);
      toast.success('Quota updated');
      loadUsers();
    } catch (error) {
      toast.error('Failed to update quota');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user with default password (123456).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username (Required)</Label>
                <Input 
                  id="username" 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newEmail} 
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter email" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Quota</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="px-6 py-4">{u.id}</td>
                    <td className="px-6 py-4 font-medium">{u.username}</td>
                    <td className="px-6 py-4">{u.is_admin ? 'Admin' : 'User'}</td>
                    <td className="px-6 py-4">{u.quota}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-20"
                          defaultValue={u.quota}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuotaUpdate(u.id, parseInt(e.currentTarget.value));
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                            handleQuotaUpdate(u.id, parseInt(input.value));
                          }}
                        >
                          Update
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
