package gzdb

import (
	"fmt"

	"github.com/samouraiworld/zenao/backend/zeni"
	"gorm.io/gorm"
)

type PriceGroup struct {
	gorm.Model
	EventID  uint `gorm:"index"`
	Capacity uint32
	Prices   []Price `gorm:"foreignKey:PriceGroupID"`
}

type Price struct {
	gorm.Model
	PriceGroupID     uint  `gorm:"index"`
	AmountMinor      int64 `gorm:"not null"`
	CurrencyCode     string
	PaymentAccountID *uint           `gorm:"index"`
	PaymentAccount   *PaymentAccount `gorm:"foreignKey:PaymentAccountID"`
}

func dbPriceGroupToZeniPriceGroup(dbGroup *PriceGroup) *zeni.PriceGroup {
	if dbGroup == nil {
		return nil
	}
	group := &zeni.PriceGroup{
		CreatedAt: dbGroup.CreatedAt,
		UpdatedAt: dbGroup.UpdatedAt,
		ID:        fmt.Sprintf("%d", dbGroup.ID),
		EventID:   fmt.Sprintf("%d", dbGroup.EventID),
		Capacity:  dbGroup.Capacity,
	}
	if len(dbGroup.Prices) > 0 {
		group.Prices = make([]*zeni.Price, 0, len(dbGroup.Prices))
		for _, price := range dbGroup.Prices {
			group.Prices = append(group.Prices, dbPriceToZeniPrice(&price))
		}
	}
	if dbGroup.DeletedAt.Valid {
		group.DeletedAt = dbGroup.DeletedAt.Time
	}
	return group
}

func dbPriceToZeniPrice(dbPrice *Price) *zeni.Price {
	if dbPrice == nil {
		return nil
	}
	price := &zeni.Price{
		CreatedAt:    dbPrice.CreatedAt,
		UpdatedAt:    dbPrice.UpdatedAt,
		ID:           fmt.Sprintf("%d", dbPrice.ID),
		PriceGroupID: fmt.Sprintf("%d", dbPrice.PriceGroupID),
		AmountMinor:  dbPrice.AmountMinor,
		CurrencyCode: dbPrice.CurrencyCode,
	}
	if dbPrice.PaymentAccountID != nil {
		price.PaymentAccountID = fmt.Sprintf("%d", *dbPrice.PaymentAccountID)
	}
	if dbPrice.PaymentAccount != nil {
		price.PaymentAccount = dbPaymentAccountToZeniPaymentAccount(dbPrice.PaymentAccount)
	}
	if dbPrice.DeletedAt.Valid {
		price.DeletedAt = dbPrice.DeletedAt.Time
	}
	return price
}
