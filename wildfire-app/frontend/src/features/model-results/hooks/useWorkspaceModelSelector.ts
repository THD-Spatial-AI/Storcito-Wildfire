import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "@/lib/axios";

import { useWorkspaceStore, type Workspace } from "@/components/workspace";
import type { Model } from "@/features/model-dashboard";

// Header selector state.
export const useWorkspaceModelSelector = (
  model: Model | null,
  resolvedModelId: number | undefined
) => {
  const navigate = useNavigate();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceModels, setWorkspaceModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [wsReloadKey, setWsReloadKey] = useState(0);

  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const preferredWorkspaceId = useWorkspaceStore((s) => s.preferredWorkspaceId);
  const isLoadingPreference = useWorkspaceStore((s) => s.isLoading);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const initializeWorkspace = useWorkspaceStore((s) => s.initializeWorkspace);

  const loadWorkspaceModels = useCallback(async (workspace: Workspace) => {
    setIsLoadingModels(true);
    try {
      const resp = await axios.get("/models", { params: { workspace_id: workspace.id } });
      const raw = resp.data?.data;
      const list: Model[] = Array.isArray(raw) ? raw : [];
      setWorkspaceModels(list.filter((m) => m.status === "completed"));
    } catch {
      setWorkspaceModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    if (model?.workspace) {
      const ws = model.workspace as Workspace;
      setSelectedWorkspace(ws);
      loadWorkspaceModels(ws);
    }
  }, [model, loadWorkspaceModels]);

  useEffect(() => {
    if (resolvedModelId) setSelectedModelId(resolvedModelId);
  }, [resolvedModelId]);

  const handleWorkspaceChange = useCallback(
    async (workspace: Workspace | null) => {
      setSelectedWorkspace(workspace);
      setCurrentWorkspace(workspace);
      if (workspace) {
        await loadWorkspaceModels(workspace);
      } else {
        setWorkspaceModels([]);
      }
    },
    [setCurrentWorkspace, loadWorkspaceModels]
  );

  const handleModelChange = useCallback(
    (mid: string) => {
      const parsed = Number.parseInt(mid, 10);
      if (parsed && parsed !== selectedModelId) {
        navigate(`/app/model-results/${parsed}`);
      }
    },
    [navigate, selectedModelId]
  );

  return {
    selectedWorkspace,
    workspaceModels,
    selectedModelId,
    isLoadingModels,
    isCreateWsOpen,
    setIsCreateWsOpen,
    wsReloadKey,
    setWsReloadKey,
    currentWorkspace,
    preferredWorkspaceId,
    isLoadingPreference,
    handleWorkspaceChange,
    handleModelChange,
  };
};
