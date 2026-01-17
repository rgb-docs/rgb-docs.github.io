---
sidebar_position: 1
title: RGB25 Overview
description: Collectible Fungible Assets - Trading cards, game items, limited editions
---

# RGB25: Collectible Fungible Assets

RGB25 is the standard interface for **collectible fungible assets** - items that are fungible within a collection but unique between collections. Think trading cards, game items, or limited edition merchandise.

## What are Collectible Fungibles?

**Collectible fungibles** combine properties of both fungible and non-fungible tokens:

```
Traditional NFTs (RGB21):     Each item is unique
Traditional Tokens (RGB20):   All items are identical
Collectible Fungibles (RGB25): Items fungible within series
```

### Real-World Examples

- **Trading Cards**: 100 copies of "Rare Dragon Card #42"
- **Game Items**: 50 "Legendary Sword" items
- **Event Tickets**: 1000 "VIP Section" tickets
- **Limited Editions**: 500 "Artist Print Series 3" copies
- **Collectibles**: 25 "First Edition Comic #1" copies

## Key Features

### Fungible Within Collection

```rust
// Multiple identical items in a collection
let collection = RGB25::create({
    series: "Pokemon Cards - First Edition",
    items: [
        {
            id: "charizard-holo",
            name: "Charizard Holographic",
            total_supply: 100,  // 100 identical copies
            rarity: "Ultra Rare"
        },
        {
            id: "pikachu-holo",
            name: "Pikachu Holographic",
            total_supply: 500,  // 500 identical copies
            rarity: "Rare"
        }
    ]
});

// Fungibility:
// - All 100 Charizard cards are interchangeable
// - All 500 Pikachu cards are interchangeable
// - But Charizard ≠ Pikachu (different items)
```

### Fractional Ownership

Unlike RGB21 NFTs, RGB25 items can be divided:

```rust
// Fractional ownership example
let ticket = collection.item("vip-section");

// Split ticket 50/50 with friend
ticket.transfer(friend, Fraction::new(1, 2));

// Each person owns 0.5 VIP tickets
// Can combine to redeem full ticket later
```

### Collection Metadata

```rust
pub struct RGB25Collection {
    pub name: String,
    pub description: String,
    pub creator: String,
    pub total_items: u32,
    pub issued: Timestamp,

    // Collection-level media
    pub banner: Option<Media>,
    pub thumbnail: Option<Media>,

    // Royalties apply to entire collection
    pub royalties: Option<Royalty>,
}
```

### Item Metadata

```rust
pub struct CollectibleItem {
    pub item_id: String,
    pub name: String,
    pub description: String,

    // How many copies exist
    pub total_supply: Amount,

    // Rarity/properties
    pub attributes: BTreeMap<String, String>,

    // Item-specific media
    pub media: Media,
    pub preview: Option<EmbeddedMedia>,
}
```

## RGB25 vs RGB20 vs RGB21

| Feature | RGB20 | RGB21 | RGB25 |
|---------|-------|-------|-------|
| **Item Type** | Single token type | Unique items | Item collections |
| **Fungibility** | Fully fungible | Non-fungible | Fungible per item type |
| **Supply** | Single total supply | 1 per NFT | Supply per item |
| **Fractionalization** | ✅ Yes | ❌ No | ✅ Yes |
| **Metadata** | Token-level | NFT-level | Collection + Item levels |
| **Use Case** | Currency, shares | Art, unique items | Cards, game items |

## Creating an RGB25 Collection

### Step 1: Define Collection

```rust
use rgb25::{CollectionParams, ItemDefinition};

let params = CollectionParams {
    name: "Crypto Legends - Series 1".to_string(),
    symbol: "CLGS1".to_string(),
    description: "First series of legendary crypto figures".to_string(),
    creator: "Crypto Art Studio".to_string(),

    // Collection-level media
    banner: Some(Media::ipfs("Qm...")),
    thumbnail: Some(Media::embedded(thumbnail_data)),

    // 5% royalty on all sales
    royalties: Some(Royalty {
        rate: 5.0,
        recipient: royalty_address,
    }),
};
```

### Step 2: Define Items

```rust
let items = vec![
    ItemDefinition {
        item_id: "satoshi-ultra-rare".to_string(),
        name: "Satoshi Nakamoto - Ultra Rare".to_string(),
        description: "The creator, ultimate rarity".to_string(),
        total_supply: 10,  // Only 10 copies exist
        precision: 0,      // Cannot be fractionalized
        attributes: btreemap! {
            "rarity" => "Ultra Rare",
            "power_level" => "9999",
            "edition" => "First Edition",
        },
        media: Media::ipfs("Qm...satoshi"),
        preview: Some(embed_image_64kb(satoshi_thumb)),
    },

    ItemDefinition {
        item_id: "vitalik-rare".to_string(),
        name: "Vitalik Buterin - Rare".to_string(),
        total_supply: 100,  // 100 copies
        precision: 2,       // Can split to 0.01
        attributes: btreemap! {
            "rarity" => "Rare",
            "power_level" => "8500",
        },
        media: Media::ipfs("Qm...vitalik"),
        preview: Some(embed_image_64kb(vitalik_thumb)),
    },

    ItemDefinition {
        item_id: "hal-common".to_string(),
        name: "Hal Finney - Common".to_string(),
        total_supply: 1000,  // 1000 copies
        precision: 2,
        attributes: btreemap! {
            "rarity" => "Common",
            "power_level" => "7000",
        },
        media: Media::ipfs("Qm...hal"),
        preview: Some(embed_image_64kb(hal_thumb)),
    },
];
```

### Step 3: Issue Collection

```rust
use rgb25::RGB25;

let collection = RGB25::issue(
    params,
    items,
    initial_owner_seal
)?;

println!("Collection ID: {}", collection.contract_id());
println!("Total item types: {}", collection.total_items());
println!("Total supply across all items: {}", collection.total_supply());

// Output:
// Collection ID: rgb:5Lz7yEU-WzNouq0Z-YnLjoIYH-vubrACv-skggrJVP-9dIqGdE
// Total item types: 3
// Total supply: 1110 (10 + 100 + 1000)
```

## Item Management

### Check Item Balance

```rust
// Check balance of specific item
let balance = collection.balance_of(
    item_id: "satoshi-ultra-rare",
    owner: my_seal
)?;

println!("I own {} Satoshi Ultra Rare cards", balance);
```

### Transfer Items

```rust
// Transfer specific item type
collection.transfer(
    item_id: "vitalik-rare",
    amount: Amount::from(5),
    recipient: recipient_seal,
    change_seal: my_change_seal
)?;

// Transfer fractional amount
collection.transfer(
    item_id: "vitalik-rare",
    amount: Amount::from_float(2.5),  // 2.5 cards
    recipient: recipient_seal,
    change_seal: my_change_seal
)?;
```

### Burn Items (Redemption)

```rust
// Burn items (e.g., redeem for physical goods)
collection.burn(
    item_id: "hal-common",
    amount: Amount::from(10),
    proof_seal: my_seal
)?;

// Reduces total supply permanently
```

## Advanced Features

### Rarity Systems

```rust
// Query by rarity
let ultra_rare_items = collection.items_by_attribute(
    "rarity",
    "Ultra Rare"
);

let rare_items = collection.items_by_attribute(
    "rarity",
    "Rare"
);

// Automatic rarity percentages
impl RGB25Collection {
    pub fn rarity_distribution(&self) -> BTreeMap<String, f64> {
        let mut distribution = BTreeMap::new();
        let total = self.total_supply();

        for item in self.items() {
            let rarity = item.attributes.get("rarity")?;
            let supply = item.total_supply;
            let percentage = (supply as f64 / total as f64) * 100.0;

            *distribution.entry(rarity.clone()).or_insert(0.0) += percentage;
        }

        distribution
    }
}

// Example output:
// Ultra Rare: 0.9%
// Rare: 9.0%
// Common: 90.1%
```

### Item Evolution/Upgrades

```rust
// Burn 3 common items to mint 1 rare item
pub fn upgrade_items(
    collection: &mut RGB25Collection,
    burn_item: &str,
    burn_amount: Amount,
    mint_item: &str,
    mint_amount: Amount,
) -> Result<(), Error> {
    // Verify upgrade rules
    collection.verify_upgrade_rule(burn_item, burn_amount, mint_item, mint_amount)?;

    // Burn source items
    collection.burn(burn_item, burn_amount)?;

    // Mint upgraded items (if supply allows)
    collection.mint_additional(mint_item, mint_amount)?;

    Ok(())
}

// Example: 3 Commons → 1 Rare
upgrade_items(
    &mut collection,
    "hal-common",
    Amount::from(3),
    "vitalik-rare",
    Amount::from(1)
)?;
```

### Batch Operations

```rust
// Transfer multiple item types in single transaction
let transfers = vec![
    Transfer {
        item_id: "satoshi-ultra-rare",
        amount: Amount::from(1),
        recipient: alice_seal,
    },
    Transfer {
        item_id: "vitalik-rare",
        amount: Amount::from(5),
        recipient: bob_seal,
    },
    Transfer {
        item_id: "hal-common",
        amount: Amount::from(20),
        recipient: charlie_seal,
    },
];

collection.batch_transfer(transfers, change_seal)?;
```

## Schema Structure

```rust
pub struct RGB25Schema {
    // Global state (collection-level)
    pub global_types: BTreeMap<GlobalStateType, GlobalStateSchema> {
        COLLECTION_NAME: GlobalStateSchema::once(StrictStr),
        COLLECTION_DESC: GlobalStateSchema::once(StrictStr),
        TOTAL_ITEMS: GlobalStateSchema::once(U32),
        ROYALTY_RATE: GlobalStateSchema::maybe(U16),
    },

    // Owned state (per-item balances)
    pub owned_types: BTreeMap<OwnedStateType, OwnedStateSchema> {
        ITEM_BALANCES: OwnedStateSchema::Fungible {
            // Item ID → Amount mapping
            item_type: StrictStr,
            amount: Amount64,
        },
    },

    // Transitions
    pub transitions: BTreeMap<TransitionType, TransitionSchema> {
        TRANSFER: TransitionSchema { ... },
        BURN: TransitionSchema { ... },
        MINT_ADDITIONAL: TransitionSchema { ... },
    },
}
```

## Use Cases

### Trading Card Game

```rust
// Pokemon-style trading card game
let pokemon_cards = RGB25::issue(
    CollectionParams {
        name: "Pokemon RGB - Gen 1",
        symbol: "PKMN1",
        total_item_types: 151,  // 151 Pokemon
    },
    items: vec![
        // Each Pokemon is an item type
        ItemDefinition {
            item_id: "001-bulbasaur",
            total_supply: 10000,  // 10k Bulbasaur cards
            attributes: btreemap! {
                "type" => "Grass/Poison",
                "hp" => "45",
                "rarity" => "Common",
            },
        },
        ItemDefinition {
            item_id: "150-mewtwo",
            total_supply: 100,  // Only 100 Mewtwo cards
            attributes: btreemap! {
                "type" => "Psychic",
                "hp" => "106",
                "rarity" => "Legendary",
            },
        },
        // ... 149 more
    ],
)?;
```

### Game Inventory System

```rust
// MMORPG item system
let game_items = RGB25::issue(
    CollectionParams {
        name: "Epic Quest - Legendary Items",
        symbol: "EQLI",
    },
    items: vec![
        ItemDefinition {
            item_id: "legendary-sword",
            total_supply: 50,
            precision: 0,  // Cannot split weapons
            attributes: btreemap! {
                "damage" => "999",
                "durability" => "Unbreakable",
                "class" => "Warrior",
            },
        },
        ItemDefinition {
            item_id: "health-potion",
            total_supply: 1000000,
            precision: 0,
            attributes: btreemap! {
                "healing" => "100",
                "consumable" => "true",
            },
        },
    ],
)?;

// In-game trades via RGB transfers
game_items.transfer("health-potion", 10, player_seal)?;
```

### Event Ticketing

```rust
// Concert with different ticket tiers
let concert_tickets = RGB25::issue(
    CollectionParams {
        name: "Bitcoin 2026 Conference Tickets",
        symbol: "BTC26",
    },
    items: vec![
        ItemDefinition {
            item_id: "vip-pass",
            total_supply: 100,
            precision: 2,  // Can sell half tickets
            attributes: btreemap! {
                "access" => "VIP + General",
                "perks" => "Meet & Greet, Swag Bag",
            },
        },
        ItemDefinition {
            item_id: "general-admission",
            total_supply: 5000,
            precision: 0,  // Whole tickets only
            attributes: btreemap! {
                "access" => "General",
            },
        },
    ],
)?;
```

## See Also

- [RGB20 Tokens](/guides/rgb20/creating-tokens) - Fungible tokens
- [RGB21 NFTs](/guides/rgb21/creating-nfts) - Non-fungible tokens
- [Interfaces Reference](/technical-reference/interfaces#rgb25) - RGB25 specification
- [Contract Schemas](/guides/contracts/schemas) - Schema design
- [Metadata Standards](/guides/rgb21/metadata-attachments) - Metadata formats
