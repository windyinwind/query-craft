'use client';

import React, { useState, useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ChevronDown, ChevronUp, Download } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QueryResult {
  [key: string]: any;
}

interface QueryResponse {
  error?: string;
  affectedRows?: number;
}

interface SqlResultPanelProps {
  results: QueryResult[] | QueryResponse | undefined;
  onClose: () => void;
  hasError?: boolean;
}

export default function SqlResultPanel({ results, onClose, hasError = false }: SqlResultPanelProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pageSize, setPageSize] = useState(10);

  // Always create the column helper regardless of results
  const columnHelper = createColumnHelper<any>();

  // Compute columns and data
  const { columns, data } = useMemo(() => {
    // Default empty state
    const emptyColumns: any[] = [];
    const emptyData: any[] = [];

    // Only process if we have array results with data
    if (results && Array.isArray(results) && results.length > 0) {
      const cols = Object.keys(results[0]).map(key => 
        columnHelper.accessor(key, {
          header: () => <span className="font-medium">{key}</span>,
          cell: info => {
            const value = info.getValue();
            // For long text, use text ellipsis but allow hovering to see full content
            if (typeof value === 'string' && value.length > 50) {
              return (
                <div className="max-w-xs truncate" title={value}>
                  {value}
                </div>
              );
            }
            return <span>{String(value ?? '')}</span>;
          },
        })
      );
      return { columns: cols, data: results };
    }
    
    return { columns: emptyColumns, data: emptyData };
  }, [results, columnHelper]);

  // Always create the table instance with consistent data structure
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const exportToCsv = () => {
    if (!results || !Array.isArray(results) || results.length === 0) return;
    
    const headers = Object.keys(results[0]);
    const csvContent = [
      headers.join(','),
      ...results.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that need to be quoted (contain commas, quotes, or newlines)
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value === null || value === undefined ? '' : value;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query-result-${new Date().toISOString().slice(0, 19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex justify-between w-full items-center">
          <h2 className="text-lg font-semibold">
            {Array.isArray(results) ? `Query Results (${results.length} rows)` : 'Query Results'}
          </h2>
          <div className="flex items-center gap-2">
            {Array.isArray(results) && results.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportToCsv}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Conditional content based on results */}
      {!results ? (
        <CardContent className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500 dark:text-gray-400">No results to display</p>
        </CardContent>
      ) : !Array.isArray(results) ? (
        <CardContent className="flex-1 p-6">
          {hasError ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{results.error}</AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>Query Executed Successfully</AlertTitle>
              <AlertDescription>
                Affected rows: {results.affectedRows}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      ) : results.length === 0 ? (
        <CardContent className="flex-1 p-6">
          <Alert>
            <AlertTitle>No Results</AlertTitle>
            <AlertDescription>
              The query returned no results.
            </AlertDescription>
          </Alert>
        </CardContent>
      ) : (
        <CardContent className="flex-1 p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-auto">
                <div className="overflow-x-auto" style={{ width: '100%', height: '100%' }}>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ width: Math.max(columns.length * 200, 800) + 'px' }}>
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                      {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map(header => (
                            <th 
                              key={header.id} 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 whitespace-nowrap"
                              onClick={header.column.getToggleSortingHandler()}
                              style={{ cursor: 'pointer', minWidth: '150px' }}
                            >
                              <div className="flex items-center">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                <span className="ml-1">
                                  {{
                                    asc: <ChevronUp className="h-4 w-4" />,
                                    desc: <ChevronDown className="h-4 w-4" />,
                                  }[header.column.getIsSorted() as string] ?? null}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {table.getRowModel().rows.map(row => (
                        <tr 
                          key={row.id}
                          className={`${
                            row.index % 2 === 0 
                              ? 'bg-white dark:bg-gray-900' 
                              : 'bg-gray-50 dark:bg-gray-800'
                          } hover:bg-gray-100 dark:hover:bg-gray-700`}
                        >
                          {row.getVisibleCells().map(cell => (
                            <td
                              key={cell.id}
                              className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700"
                              style={{ minWidth: '150px' }}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-500 dark:text-gray-400">rows per page</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 