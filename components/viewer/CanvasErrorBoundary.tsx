'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Cpu } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'WebGL Context or Renderer Failure',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Viewport caught error:', error, errorInfo);
  }

  handleReset = () => {
    // Force safe mode in store
    useAppStore.getState().setIsLowOverheadMode(true);
    useAppStore.getState().clearModel();
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center z-30">
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-800/80 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>

            <h3 className="text-base font-semibold text-zinc-100 mb-1">
              3D Graphics Context Reset
            </h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              The graphics processor (WebGL/GPU) encountered an out-of-memory or timeout event with this 3D model.
            </p>

            <div className="p-3 bg-zinc-950/60 rounded border border-zinc-800/60 font-mono text-[11px] text-zinc-400 mb-5 text-left break-words">
              <span className="text-zinc-500">Status: </span>
              {this.state.errorMessage}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-zinc-100 text-xs font-medium rounded transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Viewport in Safe Low-Overhead Mode
              </button>
              
              <button
                onClick={() => {
                  useAppStore.getState().loadSampleModel('gt');
                  this.setState({ hasError: false, errorMessage: '' });
                }}
                className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded transition-colors flex items-center justify-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Load Verified Lightweight GT Model
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
