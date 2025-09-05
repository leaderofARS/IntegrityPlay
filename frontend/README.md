# IntegrityPlay Frontend

**Modern React-based dashboard for real-time financial market surveillance and fraud detection.**

## Overview

The IntegrityPlay frontend provides an intuitive web interface for monitoring financial market activity, viewing fraud alerts, and analyzing detection results. Built with Next.js 14, TypeScript, and Tailwind CSS.

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts for data visualization
- **Graph Visualization**: Cytoscape.js
- **State Management**: TanStack Query (React Query)
- **HTTP Client**: Axios
- **Testing**: Playwright for end-to-end tests

## Features

### Dashboard
- Real-time KPI cards (total alerts, anchored evidence, average scores)
- Interactive risk score timeline chart
- Alert status overview

### Alerts Management
- Paginated alert listing with search and filtering
- Detailed alert views with evidence data
- Evidence pack downloads
- Risk score visualization

### Settings
- System configuration options
- API key management
- Notification preferences

## Development Setup

### Prerequisites
- Node.js 18+ and npm
- Running IntegrityPlay backend (port 8000)

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Building for Production
```bash
# Build optimized version
npm run build

# Start production server
npm start
```

## API Configuration

The frontend connects to the backend API using environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_KEY=demo_key
```

## Component Architecture

### Pages
- `/` - Home page with system overview
- `/dashboard` - Main surveillance dashboard
- `/alerts` - Alert management interface
- `/alerts/[id]` - Individual alert details
- `/settings` - System configuration

### Key Components
- `TopNav` - Navigation header with branding
- `AlertTable` - Paginated alert listing
- `EventTimelineChart` - Risk score visualization
- `KpiCard` - Metric display cards
- `AlertDetailTabs` - Tabbed alert information

### API Layer
- `lib/api.ts` - Centralized API client with TypeScript types
- Automatic request/response handling
- Error boundary integration

## Testing

### End-to-End Tests
```bash
# Run Playwright tests
npm run test:e2e

# Run tests in headed mode
npx playwright test --headed
```

### Test Coverage
- Demo workflow automation
- Alert generation and display
- Dashboard functionality
- API integration

## Deployment

### Docker (Recommended)
The frontend is containerized and included in the main docker-compose setup:

```yaml
frontend:
  build: ./frontend
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Manual Deployment
```bash
# Build and export static files
npm run build
npm run export

# Serve static files
npx serve out/
```

## Performance Optimizations

- **Code Splitting**: Automatic route-based code splitting
- **Image Optimization**: Next.js Image component
- **Caching**: TanStack Query for API response caching
- **Lazy Loading**: Components loaded on demand
- **Bundle Analysis**: Built-in webpack analyzer

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind CSS for styling
3. Implement proper error boundaries
4. Write E2E tests for new features
5. Ensure responsive design

## Troubleshooting

**Build failures**: Clear node_modules and reinstall
**API connection issues**: Check backend is running on port 8000
**Chart rendering problems**: Verify Recharts/Cytoscape.js compatibility
