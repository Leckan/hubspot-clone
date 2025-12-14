# HubSpot Clone CRM System

A comprehensive customer relationship management (CRM) system built with Next.js 14, TypeScript, Prisma, and Neon PostgreSQL. This application replicates core HubSpot functionality including contact management, deal pipeline tracking, company management, and analytics dashboard.

## Features

- **Contact Management**: Store and organize customer information
- **Deal Pipeline**: Visual Kanban-style deal tracking through sales stages
- **Company Management**: Organize contacts by their associated organizations
- **Activity Tracking**: Log interactions and schedule tasks
- **Analytics Dashboard**: Monitor sales performance and KPIs
- **Authentication**: Secure user authentication with NextAuth.js
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: Neon PostgreSQL
- **Authentication**: NextAuth.js
- **Form Handling**: React Hook Form with Zod validation
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (Note: Next.js 14+ requires Node.js 20.9.0+)
- npm or yarn
- Neon PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hubspot-clone
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your database connection string and other required variables:

```env
DATABASE_URL="###"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

4. Set up the database:

```bash
npm run db:push
npm run db:generate
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Database Schema

The application uses the following main entities:

- **Users**: Authentication and user management
- **Companies**: Business entities that can have multiple contacts
- **Contacts**: Individual people associated with companies
- **Deals**: Sales opportunities with pipeline stages
- **Activities**: Tasks, calls, emails, and other interactions

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── providers/      # Context providers
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── generated/          # Generated Prisma client
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
