import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bug, ChevronDown, ChevronUp, Monitor, Server } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useErrorReports, type ErrorReport } from "@/features/diagnostics/hooks/useErrorReports";

const LEVEL_STYLE: Record<ErrorReport["level"], string> = {
  fatal: "bg-expense/15 text-expense",
  error: "bg-expense/10 text-expense",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function ReportRow({ report }: { report: ErrorReport }) {
  const [open, setOpen] = useState(false);
  const hasDetails = Boolean(report.stack || report.context);

  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:px-6"
        onClick={() => hasDetails && setOpen(o => !o)}
      >
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${LEVEL_STYLE[report.level]}`}>
          {report.source === "server" ? <Server className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {report.source === "server" ? "Servidor" : "App"}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{report.level}</Badge>
            {report.path && <span className="text-xs text-muted-foreground">{report.path}</span>}
          </div>
          <p className="mt-1 text-sm font-medium break-words">{report.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {format(new Date(report.createdAt), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </p>
        </div>
        {hasDetails && (
          open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && hasDetails && (
        <div className="space-y-2 px-4 pb-4 sm:px-6">
          {report.stack && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {report.stack}
            </pre>
          )}
          {report.context && Object.keys(report.context).length > 0 && (
            <pre className="max-h-40 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words">
              {JSON.stringify(report.context, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function ErrorLog() {
  const [source, setSource] = useState<string>("all");
  const { data: reports, isLoading } = useErrorReports(source === "all" ? undefined : (source as "server" | "client"));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Log de Erros</h1>
          <p className="text-sm text-muted-foreground">Últimos erros capturados automaticamente, app e servidor</p>
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            <SelectItem value="server">Servidor</SelectItem>
            <SelectItem value="client">App</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Bug className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Nenhum erro registrado. Bom sinal.</p>
            </div>
          ) : (
            <div>
              {reports.map(r => <ReportRow key={r.id} report={r} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {reports.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          Mostrando os mais recentes. Atualiza sozinho a cada 30s.
        </p>
      )}
    </div>
  );
}
