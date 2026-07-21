import { useEffect, useMemo, useState } from 'react';
import { Search, HelpCircle, FileText, Phone } from 'lucide-react';
import { fetchFaq, fetchPolicyRules } from '@/lib/queries';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { FAQ_CATEGORIES, FAQ_CATEGORY_LABELS } from '@/lib/constants';
import { cn } from '@/lib/helpers';
import type { FaqItem, PolicyRule } from '@/lib/types';

const POLICY_TEXT = `# Política de Viagens Corporativas — Lucena Infraestrutura

## 1. Prazos de solicitação
- Baixadas, admissões, retornos, transferências e demais viagens nacionais: 30 dias corridos.
- Viagens internacionais: 60 dias corridos.
- Diretoria Executiva e Gerências — nacional: 15 dias corridos.
- Diretoria Executiva e Gerências — internacional: 30 dias corridos.
- Viagens emergenciais: assim que a necessidade for identificada.

## 2. Solicitação fora do prazo
Pedidos fora do prazo podem ser registrados com justificativa e nome do responsável que orientou ou autorizou. O atendimento pode ter opções limitadas ou custos maiores.

## 3. Terceiros
Viagens para terceiros exigem autorização prévia da Diretoria Executiva. O sistema registra a confirmação.

## 4. Hospedagem
A reserva é realizada pela Lucena ou pela agência oficial. Não reserve hotel por conta própria, salvo autorização expressa.

## 5. Bagagem
Bagagem adicional, ferramentas, equipamentos, uniformes e EPIs devem ser informados antes da emissão.

## 6. Adiantamento
Solicite preferencialmente junto com a viagem, com 7 dias corridos de antecedência e, no mínimo, 2 dias úteis antes da viagem.

## 7. Alterações pós-emissão
Remarcações, cancelamentos, bagagens e alterações devem ser tratadas pelo canal da agência oficial.

## 8. Compras por conta própria
Não compre passagens por conta própria, salvo autorização expressa.

## 9. Aeroporto
Apresente-se com 2 horas de antecedência para voos nacionais e 3 horas para internacionais.

## 10. Prestação de contas
Até 10 dias corridos após o retorno.`;

export function PolicyScreen() {
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showFull, setShowFull] = useState(false);

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

      <Button variant="outline" onClick={() => setShowFull(true)}>Ver Política completa</Button>

      {showFull && (
        <Modal open={showFull} onClose={() => setShowFull(false)} title="Política de Viagens" size="lg"
          footer={<Button variant="outline" onClick={() => setShowFull(false)}>Fechar</Button>}>
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{POLICY_TEXT}</pre>
        </Modal>
      )}
    </div>
  );
}
