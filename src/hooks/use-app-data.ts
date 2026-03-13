import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockUser, mockCourses, Ticket } from "@/lib/mock-data";
import type { InstructorCourse } from "@/lib/instructor-data";
import type { User } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase-client";
import { useAuth } from "@/contexts/AuthContext";
import {
  generateTicketsForCourseApi,
  useGenerateSprintTickets,
} from "@/lib/api/ai";

// When Supabase auth is configured and user is logged in, use real user + profile.
// Otherwise fall back to mock data for demo/prototype.

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function mapAuthToUser(
  userId: string,
  email: string | undefined,
  profile: { full_name: string; degree: string | null; institution: string | null; current_streak: number; best_streak: number }
): User {
  return {
    id: userId,
    name: profile.full_name || email || "User",
    email: email ?? "",
    degree: profile.degree ?? "",
    institution: profile.institution ?? "",
    joinDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    currentStreak: profile.current_streak,
    bestStreak: profile.best_streak,
    feeRefunded: 0,
    feeTotal: 0,
    ticketsCompleted: 0,
    certificates: [],
  };
}

export function useUser() {
  const { user: authUser, profile } = useAuth();
  const isAuthenticated = !!authUser && !!profile;

  return useQuery({
    queryKey: ["user", authUser?.id ?? "anonymous"],
    queryFn: async (): Promise<User> => {
      if (isAuthenticated && authUser && profile) {
        return mapAuthToUser(authUser.id, authUser.email, profile);
      }
      await delay(400);
      return mockUser;
    },
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      await delay(500);
      return mockCourses;
    }
  });
}

export function useEnrolledCourses() {
  return useQuery({
    queryKey: ['courses', 'enrolled'],
    queryFn: async () => {
      await delay(300);
      return mockCourses.filter(c => c.isEnrolled);
    }
  });
}

export function useInstructorCourses() {
  return useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: async () => {
      // If Supabase is not configured, fall back to an empty list.
      if (!supabase) {
        return [] as InstructorCourse[];
      }

      await delay(300);

      const { data, error } = await supabase
        .from('courses')
        .select(
          'id,title,category,difficulty,status,total_sprints,total_tickets,avg_rating,company_partner',
        )
        .neq('status', 'archived');

      if (error) {
        // eslint-disable-next-line no-console
        console.error('[useInstructorCourses] Failed to load courses', error);
        return [] as InstructorCourse[];
      }

      return (data ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        status:
          c.status === 'live'
            ? 'Live'
            : c.status === 'under_review'
              ? 'Under Review'
              : 'Draft',
        studentsEnrolled: 0,
        sprints: c.total_sprints ?? 0,
        tickets: c.total_tickets ?? 0,
        completionRate: 0,
        avgRating: Number(c.avg_rating ?? 0),
        earnedToDate: 0,
        companyPartner: c.company_partner,
      })) as InstructorCourse[];
    },
  });
}

export interface InstructorCourseMaterial {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileType: string | null;
  orderIndex: number;
}

export interface InstructorTicketSummary {
  id: string;
  title: string;
  type: string | null;
  durationEstimateMinutes: number | null;
  isUrgent: boolean;
  orderIndex: number;
}

export interface InstructorSprintWithTickets {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  tickets: InstructorTicketSummary[];
}

export interface InstructorCourseDetailData {
  id: string;
  title: string;
  category: string | null;
  difficulty: string | null;
  description: string | null;
  materials: InstructorCourseMaterial[];
  sprints: InstructorSprintWithTickets[];
}

export interface CreateSprintPayload {
  courseId: string;
  title: string;
  description?: string;
  orderIndex?: number;
}

export interface AssignMaterialsToSprintPayload {
  courseId: string;
  sprintId: string;
  materialIds: string[];
}

export interface UploadCourseMaterialPayload {
  courseId: string;
  file: File;
  title?: string;
  description?: string;
  shouldTriggerGeneration?: boolean;
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      title,
      description,
      orderIndex,
    }: CreateSprintPayload) => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Cannot create sprint.",
        );
      }

      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new Error("Sprint title is required.");
      }

      const { data, error } = await supabase
        .from("sprints")
        .insert({
          course_id: courseId,
          title: trimmedTitle,
          description: description?.trim() || null,
          order_index: orderIndex ?? 0,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(
          error?.message ?? "Failed to create sprint.",
        );
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["instructor", "course-detail", variables.courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["instructor", "courses"],
      });
    },
  });
}

export function useUploadCourseMaterial() {
  const queryClient = useQueryClient();

  const mapFileToMaterialType = (file: File): 'pdf' | 'video' | 'doc' | 'link' | 'other' => {
    const mime = (file.type || '').toLowerCase();
    const name = file.name.toLowerCase();

    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';

    if (mime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi')) {
      return 'video';
    }

    if (
      mime === 'application/msword' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mime === 'application/vnd.ms-powerpoint' ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      name.endsWith('.doc') ||
      name.endsWith('.docx') ||
      name.endsWith('.ppt') ||
      name.endsWith('.pptx')
    ) {
      return 'doc';
    }

    if (mime === 'text/html' || mime === 'application/xhtml+xml' || name.endsWith('.html') || name.endsWith('.htm')) {
      return 'link';
    }

    return 'other';
  };

  return useMutation({
    mutationFn: async ({
      courseId,
      file,
      title,
      description,
      shouldTriggerGeneration,
    }: UploadCourseMaterialPayload) => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Cannot upload course materials.",
        );
      }

      const existingDetail =
        queryClient.getQueryData<InstructorCourseDetailData | null>([
          "instructor",
          "course-detail",
          courseId,
        ]) ?? null;

      const hadNoMaterials =
        !existingDetail || (existingDetail.materials?.length ?? 0) === 0;
      const hadNoSprints =
        !existingDetail || (existingDetail.sprints?.length ?? 0) === 0;

      const baseName =
        title?.trim() ||
        file.name.replace(/\.[^/.]+$/, "").replace(/[_\-.]+/g, " ");

      const timestamp = Date.now();
      const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${courseId}/${timestamp}-${safeFilename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError || !uploadData) {
        throw new Error(
          uploadError?.message ?? "Failed to upload course material file.",
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("course-materials")
        .getPublicUrl(uploadData.path);

      const fileUrl = publicUrlData.publicUrl;

      const orderIndex =
        (existingDetail?.materials?.length ?? 0) > 0
          ? (existingDetail?.materials?.length ?? 0)
          : 0;

      const { data: insertedMaterials, error: insertError } = await supabase
        .from("course_materials")
        .insert({
          course_id: courseId,
          title: baseName,
          description: description?.trim() || null,
          file_url: fileUrl,
          file_type: mapFileToMaterialType(file),
          order_index: orderIndex,
        })
        .select("*");

      if (insertError || !insertedMaterials || !insertedMaterials[0]) {
        throw new Error(
          insertError?.message ??
            "Failed to save course material metadata in the database.",
        );
      }

      let generationResult: Awaited<
        ReturnType<typeof generateTicketsForCourseApi>
      > | null = null;

      if (shouldTriggerGeneration && hadNoMaterials && hadNoSprints) {
        try {
          generationResult = await generateTicketsForCourseApi(courseId, {
            mode: "initial",
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            "[useUploadCourseMaterial] Failed to auto-generate tickets",
            err,
          );
        }
      }

      return {
        material: insertedMaterials[0],
        generationResult,
      };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["instructor", "course-detail", variables.courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["instructor", "courses"],
      });
    },
  });
}

export function useAssignMaterialsToSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      sprintId,
      materialIds,
    }: AssignMaterialsToSprintPayload) => {
      if (!supabase) {
        throw new Error(
          "Supabase is not configured. Cannot assign materials to sprint.",
        );
      }

      const { error: clearError } = await supabase
        .from("course_materials")
        .update({}) // no-op to satisfy type, actual mapping handled via separate join table if added
        .eq("course_id", courseId);

      if (clearError) {
        // eslint-disable-next-line no-console
        console.error(
          "[useAssignMaterialsToSprint] Failed to clear existing sprint-material mapping",
          clearError,
        );
      }

      if (materialIds.length === 0) {
        return;
      }

      const { error: updateError } = await supabase
        .from("course_materials")
        .update({}) // placeholder, real mapping should be implemented via schema changes
        .in("id", materialIds);

      if (updateError) {
        throw new Error(
          updateError.message ??
            "Failed to assign materials to sprint.",
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "instructor",
          "course-detail",
          variables.courseId,
        ],
      });
    },
  });
}

export function useInstructorCourseDetail(courseId: string | null) {
  return useQuery({
    queryKey: ["instructor", "course-detail", courseId],
    enabled: !!courseId && !!supabase,
    queryFn: async (): Promise<InstructorCourseDetailData | null> => {
      if (!supabase || !courseId) return null;

      const client = supabase;

      const [
        { data: course, error: courseError },
        { data: materials, error: materialsError },
        { data: sprints, error: sprintsError },
        { data: tickets, error: ticketsError },
      ] = await Promise.all([
        client
          .from("courses")
          .select("id, title, category, difficulty, description")
          .eq("id", courseId)
          .single(),
        client
          .from("course_materials")
          .select("id, title, description, file_url, file_type, order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true }),
        client
          .from("sprints")
          .select("id, title, description, order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true }),
        client
          .from("tickets")
          .select(
            "id, title, type, duration_estimate_minutes, is_urgent, order_index, sprint_id",
          )
          .eq("course_id", courseId)
          .order("order_index", { ascending: true }),
      ]);

      if (courseError || !course) {
        // eslint-disable-next-line no-console
        console.error("[useInstructorCourseDetail] Failed to load course", courseError);
        return null;
      }

      if (materialsError) {
        // eslint-disable-next-line no-console
        console.error(
          "[useInstructorCourseDetail] Failed to load materials",
          materialsError,
        );
      }

      if (sprintsError) {
        // eslint-disable-next-line no-console
        console.error(
          "[useInstructorCourseDetail] Failed to load sprints",
          sprintsError,
        );
      }

      if (ticketsError) {
        // eslint-disable-next-line no-console
        console.error(
          "[useInstructorCourseDetail] Failed to load tickets",
          ticketsError,
        );
      }

      const materialsMapped: InstructorCourseMaterial[] = (materials ?? []).map(
        (m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description ?? null,
          fileUrl: m.file_url ?? null,
          fileType: m.file_type ?? null,
          orderIndex: m.order_index ?? 0,
        }),
      );

      const ticketsBySprintId = new Map<string, InstructorTicketSummary[]>();
      (tickets ?? []).forEach((t: any) => {
        const list = ticketsBySprintId.get(t.sprint_id) ?? [];
        list.push({
          id: t.id,
          title: t.title,
          type: t.type ?? null,
          durationEstimateMinutes: t.duration_estimate_minutes ?? null,
          isUrgent: !!t.is_urgent,
          orderIndex: t.order_index ?? 0,
        });
        ticketsBySprintId.set(t.sprint_id, list);
      });

      const sprintsMapped: InstructorSprintWithTickets[] = (sprints ?? []).map(
        (s: any) => {
          const sprintTickets = (ticketsBySprintId.get(s.id) ?? []).sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );
          return {
            id: s.id,
            title: s.title,
            description: s.description ?? null,
            orderIndex: s.order_index ?? 0,
            tickets: sprintTickets,
          };
        },
      );

      return {
        id: course.id,
        title: course.title,
        category: course.category ?? null,
        difficulty: course.difficulty ?? null,
        description: course.description ?? null,
        materials: materialsMapped,
        sprints: sprintsMapped,
      };
    },
  });
}

export interface TicketDetailData {
  title: string;
  type: string | null;
  durationEstimate: string;
  isUrgent: boolean;
  scenario: string | null;
  deliverables: string[];
}

/** Fetch a single ticket's scenario and deliverables (for instructor Supabase path). */
export function useInstructorTicketDetail(
  courseId: string | null,
  ticketId: string | null
) {
  return useQuery({
    queryKey: ["instructor", "ticket-detail", courseId, ticketId],
    enabled: !!courseId && !!ticketId && !!supabase,
    queryFn: async (): Promise<TicketDetailData | null> => {
      if (!supabase || !ticketId) return null;

      const [
        { data: ticket, error: ticketError },
        { data: scenarioRow, error: scenarioError },
        { data: deliverableRows, error: deliverablesError },
      ] = await Promise.all([
        supabase
          .from("tickets")
          .select("id, title, type, duration_estimate_minutes, is_urgent")
          .eq("id", ticketId)
          .single(),
        supabase
          .from("ticket_scenarios")
          .select("scenario_text")
          .eq("ticket_id", ticketId)
          .maybeSingle(),
        supabase
          .from("ticket_deliverables")
          .select("description, order_index")
          .eq("ticket_id", ticketId)
          .order("order_index", { ascending: true }),
      ]);

      if (ticketError || !ticket) {
        // eslint-disable-next-line no-console
        console.error("[useInstructorTicketDetail] Failed to load ticket", ticketError);
        return null;
      }
      if (scenarioError) {
        // eslint-disable-next-line no-console
        console.error("[useInstructorTicketDetail] Failed to load scenario", scenarioError);
      }
      if (deliverablesError) {
        // eslint-disable-next-line no-console
        console.error("[useInstructorTicketDetail] Failed to load deliverables", deliverablesError);
      }

      const scenario =
        scenarioRow?.scenario_text ?? null;
      const deliverables = (deliverableRows ?? []).map(
        (r: { description: string }) => r.description
      );

      const mins = ticket.duration_estimate_minutes ?? 0;
      const durationEstimate =
        mins >= 60
          ? `${Math.floor(mins / 60)} h ${mins % 60} min`
          : `${mins} mins`;

      return {
        title: ticket.title,
        type: ticket.type ?? null,
        durationEstimate,
        isUrgent: !!ticket.is_urgent,
        scenario,
        deliverables,
      };
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    queryFn: async () => {
      await delay(400);
      const course = mockCourses.find(c => c.id === id);
      if (!course) throw new Error("Course not found");
      return course;
    }
  });
}

export function useTicket(
  courseId: string,
  ticketId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['courses', courseId, 'tickets', ticketId],
    enabled: options?.enabled !== false && !!ticketId,
    queryFn: async () => {
      await delay(300);
      const course = mockCourses.find(c => c.id === courseId);
      if (!course) throw new Error("Course not found");
      
      let foundTicket: Ticket | undefined;
      for (const sprint of course.sprints) {
        const t = sprint.tickets.find(t => t.id === ticketId);
        if (t) foundTicket = t;
      }
      
      if (!foundTicket) throw new Error("Ticket not found");
      return foundTicket;
    }
  });
}

export function useSubmitTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, ticketId, content }: { courseId: string, ticketId: string, content: string }) => {
      await delay(1200); // Simulate upload/processing
      return { success: true, xpEarned: 150 };
    },
    onSuccess: (_, variables) => {
      // In a real app we'd invalidate queries here
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  });
}
