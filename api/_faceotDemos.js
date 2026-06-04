function firstDemoUrl(...sources) {
    for (const source of sources) {
        const value = source?.demo_url;
        if (Array.isArray(value)) {
            const first = value.find((item) => typeof item === "string" && item.trim());
            if (first) return first.trim();
        }
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

function isSignedDownloadUrl(url) {
    try {
        const parsed = new URL(url);
        const params = parsed.searchParams;
        return (
            params.has("X-Amz-Signature") ||
            params.has("X-Amz-Credential") ||
            params.has("X-Amz-Exipires") ||
            params.has("Signature") ||
            params.has("Expires")
        );
    } catch {
        return false;
    }
}

export function buildFaceitDemoInfo(match, detail) {
    const resourceUrl = firstDemoUrl(detail, match);
    if (!resourceUrl) {
        return {
            demoUrl: null,
            demoResourceUrl: null,
            demoUnavailableReason: null,
        };
    }

    if (isSignedDownloadUrl(resourceUrl)) {
        return {
            demoUrl: resourceUrl,
            demoResourceUrl: resourceUrl,
            demoUnavailableReason: null,
        };
    }

    return {
        demoUrl: null,
        demoResourceUrl: resourceUrl,
        demoUnavailableReason: "FACEIT returned a private demo resource URL. Direct download requires FACEIT Downloads API access to exchange it for a signed URL.",
    };
}