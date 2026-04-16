export function shortId(id: string, length?: "tiny" | "small" | "long" | "full"): string {
	const sizes = {
		tiny: 4,
		small: 17,
		long: 65,
	}
	const trimmedId = id.trim()
	switch (length) {
		case "tiny":
			return trimmedId.slice(0, sizes.tiny)
		case "small":
			return trimmedId.slice(0, sizes.small)
		case "long":
			return trimmedId.slice(0, sizes.long)
		default:
			return trimmedId
	}
}

export function shortNumber(n: number, decimals: number = 0) {
	return new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 1 + decimals }).format(n)
}

export function formatBytes(n: number, decimals: number = 0) {
	const units = [
		{ u: "TB", m: 1e12 },
		{ u: "GB", m: 1e9 },
		{ u: "MB", m: 1e6 },
		{ u: "KB", m: 1e3 },
	]
	for (const u of units) {
		if (n >= u.m) {
			return { value: (n / u.m).toFixed(decimals), unit: u.u }
		}
	}
	return { value: n.toFixed(decimals), unit: "B" }
}

export function formatSeconds(s: number) {
	const days = Math.floor(s / (3600 * 24))
	const hours = Math.floor((s % (3600 * 24)) / 3600)
	const mins = Math.floor((s % 3600) / 60)
	const secs = Math.floor(s % 60)

	const bits = []
	if (days > 0) bits.push(`${days}d`)
	if (hours > 0) bits.push(`${hours}h`)
	if (mins > 0) bits.push(`${mins}min`)
	if (secs > 0) bits.push(`${secs}s`)
	return bits.join(" ")
}

export function roleLabel(role: number | undefined | null) {
	if (role === undefined) return "Unassigned"
	if (role === null) return "Gateway"
	return "Storage"
}