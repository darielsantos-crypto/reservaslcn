import { Plane, Building2, CalendarDays, User } from 'lucide-react';
import type { TravelRequest, TravelSegment, Accommodation, Worksite, Profile } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  STATUS_LABELS,
  STATUS_STYLES,
  DEADLINE_LABELS,
  DEADLINE_STYLES,
  DEADLINE_DOTS,
} from '@/lib/constants';
import { formatDateBR, formatRelative, requestTypeLabel } from '@/lib/helpers';

interface RequestCardProps {
  request: TravelRequest & { worksite?: Worksite | null };
  segments?: TravelSegment[];
  accommodations?: Accommodation[];
  travelers?: { traveler?: { full_name: string } | null }[];
  onClick?: () => void;
}

export function RequestCard({ request, segments, accommodations, travelers, onClick }: RequestCardProps) {
  const firstSeg = segments?.[0];
  const firstAcc = accommodations?.[0];
  const route = firstSeg ? `${firstSeg.origin} → ${firstSeg.destination}` : firstAcc ? `Hospedagem em ${firstAcc.city ?? 'local a definir'}` : 'Detalhes a definir';
  const travelerName = travelers?.[0]?.traveler?.full_name ?? '—';
  const date = firstSeg?.departure_date ?? firstSeg?.return_date ?? firstAcc?.check_in;

  return (
    <Card hover={!!onClick} onClick={onClick} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <span className="font-mono">{request.request_number ?? '—'}</span>
              <span>·</span>
              <span>{requestTypeLabel(request.request_type)}</span>
            </div>
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{route}</p>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{travelerName}</p>
          </div>
          <Badge className={STATUS_STYLES[request.status]}>
            {STATUS_LABELS[request.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
          {date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDateBR(date)}
            </span>
          )}
          {request.worksite && (
            <span className="inline-flex items-center gap-1 truncate">
              <Building2 className="h-3.5 w-3.5" />
              {request.worksite.name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <Badge className={DEADLINE_STYLES[request.deadline_status]} dot dotClass={DEADLINE_DOTS[request.deadline_status]}>
            {DEADLINE_LABELS[request.deadline_status]}
          </Badge>
          <span className="text-[11px] text-gray-400">Atualizado {formatRelative(request.updated_at)}</span>
        </div>
      </div>
    </Card>
  );
}
