# Parsons Puzzle Web Application

A comprehensive pseudocode-based Parsons Puzzle platform for educational use, supporting student puzzle-solving and instructor puzzle creation with analytics.

## 🎯 Features

### For Students
- **Interactive Puzzle Solving**: Drag-and-drop interface to arrange code blocks
- **Real-time Feedback**: Instant evaluation with detailed hints
- **Progress Tracking**: Monitor your learning journey
- **Multiple Attempts**: Learn from mistakes with retry functionality

### For Instructors
- **Puzzle Creation**: Easy-to-use builder for creating custom puzzles
- **Assignment Management**: Publish puzzles to cohorts with time windows
- **Analytics Dashboard**: Track student performance and identify common errors
- **Flexible Difficulty Levels**: Easy, Medium, and Hard classifications

## 🏗️ Architecture

### Technology Stack
- **Backend**: FastAPI (Python 3.11) with async MongoDB
- **Frontend**: React 18 with Vite
- **Database**: MongoDB 7.0
- **Authentication**: JWT with role-based access control
- **Drag & Drop**: @dnd-kit library
- **Deployment**: Docker & Docker Compose

### Project Structure
```
ParsonPuzzle/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Configuration & database
│   │   ├── models/          # Pydantic models
│   │   └── services/        # Business logic
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   └── services/        # API services
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   cd ParsonPuzzle
   ```

2. **Create environment file**
   ```bash
   copy .env.example .env
   ```
   Edit `.env` and update the `JWT_SECRET_KEY` with a secure random string.

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Local Development (Without Docker)

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start MongoDB** (ensure MongoDB is running on localhost:27017)

5. **Run the server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000

## 📚 API Documentation

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Puzzles (Instructor)
- `POST /puzzles` - Create puzzle
- `GET /puzzles/{id}` - Get puzzle details
- `PUT /puzzles/{id}` - Update puzzle
- `POST /puzzles/{id}/blocks` - Add blocks to puzzle
- `GET /puzzles/{id}/blocks` - Get puzzle blocks

### Assignments
- `POST /assignments` - Publish puzzle to cohort
- `GET /assignments` - Get assignments (filtered by cohort)
- `GET /assignments/{id}/puzzle` - Get puzzle for assignment

### Attempts (Student)
- `POST /attempts` - Start new attempt
- `POST /attempts/{id}/submit` - Submit solution
- `GET /attempts` - Get user's attempts

### Analytics (Instructor)
- `GET /analytics/assignment/{id}` - Assignment statistics
- `GET /analytics/puzzle/{id}` - Puzzle performance
- `GET /analytics/student/{id}` - Student progress

## 🎨 User Interface

The application features a modern, dark-mode design with:
- **Glassmorphism effects** for cards and modals
- **Vibrant gradients** for primary actions
- **Smooth animations** for enhanced UX
- **Responsive layout** for mobile and desktop
- **Drag-and-drop** with visual feedback

## 🔐 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt for password storage
- **RBAC**: Role-based access control (Student/Instructor/Admin)
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Pydantic models for request validation

## 📊 Database Schema

### Collections
- **users**: User accounts with roles and profiles
- **cohorts**: Classes/batches of students
- **puzzles**: Puzzle metadata and configuration
- **puzzle_blocks**: Individual code blocks with correct order
- **assignments**: Published puzzles with time windows
- **attempts**: Student submissions and evaluations

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🚢 Deployment

### Production Build

1. **Update environment variables** in `.env` for production
2. **Build and start services**
   ```bash
   docker-compose up -d --build
   ```

### Environment Variables

Key variables to configure:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET_KEY`: Secret key for JWT (use strong random string)
- `CORS_ORIGINS`: Allowed frontend origins
- `VITE_API_URL`: Backend API URL for frontend

## 📖 Usage Guide

### For Students

1. **Register/Login** with student role
2. **View available puzzles** on the dashboard
3. **Select a puzzle** to start solving
4. **Drag and drop blocks** to arrange them in correct order
5. **Submit solution** to get instant feedback
6. **Review results** and retry if needed

### For Instructors

1. **Register/Login** with instructor role
2. **Create a new puzzle** with title, description, and difficulty
3. **Add code blocks** in the correct order
4. **Publish to cohort** with time window and attempt limits
5. **Monitor analytics** to track student performance

## 🤝 Contributing

This is an academic project. For contributions or issues, please contact the development team.

## 📝 License

This project is developed for educational purposes.

## 👥 Authors

Developed as part of a 3-month academic project for Parsons Puzzle implementation.

## 🆘 Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review the implementation plan
3. Contact the development team

---

**Built with ❤️ for better learning experiences**