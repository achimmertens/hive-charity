import React, { useState } from "react";
import { parseOpenAIResponse, shortSummary } from '@/lib/openaiResponse';
import { TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ExternalLink, Pencil, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
  onUpdateAnalysis?: (analysisId: string, newResponse: string) => void;
  onUpdateScore?: (analysisId: string, newScore: number) => void;
  isEditable?: boolean;
}

const AnalysisHistoryTableRow: React.FC<Props> = ({ 
  analysis, 
  charyMark, 
  onToggleChary,
  onToggleFavorite,
  isFavorite,
  onUpdateAnalysis,
  onUpdateScore,
  isEditable = false
}) => {
  const [open, setOpen] = useState(false);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(analysis.openai_response);
  const [isEditingScore, setIsEditingScore] = useState(false);
  const [editedScore, setEditedScore] = useState(analysis.charity_score.toString());

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
      <TableCell>
        {isEditable && isEditingScore ? (
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={editedScore}
              onChange={(e) => setEditedScore(e.target.value)}
              className="w-20 px-2 py-1 border rounded text-sm"
              min="0"
              max="100"
            />
            <Button
              size="sm"
              onClick={() => {
                const newScore = parseInt(editedScore, 10);
                if (!isNaN(newScore) && newScore >= 0 && newScore <= 100 && onUpdateScore) {
                  onUpdateScore(analysis.id, newScore);
                  setIsEditingScore(false);
                }
              }}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditedScore(analysis.charity_score.toString());
                setIsEditingScore(false);
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span>{analysis.charity_score}</span>
            {isEditable && onUpdateScore && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingScore(true)}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </TableCell>
          <TableCell>
            {isEditable && isEditingAnalysis ? (
              <div className="space-y-2">
                <Textarea
                  value={editedAnalysis}
                  onChange={(e) => setEditedAnalysis(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (onUpdateAnalysis) {
                        onUpdateAnalysis(analysis.id, editedAnalysis);
                      }
                      setIsEditingAnalysis(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" /> Speichern
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditedAnalysis(analysis.openai_response);
                      setIsEditingAnalysis(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <button
                  className="text-sm text-left text-gray-700 max-w-xs line-clamp-3 hover:underline flex-1"
                  onClick={() => setOpen(true)}
                  aria-label="Vollständige Analyse anzeigen"
                >
                  {analysis.openai_response ? (
                    (() => {
                      try {
                        const p = parseOpenAIResponse(analysis.openai_response);
                        return p.summary ? shortSummary(p.summary, 160) : analysis.openai_response.split('\n')[0];
                      } catch {
                        return analysis.openai_response;
                      }
                    })()
                  ) : 'Keine Analyse verfügbar.'}
                </button>
                {isEditable && onUpdateAnalysis && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingAnalysis(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
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
              {analysis.openai_response ? (
                (() => {
                  try {
                    const p = parseOpenAIResponse(analysis.openai_response);
                    return (
                      <div>
                        {p.summary && (
                          <div className="mb-3">
                            <strong>Zusammenfassung:</strong>
                            <div className="mt-1">{p.summary}</div>
                          </div>
                        )}
                        {p.reason && (
                          <div className="mb-3">
                            <strong>Begründung:</strong>
                            <div className="mt-1">{p.reason}</div>
                          </div>
                        )}
                        {p.evidence && Array.isArray(p.evidence) && p.evidence.length > 0 && (
                          <div className="mb-3">
                            <strong>Belege:</strong>
                            <ul className="mt-1 list-disc list-inside">
                              {p.evidence.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!p.summary && !p.reason && !p.evidence && (
                          <div>{analysis.openai_response}</div>
                        )}
                      </div>
                    );
                  } catch {
                    return analysis.openai_response;
                  }
                })()
              ) : 'Keine Analyse verf gbar.'}
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
