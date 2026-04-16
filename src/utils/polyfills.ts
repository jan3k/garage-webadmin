export function ObjectGroupBy<T, K extends string>(
	iterable: Iterable<T>,
	callbackfn: (value: T, key: number) => K,
): { [key: string]: T[] } {
	const obj = Object.create(null)
	let i = 0
	for (const value of iterable) {
		const key = callbackfn(value, i++)
		if (key in obj) {
			obj[key].push(value)
		} else {
			obj[key] = [value]
		}
	}
	return obj
}

export function MapGroupBy<T, K extends string>(iterable: Iterable<T>, callbackfn: (value: T, key: number) => K): Map<K, T[]> {
	const map = new Map()
	let i = 0
	for (const value of iterable) {
		const key = callbackfn(value, i++),
			list = map.get(key)
		if (list) {
			list.push(value)
		} else {
			map.set(key, [value])
		}
	}
	return map
}