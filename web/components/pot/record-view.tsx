"use client";

import { useEffect } from "react";
import { recordNoteView } from "@/app/p/[potId]/n/[noteId]/actions";

export function RecordView({ potId, noteId }: { potId: string; noteId: string }) {
  useEffect(() => {
    void recordNoteView(potId, noteId);
  }, [potId, noteId]);
  return null;
}
