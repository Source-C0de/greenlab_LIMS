// =========================================================================
// Analyst page — track tests the analyst has submitted
// Route: /approvals/my-submissions
// =========================================================================

import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMySubmittedTests } from "@/hooks/test-approvals/useMySubmittedTests";
import { approvalLabels } from "@/hooks/test-approvals/labels";
import { ApprovalsEmptyState } from "@/components/approvals/ApprovalsEmptyState";
import { TestReviewDrawer } from "@/components/approvals/TestReviewDrawer";
import { Edit3 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

interface MySubmissionRow {
  id: string;
  sampleId: string;
  name: string;
  category: string;
  method: string;
  status: string;
  submittedAt?: string;
  reason?: string;
}

export default function MySubmissions() {
  const { language } = useAppContext();
  const isRtl = language === "ar";
  const labels = approvalLabels(isRtl ? "ar" : "en");

  const { submitted, changesRequested } = useMySubmittedTests();

  const [drawerTestId, setDrawerTestId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const submittedRows: MySubmissionRow[] = submitted.map((t) => ({
    id: t.id,
    sampleId: t.sampleId,
    name: t.name,
    category: t.category,
    method: t.method,
    status: t.reviewStatus,
    submittedAt: t.submittedAt,
  }));

  const changesRows: MySubmissionRow[] = changesRequested.map((t) => ({
    id: t.id,
    sampleId: t.sampleId,
    name: t.name,
    category: t.category,
    method: t.method,
    status: t.reviewStatus,
    submittedAt: t.submittedAt,
    reason: t.latestReason,
  }));

  const submittedColumns = [
    {
      key: "id",
      header: labels.testLabel,
      render: (item: MySubmissionRow) => (
        <span className="font-mono text-xs">{item.id}</span>
      ),
    },
    {
      key: "name",
      header: labels.testLabel,
      render: (item: MySubmissionRow) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: "sampleId",
      header: labels.sampleLabel,
      render: (item: MySubmissionRow) => (
        <Link href={`/samples/${item.sampleId}`} className="text-primary hover:underline font-mono text-xs">
          {item.sampleId}
        </Link>
      ),
    },
    {
      key: "category",
      header: labels.testLabel,
      render: (item: MySubmissionRow) => item.category,
    },
    {
      key: "submittedAt",
      header: labels.submittedAt,
      render: (item: MySubmissionRow) =>
        item.submittedAt ? (
          <span className="text-xs">{format(new Date(item.submittedAt), "yyyy-MM-dd HH:mm")}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: labels.statusLabel,
      render: (item: MySubmissionRow) => <StatusBadge status={item.status} />,
    },
  ];

  const changesColumns = [
    ...submittedColumns,
    {
      key: "reason",
      header: labels.reasonLabel,
      render: (item: MySubmissionRow) =>
        item.reason ? (
          <span className="text-sm max-w-md">{item.reason}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: labels.actionsLabel,
      render: (item: MySubmissionRow) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDrawerTestId(item.id);
            setDrawerOpen(true);
          }}
        >
          <Edit3 className="me-1 h-4 w-4" />
          {labels.reviseAndResubmit}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{labels.mySubmissionsTitle}</h1>
        <p className="text-muted-foreground mt-1">{labels.mySubmissionsSubtitle}</p>
      </div>

      <Tabs defaultValue="awaiting">
        <TabsList>
          <TabsTrigger value="awaiting" className="gap-2">
            {labels.awaitingReview}
            {submitted.length > 0 && (
              <Badge variant="secondary" className="ms-1 h-5 min-w-5 px-1.5">
                {submitted.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="changes" className="gap-2">
            {labels.changesRequested}
            {changesRequested.length > 0 && (
              <Badge variant="destructive" className="ms-1 h-5 min-w-5 px-1.5">
                {changesRequested.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting" className="mt-4">
          {submittedRows.length === 0 ? (
            <ApprovalsEmptyState message={labels.emptySubmissions} />
          ) : (
            <DataTable
              data={submittedRows}
              columns={submittedColumns}
              searchKey="name"
              searchPlaceholder={isRtl ? "البحث..." : "Search..."}
            />
          )}
        </TabsContent>

        <TabsContent value="changes" className="mt-4">
          {changesRows.length === 0 ? (
            <ApprovalsEmptyState message={labels.emptySubmissions} />
          ) : (
            <DataTable
              data={changesRows}
              columns={changesColumns}
              searchKey="name"
              searchPlaceholder={isRtl ? "البحث..." : "Search..."}
              onRowClick={(item) => {
                setDrawerTestId(item.id);
                setDrawerOpen(true);
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      <TestReviewDrawer
        testId={drawerTestId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}