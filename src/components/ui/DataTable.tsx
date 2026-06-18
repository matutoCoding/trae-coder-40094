import { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = '暂无数据',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gold/20">
            {columns.map((col) => (
              <th
                key={col.key as string}
                className="text-left py-4 px-4 text-sm font-medium text-text-muted bg-bg-tertiary/50"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-12 text-center text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-gold/5 transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-gold/5' : ''
                } ${index % 2 === 0 ? 'bg-bg-secondary/30' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key as string} className="py-4 px-4 text-sm text-text-secondary">
                    {col.render ? col.render(row) : (row[col.key as keyof T] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
