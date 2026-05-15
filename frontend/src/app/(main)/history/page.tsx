'use client';

import { useState, useEffect } from 'react';
import { fetchMyHistory, HistoryItem } from '@/lib/api';
import { resolveImageUrl } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    Languages, 
    Crop, 
    Wand2, 
    Palette, 
    Calendar, 
    Search, 
    ExternalLink, 
    Download,
    Eye,
    FileText,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMyHistory()
      .then(setHistory)
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (url: string) => {
    const resolvedUrl = resolveImageUrl(url);
    if (!resolvedUrl) return;
    
    try {
        const a = document.createElement('a');
        a.href = resolvedUrl;
        a.download = `history-${Date.now()}.png`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        toast.error('Download failed');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
        case 'translation': return <Languages className="w-4 h-4 text-blue-500" />;
        case 'extraction': return <Crop className="w-4 h-4 text-orange-500" />;
        case 'super_resolution': return <Wand2 className="w-4 h-4 text-purple-500" />;
        default: return <Palette className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
        case 'translation': return 'Image Translation';
        case 'extraction': return 'Extraction';
        case 'super_resolution': return 'Super Resolution';
        default: return 'Diagram Generation';
    }
  };

  const filteredHistory = history.filter(h => 
    h.input_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.schema_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTypeLabel(h.type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">History & Assets</h1>
          <p className="text-slate-500 mt-1">View and manage your generated diagrams and processed images.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search history..." 
            className="pl-9 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No history found</h3>
          <p className="text-slate-500 mt-1">You haven't generated any diagrams yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHistory.map((item) => (
            <Card key={item.session_id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200/60 bg-white/50 backdrop-blur-sm">
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                {item.image_url ? (
                  <>
                    <img 
                      src={resolveImageUrl(item.image_url)} 
                      alt="Result" 
                      className="w-full h-full object-contain p-2 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-5xl w-full h-[80vh] p-0 overflow-hidden bg-slate-950/90 border-slate-800">
                             <div className="relative w-full h-full flex items-center justify-center">
                               <img 
                                 src={resolveImageUrl(item.image_url)} 
                                 alt="Preview" 
                                 className="max-w-full max-h-full object-contain"
                               />
                             </div>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full" onClick={() => handleDownload(item.image_url!)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <FileText className="w-12 h-12 opacity-20" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                   <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm">
                      {getTypeIcon(item.type)}
                      <span className="ml-1.5">{getTypeLabel(item.type)}</span>
                   </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-slate-900 line-clamp-1" title={item.input_summary || 'Untitled'}>
                      {item.input_summary || 'Untitled'}
                    </p>
                    <div className="flex items-center text-xs text-slate-500">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
