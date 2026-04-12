// lib/pluginApi.ts — Global API surface for CP-IDE extensions.
//
// Defines `window.cpide` which is used by community extensions to hook
// into the editor, listen to execution events, and manipulate the UI.

import { RunCodeResponse } from "./tauriClient";

export interface ExtensionRunRequest {
  code: string;
  language: string;
  stdin: string;
}

export type BeforeRunCallback = (
  req: ExtensionRunRequest
) => ExtensionRunRequest | Promise<ExtensionRunRequest> | void;

export type AfterRunCallback = (res: RunCodeResponse) => void;

class CpIdeExtensionApi {
  public version = "0.8.0";

  // Hidden references to the actual editor getter/setter injected later
  public _internal = {
    getEditorText: (): string => "",
    setEditorText: (_text: string): void => {},
    beforeRunHooks: [] as BeforeRunCallback[],
    afterRunHooks: [] as AfterRunCallback[],
    showToastFn: (msg: string, type: "success" | "error" | "info") => {
      console.log(`[Toast ${type}]: ${msg}`);
      alert(`[${type.toUpperCase()}] ${msg}`);
    },
  };

  /** Editor manipulation API */
  public editor = {
    /** Get the current text in the editor */
    getText: () => this._internal.getEditorText(),
    /** Replace the current text in the editor */
    setText: (text: string) => this._internal.setEditorText(text),
  };

  /** Lifecycle event hooks */
  public events = {
    /** Listen and optionally modify the run request before compiling */
    onBeforeRun: (callback: BeforeRunCallback) => {
      this._internal.beforeRunHooks.push(callback);
    },
    /** Listen to the outcome of a code execution */
    onAfterRun: (callback: AfterRunCallback) => {
      this._internal.afterRunHooks.push(callback);
    },
  };

  /** UI rendering utils */
  public ui = {
    /** Display a popup toast notification */
    showToast: (message: string, type: "success" | "error" | "info" = "info") => {
      this._internal.showToastFn(message, type);
    },
  };
}

// Create the singleton instance
export const apiInstance = new CpIdeExtensionApi();

// Extend the Window interface to typecheck `window.cpide`
declare global {
  interface Window {
    cpide: CpIdeExtensionApi;
  }
}

// Attach it to the window before scripts evaluate
if (typeof window !== "undefined") {
  window.cpide = apiInstance;
}
