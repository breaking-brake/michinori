import { useCallback, useMemo } from "react";
import { DagApp, useDagMessages } from "@michinori/ui";
import { createWebAdapter } from "./webAdapter";

export default function App() {
  const { state, dispatch, addUserChatMessage, dismissProposal } = useDagMessages();
  const getChatMessages = useCallback(() => state.chatMessages, [state.chatMessages]);
  const adapter = useMemo(
    () => createWebAdapter(dispatch, addUserChatMessage, getChatMessages),
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
      defaultRepoUrl={import.meta.env.DEV ? "https://github.com/breaking-brake/cc-wf-studio" : undefined}
      defaultPrompt="QwenCodeを対応プラットフォームとして追加したい"
      calendarPreset={state.calendarPreset}
      customDayOff={state.customDayOff}
      customDayOn={state.customDayOn}
      chatMessages={state.chatMessages}
      chatLoading={state.chatLoading}
      onDismissProposal={dismissProposal}
    />
  );
}
