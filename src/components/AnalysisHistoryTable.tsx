import React from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SortableTableHeader from "@/components/SortableTableHeader";
import AnalysisHistoryTableRow from "./AnalysisHistoryTableRow";

interface Props {
  columns: { key: string; label: string }[];
  analyses: any[];
  charyMap: Record<string, boolean>;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  onToggleChary?: (analysisId: string, postId: string, value: boolean) => void;
  onToggleFavorite?: (analysisId: string, value: boolean) => void;
  favoriteMap: Record<string, boolean>;
  archiveMap?: Record<string, boolean>;
  onUpdateAnalysis?: (analysisId: string, newResponse: string) => void;
  onUpdateScore?: (analysisId: string, newScore: number) => void;
  isEditable?: boolean;
}

const AnalysisHistoryTable: React.FC<Props> = ({
  columns,
  analyses,
  charyMap,
  sortKey,
  sortDirection,
  onSort,
  onToggleChary,
  onToggleFavorite,
  favoriteMap,
  onUpdateAnalysis,
  onUpdateScore,
  isEditable = false,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>!CHARY</TableHead>
          <TableHead>Favorit</TableHead>
          <TableHead>Charity-Score</TableHead>
          <TableHead>Analyse</TableHead>
          {columns.map((col) => (
            <SortableTableHeader
              key={col.key}
              column={col.key}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={onSort}
            >
              {col.label}
            </SortableTableHeader>
          ))}
          <TableHead>Aktionen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {analyses.map((analysis) => {
          const urlMatch = analysis.article_url?.match(/@([^\/]+)\/([^\/\?]+)/);
          const charyKey = urlMatch ? `${urlMatch[1]}/${urlMatch[2]}` : "";
          return (
            <AnalysisHistoryTableRow
              key={analysis.id}
              analysis={analysis}
              charyMark={!!(charyKey && charyMap[charyKey])}
              onToggleChary={onToggleChary ? 
                (value) => onToggleChary(analysis.id, charyKey, value) : undefined}
              onToggleFavorite={onToggleFavorite ? 
                (value) => onToggleFavorite(analysis.id, value) : undefined}
              isFavorite={!!favoriteMap[analysis.id]}
              onUpdateAnalysis={onUpdateAnalysis}
              onUpdateScore={onUpdateScore}
              isEditable={isEditable}
            />
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AnalysisHistoryTable;
