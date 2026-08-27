/** Bindings compartilhados pelos dois Workers do Listinia. */
export interface ListiniaEnv {
	DB: D1Database;
	OAUTH_KV: KVNamespace;
	/** O OAuthProvider e o HandlerPadrao leem vars soltas do ambiente. */
	[k: string]: unknown;
}
