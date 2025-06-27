# Central Ring Project

This project, "Central Ring," is a full-stack application designed to manage entities with custom attributes. It provides a flexible system for defining entity types and then creating instances of those entities, complete with their specific data.

## Key Features

-   **Customizable Entity Types:** Define various types of entities (e.g., Cars, Properties, Books, Software) with their own set of predefined attributes.
-   **Dynamic Entity Management:** Create, view, and manage individual entity instances based on the defined entity types.
-   **User Authentication:** Secure access to certain features using a custom OTP (One-Time Password) authentication flow.
-   **Information Request System:** Logged-in users can request information for specific missing attributes of an entity. Entity owners are notified of these requests.
-   **Interaction Logging:** A detailed log of user interactions with entities is maintained.

## Technical Stack

### Frontend

-   **React:** A JavaScript library for building user interfaces.
-   **Vite:** A fast build tool for modern web projects.
-   **React Router DOM:** For declarative routing in the application.
-   **Axios:** A promise-based HTTP client for making API requests.

### Backend

-   **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine.
-   **Express:** A fast, unopinionated, minimalist web framework for Node.js.
-   **TypeScript:** A superset of JavaScript that adds static types.
-   **Supabase:** An open-source Firebase alternative providing a PostgreSQL database, authentication, and real-time subscriptions. Used for data storage and user session management.
-   **Resend:** An email API for developers, used here for sending OTP emails.

## Project Structure

-   `frontend/`: Contains the React frontend application.
-   `src/`: Contains the Node.js/Express backend application.
-   `GEMINI.md`: Provides specific context and guidelines for the Gemini CLI agent.

## Getting Started

### Prerequisites

-   Node.js (LTS version recommended)
-   npm or Yarn
-   A Supabase project with a PostgreSQL database and authentication enabled.
-   A Resend account with a verified sender email.

### Supabase Setup

1.  **Create Tables:** Ensure the following tables are created in your Supabase project:
    -   `gemini_cli_entity_types`
    -   `gemini_cli_entities`
    -   `otps` (for custom OTP storage)
    Refer to the `GEMINI.md` file for detailed schema information for these tables.
2.  **Enable Row Level Security (RLS):** Configure RLS policies for your tables as needed to control data access.

### Environment Variables

Both the frontend and backend require environment variables. These should be set in your `.env` files for local development and in your deployment platform (e.g., Vercel) for production.

#### Backend (`.env` in `src/` or Vercel Environment Variables)

-   `SUPABASE_URL`: Your Supabase project URL.
-   `SUPABASE_ANON_KEY`: Your Supabase public anon key.
-   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (use with caution, as it bypasses RLS).
-   `RESEND_API_KEY`: Your API key from Resend.
-   `YOUR_RESEND_EMAIL_FROM`: The verified email address you configured in Resend to send emails from.

#### Frontend (`.env` in `frontend/` or Vercel Environment Variables)

-   `VITE_API_BASE_URL`: The base URL of your deployed backend API (e.g., `https://your-backend-api.vercel.app`). For local development, this would typically be `http://localhost:3000`.

### Installation and Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd centralRing
    ```

2.  **Install Backend Dependencies and Build:**
    ```bash
    cd src
    npm install
    npm run build
    cd ..
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

4.  **Start Backend Server:**
    ```bash
    cd src
    npm start
    # Or, for development with nodemon (if installed):
    # npm install -g nodemon
    # nodemon index.ts
    cd ..
    ```

5.  **Start Frontend Development Server:**
    ```bash
    cd frontend
    npm run dev
    cd ..
    ```

    The frontend application should now be running at `http://localhost:5173` (or another port if 5173 is in use).

## Deployment

This project is designed for deployment on Vercel. Ensure your environment variables are correctly configured in your Vercel project settings for both the frontend and backend.

-   The `frontend/vercel.json` file handles client-side routing for the React application.
-   The `vercel.json` file in the project root configures the backend as a Node.js serverless function.
