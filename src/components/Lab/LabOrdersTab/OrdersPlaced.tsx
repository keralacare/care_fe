import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "raviger";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import routes from "@/Utils/request/api";
import useTanStackQueryInstead from "@/Utils/request/useQuery";

import { Specimen } from "../types";
import TableAbstract from "./TableAbstract";

export default function OrdersPlaced() {
  const navigate = useNavigate();

  const columns: ColumnDef<Specimen>[] = [
    {
      accessorFn: (row) => row.id.slice(0, 8),
      header: "Specimen ID",
    },
    {
      accessorFn: (row) => row.request.id,
      header: "Order ID",
    },
    {
      header: "Patient Name",
      cell: ({ row }) => (
        <div>
          <p>{row.original.subject.name}</p>
          <p className="text-sm text-gray-400">
            {row.original.subject.id?.slice(0, 8)}
          </p>
        </div>
      ),
    },
    {
      accessorFn: (row) => row.type.display ?? row.type.code,
      header: "Specimen",
    },
    {
      accessorFn: (row) => row.request.code.display ?? row.request.code.code,
      header: "Test Ordered",
    },
    {
      header: "Priority",
      cell: ({ row }) => (
        <Badge>{row.original.request.priority ?? "routine"}</Badge>
      ),
    },
    {
      header: "Action",
      cell: ({ row }) => (
        <Button
          onClick={() => navigate(`/lab_orders/${row.id}/collect`)}
          variant="secondary"
        >
          Collect Specimen
        </Button>
      ),
    },
  ];

  const { data } = useTanStackQueryInstead(routes.labs.specimen.list, {
    query: {
      phase: "ordered",
    },
  });

  return (
    <div className="container px-4 py-2">
      <TableAbstract columns={columns} data={data?.results ?? []} />
    </div>
  );
}
