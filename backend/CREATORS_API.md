# Creators API Documentation

## Overview
The Creators API provides endpoints to retrieve information about content creators in the Funify platform.

## Endpoints

### 1. Get All Creators
**GET** `/api/creators`

Retrieves a list of all content creators.

#### Query Parameters
- `limit` (optional): Number of creators to return (default: 20, max: 100)
- `offset` (optional): Number of creators to skip (default: 0)

#### Example Request
```bash
GET /api/creators?limit=10&offset=0
```

#### Example Response
```json
[
  {
    "id": "user1",
    "github_id": null,
    "username": "johncreator",
    "email": "creator1@example.com",
    "display_name": "John Creator",
    "avatar_url": "https://example.com/avatar1.jpg",
    "bio": "I am a content creator",
    "is_creator": true,
    "created_at": "2025-10-23T22:13:26.709409Z",
    "updated_at": "2025-10-23T22:13:26.709409Z"
  }
]
```

### 2. Get Creator by Username
**GET** `/api/creators/{username}`

Retrieves a specific creator by their username.

#### Path Parameters
- `username`: The username of the creator

#### Example Request
```bash
GET /api/creators/johncreator
```

#### Example Response
```json
{
  "id": "user1",
  "github_id": null,
  "username": "johncreator",
  "email": "creator1@example.com",
  "display_name": "John Creator",
  "avatar_url": "https://example.com/avatar1.jpg",
  "bio": "I am a content creator",
  "is_creator": true,
  "created_at": "2025-10-23T22:13:26.709409Z",
  "updated_at": "2025-10-23T22:13:26.709409Z"
}
```

#### Error Responses
- `404 Not Found`: Creator with the specified username not found
- `500 Internal Server Error`: Server error

## Data Model

### User Object
```typescript
interface User {
  id: string;
  github_id?: number;
  username: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_creator: boolean;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

## Testing

Use the provided test script to verify the API endpoints:

```bash
./test_creators_api.sh
```

## Notes
- Only users with `is_creator = true` are returned by these endpoints
- The API uses pagination to handle large datasets efficiently
- All timestamps are in UTC format
