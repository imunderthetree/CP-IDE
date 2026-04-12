// context/ExtensionContext.tsx — React Context that loads & manages plugins.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiInstance } from "../lib/pluginApi";
import { getInstalledExtensions, readExtensionScript, ExtensionConfig } from "../lib/tauriClient";

interface ExtensionContextValue {
  extensions: ExtensionConfig[];
  reloadExtensions: () => Promise<void>;
  isLoaded: boolean;
}

const ExtensionContext = createContext<ExtensionContextValue | null>(null);

export function ExtensionProvider({ children }: { children: ReactNode }) {
  const [extensions, setExtensions] = useState<ExtensionConfig[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // We only want to evaluate scripts once per session to avoid duplicate hooks,
  // unless we specifically clear them out (not doing that for v1).
  const [hasEvaluated, setHasEvaluated] = useState(false);

  const loadExtensions = async () => {
    try {
      const extList = await getInstalledExtensions();
      setExtensions(extList);

      if (!hasEvaluated) {
        for (const ext of extList) {
          try {
            const script = await readExtensionScript(ext.id);
            // Execute the script, passing in our globally constructed cpide API
            const runner = new Function("cpide", script);
            runner(apiInstance);
            console.log(`Loaded plugin: ${ext.name}`);
          } catch (execErr) {
            console.error(`Failed to execute extension ${ext.id}:`, execErr);
          }
        }
        setHasEvaluated(true);
      }
    } catch (err) {
      console.error("Failed to load extensions:", err);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadExtensions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ExtensionContext.Provider
      value={{
        extensions,
        reloadExtensions: loadExtensions,
        isLoaded,
      }}
    >
      {children}
    </ExtensionContext.Provider>
  );
}

export function useExtensions() {
  const ctx = useContext(ExtensionContext);
  if (!ctx) {
    throw new Error("useExtensions must be used within an ExtensionProvider");
  }
  return ctx;
}
