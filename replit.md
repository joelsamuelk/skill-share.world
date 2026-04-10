# Overview

This is a skill share web application for St Basil's Redemptive Enterprise community. The application allows community members to create and share their professional profiles, highlighting their expertise and availability for collaboration. The system includes features for profile management, skill assessment via star ratings, password-protected access, and administrative oversight of profile approvals.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built using React with TypeScript and utilizes a modern component-based architecture:
- **UI Framework**: Radix UI components with shadcn/ui design system for consistent styling
- **Styling**: Tailwind CSS with custom CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation for type-safe forms
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
The server follows a RESTful API pattern built with Express.js:
- **Runtime**: Node.js with TypeScript and ES modules
- **Web Framework**: Express.js with middleware for JSON parsing, logging, and error handling
- **Authentication**: Passport.js with OpenID Connect for user authentication (configurable for different providers)
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **Database Layer**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints organized by resource type (auth, profiles, admin)

## Database Design
PostgreSQL database with Drizzle ORM providing type-safe schema definitions:
- **Users Table**: Stores authentication data and admin privileges
- **Skill Profiles Table**: Contains detailed skill assessments with star ratings (1-5) across multiple categories
- **Sessions Table**: Handles secure session storage
- **Access Passwords Table**: Manages password-protected entry to the application

## Authentication & Authorization
Multi-layered security approach:
- **External Authentication**: OpenID Connect integration for user identity (configurable provider)
- **Access Control**: Password protection at the application entry point
- **Session Security**: HTTP-only cookies with secure flags and configurable TTL
- **Admin Privileges**: Role-based access control for profile approval workflows

## Key Features
- **Skill Assessment**: Star-based rating system (1-5) across categories like strategy, marketing, leadership, operations, and social impact
- **Profile Management**: Complete CRUD operations for user skill profiles
- **Approval Workflow**: Admin dashboard for reviewing and approving submitted profiles
- **Search & Discovery**: Filtering and search capabilities for approved profiles
- **Responsive Design**: Mobile-first approach with adaptive layouts

# External Dependencies

## Authentication Services
- **OpenID Connect**: Configurable OIDC provider for user identity verification
- **Session Storage**: PostgreSQL-backed session management via connect-pg-simple

## Database Services  
- **Neon Database**: PostgreSQL serverless database hosting via @neondatabase/serverless
- **Drizzle ORM**: Database toolkit providing schema management, migrations, and type-safe queries

## UI & Styling Libraries
- **Radix UI**: Headless component primitives for accessibility and functionality
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: External font loading for Source Serif 4 and Open Sans

## Development Tools
- **Vite**: Build tool with hot module replacement and development server
- **TypeScript**: Static type checking across the full stack
- **ESBuild**: Fast JavaScript bundler for production builds

## Form & Validation
- **React Hook Form**: Form state management with minimal re-renders
- **Zod**: Schema validation library for runtime type checking
- **@hookform/resolvers**: Integration layer between React Hook Form and Zod

## State Management
- **TanStack Query**: Server state synchronization, caching, and background updates
- **React Context**: Local state management for authentication and UI state