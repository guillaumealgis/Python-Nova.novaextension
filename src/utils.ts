// Simple object check.
function isObject(item: any) {
    return item && typeof item === 'object' && !Array.isArray(item);
}

// Deep merge two objects.
// https://stackoverflow.com/a/34749873/404321
export function mergeDeep(target: { [key: string]: any }, ...sources: { [key: string]: any }[]) {
    if (!sources.length) {
        return target;
    }

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    Object.assign(target, { [key]: {} });
                }
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}
