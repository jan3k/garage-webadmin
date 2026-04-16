import { ref, watch, type Ref } from "vue"

export default <T>(key: string, defaultValue: T): Ref<T> => {
	const item = localStorage.getItem(key)
	const value = ref(item !== null ? (JSON.parse(item) as T) : defaultValue) as Ref<T>

	watch(value, (newValue) => {
		localStorage.setItem(key, JSON.stringify(newValue))
	})

	return value
}