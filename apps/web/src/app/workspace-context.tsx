"use client";

/** @deprecated Development fixture compatibility surface; normal /app routes use API state. */

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

export type WorkspaceSetup = {
  siteName: string;
  facilityType: string;
  robotName: string;
  fleetLabel: string;
  buildVersion: string;
  buildLabel: string;
};

export const DEFAULT_WORKSPACE_SETUP: WorkspaceSetup = {
  siteName: "Warehouse Manila-01",
  facilityType: "Warehouse",
  robotName: "AMR-17",
  fleetLabel: "Manila autonomous fleet",
  buildVersion: "4.7.21",
  buildLabel: "Controller release candidate",
};

const STORAGE_KEY = "rovaulta.workspace.setup";

function loadWorkspaceSetup(): WorkspaceSetup {
  if (typeof window === "undefined") return DEFAULT_WORKSPACE_SETUP;
  const saved = window.sessionStorage.getItem(STORAGE_KEY);
  if (saved === null) return DEFAULT_WORKSPACE_SETUP;
  try {
    const parsed = JSON.parse(saved) as Partial<WorkspaceSetup>;
    return {
      siteName:
        typeof parsed.siteName === "string" ? parsed.siteName : DEFAULT_WORKSPACE_SETUP.siteName,
      facilityType:
        typeof parsed.facilityType === "string"
          ? parsed.facilityType
          : DEFAULT_WORKSPACE_SETUP.facilityType,
      robotName:
        typeof parsed.robotName === "string" ? parsed.robotName : DEFAULT_WORKSPACE_SETUP.robotName,
      fleetLabel:
        typeof parsed.fleetLabel === "string"
          ? parsed.fleetLabel
          : DEFAULT_WORKSPACE_SETUP.fleetLabel,
      buildVersion:
        typeof parsed.buildVersion === "string"
          ? parsed.buildVersion
          : DEFAULT_WORKSPACE_SETUP.buildVersion,
      buildLabel:
        typeof parsed.buildLabel === "string"
          ? parsed.buildLabel
          : DEFAULT_WORKSPACE_SETUP.buildLabel,
    };
  } catch {
    return DEFAULT_WORKSPACE_SETUP;
  }
}

type WorkspaceContextValue = {
  setup: WorkspaceSetup;
  setSetup: Dispatch<SetStateAction<WorkspaceSetup>>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceSetupProvider({ children }: { readonly children: ReactNode }) {
  const [setup, setSetup] = useState<WorkspaceSetup>(DEFAULT_WORKSPACE_SETUP);

  useEffect(() => {
    setSetup(loadWorkspaceSetup());
  }, []);

  return (
    <WorkspaceContext.Provider value={{ setup, setSetup }}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspaceSetup(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (context === null) {
    throw new Error("useWorkspaceSetup must be used inside WorkspaceSetupProvider");
  }
  return context;
}

export { STORAGE_KEY as WORKSPACE_SETUP_STORAGE_KEY };
