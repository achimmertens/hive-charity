
import React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown } from "lucide-react";

interface SortableTableHeaderProps {
  column: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  children: React.ReactNode;
}

const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  column,
  sortKey,
  sortDirection,
  onSort,
  children,
}) => {
  const isSorted = sortKey === column;
  return (
    <TableHead
      className="cursor-pointer select-none hover:text-hive"
      onClick={() => onSort(column)}
      aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          onSort(column);
        }
      }}
    >
      <span className="flex items-center gap-1">
        {children}
        {isSorted &&
          (sortDirection === "asc" ? (
            <ArrowUp className="w-4 h-4 inline" />
          ) : (
            <ArrowDown className="w-4 h-4 inline" />
          ))}
      </span>
    </TableHead>
  );
};

export default SortableTableHeader;
