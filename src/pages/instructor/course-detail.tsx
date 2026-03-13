import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  File,
  Clock,
  AlertCircle,
  Layers,
  Upload,
  ChevronDown,
  ChevronRight,
  Eye,
} from "lucide-react";

import { InstructorLayout } from "@/components/layout/instructor-layout";
import { TicketDetailSheet } from "@/components/ticket-detail-sheet";
import {
  useInstructorCourseDetail,
  type InstructorCourseMaterial,
  type InstructorSprintWithTickets,
  useUploadCourseMaterial,
  useCreateSprint,
} from "@/hooks/use-app-data";
import { useGenerateSprintTickets } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type SprintCardProps = {
  courseId: string;
  sprint: InstructorSprintWithTickets;
  materials: InstructorCourseMaterial[];
  onTicketClick?: (ticketId: string) => void;
};

function SprintCard({ courseId, sprint, materials, onTicketClick }: SprintCardProps) {
  const generateSprintTickets = useGenerateSprintTickets(courseId, sprint.id);
  const isGenerating = generateSprintTickets.status === "pending";

  const [showMaterials, setShowMaterials] = useState(false);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

  useEffect(() => {
    const ids = materials.map((m) => m.id);
    setSelectedMaterialIds(ids);
  }, [materials]);

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAllMaterials = () => setSelectedMaterialIds(materials.map((m) => m.id));
  const deselectAllMaterials = () => setSelectedMaterialIds([]);

  const handleGenerateTickets = () => {
    if (materials.length === 0) return;
    if (selectedMaterialIds.length === 0) return;
    const mode =
      sprint.tickets.length > 0 ? "regenerate_all" : "initial";
    generateSprintTickets.mutate({ mode, materialIds: selectedMaterialIds });
  };

  const noMaterials = materials.length === 0;
  const noSelection = selectedMaterialIds.length === 0;

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {sprint.orderIndex}
          </div>
          <div>
            <CardTitle className="text-sm md:text-base leading-tight">
              {sprint.title}
            </CardTitle>
            {sprint.description && (
              <p className="text-xs text-slate-500 mt-1">
                {sprint.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500"
          >
            <Layers className="w-3 h-3" /> {sprint.tickets.length} tickets
          </Badge>
          <Button
            type="button"
            size="sm"
            className="inline-flex items-center gap-1 text-[11px]"
            disabled={isGenerating || noMaterials || noSelection}
            onClick={handleGenerateTickets}
          >
            <Upload className="w-3 h-3" />
            {isGenerating
              ? "Generating..."
              : sprint.tickets.length > 0
                ? "Regenerate tickets"
                : "Generate tickets"}
          </Button>
          {noMaterials && (
            <p className="text-[10px] text-amber-600 max-w-xs text-right">
              Upload materials in the left panel first.
            </p>
          )}
          {!noMaterials && noSelection && (
            <p className="text-[10px] text-amber-600 max-w-xs text-right">
              Select at least one material below.
            </p>
          )}
          {generateSprintTickets.isError && (
            <p className="text-[10px] text-red-600 max-w-xs text-right">
              {(generateSprintTickets.error as Error)?.message ??
                "Something went wrong while generating tickets."}
            </p>
          )}
        </div>
      </CardHeader>
      {materials.length > 0 && (
        <CardContent className="pt-0 pb-3 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setShowMaterials((p) => !p)}
            className="flex items-center gap-2 w-full text-left text-xs font-medium text-slate-600 hover:text-slate-900 py-1.5"
          >
            {showMaterials ? (
              <ChevronDown className="w-4 h-4 shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0" />
            )}
            Materials for this sprint ({selectedMaterialIds.length}/{materials.length} selected)
          </button>
          {showMaterials && (
            <div className="mt-2 pl-6 space-y-2">
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllMaterials}
                  className="text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllMaterials}
                  className="text-slate-500 hover:underline"
                >
                  Deselect all
                </button>
              </div>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <Checkbox
                      id={`sprint-${sprint.id}-mat-${m.id}`}
                      checked={selectedMaterialIds.includes(m.id)}
                      onCheckedChange={() => toggleMaterial(m.id)}
                    />
                    <label
                      htmlFor={`sprint-${sprint.id}-mat-${m.id}`}
                      className="cursor-pointer truncate flex-1"
                    >
                      {m.title}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
      <CardContent className="pt-0 space-y-2">
        {sprint.tickets.map((t) => (
          <div
            key={t.id}
            role={onTicketClick ? "button" : undefined}
            tabIndex={onTicketClick ? 0 : undefined}
            onClick={() => onTicketClick?.(t.id)}
            onKeyDown={(e) => {
              if (onTicketClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onTicketClick(t.id);
              }
            }}
            className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60 ${onTicketClick ? "cursor-pointer hover:bg-slate-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1" : ""}`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 flex-shrink-0">
                {t.isUrgent ? (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <span className="truncate">{t.title}</span>
                  {onTicketClick && (
                    <Eye className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" aria-hidden />
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                  {t.type && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 rounded-md border-slate-200"
                    >
                      {t.type}
                    </Badge>
                  )}
                  {t.durationEstimateMinutes != null && (
                    <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      <Clock className="w-3 h-3" />
                      ~{t.durationEstimateMinutes} mins
                    </span>
                  )}
                  {t.isUrgent && (
                    <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      Urgent
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function InstructorCourseDetail() {
  const [, params] = useRoute("/instructor/courses/:id");
  const courseId = params?.id ?? null;

  const { data, isLoading } = useInstructorCourseDetail(courseId);
  const uploadMutation = useUploadCourseMaterial();
  const createSprintMutation = useCreateSprint();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [newSprintTitle, setNewSprintTitle] = useState("");
  const [newSprintDescription, setNewSprintDescription] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openTicketDetail = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setSheetOpen(true);
  };
  const closeTicketDetail = () => {
    setSheetOpen(false);
    setSelectedTicketId(null);
  };
  const [showSprintForm, setShowSprintForm] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setSelectedFiles(files);
    if (files.length === 1 && !materialTitle) {
      const baseName = files[0].name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_\-.]+/g, " ");
      setMaterialTitle(baseName);
    }
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseId || !selectedFiles.length || uploadMutation.status === "pending") return;

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const isFirst = index === 0;
      // Trigger ticket generation only once, on the first file in the batch.
      await uploadMutation.mutateAsync({
        courseId,
        file,
        title: materialTitle || undefined,
        description: materialDescription || undefined,
        shouldTriggerGeneration: isFirst,
      });
    }

    setSelectedFiles([]);
    setMaterialTitle("");
    setMaterialDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateSprint = async (event: FormEvent) => {
    event.preventDefault();
    if (!courseId) return;
    if (createSprintMutation.status === "pending") return;

    await createSprintMutation.mutateAsync({
      courseId,
      title: newSprintTitle,
      description: newSprintDescription || undefined,
      orderIndex: data?.sprints.length ?? 0,
    });

    setNewSprintTitle("");
    setNewSprintDescription("");
    setShowSprintForm(false);
  };

  const renderMaterials = (materials: InstructorCourseMaterial[]) => {
    if (!materials.length) {
      return (
        <Card className="border-dashed border-slate-200 bg-slate-50/60">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                No course materials uploaded yet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Upload PDFs, slides, or links in your content tools. Once
                available, Fieldwork will use them to generate realistic work
                tickets.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {materials.map((m) => (
          <Card
            key={m.id}
            className="border-slate-200 hover:shadow-sm transition-shadow"
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="mt-1">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {m.title}
                  </p>
                  {m.fileType && (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-wide text-slate-500"
                    >
                      {m.fileType}
                    </Badge>
                  )}
                </div>
                {m.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {m.description}
                  </p>
                )}
                {m.fileUrl && (
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <File className="w-3 h-3" /> Open material
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <InstructorLayout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
        {isLoading || !data ? (
          <>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-10 w-2/3 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/instructor/courses"
                className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to courses
              </Link>
              <Badge variant="outline" className="text-xs text-slate-500">
                Instructor view
              </Badge>
            </div>

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden"
            >
              <div className="absolute inset-y-0 right-[-40%] w-1/2 bg-primary/3 pointer-events-none" />
              <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {data.category && (
                    <Badge className="bg-primary text-primary-foreground">
                      {data.category}
                    </Badge>
                  )}
                  {data.difficulty && (
                    <Badge
                      variant="outline"
                      className="border-slate-200 text-slate-600"
                    >
                      {data.difficulty}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 leading-tight">
                  {data.title}
                </h1>
                {data.description && (
                  <p className="text-sm text-slate-600 max-w-2xl">
                    {data.description}
                  </p>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="space-y-4 lg:col-span-1">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Course Materials
                </h2>

                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-900">
                      Upload new material
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={handleUpload}
                      className="space-y-3"
                    >
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-slate-600">
                          File
                        </label>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.ppt,.pptx,.doc,.docx,.md,.txt"
                          onChange={handleFileChange}
                          className="text-xs"
                        />
                        <p className="text-[11px] text-slate-500">
                          Upload one or many PDFs, slides, docs, or text files in a single batch. We&apos;ll use them to generate realistic work tickets.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">
                          Title
                        </label>
                        <Input
                          type="text"
                          value={materialTitle}
                          onChange={(e) => setMaterialTitle(e.target.value)}
                          placeholder="e.g. Week 1 - Onboarding overview"
                          className="text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-600">
                          Description <span className="text-slate-400">(optional)</span>
                        </label>
                        <Textarea
                          value={materialDescription}
                          onChange={(e) =>
                            setMaterialDescription(e.target.value)
                          }
                          placeholder="Short summary of what this material covers."
                          className="text-xs min-h-[72px]"
                        />
                      </div>

                      {uploadMutation.isError && (
                        <p className="text-xs text-red-600">
                          {(uploadMutation.error as Error)?.message ??
                            "Something went wrong while uploading. Please try again."}
                        </p>
                      )}

                      {uploadMutation.data?.generationResult && (
                        <p className="text-xs text-emerald-600">
                          Tickets are being generated for this course based on your materials.
                        </p>
                      )}

                      <Button
                        type="submit"
                        size="sm"
                        className="w-full inline-flex items-center justify-center gap-2"
                        disabled={!selectedFiles.length || uploadMutation.status === "pending"}
                      >
                        <Upload className="w-4 h-4" />
                        {uploadMutation.status === "pending"
                          ? "Uploading..."
                          : "Upload & generate tickets"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {renderMaterials(data.materials)}
              </div>
              <div className="space-y-4 lg:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Work Sprints &amp; Tickets
                  </h2>
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="inline-flex items-center gap-2"
                      onClick={() => setShowSprintForm((prev) => !prev)}
                    >
                      <Layers className="w-4 h-4" />
                      {showSprintForm ? "Cancel" : "Add sprint"}
                    </Button>
                    {createSprintMutation.isError && (
                      <p className="text-[11px] text-red-600">
                        {(createSprintMutation.error as Error)?.message ??
                          "Something went wrong while creating the sprint. Please try again."}
                      </p>
                    )}
                  </div>
                </div>

                {showSprintForm && (
                  <Card className="border-slate-200 bg-slate-50/80">
                    <CardContent className="pt-4 space-y-3">
                      <form onSubmit={handleCreateSprint} className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">
                            Sprint title
                          </label>
                          <Input
                            type="text"
                            value={newSprintTitle}
                            onChange={(e) => setNewSprintTitle(e.target.value)}
                            placeholder="e.g. Week 1 - Onboarding sprint"
                            className="text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-600">
                            Description{" "}
                            <span className="text-slate-400">(optional)</span>
                          </label>
                          <Textarea
                            value={newSprintDescription}
                            onChange={(e) =>
                              setNewSprintDescription(e.target.value)
                            }
                            placeholder="What work is covered in this sprint?"
                            className="text-xs min-h-[72px]"
                          />
                        </div>
                        <Button
                          type="submit"
                          size="sm"
                          className="inline-flex items-center gap-2"
                          disabled={
                            !newSprintTitle.trim() ||
                            createSprintMutation.status === "pending"
                          }
                        >
                          <Layers className="w-4 h-4" />
                          {createSprintMutation.status === "pending"
                            ? "Creating sprint..."
                            : "Create sprint"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {!data.sprints.length ? (
                  <Card className="border-dashed border-slate-200 bg-slate-50/60">
                    <CardContent className="p-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          No sprints yet
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Create one or more sprints for this course first. Then you can ask the AI to generate realistic tickets for each sprint.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {data.sprints.map((sprint) => (
                      <SprintCard
                        key={sprint.id}
                        courseId={data.id}
                        sprint={sprint}
                        materials={data.materials}
                        onTicketClick={openTicketDetail}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {courseId && (
        <TicketDetailSheet
          open={sheetOpen}
          onOpenChange={closeTicketDetail}
          courseId={courseId}
          ticketId={selectedTicketId}
          variant="instructor"
          courseTitle={data?.title}
        />
      )}
    </InstructorLayout>
  );
}

