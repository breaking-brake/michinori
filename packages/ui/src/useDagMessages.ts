import { useCallback, useState } from "react";
import type { DagMessage, ChatMessage } from "./types";
import type { DagNodeType, DagDerivedType } from "@michinori/shared";

export interface DagState {
  nodes: DagNodeType[];
  derived: DagDerivedType | null;
  loading: boolean;
  error: string | null;
  hasDag: boolean;
  calendarPreset: string;
  customDayOff: string[];
  customDayOn: string[];
  chatMessages: ChatMessage[];
  chatLoading: boolean;
}

const INITIAL_STATE: DagState = {
  nodes: [],
  derived: null,
  loading: false,
  error: null,
  hasDag: false,
  calendarPreset: "weekday",
  customDayOff: [],
  customDayOn: [],
  chatMessages: [],
  chatLoading: false,
};

export function useDagMessages() {
  const [state, setState] = useState<DagState>(INITIAL_STATE);

  const dispatch = useCallback((msg: DagMessage) => {
    switch (msg.type) {
      case "dagUpdate":
        setState((prev) => ({
          ...prev,
          nodes: msg.nodes,
          derived: msg.derived,
          hasDag: msg.nodes.length > 0,
          error: null,
          calendarPreset: msg.calendar?.preset ?? prev.calendarPreset,
          customDayOff: msg.calendar?.customDayOff ?? prev.customDayOff,
          customDayOn: msg.calendar?.customDayOn ?? prev.customDayOn,
        }));
        break;
      case "loading":
        setState((prev) => ({ ...prev, loading: msg.loading }));
        break;
      case "error":
        setState((prev) => ({ ...prev, error: msg.message }));
        break;
      case "chatResponse":
        setState((prev) => ({
          ...prev,
          chatMessages: [
            ...prev.chatMessages,
            { role: "assistant" as const, content: msg.message, proposal: msg.proposal ?? undefined },
          ],
          chatLoading: false,
        }));
        break;
      case "chatLoading":
        setState((prev) => ({ ...prev, chatLoading: msg.loading }));
        break;
    }
  }, []);

  const addUserChatMessage = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, { role: "user" as const, content }],
    }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, dispatch, addUserChatMessage, reset };
}
