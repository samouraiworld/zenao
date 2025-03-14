package webhook

import (

	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

)

// Structure du message Discord
type DiscordWebhook struct {
	Content string `json:"content"`
}

func SendDiscordWebhook(token,eventName, eventstart, eventend, eventLocation,eventURL string) error {


	webhookURL := fmt.Sprintf("https://discord.com/api/webhooks/%s",token)


	message := fmt.Sprintf(
		"🎉 **News Event Zenao !** 🎉\n"+
			"**Nom :** %s\n"+
			"**Start Date :** %s\n"+
			"**End Date :** %s\n"+
			"**Location :** %s\n"+
			"🔗 **Détails :** [Voir l'événement](%s)",
		eventName, eventstart, eventend, eventLocation, eventURL,
	)


	// Création de la charge utile JSON
	payload := DiscordWebhook{Content: message}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	// Envoi de la requête POST
	resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("erreur lors de l'envoi du webhook: %s", resp.Status)
	}

	fmt.Println("Message envoyé avec succès sur Discord !")
	return nil
}
