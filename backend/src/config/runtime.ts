const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

const parseCsvList = (rawValue?: string): string[] => {
    if (!rawValue) return [];
    return rawValue
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(trimTrailingSlash);
};

export const getFrontendUrl = (): string => {
    const configuredUrl = process.env.FRONTEND_URL?.trim();
    if (configuredUrl) {
        return trimTrailingSlash(configuredUrl);
    }

    return 'http://localhost:5173';
};

export const getAllowedOrigins = (): string[] => {
    const origins = new Set<string>();

    const configuredOrigins = [
        process.env.FRONTEND_URL?.trim(),
        process.env.CLIENT_URL?.trim(),
        ...parseCsvList(process.env.FRONTEND_URLS),
    ];

    for (const origin of configuredOrigins) {
        if (!origin) continue;
        origins.add(trimTrailingSlash(origin));
    }

    if (origins.size === 0) {
        origins.add('http://localhost:5173');
    }

    return Array.from(origins);
};
