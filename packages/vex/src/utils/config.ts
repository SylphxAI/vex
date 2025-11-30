// ============================================================
// Global Configuration (Valibot Parity)
// ============================================================

// Global config storage
let globalConfig: Record<string, unknown> = {}
let globalMessage: string | ((issue: { message: string }) => string) | undefined
const schemaMessages = new Map<string, string | ((issue: { message: string }) => string)>()
const specificMessages = new Map<string, string | ((issue: { message: string }) => string)>()

/**
 * Get global configuration
 */
export const getGlobalConfig = (): Record<string, unknown> => {
	return { ...globalConfig }
}

/**
 * Set global configuration
 */
export const setGlobalConfig = (config: Record<string, unknown>): void => {
	globalConfig = { ...globalConfig, ...config }
}

/**
 * Delete global configuration
 */
export const deleteGlobalConfig = (): void => {
	globalConfig = {}
}

/**
 * Get global error message
 */
export const getGlobalMessage = ():
	| string
	| ((issue: { message: string }) => string)
	| undefined => {
	return globalMessage
}

/**
 * Set global error message
 */
export const setGlobalMessage = (
	message: string | ((issue: { message: string }) => string)
): void => {
	globalMessage = message
}

/**
 * Delete global error message
 */
export const deleteGlobalMessage = (): void => {
	globalMessage = undefined
}

/**
 * Get schema-specific error message
 */
export const getSchemaMessage = (
	schema: string
): string | ((issue: { message: string }) => string) | undefined => {
	return schemaMessages.get(schema)
}

/**
 * Set schema-specific error message
 */
export const setSchemaMessage = (
	schema: string,
	message: string | ((issue: { message: string }) => string)
): void => {
	schemaMessages.set(schema, message)
}

/**
 * Delete schema-specific error message
 */
export const deleteSchemaMessage = (schema: string): void => {
	schemaMessages.delete(schema)
}

/**
 * Get specific error message by key
 */
export const getSpecificMessage = (
	key: string
): string | ((issue: { message: string }) => string) | undefined => {
	return specificMessages.get(key)
}

/**
 * Set specific error message by key
 */
export const setSpecificMessage = (
	key: string,
	message: string | ((issue: { message: string }) => string)
): void => {
	specificMessages.set(key, message)
}

/**
 * Delete specific error message by key
 */
export const deleteSpecificMessage = (key: string): void => {
	specificMessages.delete(key)
}

/**
 * Configure a schema with options
 *
 * @example
 * const configuredSchema = config(str, { abortEarly: true })
 */
export const config = <T>(schema: T, _options: Record<string, unknown>): T => {
	// Config is primarily for setting options like abortEarly, abortPipeEarly
	// In vex, we don't use these options but provide the function for compatibility
	return schema
}
