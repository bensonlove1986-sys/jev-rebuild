---
name: "image-media-path-single-source"
description: "Enforces single source of truth for image media paths in UI. Prevents URL re-entry, double normalization, and path corruption when rendering media from Twilio or internal APIs. Invoke when handling image rendering in MessageBubble or media_path processing."
---

# Image Media Path Single Source of Truth

## Overview

This skill enforces strict single source of truth rules for image media paths in frontend applications, preventing URL re-entry, double normalization, and path corruption issues.

## Capabilities

- Define strict rules for image URL construction
- Block re-parsing of imageSrc into message_id or media_sid
- Seal normalizeImageUrl to single execution
- Detect and log path corruption such as MMhttps://
- Provide final, immutable imageSrc for rendering

## Scope

- Frontend
- MessageBubble
- Image rendering
- Media_path handling

## Version

V1

## Seal

This skill is sealed to prevent modifications and ensure consistent behavior.

## Usage Guidelines

### When to Invoke

Invoke this skill when:
- Handling image rendering in MessageBubble components
- Processing media_path fields from messages
- Ensuring image URLs are constructed correctly
- Preventing URL re-entry and double normalization issues

### Forbidden Behaviors

- ❌ Re-parsing imageSrc to extract message_id or media_sid
- ❌ Double normalization (normalize(normalize(x)))
- ❌ Constructing media_path from imageSrc
- ❌ Using useEffect/useMemo to re-construct URLs
- ❌ Falling back to deprecated proxy routes

### Recommended Implementation

```javascript
const getImageUrl = () => {
  const rawMediaPath = message.media_path;
  
  if (!rawMediaPath) {
    console.log('[IMAGE_MISSING_MEDIA_PATH]', getMessageId());
    return '';
  }
  
  const imageSrc = rawMediaPath.startsWith('http')
    ? rawMediaPath
    : `${API_BASE_URL}${rawMediaPath}`;
  
  // One-time seal
  console.log('[IMAGE_URL_SINGLE_SOURCE_OF_TRUTH]');
  console.log('VERSION: V1');
  console.log('RE_ENTRY: FORBIDDEN');
  
  return imageSrc;
};
```

## Validation

Ensure the following:

1. **Network** - Only shows GET /api/media/twilio/MMxxxxxxxxxxxxxxxx/MEyyyyyyyyyyyyyyyy
2. **URL** - Never contains MMhttps://
3. **Logs** - Shows [IMAGE_URL_SINGLE_SOURCE_OF_TRUTH] and related sealing logs
4. **Rendering** - Browser displays image directly

## Error Detection

This skill detects and logs the following errors:

- [IMAGE_MISSING_MEDIA_PATH] - When media_path is missing
- [IMAGE_URL_PATH_CORRUPTION] - When path contains MMhttps:// or other corruption
- [IMAGE_URL_RE_ENTRY] - When normalizeImageUrl is called multiple times
- [IMAGE_URL_DOUBLE_NORMALIZATION] - When normalization is applied twice

## Final Output

The skill provides a final, immutable imageSrc that can be directly used for rendering:

```javascript
const imageSrc = getImageUrl();
// Use imageSrc directly in <img src={imageSrc} />
```