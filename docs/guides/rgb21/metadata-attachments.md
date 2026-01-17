---
sidebar_position: 2
title: Metadata and Attachments
description: Understanding RGB21 metadata formats, file attachments, and content storage strategies
---

# Metadata and Attachments

RGB21 NFTs support rich metadata and file attachments through a flexible type system. This comprehensive guide covers metadata formats, attachment handling, storage strategies, and best practices for NFT content management.

## Metadata Architecture

RGB21 metadata is structured data describing the NFT's properties, appearance, and characteristics. The metadata is validated client-side and can be embedded in the contract or referenced externally via content hashes.

### Metadata vs Attachments

**Metadata**: Structured data defining the NFT
- Token index (unique ID)
- Preview image (embedded, less than 64KB)
- Media reference (external, unlimited size)
- Additional attachments
- Proof of reserves

**Attachments**: File content storage
- Embedded: Stored in contract (SmallBlob, up to 64KB)
- Referenced: Stored externally, hash in contract (unlimited)

## Type System

### TokenData Structure

The core metadata container in RGB21:

```rust
pub struct TokenData {
    pub index: TokenIndex,              // u32 unique ID
    pub preview: Option<EmbeddedMedia>, // Small embedded preview
    pub media: Option<Attachment>,      // Main media reference
    pub attachments: Confined<BTreeMap<u8, Attachment>>,  // Up to 255 attachments
    pub reserves: Option<ProofOfReserves>,
}
```

**Field Breakdown:**

1. **index**: Unique token identifier (u32)
   - Must be unique within the contract
   - Enforced by schema validation
   - Used to match ownership allocations

2. **preview**: Embedded thumbnail/preview
   - Limited to 64KB (SmallBlob)
   - Stored directly in contract state
   - Always available with consignment
   - Best for: Thumbnails, icons, small images

3. **media**: Primary media reference
   - External storage via content hash
   - Unlimited file size
   - MIME type declaration
   - Best for: High-res images, videos, large files

4. **attachments**: Additional files (0-255)
   - Map indexed 0-255
   - Each is an external reference
   - Support multiple file types
   - Best for: Metadata JSON, 3D models, certificates

5. **reserves**: Proof of reserves
   - Optional backing proof
   - Used for asset-backed NFTs

### EmbeddedMedia

Small files stored directly in contract:

```rust
pub struct EmbeddedMedia {
    pub ty: MediaType,    // MIME type
    pub data: SmallBlob,  // Max 64KB (65,535 bytes)
}

// Example
use amplify::confinement::SmallBlob;

let preview = EmbeddedMedia {
    ty: MediaType::with("image/jpeg"),
    data: SmallBlob::try_from_iter(thumbnail_bytes)
        .expect("thumbnail exceeds 64KB"),
};
```

**SmallBlob Constraints:**
- Maximum size: 65,535 bytes (64KB - 1 byte)
- Binary data (no encoding required)
- Efficient for small images, icons
- Increases consignment size

**Use Cases:**
- Thumbnail images (compressed JPEG/WebP)
- Small logos or icons
- SVG graphics (text-based, compresses well)
- Preview frames from videos

### Attachment

External file reference via content hash:

```rust
pub struct Attachment {
    pub ty: MediaType,     // MIME type ("image/jpeg", "video/mp4", etc.)
    pub digest: Bytes,     // SHA-256 hash (32 bytes)
}

// Example
use amplify::Bytes;
use sha2::{Digest, Sha256};

let file_bytes = std::fs::read("artwork.jpg")?;
let mut hasher = Sha256::new();
hasher.update(&file_bytes);
let hash = hasher.finalize();

let attachment = Attachment {
    ty: MediaType::with("image/jpeg"),
    digest: Bytes::from_byte_array(hash),
};
```

**Content Addressing:**
- Hash algorithm: SHA-256 (32 bytes)
- Content is verified by hash
- Storage location is external (IPFS, Arweave, HTTP)
- Hash proves integrity

**Use Cases:**
- Full-resolution artwork
- Video files
- Audio tracks
- 3D models
- PDF documents
- Metadata JSON

### MediaType

MIME type declaration for content:

```rust
pub struct MediaType {
    // Internal string representation
    // Examples: "image/jpeg", "video/mp4", "application/json"
}

impl MediaType {
    pub fn with(mime: &str) -> Self {
        // Creates MediaType from MIME string
    }
}
```

**Common MIME Types:**

| Category | MIME Type | Description |
|----------|-----------|-------------|
| Images | `image/jpeg` | JPEG image |
| | `image/png` | PNG image |
| | `image/gif` | GIF animation |
| | `image/webp` | WebP image |
| | `image/svg+xml` | SVG vector |
| Video | `video/mp4` | MP4 video |
| | `video/webm` | WebM video |
| | `video/quicktime` | MOV video |
| Audio | `audio/mpeg` | MP3 audio |
| | `audio/wav` | WAV audio |
| | `audio/flac` | FLAC audio |
| | `audio/ogg` | OGG audio |
| 3D | `model/gltf-binary` | GLTF/GLB 3D model |
| | `model/gltf+json` | GLTF JSON |
| Documents | `application/pdf` | PDF document |
| | `application/json` | JSON data |
| | `text/plain` | Plain text |
| | `text/html` | HTML document |

**Wildcards:**
```rust
let any_image = MediaType::with("image/*");
let any_video = MediaType::with("video/*");
let any_text = MediaType::with("text/*");
```

## Embedding vs Referencing

### Decision Matrix

| Factor | Embed (preview) | Reference (media) |
|--------|----------------|-------------------|
| File size | < 64KB | Any size |
| Availability | Always with contract | Requires external fetch |
| Consignment size | Increases | Minimal (32 bytes) |
| Verification | Implicit | Hash verification |
| Censorship resistance | Maximum | Depends on storage |
| Best for | Thumbnails, icons | Full-res artwork |

### Embedding Strategy

**Optimal for Preview Images:**

```rust
use image::io::Reader as ImageReader;
use image::ImageFormat;

fn create_thumbnail(
    source_path: &str,
    max_size: u32,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // Load image
    let img = ImageReader::open(source_path)?
        .decode()?;

    // Resize maintaining aspect ratio
    let thumbnail = img.thumbnail(max_size, max_size);

    // Encode as JPEG with compression
    let mut buffer = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buffer);
    thumbnail.write_to(&mut cursor, ImageFormat::Jpeg)?;

    // Verify size constraint
    if buffer.len() > 65535 {
        return Err("Thumbnail still exceeds 64KB after compression".into());
    }

    Ok(buffer)
}

// Use in NFT creation
let thumbnail = create_thumbnail("artwork.jpg", 512)?;
let preview = EmbeddedMedia {
    ty: MediaType::with("image/jpeg"),
    data: SmallBlob::try_from_iter(thumbnail)?,
};
```

**SVG Compression:**

```rust
fn compress_svg(svg_path: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let svg_content = std::fs::read_to_string(svg_path)?;

    // Minify SVG (remove whitespace, comments)
    let minified = svg_content
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.starts_with("<!--"))
        .collect::<Vec<_>>()
        .join("");

    let bytes = minified.as_bytes().to_vec();

    if bytes.len() > 65535 {
        return Err("SVG too large even after minification".into());
    }

    Ok(bytes)
}
```

### Referencing Strategy

**IPFS Upload and Reference:**

```rust
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient};
use sha2::{Digest, Sha256};

async fn upload_and_reference(
    file_path: &str,
    mime_type: &str,
) -> Result<(String, Attachment), Box<dyn std::error::Error>> {
    // Read file
    let file_bytes = std::fs::read(file_path)?;

    // Calculate hash
    let mut hasher = Sha256::new();
    hasher.update(&file_bytes);
    let hash = hasher.finalize();

    // Upload to IPFS
    let client = IpfsClient::from_str("http://localhost:5001")?;
    let file = std::fs::File::open(file_path)?;
    let response = client.add(file).await?;
    let cid = response.hash;

    // Pin for persistence
    client.pin_add(&cid, false).await?;

    // Create attachment
    let attachment = Attachment {
        ty: MediaType::with(mime_type),
        digest: Bytes::from_byte_array(hash),
    };

    Ok((cid, attachment))
}

// Usage
let (image_cid, image_attachment) = upload_and_reference(
    "artwork_4k.jpg",
    "image/jpeg"
).await?;

println!("IPFS CID: {}", image_cid);
println!("Content hash: {:?}", image_attachment.digest);
```

## Multiple Attachments

### Attachment Map Structure

RGB21 supports up to 255 additional attachments:

```rust
use amplify::confinement::Confined;
use std::collections::BTreeMap;

// Create attachment map
let mut attachments_map = BTreeMap::new();

// Index 0: Metadata JSON
attachments_map.insert(0, Attachment {
    ty: MediaType::with("application/json"),
    digest: metadata_hash,
});

// Index 1: 3D Model
attachments_map.insert(1, Attachment {
    ty: MediaType::with("model/gltf-binary"),
    digest: model_hash,
});

// Index 2: Certificate PDF
attachments_map.insert(2, Attachment {
    ty: MediaType::with("application/pdf"),
    digest: cert_hash,
});

// Create confined map (validates size constraints)
let attachments = Confined::try_from(attachments_map)?;
```

### Attachment Indexing Convention

Suggested index allocation:

| Index | Purpose | MIME Type | Description |
|-------|---------|-----------|-------------|
| 0 | Metadata | `application/json` | NFT metadata JSON |
| 1 | 3D Model | `model/gltf-binary` | 3D representation |
| 2 | Certificate | `application/pdf` | Authenticity certificate |
| 3 | Video | `video/mp4` | Animation or video |
| 4 | Audio | `audio/mpeg` | Soundtrack or audio |
| 5-254 | Custom | Various | Project-specific |

### Complete Example with Multiple Attachments

```rust
async fn create_nft_with_attachments() -> Result<TokenData, Box<dyn std::error::Error>> {
    // 1. Create thumbnail for preview
    let thumbnail = create_thumbnail("artwork.jpg", 512)?;
    let preview = EmbeddedMedia {
        ty: MediaType::with("image/jpeg"),
        data: SmallBlob::try_from_iter(thumbnail)?,
    };

    // 2. Upload and hash full-resolution image
    let (image_cid, image_attachment) = upload_and_reference(
        "artwork_4k.jpg",
        "image/jpeg"
    ).await?;

    // 3. Prepare metadata JSON
    let metadata = serde_json::json!({
        "name": "Cyberpunk Cityscape #42",
        "description": "A neon-lit cityscape from the year 2077",
        "attributes": [
            {"trait_type": "Style", "value": "Cyberpunk"},
            {"trait_type": "Time of Day", "value": "Night"},
            {"trait_type": "Rarity", "value": "Epic"}
        ],
        "image": format!("ipfs://{}", image_cid),
        "creator": "Artist Name",
        "license": "CC BY-NC 4.0"
    });

    let metadata_bytes = serde_json::to_vec(&metadata)?;
    let (metadata_cid, metadata_attachment) = upload_and_reference_bytes(
        &metadata_bytes,
        "application/json"
    ).await?;

    // 4. Upload 3D model
    let (model_cid, model_attachment) = upload_and_reference(
        "model.glb",
        "model/gltf-binary"
    ).await?;

    // 5. Create attachment map
    let mut attachments_map = BTreeMap::new();
    attachments_map.insert(0, metadata_attachment);
    attachments_map.insert(1, model_attachment);

    let attachments = Confined::try_from(attachments_map)?;

    // 6. Build TokenData
    let token_data = TokenData {
        index: TokenIndex::from_inner(42),
        preview: Some(preview),
        media: Some(image_attachment),
        attachments,
        reserves: None,
    };

    println!("NFT Created:");
    println!("  Token: #{}", token_data.index);
    println!("  Image: ipfs://{}", image_cid);
    println!("  Metadata: ipfs://{}", metadata_cid);
    println!("  Model: ipfs://{}", model_cid);

    Ok(token_data)
}
```

## Storage Solutions

### IPFS (InterPlanetary File System)

**Advantages:**
- Decentralized content addressing
- Automatic deduplication
- Wide ecosystem support
- Free to use (hosting costs apply)

**Setup:**

```rust
use ipfs_api_backend_hyper::{IpfsApi, IpfsClient, TryFromUri};

// Local IPFS node
let client = IpfsClient::from_str("http://localhost:5001")?;

// Infura IPFS gateway
let client = IpfsClient::from_host_and_port(
    Scheme::HTTPS,
    "ipfs.infura.io",
    5001
)?;
```

**Upload with Metadata:**

```rust
async fn upload_with_tags(
    file_path: &str,
    tags: Vec<(&str, &str)>,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = IpfsClient::from_str("http://localhost:5001")?;

    // Read file
    let file = std::fs::File::open(file_path)?;

    // Add to IPFS
    let response = client.add(file).await?;
    let cid = response.hash.clone();

    // Pin with tags (requires IPFS Cluster or Pinata)
    client.pin_add(&cid, true).await?;

    // Store metadata mapping (external DB)
    store_metadata(&cid, tags).await?;

    Ok(cid)
}
```

**Pinning Services:**

```rust
// Pinata
async fn pin_to_pinata(
    file_path: &str,
    api_key: &str,
    api_secret: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();

    let form = reqwest::multipart::Form::new()
        .file("file", file_path)?;

    let response = client
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS")
        .header("pinata_api_key", api_key)
        .header("pinata_secret_api_key", api_secret)
        .multipart(form)
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;
    let cid = result["IpfsHash"].as_str()
        .ok_or("No IPFS hash in response")?
        .to_string();

    Ok(cid)
}

// web3.storage
async fn pin_to_web3storage(
    file_path: &str,
    token: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let file_bytes = std::fs::read(file_path)?;

    let response = client
        .post("https://api.web3.storage/upload")
        .header("Authorization", format!("Bearer {}", token))
        .header("X-Name", "nft-asset")
        .body(file_bytes)
        .send()
        .await?;

    let result: serde_json::Value = response.json().await?;
    let cid = result["cid"].as_str()
        .ok_or("No CID in response")?
        .to_string();

    Ok(cid)
}
```

**Retrieval and Verification:**

```rust
async fn fetch_and_verify(
    cid: &str,
    expected_hash: &[u8; 32],
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let client = IpfsClient::from_str("http://localhost:5001")?;

    // Fetch content
    let bytes = client.cat(cid)
        .map_ok(|chunk| chunk.to_vec())
        .try_concat()
        .await?;

    // Verify hash
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = hasher.finalize();

    if hash.as_slice() != expected_hash {
        return Err("Content hash mismatch".into());
    }

    Ok(bytes)
}
```

### Arweave (Permanent Storage)

**Advantages:**
- Permanent storage (one-time payment)
- Guaranteed availability
- No ongoing pinning costs
- Good for archival

**Upload:**

```rust
use reqwest::Client;

async fn upload_to_arweave(
    file_path: &str,
    wallet_key: &str,
) -> Result<String, Box<dyn std::error::Error>> {
    let client = Client::new();
    let file_bytes = std::fs::read(file_path)?;

    // Upload to Arweave
    let response = client
        .post("https://arweave.net/tx")
        .header("Content-Type", "application/octet-stream")
        .header("Authorization", format!("Bearer {}", wallet_key))
        .body(file_bytes)
        .send()
        .await?;

    let tx_id = response.text().await?;

    println!("Arweave TX: {}", tx_id);
    println!("URL: https://arweave.net/{}", tx_id);

    Ok(tx_id)
}
```

### Hybrid Multi-Storage

**Maximum redundancy:**

```rust
pub struct MultiStorageUpload {
    pub ipfs_cid: String,
    pub arweave_tx: String,
    pub http_url: Option<String>,
    pub content_hash: [u8; 32],
}

async fn upload_with_redundancy(
    file_path: &str,
    config: &StorageConfig,
) -> Result<MultiStorageUpload, Box<dyn std::error::Error>> {
    let file_bytes = std::fs::read(file_path)?;

    // Calculate hash
    let mut hasher = Sha256::new();
    hasher.update(&file_bytes);
    let content_hash = hasher.finalize().into();

    // Upload to IPFS
    let ipfs_cid = pin_to_web3storage(file_path, &config.web3storage_token).await?;

    // Upload to Arweave
    let arweave_tx = upload_to_arweave(file_path, &config.arweave_key).await?;

    // Optional: Upload to CDN
    let http_url = if let Some(cdn_config) = &config.cdn {
        Some(upload_to_cdn(file_path, cdn_config).await?)
    } else {
        None
    };

    Ok(MultiStorageUpload {
        ipfs_cid,
        arweave_tx,
        http_url,
        content_hash,
    })
}
```

**Metadata with Multiple URLs:**

```json
{
  "name": "Redundant NFT",
  "image": "ipfs://QmXxx...",
  "image_data": "<base64-thumbnail>",
  "alternate_urls": [
    "ipfs://QmXxx...",
    "ar://YYY...",
    "https://cdn.example.com/nft/1.jpg"
  ],
  "content_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

## Metadata Standards

### OpenSea Compatible

```json
{
  "name": "Creature #1",
  "description": "Friendly OpenSea creature",
  "image": "ipfs://QmX.../image.png",
  "external_url": "https://example.com/creature/1",
  "attributes": [
    {
      "trait_type": "Base",
      "value": "Starfish"
    },
    {
      "trait_type": "Eyes",
      "value": "Big"
    },
    {
      "trait_type": "Mouth",
      "value": "Surprised"
    },
    {
      "trait_type": "Level",
      "value": 5,
      "display_type": "number"
    },
    {
      "trait_type": "Stamina",
      "value": 1.4,
      "display_type": "boost_number"
    },
    {
      "trait_type": "Aqua Power",
      "value": 40,
      "display_type": "boost_percentage"
    },
    {
      "trait_type": "Birthday",
      "value": 1704067200,
      "display_type": "date"
    }
  ],
  "background_color": "00FF00"
}
```

### ERC-1155 Compatible

```json
{
  "name": "Asset Name",
  "description": "Asset description",
  "image": "ipfs://QmX.../image.png",
  "properties": {
    "type": "character",
    "rarity": "legendary",
    "edition": 1,
    "max_edition": 1000
  },
  "attributes": [...],
  "localization": {
    "uri": "ipfs://QmX.../locales/{locale}.json",
    "default": "en",
    "locales": ["en", "es", "zh", "ja"]
  }
}
```

### Schema.org Integration

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "Digital Artwork",
  "description": "A unique digital creation",
  "image": "ipfs://QmX.../image.png",
  "creator": {
    "@type": "Person",
    "name": "Artist Name",
    "url": "https://artist.example.com"
  },
  "dateCreated": "2024-01-01",
  "license": "https://creativecommons.org/licenses/by-nc/4.0/",
  "copyrightHolder": {
    "@type": "Organization",
    "name": "Art Studio"
  },
  "associatedMedia": {
    "@type": "MediaObject",
    "contentUrl": "ipfs://QmX.../full.jpg",
    "encodingFormat": "image/jpeg",
    "width": "4096px",
    "height": "4096px"
  }
}
```

## Content Verification

### Hash Verification

```rust
pub fn verify_attachment(
    attachment: &Attachment,
    content: &[u8],
) -> Result<(), String> {
    let mut hasher = Sha256::new();
    hasher.update(content);
    let computed_hash = hasher.finalize();

    if computed_hash.as_slice() != attachment.digest.as_slice() {
        return Err(format!(
            "Hash mismatch: expected {:?}, got {:?}",
            attachment.digest,
            computed_hash
        ));
    }

    Ok(())
}

// Usage
let content = fetch_from_ipfs(&cid).await?;
verify_attachment(&token_data.media.unwrap(), &content)?;
```

### MIME Type Validation

```rust
pub fn validate_mime_type(
    content: &[u8],
    declared_type: &MediaType,
) -> Result<(), String> {
    let detected = infer::get(content)
        .ok_or("Could not detect file type")?;

    let detected_mime = detected.mime_type();

    // Exact match
    if detected_mime == declared_type.as_str() {
        return Ok(());
    }

    // Category match (e.g., image/* matches image/jpeg)
    let declared_str = declared_type.as_str();
    if declared_str.ends_with("/*") {
        let category = declared_str.trim_end_matches("/*");
        if detected_mime.starts_with(category) {
            return Ok(());
        }
    }

    Err(format!(
        "MIME type mismatch: expected {}, detected {}",
        declared_type.as_str(),
        detected_mime
    ))
}
```

### Content Security

```rust
pub fn scan_content_safety(
    content: &[u8],
    mime_type: &MediaType,
) -> Result<(), String> {
    // Check file size limits
    if content.len() > 100_000_000 {  // 100MB
        return Err("File too large".into());
    }

    // Validate image safety
    if mime_type.as_str().starts_with("image/") {
        validate_image_safety(content)?;
    }

    // Validate video safety
    if mime_type.as_str().starts_with("video/") {
        validate_video_safety(content)?;
    }

    Ok(())
}

fn validate_image_safety(data: &[u8]) -> Result<(), String> {
    use image::io::Reader as ImageReader;
    use std::io::Cursor;

    // Try to decode to verify it's a valid image
    let img = ImageReader::new(Cursor::new(data))
        .with_guessed_format()
        .map_err(|e| format!("Invalid image: {}", e))?
        .decode()
        .map_err(|e| format!("Cannot decode image: {}", e))?;

    // Check dimensions
    if img.width() > 10000 || img.height() > 10000 {
        return Err("Image dimensions too large".into());
    }

    Ok(())
}
```

## Advanced Patterns

### Layered NFTs

Composable NFTs with multiple layers:

```rust
pub struct LayeredNft {
    pub base_token: TokenData,
    pub layers: Vec<LayerInfo>,
}

pub struct LayerInfo {
    pub name: String,
    pub z_index: u8,
    pub attachment_index: u8,
    pub blend_mode: Option<String>,
}

// Store layer composition in metadata attachment
let layers_metadata = serde_json::json!({
    "composition": "layered",
    "layers": [
        {
            "name": "Background",
            "z_index": 0,
            "attachment_index": 1,
            "blend_mode": "normal"
        },
        {
            "name": "Character",
            "z_index": 1,
            "attachment_index": 2,
            "blend_mode": "normal"
        },
        {
            "name": "Effects",
            "z_index": 2,
            "attachment_index": 3,
            "blend_mode": "screen"
        }
    ]
});
```

### Dynamic Metadata

Metadata that references mutable external state:

```json
{
  "name": "Dynamic NFT #1",
  "description": "Properties change based on external events",
  "image": "ipfs://QmStatic.../base.png",
  "dynamic_properties": {
    "level": {
      "source": "https://api.game.com/nft/1/level",
      "type": "number"
    },
    "experience": {
      "source": "https://api.game.com/nft/1/xp",
      "type": "number"
    }
  },
  "static_properties": {
    "class": "Warrior",
    "rarity": "Epic"
  }
}
```

**Note**: RGB21 state is immutable. Dynamic properties must be queried from external sources.

### Multi-Resolution Assets

Provide multiple resolutions for different use cases:

```rust
let mut attachments_map = BTreeMap::new();

// Index 0: Metadata with resolution info
attachments_map.insert(0, metadata_attachment);

// Index 1: Thumbnail (256x256)
attachments_map.insert(1, thumbnail_attachment);

// Index 2: Medium (1024x1024)
attachments_map.insert(2, medium_attachment);

// Index 3: High (4096x4096)
attachments_map.insert(3, high_res_attachment);

// Index 4: Original (unlimited)
attachments_map.insert(4, original_attachment);

let token_data = TokenData {
    index: TokenIndex::from_inner(1),
    preview: Some(embedded_thumbnail),
    media: Some(high_res_attachment),  // Default to high-res
    attachments: Confined::try_from(attachments_map)?,
    reserves: None,
};
```

### Metadata Localization

```json
{
  "name": "Artwork",
  "description": "English description",
  "localization": {
    "uri": "ipfs://QmX.../i18n/{locale}.json",
    "default": "en",
    "locales": ["en", "es", "zh", "ja", "ar", "fr"]
  }
}
```

Each locale file (`en.json`, `es.json`, etc.):

```json
{
  "name": "Obra de Arte",
  "description": "Descripción en español",
  "attributes": [
    {
      "trait_type": "Estilo",
      "value": "Abstracto"
    }
  ]
}
```

## Best Practices

### 1. Size Optimization

**Images:**
```rust
// Progressive JPEG
use image::codecs::jpeg::JpegEncoder;

fn optimize_jpeg(
    img: &DynamicImage,
    quality: u8,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut buffer = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut buffer);

    let mut encoder = JpegEncoder::new_with_quality(&mut cursor, quality);
    encoder.encode_image(img)?;

    Ok(buffer)
}

// WebP (better compression)
let webp = webp::Encoder::from_image(img)?
    .encode(85.0);  // Quality 0-100
```

**Videos:**
```bash
# H.264 compression
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset slow \
       -c:a aac -b:a 128k output.mp4

# WebM compression (smaller)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 \
       -c:a libopus output.webm
```

### 2. Redundancy Strategy

**Three-Tier Approach:**

1. **Tier 1**: Embedded thumbnail (always available)
2. **Tier 2**: IPFS primary + pinning service
3. **Tier 3**: Arweave permanent backup

```rust
pub struct RedundantStorage {
    pub embedded: EmbeddedMedia,      // Always available
    pub primary: Attachment,           // IPFS
    pub backup: Option<Attachment>,    // Arweave
}
```

### 3. Privacy Considerations

**Public Metadata:**
- Collection name/description
- Visual artwork
- Trait attributes

**Consider Privacy:**
- Owner identity
- Purchase price
- Personal messages
- Geolocation data
- Private contact info

**Blinded Metadata Pattern:**

```json
{
  "name": "Private Collectible #42",
  "description": "Some details are private",
  "image": "ipfs://QmPublic.../preview.jpg",
  "public_attributes": [
    {"trait_type": "Rarity", "value": "Common"}
  ],
  "private_data_hash": "e3b0c44...",
  "note": "Full metadata available to owner via separate channel"
}
```

### 4. Versioning

**Schema Version:**

```json
{
  "schema_version": "1.0",
  "name": "NFT Name",
  "description": "...",
  "format": "rgb21-metadata-v1"
}
```

### 5. Licensing

**Clear License Declaration:**

```json
{
  "name": "Artwork",
  "license": "CC BY-NC 4.0",
  "license_url": "https://creativecommons.org/licenses/by-nc/4.0/",
  "rights": {
    "commercial_use": false,
    "derivative_works": true,
    "attribution_required": true,
    "resale_allowed": true
  }
}
```

## Troubleshooting

### Common Issues

**"SmallBlob size limit exceeded"**

```rust
// Compress more aggressively
let thumbnail = create_thumbnail("image.jpg", 256)?;  // Reduce from 512
let webp = convert_to_webp(&thumbnail, 75)?;  // Use WebP instead of JPEG
```

**"Content hash mismatch"**

```rust
// Ensure consistent hashing
let content = std::fs::read("file.jpg")?;
let hash = sha256(&content);  // Use same algorithm as when creating attachment
```

**"IPFS content not found"**

```rust
// Verify pinning
let pins = client.pin_ls(None, None).await?;
for pin in pins {
    println!("Pinned: {}", pin.hash);
}

// Re-pin if needed
client.pin_add(&cid, true).await?;
```

**"Attachment index out of range"**

```rust
// Validate index is 0-255
if index > 255 {
    return Err("Attachment index must be 0-255".into());
}
```

## Related Documentation

- [Creating RGB21 NFTs](./creating-nfts.md) - NFT creation guide
- [Transferring NFTs](./transferring-nfts.md) - Transfer workflows
- [RGB21 Interface](../../technical-reference/interfaces.md#rgb21) - Technical spec
- [Strict Types](../../technical-reference/strict-types.md) - Type system details
- [Consignments](../../technical-reference/consignments.md) - Consignment structure

## Next Steps

1. **Optimize your media**: Compress images and videos
2. **Set up IPFS**: Configure local node or use pinning service
3. **Implement verification**: Hash check all referenced content
4. **Plan redundancy**: Use multiple storage providers
5. **Design metadata**: Follow standard schemas for compatibility
