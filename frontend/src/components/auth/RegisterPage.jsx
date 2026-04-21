import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'STUDENT'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const passwordChecks = [
        {
            label: 'At least 10 characters',
            valid: formData.password.length >= 10,
        },
        {
            label: 'One uppercase letter',
            valid: /[A-Z]/.test(formData.password),
        },
        {
            label: 'One lowercase letter',
            valid: /[a-z]/.test(formData.password),
        },
        {
            label: 'One number',
            valid: /\d/.test(formData.password),
        },
        {
            label: 'One special character',
            valid: /[^A-Za-z0-9]/.test(formData.password),
        },
    ];

    const passedChecks = passwordChecks.filter(check => check.valid).length;
    const strengthPct = (passedChecks / passwordChecks.length) * 100;
    const strengthLabel =
        passedChecks <= 2 ? 'Needs work' :
        passedChecks <= 4 ? 'Good' :
        'Strong';
    const strengthClass =
        passedChecks <= 2 ? 'weak' :
        passedChecks <= 4 ? 'medium' :
        'strong';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passedChecks < passwordChecks.length) {
            setError('Please create a stronger password before signing up');
            return;
        }

        setLoading(true);

        const result = await register(
            formData.name,
            formData.email,
            formData.password,
            formData.role
        );

        if (result.success) {
            navigate('/login');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card card fade-in">
                <div className="auth-header">
                    <h1>Create Account</h1>
                    <p className="text-secondary">Join the learning community</p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="input"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            name="role"
                            className="input"
                            value={formData.role}
                            onChange={handleChange}
                        >
                            <option value="STUDENT">Student</option>
                            <option value="INSTRUCTOR">Instructor</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-input-shell">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input password-input"
                                placeholder="Create a secure password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className={`password-strength-card ${strengthClass}`}>
                            <div className="password-strength-header">
                                <div className="password-strength-title">
                                    <ShieldCheck size={16} />
                                    <span>Password strength</span>
                                </div>
                                <span className={`strength-badge ${strengthClass}`}>{strengthLabel}</span>
                            </div>

                            <div className="strength-meter">
                                <div
                                    className={`strength-meter-fill ${strengthClass}`}
                                    style={{ width: `${strengthPct}%` }}
                                />
                            </div>

                            <div className="password-checklist">
                                {passwordChecks.map((check) => (
                                    <div
                                        key={check.label}
                                        className={`password-check-item ${check.valid ? 'valid' : ''}`}
                                    >
                                        {check.valid ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                                        <span>{check.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="password-input-shell">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="input password-input"
                                placeholder="Type it again"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p className="text-secondary">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
