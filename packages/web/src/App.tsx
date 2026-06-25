import { useMemo } from "react";
import { DagApp, useDagMessages } from "@michinori/ui";
import { createWebAdapter } from "./webAdapter";

export default function App() {
  const { state, dispatch } = useDagMessages();
  const adapter = useMemo(() => createWebAdapter(dispatch), [dispatch]);

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
    />
  );
}
