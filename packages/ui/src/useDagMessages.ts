import { useCallback, useRef, useState } from "react";
import type { DagMessage } from "./types";
import type { DagNodeType, DagDerivedType } from "@michinori/shared";

export interface DagState {
  nodes: DagNodeType[];
  derived: DagDerivedType | null;
  loading: boolean;
  error: string | null;
  hasDag: boolean;
}

const INITIAL_STATE: DagState = {
  nodes: [],
  derived: null,
  loading: false,
  error: null,
  hasDag: false,
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
        }));
        break;
      case "loading":
        setState((prev) => ({ ...prev, loading: msg.loading }));
        break;
      case "error":
        setState((prev) => ({ ...prev, error: msg.message }));
        break;
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, dispatch, reset };
}
