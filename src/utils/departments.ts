export const CANONICAL_DEPARTMENTS = [
    'Tech',
    'Marketing',
    'Support',
    'Finance',
    'HR&Recruitments',
    'Sector Group',
    'Trade Group',
    'Fleet&Assets',
] as const;

export type CanonicalDepartment = (typeof CANONICAL_DEPARTMENTS)[number];

const LEGACY_DEPARTMENT_ALIASES: Record<string, CanonicalDepartment> = {
    royston: 'Tech',
    roystton: 'Tech',
    chessington: 'Tech',
    'hr & recruitment': 'HR&Recruitments',
    'hr&recruitment': 'HR&Recruitments',
    'hr and recruitment': 'HR&Recruitments',
    'hr & recruitments': 'HR&Recruitments',
    'hr and recruitments': 'HR&Recruitments',
    fleet: 'Fleet&Assets',
    assets: 'Fleet&Assets',
    'fleet & assets': 'Fleet&Assets',
};

const CANONICAL_LOOKUP: Record<string, CanonicalDepartment> = Object.fromEntries(
    CANONICAL_DEPARTMENTS.map((name) => [name.toLowerCase(), name]),
) as Record<string, CanonicalDepartment>;

export const isCanonicalDepartment = (value: string): value is CanonicalDepartment =>
    (CANONICAL_DEPARTMENTS as readonly string[]).includes(value);

export const normalizeDepartmentName = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const lowered = trimmed.toLowerCase();
    if (LEGACY_DEPARTMENT_ALIASES[lowered]) {
        return LEGACY_DEPARTMENT_ALIASES[lowered];
    }

    if (CANONICAL_LOOKUP[lowered]) {
        return CANONICAL_LOOKUP[lowered];
    }

    return trimmed;
};
