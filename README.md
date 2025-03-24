# 🐳 Running the Project with Docker

To facilitate the deployment and execution of the BandMates application, Docker and Docker Compose are utilized. Follow the steps below to set up and run the project:

## Prerequisites

- Ensure Docker and Docker Compose are installed on your system.
- Verify the Node.js version specified in the Dockerfile (`22.13.1`) is compatible with your environment.

## Environment Variables

- The application requires an `.env` file located in the root directory. This file should contain the necessary environment variables for the application to function correctly.

## Build and Run Instructions

1. Build the Docker images and start the services:

   ```bash
   docker-compose up --build
   ```

2. Access the application at `http://localhost:3000`.

## Services and Ports

- **Application Service**: Exposed on port `3000`.
- **Database Service**: SQLite database managed internally.

## Notes

- The `db_data` volume is used to persist database data.
- The application is configured to restart automatically unless stopped manually.

For further details, refer to the Dockerfile and `docker-compose.yml` provided in the project repository.