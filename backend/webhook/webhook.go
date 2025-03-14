package webhook

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"go.uber.org/zap"
)

type DiscordWebhook struct {
	Content string `json:"content"`
}

func SendDiscordWebhook(logger *zap.Logger, token, eventName, eventstart, eventend, eventLocation, eventURL string) error {

	webhookURL := fmt.Sprintf("https://discord.com/api/webhooks/%s", token)

	message := fmt.Sprintf(
		"🎉 **News Event Zenao !** 🎉\n"+
			"**Nom :** %s\n"+
			"**Start Date :** %s\n"+
			"**End Date :** %s\n"+
			"**Location :** %s\n"+
			"🔗 **Détails :** [Voir l'événement](%s)",
		eventName, eventstart, eventend, eventLocation, eventURL,
	)

	payload := DiscordWebhook{Content: message}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("error send webhook: %s", resp.Status)
	}

	logger.Info("Message successfully sent on Discord.!")
	return nil
}
