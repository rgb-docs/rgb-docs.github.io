---
sidebar_position: 5
title: RGB Invoices
description: RGB invoice format and payment request specification
---

# RGB Invoices

RGB invoices encode payment requests for RGB assets.

## Invoice Format

```
rgb:<contract_id>:<blinded_utxo>:<amount>[?params]

Example:
rgb:2wHxKf3U9...:utxob1qxy...:1000?expiry=1704067200
```

*Format to be expanded*

## Invoice Structure

```typescript
interface RgbInvoice {
  // Required
  contractId: ContractId;
  recipient: BlindedUtxo;
  amount: bigint;

  // Optional
  expiry?: Timestamp;
  memo?: string;
  routeHints?: RouteHint[];
}
```

*Structure to be expanded*

## Creating Invoices

```typescript
const invoice = await wallet.createInvoice({
  contractId: 'rgb:...',
  amount: 1000n,
  expiry: new Date('2024-12-31'),
  memo: 'Payment for services'
});

console.log(invoice.toString());
// rgb:2wHxKf3U9...:utxob1qxy...:1000?expiry=...
```

*Creation to be expanded*

## Parsing Invoices

```typescript
const invoice = RgbInvoice.parse(invoiceString);

console.log('Asset:', invoice.contractId);
console.log('Amount:', invoice.amount);
console.log('Recipient:', invoice.recipient);
```

*Parsing to be expanded*

## Lightning Invoices

RGB Lightning invoice format:

```
lnrgb:<contract_id>:<payment_hash>:<amount>
```

*Lightning invoices to be expanded*

## QR Codes

```typescript
import QRCode from 'qrcode';

const qr = await QRCode.toDataURL(invoice.toString());
```

*QR encoding to be expanded*

## Related Documentation

- [RGB20 Transfers](../guides/rgb20/transferring-assets.md)
- [API Reference](./api.md)
