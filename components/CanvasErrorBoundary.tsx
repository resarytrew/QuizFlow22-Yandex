import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { Icons } from './QuizEditor/Icons';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[CanvasErrorBoundary] Editor crashed:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-50">
                    <div className="text-center max-w-md p-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 text-red-600 mb-6">
                            <Icons.Warning />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Редактор холста недоступен</h2>
                        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
                            Произошла критическая ошибка при отрисовке холста.
                            Пожалуйста, перезагрузите редактор.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={this.handleReset}
                                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105"
                            >
                                Перезагрузить редактор
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
