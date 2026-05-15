'use client';

import { useEffect, useState } from 'react';
import { fetchHistory, HistoryItem } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Calendar, User, FileText, Image as ImageIcon, ExternalLink, RefreshCw } from 'lucide-react';

export default function AdminHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user || !user.is_admin) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const items = await fetchHistory();
      setHistory(items);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(h => 
    h.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.input_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.schema_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Generation History</h1>
          <p className="text-slate-500">View all user generation activities and results.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search history..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No history records found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistory.map((h) => (
                <div key={h.session_id} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Info & User */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium text-slate-700">{h.username}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        {h.updated_at !== h.created_at && (
                          <>
                            <span>•</span>
                            <span className="text-xs">Updated: {new Date(h.updated_at).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input Summary</span>
                            <p className="text-sm text-slate-800 mt-1 line-clamp-2">{h.input_summary || 'No summary available'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Results (Schema & Image) */}
                    <div className="flex-1 md:border-l md:pl-6 space-y-3">
                       <div className="flex gap-4">
                         <div className="w-32 shrink-0 flex flex-col items-center">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 self-start">Result</span>
                            {h.image_url ? (
                              <a href={h.image_url} target="_blank" rel="noreferrer" className="block relative group">
                                <img 
                                  src={h.image_url} 
                                  alt="Result" 
                                  className="w-32 h-32 object-cover rounded border border-slate-200 bg-white" 
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                                  <ExternalLink className="w-6 h-6 text-white" />
                                </div>
                              </a>
                            ) : (
                              <div className="w-32 h-32 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-8 h-8 opacity-50" />
                              </div>
                            )}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-2 mb-2">
                             <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Schema</span>
                           </div>
                           <pre className="text-xs bg-slate-50 p-2 rounded border border-slate-200 h-32 overflow-y-auto font-mono text-slate-600 whitespace-pre-wrap break-all">
                             {h.schema_text || 'No schema generated'}
                           </pre>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
