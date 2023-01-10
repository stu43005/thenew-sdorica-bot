export class MathUtils {
    public static sum(numbers: number[]): number {
        return numbers.reduce((a, b) => a + b, 0);
    }

    public static clamp(input: number, min: number | undefined, max: number | undefined): number {
        if (typeof min === 'undefined') min = Number.MIN_SAFE_INTEGER;
        if (typeof max === 'undefined') max = Number.MAX_SAFE_INTEGER;
        return Math.min(Math.max(input, min), max);
    }

    public static range(start: number, size: number): number[] {
        return [...Array(size).keys()].map(i => i + start);
    }

    public static ceilToMultiple(input: number, multiple: number): number {
        return Math.ceil(input / multiple) * multiple;
    }

    public static multiply(arg1: number, arg2: number): number {
        let m = 0;
        const s1 = arg1.toString(),
            s2 = arg2.toString();
        try {
            m += s1.split('.')[1].length;
        } catch (e) {}
        try {
            m += s2.split('.')[1].length;
        } catch (e) {}
        return (Number(s1.replace('.', '')) * Number(s2.replace('.', ''))) / Math.pow(10, m);
    }
}
