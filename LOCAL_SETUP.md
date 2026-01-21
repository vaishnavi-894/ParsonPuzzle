# Local Development Setup Guide

## Prerequisites Check ✅
- Python 3.14.0 ✅
- Node.js v24.12.0 ✅
- MongoDB ❌ (needs installation)

## Step 1: Install MongoDB Community Edition

### Option A: Using Chocolatey (Recommended for Windows)
```powershell
# If you have Chocolatey installed
choco install mongodb

# Start MongoDB service
net start MongoDB
```

### Option B: Manual Installation
1. Download MongoDB Community Server from: https://www.mongodb.com/try/download/community
2. Choose Windows x64, MSI installer
3. Run the installer
4. During installation, select "Install MongoDB as a Service"
5. Complete the installation

### Option C: Use MongoDB Atlas (Cloud - No local install needed)
If you prefer not to install MongoDB locally, you can use MongoDB Atlas free tier:
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free cluster
3. Get your connection string
4. Update `backend/.env` with your Atlas connection string

## Step 2: Verify MongoDB is Running

```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Or try connecting
mongosh
```

## Step 3: Set Up Backend

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

**Backend will be available at:**
- API: http://localhost:8000
- Interactive API Docs: http://localhost:8000/docs

## Step 4: Set Up Frontend (New Terminal)

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend will be available at:** http://localhost:3000

## Step 5: Test the Application

1. Open http://localhost:3000 in your browser
2. Click "Sign up" to create a new account
3. Choose either "Student" or "Instructor" role
4. Login and explore!

## Troubleshooting

### MongoDB Connection Issues
- Make sure MongoDB service is running: `net start MongoDB`
- Check if port 27017 is available
- Verify connection string in `backend/.env`

### Backend Issues
- Make sure virtual environment is activated
- Check if all dependencies installed correctly
- Verify `.env` file exists in backend directory

### Frontend Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check if backend is running on port 8000
- Verify `.env` file exists in frontend directory

## Environment Files

Both `.env` files have been created for you:

**backend/.env**
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=parsons_puzzle
```

**frontend/.env**
```
VITE_API_URL=http://localhost:8000
```

## Quick Commands Reference

**Start Backend:**
```powershell
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Start Frontend:**
```powershell
cd frontend
npm run dev
```

**Start MongoDB (if not running as service):**
```powershell
net start MongoDB
```
