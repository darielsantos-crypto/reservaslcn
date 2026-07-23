import { useEffect, useMemo, useState } from 'react';
import { Search, HelpCircle, FileText, Phone, ExternalLink } from 'lucide-react';
import { fetchFaq, fetchPolicyRules } from '@/lib/queries';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/helpers';
import type { FaqItem, PolicyRule } from '@/lib/types';


export function PolicyScreen() {
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    Promise.all([fetchFaq(), fetchPolicyRules()]).then(([f, r]) => {
      setFaq(f);
      setRules(r);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    return faq.filter((f) => {
      if (category && f.category !== category) return false;
      if (search) {
        const hay = `${f.question} ${f.answer}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [faq, search, category]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Política e ajuda</h1>
        <p className="text-sm text-gray-500">Tire dúvidas rapidamente sem ler documentos longos.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar ajuda..." className="pl-9" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCategory('')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', !category ? 'bg-[#004883] text-white' : 'bg-white border border-gray-200 text-gray-600')}>
          Todas
        </button>
        {FAQ_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium', category === c ? 'bg-[#004883] text-white' : 'bg-white border border-gray-200 text-gray-600')}>
            {FAQ_CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="sm:col-span-2"><EmptyState icon={<HelpCircle className="h-8 w-8" />} title="Nenhuma resposta encontrada" /></div>
        ) : (
          filtered.map((f) => (
            <Card key={f.id}>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-900">{f.question}</p>
                <p className="text-sm text-gray-600 mt-1.5">{f.answer}</p>
                <p className="text-[11px] text-gray-400 mt-2">{FAQ_CATEGORY_LABELS[f.category] ?? f.category}</p>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#004883]" />
            <p className="text-sm font-semibold text-gray-900">Regras de prazo</p>
          </div>
          <div className="space-y-1.5 text-sm">
            {rules.map((r) => (
              <div key={r.id} className="flex justify-between">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-900">{r.min_days} dias</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-900">Contatos</p>
          </div>
          <div className="space-y-1.5 text-sm text-gray-600">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" /> Gestão de Viagens: viagens@lucena.com.br</p>
          </div>
        </div>
      </Card>

      <Button variant="outline" onClick={() => window.open('/politica-de-viagens.pdf', '_blank', 'noopener,noreferrer')}>
        <FileText className="h-4 w-4" /> Ver Política completa <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
}
