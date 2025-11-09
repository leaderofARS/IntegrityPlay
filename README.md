# IntegrityPlay 2.0

AI-Powered Market Surveillance Platform with real-time detection and modern UI.

## Features

- **Real-Time Charts** - Live activity monitoring with 4 interactive charts
- **AI Detection** - Pattern recognition for market manipulation
- **Demo Mode** - Works without backend using mock data
- **Modern UI** - Dark purple/blue theme with smooth animations
- **Case Management** - Track and manage investigations
- **Alert System** - Advanced filtering and search

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11 or 3.12 (for backend)

### Installation

```bash
# Install frontend
cd frontend
npm install

# Install backend
cd ../backend
pip install -r requirements-minimal.txt
```

### Running

**Frontend:**
```bash
cd frontend
npm run dev
```
Access at http://localhost:3000

**Backend (optional):**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Demo Mode

The application works without a backend using realistic mock data:
- 50 pre-generated alerts
- 20 pre-generated cases
- Live updating charts
- Full UI functionality

Try the demo at http://localhost:3000/demo

## Tech Stack

**Frontend:** Next.js 14, React 18, TypeScript, TailwindCSS, Framer Motion, Recharts  
**Backend:** FastAPI, SQLAlchemy, Uvicorn

## License

MIT License - See [LICENSE](LICENSE) for details.
