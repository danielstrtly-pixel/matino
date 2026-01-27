# Prishantering i Matino

## Översikt

Matino hanterar två typer av priser:
1. **Styckpris** - t.ex. "29 kr" för en enskild produkt
2. **Paketpris** - t.ex. "3 för 89 kr" (multi-buy erbjudanden)

## Databasschema

Tabellen `offers` har följande prisrelaterade fält:

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| `offer_price` | decimal | **Paketpriset** - det pris kunden betalar (t.ex. 89 för "3 för 89 kr") |
| `quantity` | integer | Antal produkter i erbjudandet (t.ex. 3 för "3 för 89 kr"), `null` för styckpris |
| `quantity_price` | decimal | **Styckpris för jämförelse** (t.ex. 29.67 för "3 för 89 kr"), `null` för styckpris |
| `original_price` | decimal | Ordinarie pris (före rabatt), `null` om okänt |
| `unit` | string | Enhet för priset (t.ex. "kg", "st", "l") |

## Prislogik

### Styckpris (quantity = null)
```
offer_price = 29.00
quantity = null
quantity_price = null
```
Visas som: **29,00 kr**

### Paketpris (quantity > 1)
```
offer_price = 89.00      # Totalt paketpris
quantity = 3             # Antal i paketet
quantity_price = 29.67   # Beräknat styckpris (89/3)
```
Visas som: **3 för 89,00 kr** (29,67 kr/st)

## Scrapers

Alla scrapers (ICA, Coop, Hemköp, Lidl) följer samma konvention:

1. Letar efter mönstret "X för Y kr" i pristexten
2. Om hittat:
   - `offer_price` = Y (totalpriset)
   - `quantity` = X (antal)
   - `quantity_price` = Y / X (uträknat styckpris)
3. Om inte hittat:
   - `offer_price` = priset
   - `quantity` = null
   - `quantity_price` = null

### Kodexempel (från coop.ts)
```typescript
const multiMatch = text.match(/(\d+)\s*för\s*(\d+)\s*kr/i);
if (multiMatch) {
  quantity = parseInt(multiMatch[1]);
  offerPrice = parseInt(multiMatch[2]);
  quantityPrice = Math.round((offerPrice / quantity) * 100) / 100;
}
```

## Frontend

### Deals-sidan (`/dashboard/deals`)

Priset visas med följande logik:

```typescript
const isMultiBuy = offer.quantity && offer.quantity > 1;
const priceText = isMultiBuy
  ? `${offer.quantity} för ${formatPrice(offer.offerPrice)} kr`
  : `${formatPrice(offer.offerPrice)} kr`;
const perUnitText = isMultiBuy && offer.quantityPrice
  ? `(${formatPrice(offer.quantityPrice)} kr/st)`
  : null;
```

### Visningsformat

| Typ | Pris-badge | Under produktnamn |
|-----|-----------|-------------------|
| Styck | 29,00 kr | 29,00 kr |
| Paket | 3 för 89,00 kr | 3 för 89,00 kr (29,67 kr/st) |

## Historik

- **2026-01-27**: Implementerade korrekt hantering av paketpriser
  - Fixade scrapers för ICA, Coop, Hemköp, Lidl
  - Uppdaterade frontend för att visa "X för Y kr" korrekt
  - Tidigare visades styckpris felaktigt som paketpris

## Framtida förbättringar

- [ ] Visa jämförelsepris per kg/l för viktbaserade produkter
- [ ] Beräkna faktisk besparing vs ordinarie pris
- [ ] Sortera erbjudanden efter styckpris för enklare jämförelse
