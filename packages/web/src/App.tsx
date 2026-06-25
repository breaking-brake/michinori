import { useCallback, useMemo, useState } from "react";
import { DagApp, useDagMessages } from "@michinori/ui";
import { createWebAdapter } from "./webAdapter";

const API_KEY_STORAGE = "michinori:apiKey";

export default function App() {
  const { state, dispatch } = useDagMessages();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) ?? "");

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  }, []);

  const adapter = useMemo(() => createWebAdapter(dispatch, () => apiKey), [dispatch, apiKey]);

  return (
    <DagApp
      adapter={adapter}
      dispatch={dispatch}
      nodes={state.nodes}
      derived={state.derived}
      loading={state.loading}
      error={state.error}
      hasDag={state.hasDag}
      apiKey={apiKey}
      onApiKeyChange={handleApiKeyChange}
    />
  );
}
