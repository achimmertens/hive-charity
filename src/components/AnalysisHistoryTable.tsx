
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
}

const AnalysisHistoryTable: React.FC<Props> = ({
  columns,
  analyses,
  charyMap,
  sortKey,
  sortDirection,
  onSort,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
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
          <TableHead>!CHARY</TableHead>
          <TableHead>Analysiert am</TableHead>
          <TableHead>OpenAI Analyse</TableHead>
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
            />
          );
        })}
      </TableBody>
    </Table>
  );
};

export default AnalysisHistoryTable;
