// =========================================================================
// Manager queue page — lab manager reviews and approves/rejects submitted tests
// Route: /approvals
// =========================================================================

import { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Eye, X } from "lucide-react";
import { useApprovalQueue } from "@/hooks/test-approvals/useApprovalQueue";
import { useBulkApprove } from "@/hooks/test-approvals/useBulkApprove";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import { TestReviewDrawer } from "@/components/approvals/TestReviewDrawer";
import { ApprovalsEmptyState } from "@/components/approvals/ApprovalsEmptyState";
import { mockAnalysts } from "@/mock-data";
import type { TestQueueItem } from "@/mock-data/testQueue";
import { format } from "date-fns";

export default function ApprovalsQueue() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const [priorityFilter, setPriorityFilter] = useState<string>("__all__");
  const [analystFilter, setAnalystFilter] = useState<string>("__all__");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const queue = useApprovalQueue({
    priority: priorityFilter === "__all__" ? undefined : (priorityFilter as "Normal" | "High" | "Urgent"),
    assignedTo: analystFilter === "__all__" ? undefined : analystFilter,
    sortBy: "submittedAt",
    sortOrder,
    pageSize: 100,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerTestId, setDrawerTestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bulkApprove = useBulkApprove();

  const selectedTests = useMemo(
    () => queue.data.filter((q) => selectedIds.has(q.test.id)),
    [queue.data, selectedIds],
  );

  const toggleRow = (testId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const all = queue.data.map((q) => q.test.id);
      const allSelected = all.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(all);
    });
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    await bulkApprove({ testIds: Array.from(selectedIds) });
    setSelectedIds(new Set());
  };

  const columns: Array<{
    key: string;
    header: string;
    render?: (item: TestQueueItem) => React.ReactNode;
  }> = [
    {
      key: "select",
      header: "",
      render: (item: TestQueueItem) => (
        <input
          type="checkbox"
          aria-label={`select ${item.test.name}`}
          checked={selectedIds.has(item.test.id)}
          onChange={(e) => {
            e.stopPropagation();
            toggleRow(item.test.id);
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4"
        />
      ),
    },
    {
      key: "testId",
      header: labels.testLabel,
      render: (item: TestQueueItem) => (
        <span className="font-mono text-xs">{item.test.id}</span>
      ),
    },
    {
      key: "name",
      header: labels.testLabel,
      render: (item: TestQueueItem) => <span className="font-medium">{item.test.name}</span>,
    },
    {
      key: "sample",
      header: labels.sampleLabel,
      render: (item: TestQueueItem) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">{item.sample.id}</span>
          <span className="text-xs text-muted-foreground">{item.sample.clientName}</span>
        </div>
      ),
    },
    {
      key: "sampleType",
      header: labels.filterBySampleType,
      render: (item: TestQueueItem) => item.sample.sampleType,
    },
    {
      key: "priority",
      header: labels.priorityLabel,
      render: (item: TestQueueItem) => item.sample.priority,
    },
    {
      key: "analyst",
      header: labels.analystLabel,
      render: (item: TestQueueItem) =>
        item.analyst ? item.analyst.name : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "submittedAt",
      header: labels.submittedAt,
      render: (item: TestQueueItem) =>
        item.test.submittedAt ? (
          <span className="text-xs">{format(new Date(item.test.submittedAt), "yyyy-MM-dd HH:mm")}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: labels.statusLabel,
      render: (item: TestQueueItem) => <StatusBadge status={item.test.reviewStatus} />,
    },
    {
      key: "actions",
      header: labels.actionsLabel,
      render: (item: TestQueueItem) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setDrawerTestId(item.test.id);
            setDrawerOpen(true);
          }}
        >
          <Eye className="me-1 h-4 w-4" />
          {isRtl ? "مراجعة" : "Review"}
        </Button>
      ),
    },
  ];

  const allSelected =
    queue.data.length > 0 && queue.data.every((q) => selectedIds.has(q.test.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{labels.queueTitle}</h1>
          <p className="text-muted-foreground mt-1">{labels.queueSubtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{labels.filterByPriority}</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{labels.allPriorities}</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{labels.filterByAnalyst}</label>
              <Select value={analystFilter} onValueChange={setAnalystFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{labels.allAnalysts}</SelectItem>
                  {mockAnalysts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">{labels.sortBy}</label>
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{labels.oldest}</SelectItem>
                  <SelectItem value="desc">{labels.newest}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk select row */}
      {queue.data.length > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2 text-sm">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="select all"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4"
            />
            <span>
              {selectedTests.length > 0
                ? isRtl
                  ? `${selectedTests.length} محدد`
                  : `${selectedTests.length} selected`
                : isRtl
                ? `${queue.data.length} في القائمة`
                : `${queue.data.length} in queue`}
            </span>
          </div>
          {selectedTests.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="me-1 h-4 w-4" />
                {labels.clearSelection}
              </Button>
              <Button size="sm" onClick={handleBulkApprove}>
                <CheckCircle2 className="me-1 h-4 w-4" />
                {labels.bulkApproveSelected} ({selectedTests.length})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Queue */}
      {queue.data.length === 0 ? (
        <ApprovalsEmptyState message={labels.emptyQueue} />
      ) : (
        <DataTable
          data={queue.data}
          columns={columns}
          searchKey="name"
          searchPlaceholder={isRtl ? "البحث في القائمة..." : "Search queue..."}
          onRowClick={(item) => {
            setDrawerTestId(item.test.id);
            setDrawerOpen(true);
          }}
        />
      )}

      <TestReviewDrawer
        testId={drawerTestId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDecision={() => setSelectedIds(new Set())}
      />
    </div>
  );
}