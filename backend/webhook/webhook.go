package webhook

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	zenaov1 "github.com/samouraiworld/zenao/backend/zenao/v1"
	"github.com/samouraiworld/zenao/backend/zeni"
	"go.uber.org/zap"
)

type discordWebhook struct {
	Content string `json:"content"`
}

func SendDiscordWebhook(logger *zap.Logger, token, eventName, eventStart, eventEnd, eventLocation, eventURL string) error {

	webhookURL := fmt.Sprintf("https://discord.com/api/webhooks/%s", token)

	message := fmt.Sprintf(
		"🎉 **News Event Zenao !** 🎉\n"+
			"**Nom :** %s\n"+
			"**Start Date :** %s\n"+
			"**End Date :** %s\n"+
			"**Location :** %s\n"+
			"🔗 **Détails :** [Voir l'événement](%s)",
		eventName, eventStart, eventEnd, eventLocation, eventURL,
	)

	payload := discordWebhook{Content: message}
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
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("error sending webhook: %s - %s", resp.Status, string(body))

	}

	logger.Info("Message successfully sent on Discord.!")
	return nil
}

func TrySendDiscordMessage(logger *zap.Logger, token string, evtID string, evt *zenaov1.EventInfo) {
	if token == "" {
		return
	}

	locationStr, err := zeni.LocationToString(evt.Location)
	if err != nil {
		logger.Error("Error getting location string", zap.Error(err))
		return
	}

	eventURL := fmt.Sprintf("https://zenao.io/event/%s", evtID)
	err = SendDiscordWebhook(
		logger,
		token,
		evt.Title,
		time.Unix(int64(evt.StartDate), 0).Format("2006-01-02 15:04:05"),
		time.Unix(int64(evt.EndDate), 0).Format("2006-01-02 15:04:05"),
		locationStr,
		eventURL,
	)
	if err != nil {
		logger.Error("Error sending Discord message", zap.Error(err))
	}
}
