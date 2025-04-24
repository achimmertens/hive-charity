
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ExternalLink } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  onToggleArchive?: (value: boolean) => void;
  isFavorite: boolean;
  isArchived: boolean;
}

const AnalysisHistoryTableRow: React.FC<Props> = ({ 
  analysis, 
  charyMark, 
  onToggleChary,
  onToggleFavorite,
  onToggleArchive,
  isFavorite,
  isArchived
}) => {
  const urlMatch = analysis.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
  return (
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
        {onToggleArchive && (
          <Checkbox 
            checked={isArchived} 
            onCheckedChange={onToggleArchive} 
            className="ml-1" 
          />
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
  );
};

export default AnalysisHistoryTableRow;
