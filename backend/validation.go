package main

import (
	"errors"
	"fmt"
	"net/mail"
	"slices"
	"strings"

	"github.com/samouraiworld/zenao/backend/zeni"
)

func validatePasswordLength(password string) error {
	if len(password) > zeni.MaxPasswordLen {
		return errors.New("password too long")
	}
	return nil
}

func validateEmailList(emails []string) error {
	for _, email := range emails {
		if err := validateEmailAddress(email); err != nil {
			return err
		}
	}
	return nil
}

func validateEmailAddress(email string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("invalid guest email address: %w", err)
	}

	guestDomain := strings.Split(email, "@")[1]
	if blacklistedDomains != nil && slices.Contains(blacklistedDomains, guestDomain) {
		return fmt.Errorf("guest email domain %s is not allowed", guestDomain)
	}

	return nil
}
