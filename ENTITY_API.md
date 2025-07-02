
# Entity API Documentation

This document provides instructions on how to interact with the entity API to retrieve and request information.

## Get Entity Details

This endpoint retrieves the public details of a specific entity.

*   **URL:** `/entities/:id`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization: Bearer <session_token>` (Optional - for authenticated users to get more details)
*   **Example Request:**
    ```bash
    curl -X GET https://central-ring-backend.vercel.app/entities/<your-entity-id>
    ```

*   **Example Success Response (200 OK):**

    ```json
    {
      "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      "typeId": "car",
      "name": "My Classic Car",
      "attributes": [
        {
          "name": "make",
          "type": "string",
          "required": true,
          "value": "Ford"
        },
        {
          "name": "model",
          "type": "string",
          "required": true,
          "value": "Mustang"
        },
        {
          "name": "year",
          "type": "number",
          "required": true,
          "value": 1969
        },
        {
          "name": "color",
          "type": "string",
          "required": false,
          "value": "Red"
        }
      ],
      "entityType": {
        "id": "car",
        "name": "Car",
        "description": "Details about a car",
        "predefinedAttributes": [
            { "name": "make", "type": "string", "required": true },
            { "name": "model", "type": "string", "required": true },
            { "name": "year", "type": "number", "required": true },
            { "name": "color", "type": "string", "required": false }
        ]
      },
      "missingInfoAttributes": ["vin", "mileage"],
      "requestedByUsers": ["user-id-1", "user-id-2"]
    }
    ```

## Request More Information

This endpoint allows an authenticated user to send a message or request specific attributes for an entity.

*   **URL:** `/entities/:id/request-info`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization: Bearer <session_token>` (Required)
    *   `Content-Type: application/json`
*   **Body:**
    *   `message` (string): A custom message to the entity owner.
    *   `attributeNames` (array of strings): A list of specific attributes you are requesting.
*   **Note on User Identification:** The user making the request is identified automatically on the backend via the `<session_token>`. The server validates the token and extracts the user's ID. You do not need to include a `userId` in the request body.
*   **Example Request:**
    ```bash
    curl -X POST https://central-ring-backend.vercel.app/entities/<your-entity-id>/request-info \
      -H "Authorization: Bearer <your-session-token>" \
      -H "Content-Type: application/json" \
      -d '{
            "message": "Could you please provide the engine specifications?",
            "attributeNames": ["engine_type", "horsepower"]
          }'
    ```

*   **Example Success Response (200 OK):**

    ```json
    {
        "message": "Information request recorded successfully."
    }
    ```

