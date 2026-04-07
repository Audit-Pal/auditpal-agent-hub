export function formatEnum(value: string): string {
    if (!value || value === 'All kinds' || value === 'All categories' || value === 'All platforms') {
        return value;
    }

    return value
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export function formatUsd(value: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
}
