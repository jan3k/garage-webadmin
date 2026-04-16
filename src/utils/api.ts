import type { FetchResponse } from "openapi-fetch"

export class HttpError<T> {
	constructor(
		public response: Response,
		public body: T,
	) {}
}

export function successOrThrow<Result extends FetchResponse<any, any, any>>(result: Result): NonNullable<Result["data"]> {
	if (result.data == null) {
		throw new HttpError(result.response, result.error)
	}

	return result.data
}