package main

import "os"

func injectEnv() {
	mappings := map[string]*string{
		"ZENAO_ADMIN_MNEMONIC":    &conf.adminMnemonic,
		"ZENAO_RESEND_SECRET_KEY": &conf.resendSecretKey,
		"ZENAO_CLERK_SECRET_KEY":  &conf.clerkSecretKey,
		"ZENAO_DB":                &conf.dbPath,
	}

	for key, ps := range mappings {
		val := os.Getenv(key)
		if val != "" {
			*ps = val
		}
	}
}
