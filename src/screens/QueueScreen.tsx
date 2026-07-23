import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, ChevronRight, CalendarDays, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { PageLoader, EmptyState } from '@/components/ui/Feedback';
import { STATUS_LABELS, STATUS_STYLES, DEADLINE_LABELS, DEADLINE_STYLES } from '@/lib/constants';
import { formatDateBR } from '@/lib/helpers';
import type { RequestStatus } from '@/lib/types';

type Row={id:string;request_number:string;request_type:string;status:RequestStatus;deadline_status:'dentro'|'proximo'|'fora';updated_at:string;worksite?:{name:string};segment?:any[];accommodation?:any[];travelers?:any[];requester?:{full_name:string}};

export function QueueScreen({title='Triagem e compras',filterStatus}:{title?:string;filterStatus?:RequestStatus[]}){
 const {navigate}=useRouter();
 const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const [status,setStatus]=useState('');
 useEffect(()=>{(async()=>{let q=supabase.from('travel_app_requests').select('id,request_number,request_type,status,deadline_status,updated_at,worksite:travel_app_worksites(name),requester:travel_app_profiles!requester_id(full_name),segment:travel_app_segments(origin,destination,departure_date),accommodation:travel_app_accommodations(city,check_in,check_out),travelers:travel_app_request_travelers(traveler:travel_app_travelers(full_name))').order('submitted_at',{ascending:true});if(filterStatus?.length)q=q.in('status',filterStatus);const {data}=await q;setRows((data??[]) as any);setLoading(false)})()},[JSON.stringify(filterStatus)]);
 if(loading)return <PageLoader/>;
 const filtered=rows.filter(r=>{const seg=r.segment?.[0];const acc=r.accommodation?.[0];const names=r.travelers?.map((x:any)=>x.traveler?.full_name).join(' ')||'';const hay=`${r.request_number} ${seg?.origin} ${seg?.destination} ${acc?.city} ${names} ${r.worksite?.name}`.toLowerCase();return (!search||hay.includes(search.toLowerCase()))&&(!status||r.status===status)});
 return <div className="space-y-4 min-w-0">
  <div><h1 className="text-xl font-semibold">{title}</h1><p className="text-sm text-gray-500">Pedidos recebidos, orçamento e conclusão em uma única fila.</p></div>
  <div className="flex flex-col sm:flex-row gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-4 h-4 w-4 text-gray-400"/><Input className="pl-9" placeholder="Protocolo, viajante, obra ou destino" value={search} onChange={e=>setSearch(e.target.value)}/></div><Select className="sm:w-52" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LABELS).filter(([k])=>k!=='rascunho').map(([k,v])=><option key={k} value={k}>{v}</option>)}</Select></div>
  {filtered.length===0?<EmptyState icon={<SlidersHorizontal className="h-8 w-8"/>} title="Nenhuma solicitação encontrada"/>:<>
   <div className="md:hidden space-y-2">
    {filtered.map(r=>{const seg=r.segment?.[0];const acc=r.accommodation?.[0];const names=r.travelers?.map((x:any)=>x.traveler?.full_name).filter(Boolean).join(', ')||'—';return <button key={r.id} onClick={()=>navigate(`request/${r.id}`)} className="w-full text-left rounded-2xl border bg-white p-4 shadow-sm active:bg-gray-50">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-gray-500">{r.request_number}</p><p className="font-semibold text-gray-900 truncate mt-0.5">{names}</p><p className="text-sm text-gray-700 truncate">{seg?`${seg.origin} → ${seg.destination}`:acc?`Hospedagem em ${acc.city||'local a definir'}`:'Detalhes não informados'}</p></div><ChevronRight className="h-5 w-5 text-gray-400 shrink-0 mt-1"/></div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-gray-600"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5"/>{formatDateBR(seg?.departure_date||acc?.check_in)}</span><span className="flex items-center gap-1.5 truncate"><Building2 className="h-3.5 w-3.5 shrink-0"/>{r.worksite?.name||'Sem obra'}</span></div>
      <div className="flex flex-wrap gap-2 mt-3"><Badge className={STATUS_STYLES[r.status]}>{STATUS_LABELS[r.status]}</Badge><Badge className={DEADLINE_STYLES[r.deadline_status]}>{DEADLINE_LABELS[r.deadline_status]}</Badge></div>
    </button>})}
   </div>
   <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white mobile-scroll"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50 text-gray-500 text-left"><tr><th className="p-3">Protocolo</th><th className="p-3">Viajante</th><th className="p-3">Pedido</th><th className="p-3">Data</th><th className="p-3">Obra</th><th className="p-3">Prazo</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{filtered.map(r=>{const seg=r.segment?.[0];const acc=r.accommodation?.[0];const names=r.travelers?.map((x:any)=>x.traveler?.full_name).filter(Boolean).join(', ')||'—';return <tr key={r.id} className="border-t hover:bg-gray-50"><td className="p-3 font-medium">{r.request_number}</td><td className="p-3">{names}</td><td className="p-3">{seg?`${seg.origin} → ${seg.destination}`:'—'}</td><td className="p-3">{formatDateBR(seg?.departure_date||acc?.check_in)}</td><td className="p-3">{r.worksite?.name||'—'}</td><td className="p-3"><Badge className={DEADLINE_STYLES[r.deadline_status]}>{DEADLINE_LABELS[r.deadline_status]}</Badge></td><td className="p-3"><Badge className={STATUS_STYLES[r.status]}>{STATUS_LABELS[r.status]}</Badge></td><td className="p-3 text-right"><button className="font-medium text-[#004883] hover:underline" onClick={()=>navigate(`request/${r.id}`)}>Abrir</button></td></tr>})}</tbody></table></div>
  </>}
 </div>
}
