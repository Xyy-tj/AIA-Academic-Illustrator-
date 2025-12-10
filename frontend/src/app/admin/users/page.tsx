'use client';

import { useEffect, useState } from 'react';
import { fetchAllUsers, updateUserQuota } from '@/lib/api';
import { useAuthStore, User } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
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

