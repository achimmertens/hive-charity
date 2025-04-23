
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

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
}

const AnalysisHistoryTableRow: React.FC<Props> = ({ analysis, charyMark }) => {
  const urlMatch = analysis.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
  return (
    <TableRow key={analysis.id}>
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
        <span
          className={`font-medium ${
            analysis.charity_score >= 7
              ? "text-green-600"
              : analysis.charity_score >= 4
              ? "text-amber-600"
              : "text-red-600"
          }`}
        >
          {analysis.charity_score}
        </span>
      </TableCell>
      <TableCell>
        {analysis.created_at
          ? format(new Date(analysis.created_at), "PPp", { locale: de })
          : "N/A"}
      </TableCell>
      <TableCell>{analysis.title}</TableCell>
      <TableCell>
        {charyMark && <span className="text-hive text-lg font-bold">x</span>}
      </TableCell>
      <TableCell>
        {format(new Date(analysis.analyzed_at), "PPp", { locale: de })}
      </TableCell>
      <TableCell className="max-w-md">
        <div className="truncate">{analysis.openai_response}</div>
      </TableCell>
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
