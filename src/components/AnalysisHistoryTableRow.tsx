import React, { useState } from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Analysis = {
  id: string;
  author_name: string;
  author_reputation: number | null;
  charity_score: number;
  created_at: string;
  title: string;
  article_url: string;
  image_url?: string;
  openai_response: string;
  analyzed_at: string;
};

interface Props {
  analysis: Analysis;
  charyMark: boolean;
  onToggleChary?: (value: boolean) => void;
  onToggleFavorite?: (value: boolean) => void;
  isFavorite: boolean;
}

const AnalysisHistoryTableRow: React.FC<Props> = ({ 
  analysis, 
  charyMark, 
  onToggleChary,
  onToggleFavorite,
  isFavorite
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow key={analysis.id}>
      <TableCell>
        {onToggleChary ? (
          <Checkbox 
            checked={charyMark} 
            onCheckedChange={onToggleChary} 
            className="ml-1" 
          />
        ) : (
          charyMark && <span className="text-hive text-lg font-bold">x</span>
        )}
      </TableCell>
      <TableCell>
        {onToggleFavorite && (
          <Checkbox 
            checked={isFavorite} 
            onCheckedChange={onToggleFavorite} 
            className="ml-1" 
          />
        )}
      </TableCell>
      <TableCell>{analysis.charity_score}</TableCell>
          <TableCell>
            <button
              className="text-sm text-left text-gray-700 max-w-xs line-clamp-3 hover:underline"
              onClick={() => setOpen(true)}
              aria-label="Vollständige Analyse anzeigen"
            >
              {analysis.openai_response ? analysis.openai_response : 'Keine Analyse verfügbar.'}
            </button>
          </TableCell>
      <TableCell>
        <a
          href={`https://peakd.com/@${analysis.author_name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-hive hover:underline flex items-center gap-1"
        >
          @{analysis.author_name}
        </a>
      </TableCell>
      <TableCell>
        {analysis.author_reputation !== null ? analysis.author_reputation : "N/A"}
      </TableCell>
      <TableCell>
        {analysis.created_at
          ? format(new Date(analysis.created_at), "PPp", { locale: de })
          : "N/A"}
      </TableCell>
      <TableCell>{analysis.title}</TableCell>
      <TableCell>
        <div className="flex flex-col space-y-2">
          <a
            href={analysis.article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-hive hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" /> Artikel
          </a>
          {analysis.image_url && (
            <a
              href={analysis.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-hive hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Bild
            </a>
          )}
        </div>
      </TableCell>
      </TableRow>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyse: {analysis.title || getShortTitle(analysis.article_url)}</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <div className="text-sm text-gray-600 mb-2">
              <strong>Charity-Score:</strong> {analysis.charity_score}
              {analysis.analyzed_at && (
                <span className="ml-4">• Analysiert: {format(new Date(analysis.analyzed_at), 'PPp', { locale: de })}</span>
              )}
            </div>
            <div className="prose max-w-none whitespace-pre-wrap text-sm text-gray-800">
              {analysis.openai_response || 'Keine Analyse verfügbar.'}
            </div>
            <div className="mt-4 text-sm">
              <a href={analysis.article_url} target="_blank" rel="noopener noreferrer" className="text-hive hover:underline inline-flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> Beitrag öffnen
              </a>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Helper to get short title from URL when title is missing
function getShortTitle(url: string) {
  if (!url) return 'Artikel';
  const match = url.match(/\/@[^\/]+\/(.*)$/);
  return match && match[1] ? decodeURIComponent(match[1]) : url;
}

export default AnalysisHistoryTableRow;
