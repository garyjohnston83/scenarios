# Product Tech-Stack Document

## Architectural Context

This document outlines the technology stack for our product, categorized by its main architectural components. We focus on providing a comprehensive view of the tools and technologies that form the backbone of our development practices, ensuring high performance and scalability. Designed to foster seamless integration and deployment, this stack supports both the frontend and backend, while catering to modern DevOps practices.

## Technology Categories

### Data Platform
- **Primary Database:** PostgreSQL v15 (v17 if prototyping)
- **Development and Testing Database:** H2 (runtime)
- **Object-Relational Mapping (ORM):** Spring Data JPA

### Backend Services
- **Runtime Environment (CRUD services, Core Business Logic):** Java 21
- **Runtime Environment (Gateways, MCP servers):**
- **Programming Languages:** Java
- **Framework:** Spring Boot 3.x
- **Package Manager for Java:** Maven
- **Testing Framework for Backend:** JUnit
- **JSON and XML Parsing:** Jackson
- **Metrics and Monitoring:** Micrometer

### API Layer
- **RESTful Services Framework:** Spring Boot is used to expose API services, leveraging its robust support for REST patterns alongside JSON serialization/deserialization with Jackson.

### Frontend
- **Language:** TypeScript
- **Framework:** React 19
- **Package Manager for JavaScript:** npm
- **Build Tools:** Webpack
- **Frontend Testing:** Jest
- **UI Component Development and Testing:** Storybook
- **End-to-End Testing:** Playwright
- **Linting:** ESLint for JavaScript/TypeScript

### Additional Tools
- **Containerization and Deployment:** Docker (packaged via jib)
- **Git Hooks Management:** Husky
- **Concurrent Execution:** Concurrently

## Supplementary Content from Global Standard Baseline

### Frontend Tools
- **CSS Framework:** Not standardized (N/A)

### Code Quality Tools
- **Formatting:** Not standardized (N/A)
- **Stylelint (CSS Linting):** Integrated for CSS where applicable

### Other Considerations
While certain tools and configurations are provided, flexibility is encouraged to allow adaptation for specific project needs. Compliance with these standards ensures our products remain robust and easily scalable. Regular evaluations are intended to integrate innovative technologies that may further enhance our solution architecture.