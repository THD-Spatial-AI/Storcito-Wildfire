import { FC, useEffect, useRef, useState } from "react";
import type Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import { Mail, MapPin, Phone, X } from "lucide-react";

import { useTranslation } from "@/i18n";

import { formatDistance, getCategoryMeta, type EmergencyService } from "../types";

interface EmergencyServicePopupProps {
	map: Map;
	service: EmergencyService;
	onClose: () => void;
}

interface PopupRowProps {
	label: string;
	value: string;
	icon?: FC<{ className?: string }>;
}

const PopupRow: FC<PopupRowProps> = ({ label, value, icon: Icon }) => (
	<div className="flex items-start gap-1.5">
		{Icon && <Icon className="mt-px h-3 w-3 shrink-0 text-muted-foreground" />}
		<span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
			{label}
		</span>
		<span className="min-w-0 flex-1 break-words text-right text-[11px] text-foreground">
			{value}
		</span>
	</div>
);

// Card pinned above the selected marker.
export const EmergencyServicePopup: FC<EmergencyServicePopupProps> = ({
	map,
	service,
	onClose,
}) => {
	const { t } = useTranslation();
	const cardRef = useRef<HTMLDivElement | null>(null);
	const [pixel, setPixel] = useState<[number, number] | null>(null);

	useEffect(() => {
		const update = () =>
			setPixel(
				map.getPixelFromCoordinate(fromLonLat([service.longitude, service.latitude])) as [
					number,
					number,
				]
			);
		update();
		map.on("moveend", update);
		return () => {
			map.un("moveend", update);
		};
	}, [map, service]);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		const onPointerDown = (e: MouseEvent) => {
			if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("mousedown", onPointerDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("mousedown", onPointerDown);
		};
	}, [onClose]);

	if (!pixel) return null;

	const meta = getCategoryMeta(service.category);
	const categoryLabel = t(meta.labelKey, service.serviceType ?? service.name);
	const distance = formatDistance(service.distanceM);

	return (
		<div
			ref={cardRef}
			className="md-fade-in absolute z-30 w-56 overflow-hidden rounded-xl border border-border/60 bg-popover/95 text-popover-foreground shadow-lg backdrop-blur-md"
			style={{
				left: `${pixel[0]}px`,
				top: `${pixel[1]}px`,
				transform: "translate(-50%, calc(-100% - 14px))",
			}}
		>
			<header className="flex items-start gap-2 border-b border-border/60 bg-muted/30 px-2.5 py-1.5">
				<span
					className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
					style={{ backgroundColor: meta.color }}
				/>
				<div className="min-w-0 flex-1">
					<p className="truncate text-[11px] font-semibold text-foreground">{service.name}</p>
					<p className="truncate text-[10px] text-muted-foreground">{categoryLabel}</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("common.close", "Close")}
					className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</header>
			<div className="flex flex-col gap-1 px-2.5 py-2">
				{service.phone && (
					<PopupRow
						label={t("modelResults.emergencyServices.phone", "Phone")}
						value={service.phone}
						icon={Phone}
					/>
				)}
				{service.email && (
					<PopupRow
						label={t("modelResults.emergencyServices.email", "Email")}
						value={service.email}
						icon={Mail}
					/>
				)}
				{service.address && (
					<PopupRow
						label={t("modelResults.emergencyServices.address", "Address")}
						value={service.address}
						icon={MapPin}
					/>
				)}
				{service.postcode && (
					<PopupRow
						label={t("modelResults.emergencyServices.postcode", "Postcode")}
						value={service.postcode}
					/>
				)}
				{service.city && (
					<PopupRow
						label={t("modelResults.emergencyServices.city", "City")}
						value={service.city}
					/>
				)}
				{distance && (
					<PopupRow
						label={t("modelResults.emergencyServices.distance", "Distance")}
						value={distance}
					/>
				)}
			</div>
		</div>
	);
};
