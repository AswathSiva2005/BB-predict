# API Documentation

## Authentication

All protected routes require a JWT access token in the `Authorization: Bearer <token>` header.

### `POST /api/auth/register`

Create a new account.

Request body:

```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

### `POST /api/auth/login`

Obtain a JWT access token.

Request body:

```json
{
  "email": "jane@example.com",
  "password": "StrongPass123"
}
```

### `GET /api/auth/me`

Return the authenticated user profile.

### `PUT /api/auth/me`

Update the current user profile.

Request body:

```json
{
  "full_name": "Jane Q. Doe",
  "email": "janeq@example.com"
}
```

### `PUT /api/auth/password`

Change the current password.

Request body:

```json
{
  "current_password": "StrongPass123",
  "new_password": "EvenStronger456"
}
```

### `DELETE /api/auth/me`

Delete the authenticated account.

## Core application endpoints

### `GET /api/dashboard`

Returns dashboard summary, latest prediction, and stock metrics.

### `GET /api/stocks`

Returns tracked stock summaries.

### `GET /api/prediction`

Returns a prediction for a symbol and sample index.

Query parameters:

- `symbol`
- `sample_index`

### `POST /api/predict`

Creates and stores a prediction.

### `GET /api/history`

Returns saved prediction history and training history.

### `GET /api/shap`

Generates SHAP explanations.

### `GET /api/lime`

Generates LIME explanations.

### `POST /api/explain`

Generates and persists SHAP, LIME, or combined explanations.

### `POST /api/train`

Starts a training job for selected symbols.

## Response notes

- Dates are returned as ISO 8601 values.
- Prediction confidence is returned as a decimal probability.
- History objects include the stored input context and explanation payloads when available.
