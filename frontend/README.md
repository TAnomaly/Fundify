# Fundify Frontend

Modern crowdfunding platform built with Next.js 15, React, TypeScript, and Tailwind CSS.

## Features

- Modern, responsive UI with purple-blue gradient theme
- Campaign browsing and filtering
- Campaign detail pages with donation forms
- Beautiful animations and transitions
- Dark mode support
- TypeScript for type safety
- Axios for API integration

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Update the environment variables in `.env.local` to point to your backend API.

### Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

Build the application for production:

```bash
npm run build
# or
yarn build
# or
pnpm build
```

### Start Production Server

```bash
npm start
# or
yarn start
# or
pnpm start
```

## Project Structure

```
fundify/frontend/
├── app/                      # Next.js 15 app directory
│   ├── campaigns/           # Campaign pages
│   │   ├── [slug]/         # Dynamic campaign detail page
│   │   └── page.tsx        # Campaign listing page
│   ├── layout.tsx          # Root layout with navigation & footer
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles and Tailwind directives
├── components/
│   └── ui/                 # UI components
│       ├── button.tsx      # Button component with variants
│       └── card.tsx        # Card components
├── lib/
│   ├── api.ts             # Axios instance and API functions
│   ├── types.ts           # TypeScript type definitions
│   └── utils.ts           # Utility functions
├── public/                # Static assets
├── tailwind.config.ts     # Tailwind CSS configuration
├── next.config.ts         # Next.js configuration
├── postcss.config.mjs     # PostCSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Technologies

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Radix UI** - Accessible component primitives
- **Class Variance Authority** - Component variant management

## API Integration

The application uses Axios for API calls. Update `NEXT_PUBLIC_API_URL` in `.env.local` to connect to your backend.

API functions are organized in `/lib/api.ts`:
- `campaignApi` - Campaign CRUD operations
- `donationApi` - Donation operations
- `userApi` - User management
- `authApi` - Authentication

## Customization

### Theme Colors

Edit `/tailwind.config.ts` to customize:
- Gradient colors
- Shadow effects
- Animation timings
- Border radius
- Custom color palette

### Global Styles

Edit `/app/globals.css` to customize:
- CSS custom properties
- Utility classes
- Animations
- Scrollbar styling

## License

MIT

