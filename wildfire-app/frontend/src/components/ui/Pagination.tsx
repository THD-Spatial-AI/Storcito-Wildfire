import React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@spatialhub/ui";
import { useTranslation } from "@/i18n";

interface PaginationProps {
	readonly currentPage: number;
	readonly totalItems: number;
	readonly itemsPerPage: number;
	readonly onPageChange: (page: number) => void;
	readonly onItemsPerPageChange: (itemsPerPage: number) => void;
	readonly pageSizeOptions?: number[];
	readonly className?: string;
	readonly isLoading?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalItems,
	itemsPerPage,
	onPageChange,
	onItemsPerPageChange,
	pageSizeOptions = [5, 10, 25],
	className = "",
	isLoading = false,
}) => {
	const { t } = useTranslation();

	// Guard zero pages.
	const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
	
	// Bounded display range.
	const startItem = totalItems === 0 ? 0 : currentPage * itemsPerPage + 1;
	const endItem = Math.min((currentPage + 1) * itemsPerPage, totalItems);
	
	// Clamp current page.
	const validCurrentPage = Math.min(currentPage, totalPages - 1);

	// Page numbers.
	const getPageNumbers = () => {
		const pages: (number | string)[] = [];
		const maxVisiblePages = 5;
		
		if (totalPages <= maxVisiblePages) {
			for (let i = 0; i < totalPages; i++) pages.push(i);
		} else {
			pages.push(0);
			
			if (validCurrentPage > 2) {
				pages.push("...");
			}
			
			const start = Math.max(1, validCurrentPage - 1);
			const end = Math.min(totalPages - 2, validCurrentPage + 1);
			
			for (let i = start; i <= end; i++) {
				if (!pages.includes(i)) pages.push(i);
			}
			
			if (validCurrentPage < totalPages - 3) {
				pages.push("...");
			}
			
			if (!pages.includes(totalPages - 1)) {
				pages.push(totalPages - 1);
			}
		}
		
		return pages;
	};
	
	return (
		<div className={`bg-muted/20 px-4 py-3 border-t border-border sm:px-6 ${className}`}>
			<div className="flex flex-col sm:flex-row justify-between items-center gap-3">
				{/* Results info */}
				<div className="flex items-center">
					<p className="text-sm text-muted-foreground">
						{isLoading ? (
							<span className="flex items-center gap-2">
								<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
								<span className="text-muted-foreground">{t("common.pagination.loading")}</span>
							</span>
						) : (
							<>
								{totalItems === 0 ? (
									<span className="text-muted-foreground">{t("common.pagination.noResults")}</span>
								) : (
									<>
										{t("common.pagination.showing")} <span className="font-medium text-foreground">{startItem}</span> {t("common.pagination.to")}{" "}
										<span className="font-medium text-foreground">{endItem}</span> {t("common.pagination.of")}{" "}
										<span className="font-medium text-foreground">{totalItems}</span> {t("common.pagination.results")}
									</>
								)}
							</>
						)}
					</p>
				</div>

				<div className="flex items-center gap-4">
					{/* Page size picker. */}
					<Select
						value={String(itemsPerPage)}
						onValueChange={(v) => {
							onItemsPerPageChange(Number(v));
							onPageChange(0);
						}}
						disabled={isLoading}
					>
						<SelectTrigger className="h-9 w-auto gap-1.5 border-border bg-muted px-3 text-sm hover:bg-muted/80">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map(size => (
								<SelectItem key={size} value={String(size)}>
									{size} {t("common.pagination.perPage")}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					
					{/* Modern pagination controls */}
					{totalItems > 0 && (
						<div className="flex items-center gap-1">
							{/* Previous button */}
							<button
								onClick={() => onPageChange(Math.max(0, validCurrentPage - 1))}
								disabled={validCurrentPage === 0 || isLoading || totalPages <= 1}
								className="p-1.5 rounded-lg border border-border bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-all duration-200 group"
								aria-label={t("common.pagination.previousPage")}
							>
								<ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
							</button>
							
							{/* Page numbers */}
							<div className="flex items-center gap-1 mx-1">
								{getPageNumbers().map((page, index, array) => (
									typeof page === "string" ? (
										<span key={`ellipsis-after-${array[index-1]}`} className="px-2 text-muted-foreground text-sm">
											{page}
										</span>
									) : (
										<button
											key={page}
											onClick={() => onPageChange(page)}
											disabled={isLoading}
											className={`min-w-[32px] h-8 px-2 text-sm tabular-nums rounded-lg transition-colors duration-150 ${
												page === validCurrentPage
													? "bg-primary text-primary-foreground font-medium shadow-sm"
													: "text-muted-foreground hover:bg-muted hover:text-foreground"
											} disabled:opacity-50 disabled:cursor-not-allowed`}
										>
											{page + 1}
										</button>
									)
								))}
							</div>
							
							{/* Next button */}
							<button
								onClick={() => onPageChange(Math.min(totalPages - 1, validCurrentPage + 1))}
								disabled={validCurrentPage >= totalPages - 1 || isLoading || totalPages <= 1}
								className="p-1.5 rounded-lg border border-border bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-all duration-200 group"
								aria-label={t("common.pagination.nextPage")}
							>
								<ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Pagination;