import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[AppErrorBoundary] App crashed:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center max-w-md p-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Что-то пошло не так</h2>
                        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                            Произошла непредвиденная ошибка. Попробуйте перезагрузить страницу.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleReset}
                                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
                            >
                                Попробовать снова
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all"
                            >
                                Перезагрузить страницу
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
