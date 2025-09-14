# Kanban Board Application

A modern, full-stack Kanban board application built with Next.js, featuring real-time collaboration, drag-and-drop functionality, and a clean, intuitive interface.

## ✨ Features

- 📝 **Board Management**
  - Create and customize boards
  - Set board visibility (public/private)
  - Share boards with specific users
  - Real-time board updates

- 📋 **List & Card Management**
  - Create, edit, and archive lists
  - Add, edit, and move cards
  - Drag-and-drop cards between lists
  - Reorder lists with drag-and-drop

- 👥 **User Features**
  - Secure authentication system
  - Personal board dashboard
  - Collaborative board sharing
  - Permission management

- 🔄 **Real-time Collaboration**
  - Live updates across all users
  - Instant card and list movements
  - Real-time title and description updates
  - Connected users synchronization

## 🛠 Tech Stack

### Frontend
- **Next.js 12**: Server-side rendering and API routes
- **React 17**: UI components and state management
- **TypeScript**: Type-safe code
- **@hello-pangea/dnd**: Drag-and-drop functionality
- **Socket.IO Client**: Real-time updates
- **CSS Modules**: Scoped styling

### Backend
- **Next.js API Routes**: RESTful API endpoints
- **MongoDB**: Database
- **Socket.IO**: Real-time communication
- **NextAuth.js**: Authentication
- **JWT**: Token-based security

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn

### Installation Steps

1. **Clone and Setup**
   ```bash
   git clone https://github.com/Rawallon/trello-clone-next.git
   cd trello-clone-next
   npm install
   ```

2. **Environment Configuration**
   Create a `.env.local` file:
   ```env
   # Database
   DATABASE_URL=mongodb://localhost:27017
   MONGODB_DB=kanban

   # Authentication
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   JWT_SECRET=your-jwt-secret

   # App
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000)
   The Socket.IO server runs automatically with the Next.js development server. No separate process needed.

### Production Build
```bash
npm run build
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BASE_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

# Authentication
NEXTAUTH_SECRET=your-secret-key-here

# Database (when using real DB)
DATABASE_URL=mongodb://localhost:27017
MONGODB_DB=trello_clone

# Optional: OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Development
NEXT_PUBLIC_API_MOCKING=enabled
```

## Database Schema Overview

### Core Collections/Tables

```
Users
├── id (string, primary key)
├── email (string, unique)
├── password (string, hashed)
├── name (string)
├── avatar (string, optional)
└── createdAt (datetime)

Workspaces
├── id (string, primary key)
├── name (string)
├── description (string, optional)
├── ownerId (string, foreign key → Users.id)
├── members (array of user IDs)
└── createdAt (datetime)

Boards
├── id (string, primary key)
├── title (string)
├── description (string, optional)
├── workspaceId (string, foreign key → Workspaces.id)
├── author (string, foreign key → Users.id)
├── bgcolor (string, hex color)
├── isPublic (boolean)
├── members (array of user IDs)
└── createdAt (datetime)

Lists
├── id (string, primary key)
├── title (string)
├── boardId (string, foreign key → Boards.id)
├── position (number, for ordering)
└── createdAt (datetime)

Cards
├── id (string, primary key)
├── title (string)
├── description (string, optional)
├── listId (string, foreign key → Lists.id)
├── assignedTo (array of user IDs)
├── position (number, for ordering)
├── dueDate (datetime, optional)
├── labels (array of strings)
├── attachments (array of file URLs)
└── createdAt (datetime)

Activities
├── id (string, primary key)
├── type (string: 'card_created', 'card_moved', etc.)
├── userId (string, foreign key → Users.id)
├── boardId (string, foreign key → Boards.id)
├── entityId (string, card/list ID)
├── metadata (JSON, action-specific data)
└── createdAt (datetime)
```

### Indexing Strategy
- **Users**: Index on `email` for authentication
- **Boards**: Index on `author` and `workspaceId` for user boards lookup
- **Lists**: Compound index on `(boardId, position)` for ordered retrieval
- **Cards**: Compound index on `(listId, position)` for ordered retrieval
- **Activities**: Index on `(boardId, createdAt)` for activity feeds

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/session` - Get current session

### Boards
- `GET /api/boards` - List user boards
- `POST /api/boards` - Create new board
- `GET /api/boards/[id]` - Get board details
- `PUT /api/boards/[id]` - Update board
- `DELETE /api/boards/[id]` - Delete board

### Lists
- `GET /api/boards/[boardId]/lists` - Get board lists
- `POST /api/boards/[boardId]/lists` - Create list
- `PUT /api/lists/[id]` - Update list
- `DELETE /api/lists/[id]` - Delete list

### Cards
- `GET /api/lists/[listId]/cards` - Get list cards
- `POST /api/lists/[listId]/cards` - Create card
- `PUT /api/cards/[id]` - Update card
- `DELETE /api/cards/[id]` - Delete card
- `POST /api/cards/[id]/move` - Move card between lists

### Real-time Events
- `card:created` - New card added
- `card:updated` - Card modified
- `card:moved` - Card moved between lists
- `list:created` - New list added
- `user:joined` - User joined board
- `cursor:move` - Live cursor tracking

## Features

### Core Functionality
- ✅ User authentication (email/password)
- ✅ Board creation and management
- ✅ List creation and ordering
- ✅ Card creation and management
- ✅ Drag-and-drop for cards and lists
- ✅ Real-time collaboration
- ✅ Multi-user workspaces

### Advanced Features
- 🔄 Live cursor tracking
- 🔄 Activity feeds
- 🔄 Card assignments
- 🔄 Due dates and labels
- 🔄 File attachments
- 🔄 Board templates

## Development

### Project Structure
```
src/
├── components/           # Reusable UI components
│   ├── BoardListing/    # Board list and management
│   ├── BoardPage/       # Individual board view
│   ├── Home/           # Landing page
│   └── Icons/          # SVG icons
├── context/            # React Context providers
│   ├── BoardContext   # Board state management
│   ├── CardsContext   # Cards state management
│   ├── ListsContext   # Lists state management
│   └── ModalContext   # Modal state management
├── pages/             # Next.js pages and API routes
│   ├── api/          # Backend API endpoints
│   └── boards/       # Board-related pages
├── styles/           # Global styles and CSS modules
├── types/            # TypeScript type definitions
└── utils/           # Helper functions and utilities
```

### Testing

The project includes comprehensive testing:

```bash
# Run tests in watch mode
npm test

# Generate coverage report
npm run coverage
```

### Test Structure
- Unit tests for components
- Integration tests for API endpoints
- Context provider tests
- Utility function tests

### Code Quality
```bash
npm run lint           # ESLint
npm run type-check     # TypeScript checking
```

## Deployment

The application can be deployed on platforms like Vercel, Netlify, or any Node.js hosting service. For production:

1. Set up a real database (MongoDB/PostgreSQL)
2. Configure environment variables
3. Build and deploy: `npm run build && npm start`

## Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Keep components modular and reusable
- Use CSS Modules for styling
- Follow established naming conventions

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [MongoDB](https://www.mongodb.com/) for the database
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) for drag-and-drop functionality
- [Socket.IO](https://socket.io/) for real-time features
- The open-source community for inspiration and support