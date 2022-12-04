/** Appends the argument to the array if the condition is true and returns it. */
export function conditionalAppendArgumentsToArray<T>(condition: boolean, array: T[], elt: T): T[] {
    if (condition) {
        array.push(elt);
    }
    return array;
}

/** Parse JSON from a string and return an JSON object. */
export function parseJSON(str: string) {
    return JSON.parse(
        str
            .trim()
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
    );
}

/** Parse space or comma separated strings into a list. */
export function parseList(listStr: string, sep = ' '): string[] {
    return listStr.split(sep).flatMap((elt: string) => {
        const val = elt.trim();
        return val ? val : [];
    });
}
