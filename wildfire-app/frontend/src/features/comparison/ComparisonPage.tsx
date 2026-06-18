import { FC, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  GitCompare,
  ArrowRight,
  X,
  Loader2,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { modelService, Model } from '@/features/model-dashboard/services/modelService';
import { Workspace } from '@/components/workspace';
import { useWorkspaceStore } from '@/components/workspace';
import { WorkspaceSelector } from '@/components/workspace';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@spatialhub/ui';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useTranslation } from '@/i18n';
import { ComparisonMapView } from './ComparisonMapView';
import { ComparisonMetrics } from './ComparisonMetrics';

interface ComparisonPageProps {
  modelId?: number;
}

export const ComparisonPage: FC<ComparisonPageProps> = ({ modelId: propModelId }) => {
  const { modelId: paramModelId } = useParams<{ modelId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useDocumentTitle(t('simulationComparison.title'));

  const { currentWorkspace: defaultWorkspace } = useWorkspaceStore();

  const [workspace1, setWorkspace1] = useState<Workspace | null>(defaultWorkspace);
  const [workspace2, setWorkspace2] = useState<Workspace | null>(defaultWorkspace);

  const [availableModels1, setAvailableModels1] = useState<Model[]>([]);
  const [availableModels2, setAvailableModels2] = useState<Model[]>([]);

  const [selectedModelId1, setSelectedModelId1] = useState<string | undefined>(
    paramModelId || (propModelId ? String(propModelId) : undefined) || searchParams.get('model1') || undefined
  );
  const [selectedModelId2, setSelectedModelId2] = useState<string | undefined>(searchParams.get('model2') || undefined);

  const [model1, setModel1] = useState<Model | null>(null);
  const [model2, setModel2] = useState<Model | null>(null);

  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    if (defaultWorkspace && !workspace1) setWorkspace1(defaultWorkspace);
    if (defaultWorkspace && !workspace2) setWorkspace2(defaultWorkspace);
  }, [defaultWorkspace, workspace1, workspace2]);

  useEffect(() => {
    const fetchModels1 = async () => {
      try {
        const params: { limit?: number; workspace_id?: number } = { limit: 100 };
        if (workspace1?.id) params.workspace_id = workspace1.id;
        const response = await modelService.getModels(params);
        if (response.success) {
          setAvailableModels1(response.data.filter(m => m.status === 'completed'));
        }
      } catch (error) {
        console.error('Failed to fetch models for side 1:', error);
      }
    };
    fetchModels1();
  }, [workspace1]);

  useEffect(() => {
    const fetchModels2 = async () => {
      try {
        const params: { limit?: number; workspace_id?: number } = { limit: 100 };
        if (workspace2?.id) params.workspace_id = workspace2.id;
        const response = await modelService.getModels(params);
        if (response.success) {
          setAvailableModels2(response.data.filter(m => m.status === 'completed'));
        }
      } catch (error) {
        console.error('Failed to fetch models for side 2:', error);
      }
    };
    fetchModels2();
  }, [workspace2]);

  useEffect(() => {
    if (!selectedModelId1) {
      setModel1(null);
      return;
    }
    const fetchModel1 = async () => {
      setLoading1(true);
      try {
        const response = await modelService.getModelById(Number(selectedModelId1));
        if (response.success) setModel1(response.data);
      } catch (error) {
        console.error(`Failed to fetch model ${selectedModelId1}:`, error);
      } finally {
        setLoading1(false);
      }
    };
    fetchModel1();
  }, [selectedModelId1]);

  useEffect(() => {
    if (!selectedModelId2) {
      setModel2(null);
      return;
    }
    const fetchModel2 = async () => {
      setLoading2(true);
      try {
        const response = await modelService.getModelById(Number(selectedModelId2));
        if (response.success) setModel2(response.data);
      } catch (error) {
        console.error(`Failed to fetch model ${selectedModelId2}:`, error);
      } finally {
        setLoading2(false);
      }
    };
    fetchModel2();
  }, [selectedModelId2]);

  const renderModelSelect = (
    models: Model[],
    value: string | undefined,
    onChange: (val: string) => void,
    placeholder: string,
    excludeId?: string
  ) => (
    <div className="w-full">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-background border-border">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {models.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              {t('simulationComparison.noCompletedModels')}
            </div>
          ) : (
            models
              .filter(m => String(m.id) !== excludeId)
              .map((model) => (
                <SelectItem key={model.id} value={String(model.id)}>
                  <span className="flex items-center justify-between w-full gap-2">
                    <span className="truncate">{model.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(model.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </SelectItem>
              ))
          )}
        </SelectContent>
      </Select>
    </div>
  );

  const isLoading = loading1 || loading2;
  const hasComparison = Boolean(model1 && model2);

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <header className="bg-card border-b border-border flex-shrink-0">
        <div className="h-[3px] bg-muted" />

        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/app/model-dashboard')}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-lg">
                  <GitCompare className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">
                    {t('simulationComparison.title')}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {t('simulationComparison.subtitle')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                  {t('simulationComparison.baseline')}
                </span>
                {model1 && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {model1.region || t('simulationComparison.noRegion')}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-1.5">
                <div className="w-1/3 min-w-[120px]">
                  <WorkspaceSelector
                    activeWorkspace={workspace1}
                    onWorkspaceChange={setWorkspace1}
                  />
                </div>
                <div className="flex-1">
                  {renderModelSelect(
                    availableModels1,
                    selectedModelId1,
                    setSelectedModelId1,
                    t('simulationComparison.selectBaselineModel'),
                    selectedModelId2
                  )}
                </div>
              </div>
            </div>

            <div className="hidden md:flex justify-center">
              <div className="p-1.5 bg-muted border border-border rounded-full">
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                  {t('simulationComparison.comparison')}
                </span>
                {model2 && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {model2.region || t('simulationComparison.noRegion')}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-1.5">
                <div className="w-1/3 min-w-[120px]">
                  <WorkspaceSelector
                    activeWorkspace={workspace2}
                    onWorkspaceChange={setWorkspace2}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex gap-1">
                    {renderModelSelect(
                      availableModels2,
                      selectedModelId2,
                      setSelectedModelId2,
                      t('simulationComparison.selectComparisonModel'),
                      selectedModelId1
                    )}
                    {selectedModelId2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedModelId2(undefined)}
                        className="shrink-0 h-8 w-8"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
        {(() => {
          if (isLoading) {
            return (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="relative mx-auto mb-6 w-16 h-16">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 animate-pulse" />
                    <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {t('simulationComparison.loading')}
                  </p>
                </div>
              </div>
            );
          }

          if (!hasComparison) {
            return (
              <div className="bg-card rounded-xl border border-border border-dashed">
                <div className="flex flex-col items-center justify-center text-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-violet-500/20 blur-sm scale-110" />
                    <div className="relative p-5 bg-muted rounded-full">
                      <BarChart3 className="w-12 h-12 text-muted-foreground/60" />
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2">
                    {t('simulationComparison.selectModels')}
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    {t('simulationComparison.selectModelsDescription')}
                  </p>
                  {!selectedModelId1 && (
                    <div className="mt-5 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {t('simulationComparison.startBySelectingBaseline')}
                      </p>
                    </div>
                  )}
                  {selectedModelId1 && !selectedModelId2 && (
                    <div className="mt-5 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        {t('simulationComparison.nowSelectComparison')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-6">
              {model1 && model2 && (
                <>
                  <div className="h-[560px]">
                    <ComparisonMapView model1={model1} model2={model2} />
                  </div>
                  <ComparisonMetrics model1={model1} model2={model2} />
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
