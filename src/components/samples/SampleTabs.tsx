import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Beaker,
  Info,
  Paperclip,
  History,
  Activity,
  Plus,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestTable, type TestTableTest } from "@/components/tests/TestTable";
import { AddTestToSampleDialog, type NewSampleTest } from "@/components/samples/AddTestToSampleDialog";
import { ReplicateTestsDialog } from "@/components/samples/ReplicateTestsDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import { SampleTimeline } from "@/components/shared/SampleTimeline";
import type { MockSample } from "@/mock-data/samples";

interface SampleTabsProps {
  sample: MockSample;
  onViewTest: (id: string) => void;
  onAddTest: (tests: NewSampleTest[]) => void;
  onUpdateTest: (testId: string, patch: Partial<TestTableTest>) => void;
  onEditTest?: (testId: string) => void;
  onDeleteTest?: (testId: string) => void;
}

export function SampleTabs({
  sample,
  onViewTest,
  onAddTest,
  onUpdateTest,
  onEditTest,
  onDeleteTest,
}: SampleTabsProps) {
  const { language, currentRole } = useAppContext();
  const isRtl = language === "ar";
  const [isAddTestOpen, setIsAddTestOpen] = useState(false);
  const [isReplicateOpen, setIsReplicateOpen] = useState(false);

  const timelineSteps = [
    { label: "Sample Received", status: "completed" as const, date: sample.receivedDate, actor: "Reception" },
    { label: "Logged in LIMS", status: "completed" as const, date: sample.receivedDate, actor: "System" },
    { label: "Assigned to Analyst", status: sample.assignedAnalyst ? "completed" as const : "pending" as const, date: sample.assignedAnalyst ? sample.receivedDate : undefined, actor: sample.assignedAnalyst || undefined },
    { label: "Testing in Progress", status: sample.status === "Testing" ? "current" as const : (sample.status === "Review" || sample.status === "Approved" ? "completed" as const : "pending" as const) },
    { label: "Results Review", status: sample.status === "Review" ? "current" as const : (sample.status === "Approved" ? "completed" as const : "pending" as const) },
    { label: "Final Approval", status: sample.status === "Approved" ? "completed" as const : "pending" as const, date: sample.completedDate || undefined },
  ];

  return (
    <Tabs defaultValue="tests" className="w-full" dir={isRtl ? "rtl" : "ltr"}>
      <TabsList className="mb-6 h-12 p-1 bg-muted/50 w-full justify-start gap-2 border">
        <TabsTrigger value="tests" className="gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Beaker className="w-4 h-4" />
          {isRtl ? "الاختبارات" : "Tests"}
        </TabsTrigger>
        <TabsTrigger value="info" className="gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Info className="w-4 h-4" />
          {isRtl ? "معلومات العينة" : "Sample Information"}
        </TabsTrigger>
        <TabsTrigger value="attachments" className="gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Paperclip className="w-4 h-4" />
          {isRtl ? "المرفقات" : "Attachments"}
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2 px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <History className="w-4 h-4" />
          {isRtl ? "سجل المراجعة" : "Audit Trail"}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tests" className="space-y-6 animate-in fade-in-50 duration-300">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Beaker className="w-4 h-4" />
              {isRtl ? "قائمة الاختبارات" : "Test List"}
              <span className="text-[10px] font-mono text-muted-foreground/70">
                ({sample.tests?.length ?? 0})
              </span>
            </h3>
            {currentRole !== "client" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReplicateOpen(true)}
                  disabled={(sample.tests?.length ?? 0) === 0}
                  title={
                    (sample.tests?.length ?? 0) === 0
                      ? isRtl
                        ? "لا توجد اختبارات لتكرارها"
                        : "No tests to replicate"
                      : isRtl
                        ? "تكرار هذه الاختبارات إلى عينات أخرى"
                        : "Replicate these tests to other samples"
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {isRtl ? "تكرار إلى عينات أخرى" : "Replicate to Samples"}
                </Button>
                <Button size="sm" onClick={() => setIsAddTestOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isRtl ? "إضافة اختبار" : "Add Test"}
                </Button>
              </div>
            )}
          </div>
          <TestTable
            tests={sample.tests || []}
            onViewTest={onViewTest}
            onUpdateTest={onUpdateTest}
            onEditTest={onEditTest}
            onDeleteTest={onDeleteTest}
          />
        </div>
      </TabsContent>

      <TabsContent value="info" className="space-y-6 animate-in fade-in-50 duration-300">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                {isRtl ? "التعريف" : "Identification"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "رقم الدفعة" : "BATCH / LOT NUMBER"}</p>
                <p className="text-sm font-medium">B-2024-X-99</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "المصدر" : "SOURCE"}</p>
                <p className="text-sm font-medium">Production Line 4</p>
              </div>
               <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "ظروف التخزين" : "STORAGE CONDITIONS"}</p>
                <p className="text-sm font-medium">Refrigerated (2-8°C)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                {isRtl ? "جمع العينات" : "Collection Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "تاريخ الجمع" : "COLLECTION DATE"}</p>
                <p className="text-sm font-medium">2024-01-14 10:30 AM</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "جمع بواسطة" : "COLLECTED BY"}</p>
                <p className="text-sm font-medium">Mohammed Al-Ali</p>
              </div>
               <div>
                <p className="text-xs text-muted-foreground font-semibold">{isRtl ? "طريقة الجمع" : "COLLECTION METHOD"}</p>
                <p className="text-sm font-medium">Standard Athermal Sampling</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="attachments" className="animate-in fade-in-50 duration-300">
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="h-64 flex flex-col items-center justify-center text-center p-6">
            <Paperclip className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground mb-4">
              {isRtl ? "اسحب وأسقط الملفات هنا للتحميل" : "Drag & drop files here to upload documentation"}
            </p>
            <Button variant="outline">{isRtl ? "إضافة مرفق" : "Select Files"}</Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="audit" className="animate-in fade-in-50 duration-300">
        <Card>
          <CardContent className="pt-6">
            <SampleTimeline steps={timelineSteps} />
          </CardContent>
        </Card>
      </TabsContent>

      <AddTestToSampleDialog
        isOpen={isAddTestOpen}
        onClose={() => setIsAddTestOpen(false)}
        onAdd={(newTests) => {
          onAddTest(newTests);
          setIsAddTestOpen(false);
        }}
        sampleId={sample.id}
      />

      <ReplicateTestsDialog
        sourceSample={sample}
        isOpen={isReplicateOpen}
        onClose={() => setIsReplicateOpen(false)}
      />
    </Tabs>
  );
}
