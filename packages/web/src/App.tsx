import { useCallback, useEffect, useMemo, useState } from "react";
import { DagApp, useDagMessages, type QuotaInfo } from "@michinori/ui";
import { createWebAdapter, fetchQuota } from "./webAdapter";

const ENDPOINT_STORAGE = "michinori:endpoint";
function getEndpoint(): string {
  return localStorage.getItem(ENDPOINT_STORAGE) ?? "http://localhost:8080";
}

export default function App() {
  const { state, dispatch, addUserChatMessage, dismissProposal, markProposalApplied } = useDagMessages();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    fetchQuota(getEndpoint()).then((q) => { if (q) setQuota(q); });
  }, []);

  const getChatMessages = useCallback(() => state.chatMessages, [state.chatMessages]);
  const adapter = useMemo(
    () => createWebAdapter(dispatch, addUserChatMessage, getChatMessages, setQuota),
    [dispatch, addUserChatMessage, getChatMessages],
  );

  return (
    <DagApp
      adapter={adapter}
      dispatch={dispatch}
      nodes={state.nodes}
      derived={state.derived}
      loading={state.loading}
      error={state.error}
      hasDag={state.hasDag}
      defaultRepoUrl={import.meta.env.DEV ? "https://github.com/breaking-brake/michinori" : undefined}
      defaultPrompt="docs/devops-ai-agent-hackathon.md のハッカソンに入稿するまでのタスクを整理して"
      calendarPreset={state.calendarPreset}
      customDayOff={state.customDayOff}
      customDayOn={state.customDayOn}
      chatMessages={state.chatMessages}
      chatLoading={state.chatLoading}
      onDismissProposal={dismissProposal}
      onMarkProposalApplied={markProposalApplied}
      quota={quota}
    />
  );
}
