# ACSAC Threat Intel Portal

A centralized platform designed for the Aviation Cyber Security Advisory Center (ACSAC) to manage threat intelligence, coordinate incident reporting, and facilitate Information Sharing and Analysis Center (ISAC) insights among member organizations.

## Features

- **Role-Based Access Control**: Tailored dashboards for Admins (Platform), Analysts (Platform), and Members.
- **Threat Intelligence Management**: Complete lifecycle management for Alerts and Advisories—from drafting, to internal review, approval, and publishing.
- **SLA Tracking**: Enforces Service Level Agreements (SLAs) for member responses and visualizations for SLA compliance.
- **ISAC Peer Sharing**: Members can securely share threat insights with the community. Platform analysts can seamlessly escalate these insights into actionable platform-wide alerts, with full traceability.
- **Real-Time Discussion Threads**: Embedded comment threads in ISAC submissions and alert clarifications allow for seamless back-and-forth between members and platform analysts.
- **Incident Reporting**: Secure and structured channels for members to report incidents, attach evidence, and communicate with the ACSAC team.
- **Analytics & Dashboards**: High-level visualizations for intel distribution, member responsiveness, and platform activity.

## Tech Stack

- **Frontend**: React.js (Create React App), Vanilla CSS
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Deployment**: Docker & Docker Compose

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/threat-intel-portal.git
   cd threat-intel-portal
   ```

2. **Start the application with Docker Compose**
   ```bash
   docker compose up -d --build
   ```

   This will spin up three containers:
   - **Database (`threat_intel_db`)**: PostgreSQL database running on port `5432`.
   - **Backend (`threat_intel_backend`)**: FastAPI application running on port `8000`.
   - **Frontend (`threat_intel_frontend`)**: React application running on port `3000`.

3. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`.
   - The backend API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

### Test Accounts

The database is automatically seeded with test data upon initialization. You can use the following default accounts to log in and explore the different roles:

- **Platform Admin**: `admin@platform.local`
- **Platform Analyst**: `analyst@platform.local`
- **Sector Member 1**: `member1@sector.local`
- **Sector Member 2**: `member2@sector.local`

*(Note: There is no password required for local development; selecting the email from the login dropdown handles authentication.)*

## Architecture

- `backend/`: Contains the FastAPI application, database models (`models.py`), Pydantic schemas (`schemas.py`), and API endpoints (`main.py`). The database is seeded on startup via the lifespan context manager.
- `frontend/`: Contains the React application. The UI relies on Vanilla CSS (`index.css`) to enforce a consistent, modern glassmorphism design system.
- `docker-compose.yml`: Orchestrates the PostgreSQL database, backend, and frontend services for easy local development and deployment.

## License

This project is proprietary and confidential.
