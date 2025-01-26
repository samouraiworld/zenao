package main

import "os"

func injectEnv() {
	mappings := map[string]*string{
		"ZENAO_ADMIN_MNEMONIC":    &conf.adminMnemonic,
		"ZENAO_RESEND_SECRET_KEY": &conf.resendSecretKey,
		"ZENAO_CLERK_SECRET_KEY":  &conf.clerkSecretKey,
		"ZENAO_DB":                &conf.dbPath,
		"ZENAO_CHAIN_ENDPOINT":    &conf.chainEndpoint,
		"ZENAO_ALLOWED_ORIGINS":   &conf.allowedOrigins,
	}

	for key, ps := range mappings {
		val := os.Getenv(key)
		if val != "" {
			*ps = val
		}
	}
}
