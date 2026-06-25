import { useState } from "react";
import { useParams } from "wouter";
import { mockSamples } from "@/mock-data";
import { SampleHeader } from "@/components/samples/SampleHeader";
import { SampleTabs } from "@/components/samples/SampleTabs";
import { TestDrawer } from "@/components/tests/TestDrawer";
import { AssignAnalystDialog } from "@/components/samples/AssignAnalystDialog";
import { useAppContext } from "@/context/AppContext";
import { toast } from "sonner";

export default function SampleDetail() {
  const { id } = useParams();
  const { language } = useAppContext();
  const isRtl = language === "ar";

  // Manage sample in local state to allow dynamic updates
  const [sample, setSample] = useState(() => {
    return mockSamples.find(s => s.id === id) || mockSamples[0];
  });

  // Dialog States
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const isDrawerOpen = selectedTestId !== null;

  const handleViewTest = (testId: string) => {
    setSelectedTestId(testId);
  };

  const handleCloseDrawer = () => {
    setSelectedTestId(null);
  };

  const selectedTest = sample.tests?.find(t => t.id === selectedTestId);

  // Action Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleGenerateReport = () => {
    toast.info(isRtl ? "جاري إنشاء التقرير..." : "Generating chemical analysis report...", {
      description: isRtl ? "سيتم الانتهاء قريباً" : "This may take a few seconds"
    });

    setTimeout(() => {
      toast.success(isRtl ? "تم إنشاء التقرير بنجاح" : "Report generated successfully!", {
        description: isRtl ? "تم إرساله إلى بريدك الإلكتروني" : "The PDF has been sent to your email."
      });
    }, 2000);
  };

  const handleAssignAnalyst = (analyst: any) => {
    setSample(prev => ({
      ...prev,
      assignedAnalyst: analyst.name
    }));
    setIsAssignOpen(false);
    toast.success(isRtl ? "تم تعيين المحلل" : "Analyst assigned", {
      description: `${isRtl ? "المحلل:" : "Assigned to:"} ${isRtl ? analyst.nameAr : analyst.name}`
    });
  };

  return (
    <div className="flex flex-col h-full overflow-visible">
      <div className="md:px-2">
        <SampleHeader
          sample={sample}
          onPrint={handlePrint}
          onGenerateReport={handleGenerateReport}
          onAssignAnalyst={() => setIsAssignOpen(true)}
        />

        <div className="flex-1">
          <SampleTabs
            sample={sample}
            onViewTest={handleViewTest}
            onAddTest={(newTests) => {
              setSample(prev => ({
                ...prev,
                tests: [...(prev.tests || []), ...newTests],
              }));
            }}
            onUpdateTest={(testId, patch) => {
              setSample(prev => ({
                ...prev,
                tests: (prev.tests || []).map(t =>
                  t.id === testId ? { ...t, ...patch } : t
                ),
              }));
            }}
          />
        </div>
      </div>

      <TestDrawer
        test={selectedTest}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      <AssignAnalystDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssign={handleAssignAnalyst}
        currentAnalyst={sample.assignedAnalyst}
      />
    </div>
  );
}
