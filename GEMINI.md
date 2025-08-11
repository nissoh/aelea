# Aelea Project Documentation

## Project Overview

Aelea is a functional reactive UI framework for building web applications. It is written in TypeScript and utilizes composable streams to manage application state and UI updates. The project is structured as a monorepo, containing the core `aelea` framework and a `website` that serves as a documentation and example platform.

**Key Technologies:**

*   **Language:** TypeScript
*   **Package Manager:** Bun
*   **UI Framework:** Aelea (self-hosted)
*   **Website Bundler:** Vite
*   **Linting:** Biome

## Building and Running

The project is managed as a Bun monorepo. The following commands are essential for development:

*   **Install Dependencies:**
    ```bash
    bun install
    ```

*   **Build the entire project (aelea and website):**
    ```bash
    bun run build
    ```

*   **Build the `aelea` framework:**
    ```bash
    bun run aelea:build
    ```

*   **Run the website in development mode:**
    ```bash
    cd website
    bun run dev
    ```

*   **Build the website for production:**
    ```bash
    bun run website:build
    ```

*   **Run linter:**
    ```bash
    bun run biome:check
    ```

*   **Run linter and fix issues:**
    ```bash
    bun run biome:check:fix
    ```

## Development Conventions

*   The project uses a monorepo structure with `aelea` and `website` as the main workspaces.
*   The `aelea` package is the core framework, providing streams, UI components, and other utilities.
*   The `website` package is a Vite application that demonstrates the usage of the `aelea` framework.
*   The project uses Biome for code formatting and linting.
*   Changesets are used for versioning and publishing the `aelea` package.
