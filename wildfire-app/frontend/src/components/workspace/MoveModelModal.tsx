import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { FormDataConvertible } from '@/hooks/useForm';
import { workspaceService, type Workspace } from '@/components/workspace/services/workspaceService';
import { modelService, type Model } from '@/features/model-dashboard/services/modelService';
import { UniversalForm } from '@spatialhub/forms';
import { getMoveModelFormSections } from '@/configuration/formConfigurations';
import { useTranslation } from '@/i18n';

interface MoveModelModalProps {
    isOpen: boolean;
    model: Model | null;
    models?: Model[];
    currentWorkspaceId: number | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const MoveModelModal: React.FC<MoveModelModalProps> = ({
    isOpen,
    model,
    models,
    currentWorkspaceId,
    onClose,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<{ workspace_id: number | null }>({
        workspace_id: null,
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const loadWorkspaces = useCallback(async () => {
        setIsLoading(true);
        try {
            const allWorkspaces = await workspaceService.getUserWorkspaces();
            const availableWorkspaces = allWorkspaces.filter(
                ws => ws.id !== currentWorkspaceId
            );
            setWorkspaces(availableWorkspaces);

            if (availableWorkspaces.length > 0) {
                const firstWorkspaceId = availableWorkspaces[0].id;
                setFormData({ workspace_id: firstWorkspaceId });
            } else {
                setFormData({ workspace_id: null });
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error('Failed to load workspaces:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspaceId]);

    useEffect(() => {
        if (isOpen) {
            loadWorkspaces();
        }
    }, [isOpen, loadWorkspaces]);

    if (!isOpen || (!model && (!models || models.length === 0))) return null;

    const isBulkMove = models && models.length > 0;
    const moveCount = isBulkMove ? models.length : 1;

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({ workspace_id: null });
            setFormErrors({});
            onClose();
        }
    };

    const handleFormChange = (key: string, value: FormDataConvertible) => {
        const processedValue = key === 'workspace_id' && value !== '' ? Number(value) : value;

        setFormData((prev) => ({
            ...prev,
            [key]: processedValue,
        }));

        if (formErrors[key]) {
            setFormErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const handleSubmit = async () => {
        if (!formData.workspace_id) {
            setFormErrors({ workspace_id: t('forms.moveModel.errorSelect', 'Please select a workspace') });
            return;
        }

        setIsSubmitting(true);
        setFormErrors({});

        try {
            if (isBulkMove) {
                const modelIds = models.map(m => m.id);
                await modelService.bulkMoveModels(modelIds, formData.workspace_id);
            } else {
                await modelService.moveModel(model!.id, formData.workspace_id);
            }

            // Invalidate model caches.
            queryClient.invalidateQueries({ queryKey: ["models", "list"] });
            queryClient.invalidateQueries({ queryKey: ["models", "stats"] });

            onSuccess?.();
            handleClose();
        } catch (error) {
            if (import.meta.env.DEV) console.error('Failed to move model(s):', error);
            setFormErrors({
                workspace_id: isBulkMove
                    ? t('forms.moveModel.errorMovePlural', 'Failed to move models. Please try again.')
                    : t('forms.moveModel.errorMove', 'Failed to move model. Please try again.')
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return null;
    }

    if (workspaces.length === 0) {
        return (
            <UniversalForm
                isOpen={isOpen}
                onClose={handleClose}
                title={isBulkMove ? t('forms.moveModel.titlePlural', 'Move Models') : t('forms.moveModel.title', 'Move Model')}
                description={t('forms.moveModel.noWorkspaces', 'No other workspaces available. Create a new workspace first.')}
                variant="default"
                sections={[]}
                values={{}}
                onChange={() => {}}
                onSubmit={handleClose}
                submitText={t('common.close', 'Close')}
                loading={false}
                errors={{}}
            />
        );
    }

    const formSections = getMoveModelFormSections(workspaces, t);

    return (
        <UniversalForm
            isOpen={isOpen}
            onClose={handleClose}
            title={isBulkMove ? t('forms.moveModel.titlePlural', 'Move Models') : t('forms.moveModel.title', 'Move Model')}
            description={isBulkMove
                ? t('forms.moveModel.descriptionPlural', { count: moveCount, defaultValue: `Move ${moveCount} selected models to a different workspace` })
                : t('forms.moveModel.description', { title: model?.title ?? '', defaultValue: `Move "${model?.title ?? ''}" to a different workspace` })}
            variant="default"
            sections={formSections}
            values={formData as unknown as Record<string, FormDataConvertible>}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            submitText={isBulkMove
                ? t('forms.moveModel.submitPlural', { count: moveCount, defaultValue: `Move ${moveCount} Models` })
                : t('forms.moveModel.title', 'Move Model')}
            loading={isSubmitting}
            errors={formErrors}
        />
    );
};

