'use client';

import { useEffect, useState } from 'react';
import { fetchHistory, HistoryItem } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
      const items = await fetchHistory();
      setHistory(items);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Generation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.map((h) => (
              <div key={h.session_id} className="border border-slate-200 rounded-lg p-4 bg-white">
                <div className="text-sm text-slate-600 mb-2 flex gap-6">
                  <span>User: {h.username} (#{h.user_id})</span>
                  <span>Start: {new Date(h.created_at).toLocaleString()}</span>
                  <span>Updated: {new Date(h.updated_at).toLocaleString()}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Paper Input</h4>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{h.input_summary || '-'}</p>
                    <h4 className="font-medium mt-4 mb-2">Generated Schema</h4>
                    <pre className="text-xs bg-slate-50 p-3 rounded border border-slate-200 overflow-auto max-h-48 whitespace-pre-wrap break-words">{h.schema_text || '-'}</pre>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Rendered Image</h4>
                    {h.image_url ? (
                      h.image_url.startsWith('data:') ? (
                        <img src={h.image_url} alt="Rendered" className="rounded border max-h-64 object-contain" />
                      ) : (
                        <a href={h.image_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline break-all">{h.image_url}</a>
                      )
                    ) : (
                      <span className="text-slate-500 text-sm">No image</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
