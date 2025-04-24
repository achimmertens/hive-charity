
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
  onToggleArchive?: (analysisId: string, value: boolean) => void;
  favoriteMap: Record<string, boolean>;
  archiveMap: Record<string, boolean>;
  showArchiveButton?: boolean;
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
  onToggleArchive,
  favoriteMap,
  archiveMap,
  showArchiveButton = false,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>!CHARY</TableHead>
          <TableHead>Favorit</TableHead>
          <TableHead>Archiv</TableHead>
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
              onToggleArchive={onToggleArchive ? 
                (value) => onToggleArchive(analysis.id, value) : undefined}
              isFavorite={!!favoriteMap[analysis.id]}
              isArchived={!!archiveMap[analysis.id]}
            />
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AnalysisHistoryTable;
