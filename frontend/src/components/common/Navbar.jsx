import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, User, BookOpen, BarChart3 } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
    const { user, logout, isInstructor } = useAuth();
    const navigate = useNavigate();

    const formatRole = (role) => {
        if (!role) return '';
        return role.charAt(0) + role.slice(1).toLowerCase();
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="navbar-container container">
                <Link to="/" className="navbar-brand">
                    <BookOpen size={24} />
                    <span>Parsons Puzzle</span>
                </Link>

                <div className="navbar-menu">
                    {isInstructor() ? (
                        <>
                            <Link to="/instructor/puzzles" className="nav-link">
                                My Puzzles
                            </Link>
                            <Link to="/instructor/analytics" className="nav-link">
                                <BarChart3 size={18} />
                                Analytics
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/student/puzzles" className="nav-link">
                                Puzzles
                            </Link>
                            <Link to="/student/progress" className="nav-link">
                                My Progress
                            </Link>
                        </>
                    )}

                    <div className="nav-user">
                        <User size={18} />
                        <span>{user.name}</span>
                        <span className="badge badge-primary">{formatRole(user.role)}</span>
                    </div>

                    <button onClick={handleLogout} className="btn btn-secondary">
                        <LogOut size={18} />
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
