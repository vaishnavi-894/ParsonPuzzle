import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Blocks, CheckCircle2, Code2, Sparkles } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
    return (
        <main className="cover-page">
            <section className="cover-hero">
                <div className="cover-copy">
                    <div className="cover-kicker">
                        <Sparkles size={16} />
                        Interactive code ordering practice
                    </div>
                    <h1>Parsons Puzzle</h1>
                    <p>
                        Build algorithms by arranging clean, focused code blocks.
                        Practice logic, loops, and functions in a workspace that feels sharp and calm.
                    </p>
                    <div className="cover-actions">
                        <Link className="btn btn-primary btn-lg" to="/login">
                            Sign in
                            <ArrowRight size={18} />
                        </Link>
                        <Link className="btn btn-secondary btn-lg" to="/register">
                            Create account
                        </Link>
                    </div>
                </div>

                <div className="cover-workspace" aria-label="Puzzle preview">
                    <div className="cover-window-bar">
                        <span />
                        <span />
                        <span />
                    </div>
                    <div className="cover-preview-grid">
                        <div className="cover-code-panel">
                            <div className="cover-panel-title">
                                <Code2 size={16} />
                                Code Editor
                            </div>
                            <div className="cover-line done"><span>1</span>Initialize indexMap</div>
                            <div className="cover-line done"><span>2</span>For each number in arr</div>
                            <div className="cover-line active"><span>3</span>Check complement</div>
                            <div className="cover-line muted"><span>4</span>Return indices</div>
                        </div>
                        <div className="cover-block-panel">
                            <div className="cover-panel-title">
                                <Blocks size={16} />
                                Blocks
                            </div>
                            <div className="cover-block">Put currentNumber into map</div>
                            <div className="cover-block">Return Null</div>
                            <div className="cover-complete">
                                <CheckCircle2 size={18} />
                                2 functions complete
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
