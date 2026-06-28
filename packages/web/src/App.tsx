import { useCallback, useEffect, useMemo, useState } from "react";
import { DagApp, useDagMessages, type QuotaInfo } from "@michinori/ui";
import { createWebAdapter, fetchQuota } from "./webAdapter";

import { getEndpoint } from "./webAdapter";

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
      repoUrl={state.repoUrl}
      prompt={state.prompt}
      defaultRepoUrl="https://github.com/breaking-brake/michinori"
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
