import type { SVGProps } from "react";

export const CompleteIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
        <circle cx="12" cy="12" r="10" fill="#22C55E" />
        <path d="M7 12l3 3 7-7" stroke="white" strokeWidth="2" fill="none" />
    </svg>
);

export const ProgressIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
        <circle cx="12" cy="12" r="10" fill="#F59E0B" />
        <circle cx="12" cy="12" r="5" fill="white" />
    </svg>
);

export const PendingIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
        <circle cx="12" cy="12" r="10" fill="#EF4444" />
        <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" fill="none" />
    </svg>
);

export const UsersIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg width="18" height="18" viewBox="0 0 24 24" {...props}>
        <circle cx="8" cy="8" r="3" fill="#3B82F6" />
        <circle cx="16" cy="8" r="3" fill="#3B82F6" />
        <path d="M2 20c0-3 3-5 6-5s6 2 6 5" fill="#3B82F6" />
    </svg>
);