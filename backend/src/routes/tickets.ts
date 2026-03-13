import { Router } from "express";
import { getSupabaseClient } from "../supabaseClient.js";
import { HttpError } from "../errors.js";
import {
  generateTicketsForCourseId,
  generateTicketsForSprintId,
} from "../services/ticketGenerationService.js";
import {
  gradeAttemptForTicket,
} from "../services/ticketGradingService.js";

export const ticketsRouter = Router();

ticketsRouter.post("/generate", async (req, res) => {
  try {
    const courseId = (req.query.courseId as string | undefined) ??
      (req.body?.courseId as string | undefined);
    const modeParam =
      (req.query.mode as string | undefined) ??
      (req.body?.mode as string | undefined) ?? "initial";
    const targetTicketCountParam =
      (req.query.targetTicketCount as string | undefined) ??
      (req.body?.targetTicketCount as string | undefined);

    if (!courseId) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Missing courseId parameter.",
        },
      });
    }

    const mode = modeParam as
      | "initial"
      | "regenerate_all"
      | "append";

    const targetTicketCount = targetTicketCountParam
      ? Number(targetTicketCountParam)
      : undefined;

    const supabase = getSupabaseClient();

    const result = await generateTicketsForCourseId(supabase, {
      courseId,
      mode,
      targetTicketCount,
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }

    // eslint-disable-next-line no-console
    console.error("generate tickets error", (err as Error)?.message ?? err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected error generating tickets.",
      },
    });
  }
});

ticketsRouter.post(["/generate-for-sprint", "/generate-for-sprint/"], async (req, res) => {
  try {
    const sprintId =
      (req.query.sprintId as string | undefined) ??
      (req.body?.sprintId as string | undefined);
    const courseId =
      (req.query.courseId as string | undefined) ??
      (req.body?.courseId as string | undefined);
    let materialIds = req.body?.materialIds;
    if (materialIds != null && !Array.isArray(materialIds)) {
      materialIds = [materialIds] as string[];
    }
    if (Array.isArray(materialIds) && materialIds.length === 0) {
      materialIds = undefined;
    }
    const modeParam =
      (req.query.mode as string | undefined) ??
      (req.body?.mode as string | undefined) ??
      "initial";
    const targetTicketCountParam =
      (req.query.targetTicketCount as string | undefined) ??
      (req.body?.targetTicketCount as string | undefined);

    if (!sprintId || !courseId) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Missing sprintId or courseId parameter.",
        },
      });
    }

    const mode = modeParam as "initial" | "regenerate_all" | "append";

    const targetTicketCount = targetTicketCountParam
      ? Number(targetTicketCountParam)
      : undefined;

    const supabase = getSupabaseClient();

    const result = await generateTicketsForSprintId(supabase, {
      courseId,
      sprintId,
      mode,
      targetTicketCount,
      materialIds,
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }

    const message = (err as Error)?.message ?? "Unexpected error generating tickets for sprint.";
    // eslint-disable-next-line no-console
    console.error("generate tickets for sprint error", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message,
      },
    });
  }
});

ticketsRouter.post("/grade", async (req, res) => {
  try {
    const ticketId = req.body?.ticketId as string | undefined;
    const attemptId = req.body?.attemptId as string | undefined;

    if (!ticketId || !attemptId) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message:
            "ticketId and attemptId are required in the request body.",
        },
      });
    }

    const supabase = getSupabaseClient();

    const result = await gradeAttemptForTicket(supabase, {
      ticketId,
      attemptId,
    });

    return res.status(200).json({ data: result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
    }

    // eslint-disable-next-line no-console
    console.error("grade attempt error", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected error grading attempt.",
      },
    });
  }
});

