import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function SettingsScreen() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500">Configurações gerais do sistema</p>
      </div>
      <Card>
        <div className="p-5 space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#004883]" />
            <p className="font-medium text-gray-900">Sistema</p>
          </div>
          <p>As configurações de regras de prazo estão disponíveis em "Regras e prazos".</p>
          <p>As perguntas frequentes podem ser gerenciadas em "Perguntas frequentes".</p>
          <p>O contato da agência oficial pode ser configurado na tela de Fornecedores.</p>
        </div>
      </Card>
    </div>
  );
}
