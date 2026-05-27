package zeni

import (
	"strings"

	"github.com/stripe/stripe-go/v84"
)

var supportedStripeCurrencies = map[string]struct{}{
	string(stripe.CurrencyAUD): {},
	string(stripe.CurrencyEUR): {},
	string(stripe.CurrencyGBP): {},
	string(stripe.CurrencyNZD): {},
	string(stripe.CurrencyUSD): {},
	string(stripe.CurrencyJPY): {},
}

func IsSupportedStripeCurrency(code string) bool {
	_, ok := supportedStripeCurrencies[strings.ToLower(code)]
	return ok
}

func ListSupportedStripeCurrencies() []string {
	currencies := make([]string, 0, len(supportedStripeCurrencies))
	for currency := range supportedStripeCurrencies {
		currencies = append(currencies, strings.ToUpper(currency))
	}

	return currencies
}
