import * as React from "react";

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DndContext,
  closestCenter,
  type UniqueIdentifier,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  ColumnDef,
  flexRender,
  Row,
  type Table as TanStackTable,
} from "@tanstack/react-table";

import { DraggableRow } from "./draggable-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";

interface DataTableProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled?: boolean;
  onReorder?: (newData: TData[]) => void;
  nothingFn?: () => React.ReactNode;
  onClickRow?: (row: Row<TData>) => void;
}

function renderTableBody<TData, TValue>({
  table,
  columns,
  dndEnabled,
  dataIds,
  nothingFn,
  onClickRow,
}: {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled: boolean;
  dataIds: UniqueIdentifier[];
  nothingFn?: () => React.ReactNode;
  onClickRow?: (row: Row<TData>) => void;
}) {
  if (!table.getRowModel().rows.length) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          {nothingFn ? nothingFn() : "No results."}
        </TableCell>
      </TableRow>
    );
  }
  if (dndEnabled) {
    return (
      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
        {table.getRowModel().rows.map((row) => (
          <DraggableRow key={row.id} row={row} />
        ))}
      </SortableContext>
    );
  }
  return table.getRowModel().rows.map((row) => (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      onClick={() => onClickRow?.(row)}
      className={onClickRow && "cursor-pointer"}
    >
      {row.getVisibleCells().map((cell) => {
        return (
          <TableCell
            key={cell.id}
            className={cell.column.columnDef.meta?.className}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  ));
}

export function DataTable<TData, TValue>({
  table,
  columns,
  dndEnabled = false,
  onReorder,
  nothingFn,
  onClickRow,
}: DataTableProps<TData, TValue>) {
  const dataIds: UniqueIdentifier[] = table
    .getRowModel()
    .rows.map((row) => Number(row.id) as UniqueIdentifier);
  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onReorder) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);

      // Call parent with new data order (parent manages state)
      const newData = arrayMove(table.options.data, oldIndex, newIndex);
      onReorder(newData);
    }
  }

  const tableContent = (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={header.column.columnDef.meta?.className}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="**:data-[slot=table-cell]:first:w-8">
        {renderTableBody({
          table,
          columns,
          dndEnabled,
          dataIds,
          nothingFn,
          onClickRow,
        })}
      </TableBody>
    </Table>
  );

  if (dndEnabled) {
    return (
      <DndContext
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragEnd={handleDragEnd}
        sensors={sensors}
        id={sortableId}
      >
        {tableContent}
      </DndContext>
    );
  }

  return tableContent;
}
