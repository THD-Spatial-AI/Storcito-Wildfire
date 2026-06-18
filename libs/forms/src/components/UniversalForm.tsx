import React, { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { LucideIcon, Save, Eye, EyeOff, Check, X, ChevronDown, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui-elements/alert-dialog";
import { Button } from "./ui-elements/button";
import { LoadingDots } from "./ui-elements/loading";
import { cn } from "../utils";
import { IconX } from "@tabler/icons-react";
import { useTranslation } from "@spatialhub/i18n";

type FormDataPrimitive = string | number | boolean | File | null;
export type FormDataConvertible = FormDataPrimitive | FormDataPrimitive[];

type PasswordRequirement = {
	label: string;
	test: (value: string) => boolean;
};

type FormField = {
	key: string;
	label: string;
	type: "text" | "email" | "password" | "number" | "tel" | "select" | "checkbox" | "textarea";
	value?: string | number | boolean;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	icon?: LucideIcon;
	options?: { value: string; label: string }[];
	description?: string;
	rows?: number;
	min?: number;
	max?: number;
	validation?: (value: string | number | boolean) => string | null;
	showPasswordToggle?: boolean; // For password fields to show/hide toggle
	passwordRequirements?: PasswordRequirement[]; // For password strength indicators
};

export type FormSection = {
	title: string;
	description?: string;
	columns?: 1 | 2;
	fields: FormField[];
};

type UniversalFormProps = {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	description?: string;
	sections: FormSection[];
  values: Record<string, FormDataConvertible>;
  onChange: (key: string, value: FormDataConvertible) => void;
	onSubmit: () => void | Promise<void>;
	submitText?: string | React.ReactNode;
	cancelText?: string;
	loading?: boolean;
	errors?: Record<string, string>;
	buttonWidth?: number;
	variant?: "default" | "user" | "webservice";
	inline?: boolean;
	showCloseButton?: boolean;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
	footerContent?: React.ReactNode;
	headerContent?: React.ReactNode;
	beforeSubmitContent?: React.ReactNode;
	Icon?: LucideIcon;
};

const UniversalForm: React.FC<UniversalFormProps> = ({
	isOpen,
	onClose,
	title,
	description,
	sections,
	values,
	onChange,
	onSubmit,
	submitText,
	cancelText,
	loading = false,
	errors = {},
	buttonWidth,
	variant = "default",
	inline = false,
	showCloseButton = true,
	maxWidth = "md",
	footerContent,
	headerContent,
	beforeSubmitContent,
	Icon,
}) => {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});

  const validationErrors: Record<string, string> = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.validation) {
          const raw = values[field.key];
          const coerce = typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean" ? raw : "";
          const msg = field.validation(coerce);
          if (msg) errs[field.key] = msg;
        }
      }
    }
    return errs;
  }, [sections, values]);

  const getVariantStyles = useMemo(() => getFormVariantStyles(variant, Icon), [variant, Icon]);

  const variantStyles = getVariantStyles;
  const FormIcon = Icon || variantStyles.icon;

  type FieldValue = string | number | boolean;

  const handleFieldChange = useCallback((field: FormField, newValue: FieldValue) => {
    onChange(field.key, newValue);
  }, [onChange]);

  const renderField = useCallback((field: FormField, autoFocus?: boolean) => {
    const fieldError = validationErrors[field.key] || errors[field.key];
    const FieldIcon = field.icon;

    const inputClasses = getInputClasses(FieldIcon, field.disabled, fieldError);
    const renderContext = {
      field,
      FieldIcon,
      inputClasses,
      fieldError,
      values,
      handleFieldChange,
      passwordVisibility,
      setPasswordVisibility,
      autoFocus
    };

		switch (field.type) {
      case "select":
        return renderSelectField(renderContext);
      case "checkbox":
        return renderCheckboxField(renderContext);
      case "textarea":
        return renderTextareaField(renderContext);
      default:
        return renderInputField(renderContext);
    }
  }, [values, validationErrors, errors, handleFieldChange, passwordVisibility]);

  const onOpenChange = useCallback((open: boolean) => {
    // Close when dialog requests it; remain controlled by parent
    if (!open) onClose();
  }, [onClose]);

  const handleModalSubmit = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    form.requestSubmit();
  }, []);

  const containerClasses = getContainerClasses(inline, maxWidth);

  const renderContent = () => (
    <>
      {/* Close button - positioned relative to AlertDialogContent */}
      {!inline && showCloseButton && (
        <Button
          disabled={loading}
          onClick={onClose}
          variant="ghost"
          size="icon"
          className={cn(
            "absolute z-10 right-3 top-3",
            "size-8 justify-center items-center flex cursor-pointer rounded-lg",
            "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
            "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          )}
        >
          <IconX className="size-4" />
        </Button>
      )}
      
      <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
				{renderFormHeader({ inline, headerContent, title, description, variantStyles, FormIcon })}
			</div>

			<div className="relative max-h-[60dvh] overflow-auto no-scrollbar border-y border-border">
				<form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="h-full flex flex-col" ref={formRef}>
					<div className="relative space-y-6 py-4">
						{sections.map((section, sectionIdx) => (
							<div key={section.title} className="space-y-4">
								{(section.title || section.description) && (
									<div className="pb-2">
										{section.title && (
											<h3 className="text-base font-semibold text-foreground">{section.title}</h3>
										)}
										{section.description && (
											<p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
										)}
									</div>
								)}
								<div className={`grid grid-cols-1 ${section.columns === 2 ? "md:grid-cols-2" : ""} gap-x-4 gap-y-3`}>
									{section.fields.map((field, idx) => (
										<div key={field.key} className={section.columns === 2 && field.type === "textarea" ? "md:col-span-2" : ""}>
											{renderField(field, sectionIdx === 0 && idx === 0)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</form>
			</div>

			{beforeSubmitContent && <div className="mb-2">{beforeSubmitContent}</div>}

			{renderFormFooter({ inline, loading, onClose, cancelText, confirmButtonRef, handleModalSubmit, formRef, buttonWidth, submitText, t })}

      {footerContent && <div className="mt-3">{footerContent}</div>}
    </>
  );

  if (inline) {
    return <div className={containerClasses}>{renderContent()}</div>;
  }

  // Don't render the dialog until isOpen is true to prevent animation glitches
  if (!isOpen) {
    return null;
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className={containerClasses}>
        <AlertDialogDescription className="sr-only">
          {description || title || "Form dialog"}
        </AlertDialogDescription>
        {renderContent()}
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Helper functions for rendering form fields
type RenderContext = {
  field: FormField;
  FieldIcon: LucideIcon | undefined;
  inputClasses: string;
  fieldError: string | undefined;
  values: Record<string, FormDataConvertible>;
  handleFieldChange: (field: FormField, value: string | number | boolean) => void;
  passwordVisibility: Record<string, boolean>;
  setPasswordVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  autoFocus?: boolean;
};

function getInputClasses(FieldIcon: LucideIcon | undefined, disabled: boolean | undefined, fieldError: string | undefined): string {
  return `
    block w-full ${FieldIcon ? "pl-10" : "pl-4"} pr-4 py-3 text-sm border rounded-xl
    placeholder-muted-foreground transition-all duration-200 min-h-[2.875rem] text-foreground
    ${
      disabled
        ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
        : `bg-background dark:bg-input border-border
         hover:border-muted-foreground
         focus:outline-none focus:ring-2 focus:ring-ring focus:border-muted-foreground`
    }
    ${fieldError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : ""}
  `;
}

const CustomSelectField: React.FC<{ ctx: RenderContext }> = ({ ctx }) => {
  const { field, FieldIcon, fieldError, values, handleFieldChange } = ctx;
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawValue = values[field.key];
  const currentValue = (typeof rawValue === "string" || typeof rawValue === "number")
    ? String(rawValue)
    : "";
  const selectedOption = field.options?.find(opt => opt.value === currentValue);
  const displayValue = selectedOption?.label || field.placeholder || `Select ${field.label}`;

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    let top = rect.bottom + 4;
    const width = Math.max(256, rect.width);
    let left = rect.left;
    const maxLeft = Math.max(8, Math.min(left, window.innerWidth - 8 - width));
    left = maxLeft;
    const estimatedHeight = Math.min(256, (field.options?.length || 0) * 44 + 8);
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - 4 - estimatedHeight);
    }
    setMenuPosition({ top, left, width });
  }, [field.options]);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = containerRef.current?.contains(target);
      const clickedInsideMenu = menuRef.current?.contains(target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    const handleScrollResize = () => {
      if (isOpen) updateMenuPosition();
    };

    if (isOpen) {
      updateMenuPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollResize, true);
      window.addEventListener('resize', handleScrollResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollResize, true);
      window.removeEventListener('resize', handleScrollResize);
    };
  }, [isOpen, updateMenuPosition]);

  const handleOptionSelect = (value: string) => {
    handleFieldChange(field, value);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1.5" key={field.key} ref={containerRef}>
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {field.description && <p className="text-xs text-muted-foreground mb-1.5">{field.description}</p>}
      <div className="relative">
        <button
          type="button"
          ref={buttonRef}
          onClick={() => !field.disabled && setIsOpen(!isOpen)}
          disabled={field.disabled}
          className={cn(
            "flex items-center gap-2 w-full px-4 py-3 text-sm border rounded-xl transition-all duration-200 min-h-[2.875rem]",
            field.disabled
              ? "bg-muted border-border text-muted-foreground cursor-not-allowed"
              : "bg-background dark:bg-input border-border hover:border-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-muted-foreground",
            fieldError ? "border-destructive focus:border-destructive focus:ring-destructive/20" : "",
            FieldIcon ? "pl-10" : ""
          )}
        >
          {FieldIcon && (
            <div className="absolute left-0 pl-3.5 flex items-center pointer-events-none">
              <FieldIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className={cn("flex-1 text-left text-foreground", !currentValue && "text-muted-foreground")}>
            {displayValue}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0", isOpen && "rotate-180")} />
        </button>

        {isOpen && createPortal(
          <div
            ref={menuRef}
            role="menu"
            tabIndex={-1}
            className="fixed bg-popover border border-border rounded-xl shadow-xl z-[9999] py-1.5 pointer-events-auto overflow-hidden"
            style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              {(!currentValue && field.placeholder) && (
                <button
                  type="button"
                  onClick={() => handleOptionSelect("")}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <span className="text-sm text-muted-foreground">{field.placeholder}</span>
                  {!currentValue && <Check className="w-4 h-4 text-foreground flex-shrink-0 ml-2" />}
                </button>
              )}
              {field.options?.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleOptionSelect(option.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-left",
                    currentValue === option.value 
                      ? "bg-accent" 
                      : "hover:bg-accent"
                  )}
                >
                  <span className={cn(
                    "text-sm",
                    currentValue === option.value 
                      ? "font-medium text-foreground" 
                      : "text-popover-foreground"
                  )}>{option.label}</span>
                  {currentValue === option.value && <Check className="w-4 h-4 text-foreground flex-shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
      <div className="min-h-[1.125rem]">
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </div>
    </div>
  );
};

function renderSelectField(ctx: RenderContext) {
  return <CustomSelectField ctx={ctx} />;
}

function renderCheckboxField(ctx: RenderContext) {
  const { field, fieldError, values, handleFieldChange } = ctx;
  
  return (
    <div className="space-y-1.5" key={field.key}>
      <div className="flex items-center gap-3">
        <div className="relative flex items-center">
          <input
            type="checkbox"
            checked={typeof values[field.key] === "boolean" ? (values[field.key] as boolean) : false}
            onChange={(e) => handleFieldChange(field, e.target.checked)}
            disabled={field.disabled}
            className="w-5 h-5 text-primary rounded-md border-border 
                       focus:ring-2 focus:ring-ring focus:ring-offset-0 
                       transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            required={field.required}
          />
        </div>
        <label className="text-sm font-medium text-foreground cursor-pointer select-none">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      </div>
      {field.description && <p className="text-xs text-muted-foreground ml-8">{field.description}</p>}
      <div className="min-h-[1.125rem] ml-8">
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </div>
    </div>
  );
}

function renderTextareaField(ctx: RenderContext) {
  const { field, FieldIcon, inputClasses, fieldError, values, handleFieldChange, autoFocus } = ctx;
  
  return (
    <div className="space-y-1.5" key={field.key}>
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {field.description && <p className="text-xs text-muted-foreground mb-1.5">{field.description}</p>}
      <div className="relative">
        {FieldIcon && (
          <div className="absolute z-10 top-3.5 left-0 pl-3.5 flex items-start pointer-events-none">
            <FieldIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <textarea
          value={typeof values[field.key] === "string" || typeof values[field.key] === "number" ? (values[field.key] as string | number) : ""}
          onChange={(e) => handleFieldChange(field, e.target.value)}
          disabled={field.disabled}
          placeholder={field.placeholder}
          rows={field.rows || 3}
          className={`${inputClasses} resize-none`}
          required={field.required}
          autoFocus={!!autoFocus}
        />
      </div>
      <div className="min-h-[1.125rem]">
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </div>
    </div>
  );
}

function renderInputField(ctx: RenderContext) {
  const { field, FieldIcon, inputClasses, fieldError, values, handleFieldChange, passwordVisibility, setPasswordVisibility, autoFocus } = ctx;
  
  const isPasswordField = field.type === "password";
  const showPassword = passwordVisibility[field.key] || false;
  const actualInputType = isPasswordField && showPassword ? "text" : field.type;

  return (
    <div className="space-y-1.5" key={field.key}>
      <label className="block text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {field.description && <p className="text-xs text-muted-foreground mb-1.5">{field.description}</p>}
      <div className="relative group">
        {FieldIcon && (
          <div className="absolute z-10 inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <FieldIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          </div>
        )}
        <input
          type={actualInputType}
          value={typeof values[field.key] === "string" || typeof values[field.key] === "number" ? (values[field.key] as string | number) : ""}
          onChange={(e) => {
            const rawValue = e.target.value;
            // Filter phone input to only allow valid characters
            if (field.type === "tel") {
              const filteredValue = rawValue.replaceAll(/[^\d\s\-+()]/g, '');
              handleFieldChange(field, filteredValue);
            } else {
              const value = field.type === "number" && rawValue !== "" ? Number(rawValue) : rawValue;
              handleFieldChange(field, value);
            }
          }}
          disabled={field.disabled}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          pattern={field.type === "tel" ? String.raw`[\d\s\-+()]+` : undefined}
          className={cn(inputClasses, field.showPasswordToggle && "pr-11")}
          autoFocus={!!autoFocus}
          required={field.required}
        />
        {field.showPasswordToggle && isPasswordField && (
          <button
            type="button"
            onClick={() => setPasswordVisibility(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      
      {field.passwordRequirements && field.passwordRequirements.length > 0 &&
        typeof values[field.key] === "string" && (values[field.key] as string).length > 0 && (
        <div className="mt-2.5 space-y-1.5 p-3 bg-muted rounded-lg border border-border">
          {field.passwordRequirements.map((req) => {
            const isMet = req.test(typeof values[field.key] === "string" ? (values[field.key] as string) : "");
            return (
              <div key={req.label} className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full transition-colors",
                  isMet ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"
                )}>
                  {isMet ? (
                    <Check className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <X className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "transition-colors",
                  isMet ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
                )}>
                  {req.label}
                </span>
              </div>
            );
          })}
          {typeof values[field.key] === "string" && (values[field.key] as string).length > 0 && (values[field.key] as string) !== (values[field.key] as string).trim() && (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-1 pt-1.5 border-t border-border">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Password contains leading or trailing spaces</span>
            </div>
          )}
        </div>
      )}
      
      <div className="min-h-[1.125rem]">
        {fieldError && <p className="text-xs text-destructive">{fieldError}</p>}
      </div>
    </div>
  );
}

// Type for variant styles returned by getFormVariantStyles
type FormVariantStyles = {
  background: string;
  card: string;
  icon: LucideIcon;
  iconBg: string;
  button: string;
};

// Helper function to get variant styles
function getFormVariantStyles(variant: "default" | "user" | "webservice", Icon: LucideIcon | undefined): FormVariantStyles {
  const baseStyles = {
    background: "bg-white dark:bg-gray-900",
    card: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
    icon: Icon || Save,
  };

  const variantConfig = {
    user: {
      iconBg: "bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300",
      button: "bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200",
    },
    webservice: {
      iconBg: "bg-gradient-to-br from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400",
      button: "bg-gray-800 dark:bg-gray-200 hover:bg-gray-700 dark:hover:bg-gray-300",
    },
    default: {
      iconBg: "bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400",
      button: "bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200",
    },
  };

  const config = variantConfig[variant] || variantConfig.default;
  return { ...baseStyles, ...config };
}

// Helper function to get container classes
function getContainerClasses(inline: boolean, maxWidth: "sm" | "md" | "lg" | "xl" | "2xl") {
  const maxWidthClasses = {
    sm: inline ? "max-w-sm" : "sm:max-w-sm",
    md: inline ? "max-w-md" : "sm:max-w-md",
    lg: inline ? "max-w-lg" : "sm:max-w-lg",
    xl: inline ? "max-w-xl" : "sm:max-w-xl",
    "2xl": inline ? "max-w-2xl" : "sm:max-w-2xl",
  } as const;

  const baseClass = inline ? "" : "p-5";
  const widthClass = maxWidthClasses[maxWidth] || maxWidthClasses.md;

  return cn(baseClass, widthClass);
}

// Helper function to render form header
interface RenderFormHeaderParams {
  inline: boolean;
  headerContent: React.ReactNode | undefined;
  title: string | undefined;
  description: string | undefined;
  variantStyles: FormVariantStyles;
  FormIcon: LucideIcon;
}

function renderFormHeader(params: RenderFormHeaderParams) {
  const { inline, headerContent, title, description, variantStyles, FormIcon } = params;
  if (inline) {
    return headerContent ? (
      <div className="w-full text-center">{headerContent}</div>
    ) : (
      <div className="w-full text-center">
        {title && (
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-foreground">
            <span className={cn("w-8 h-8 ", variantStyles.iconBg, "rounded-xl flex items-center justify-center shadow-lg")}>
              <FormIcon className="w-4 h-4 text-white dark:text-gray-900" />
            </span>
            {title}
          </h2>
        )}
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    );
  }

  return (
    <AlertDialogHeader className="pr-10">
      {title && (
        <AlertDialogTitle className="flex items-center gap-2.5 text-xl">
          <span className={cn("w-9 h-9 ", variantStyles.iconBg, "rounded-xl flex items-center justify-center shadow-lg")}>
            <FormIcon className="w-4.5 h-4.5 text-white dark:text-gray-900" />
          </span>
          {title}
        </AlertDialogTitle>
      )}
      {description && <AlertDialogDescription className="mt-1">{description}</AlertDialogDescription>}
    </AlertDialogHeader>
  );
}

// Helper function to render form footer
interface RenderFormFooterParams {
  readonly inline: boolean;
  readonly loading: boolean;
  readonly onClose: () => void;
  readonly cancelText: string | undefined;
  readonly confirmButtonRef: React.RefObject<HTMLButtonElement | null>;
  readonly handleModalSubmit: () => void;
  readonly formRef: React.RefObject<HTMLFormElement | null>;
  readonly buttonWidth: number | undefined;
  readonly submitText: string | React.ReactNode | undefined;
  readonly t: (key: string) => string;
}

function renderFormFooter(params: RenderFormFooterParams) {
  const { inline, loading, onClose, cancelText, confirmButtonRef, handleModalSubmit, formRef, buttonWidth, submitText, t } = params;
  const buttons = (
    <>
      <Button 
        type="button" 
        variant="ghost" 
        disabled={loading} 
        onClick={onClose} 
        className="rounded-xl cursor-pointer text-sm h-10 px-5 font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        {cancelText || t("common.cancel")}
      </Button>
      <Button
        ref={confirmButtonRef}
        variant="default"
        disabled={loading}
        onClick={inline ? () => formRef.current?.requestSubmit() : handleModalSubmit}
        type="submit"
        style={{ ["--width" as string]: buttonWidth ? `${buttonWidth}px` : undefined }}
        className={cn(
          "rounded-xl cursor-pointer text-sm h-10 px-6 font-medium min-w-[calc(var(--spacing)_*_20)]",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          buttonWidth && "min-w-[var(--width)]"
        )}
      >
        {loading ? <LoadingDots className="bg-primary-foreground" /> : submitText || t("common.confirm")}
      </Button>
    </>
  );

  return inline ? (
    <div className="pt-4 flex items-center justify-end gap-3">{buttons}</div>
  ) : (
    <AlertDialogFooter className="pt-4 gap-3">{buttons}</AlertDialogFooter>
  );
}

export default UniversalForm;