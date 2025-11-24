import React, { useState, useEffect, useRef } from 'react';
import { Calculator as CalcIcon, X, Delete, RotateCcw } from 'lucide-react';

const Calculator = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [display, setDisplay] = useState('0');
    const [equation, setEquation] = useState('');
    const [isNewNumber, setIsNewNumber] = useState(true);

    const handleNumber = (num) => {
        if (isNewNumber) {
            setDisplay(num.toString());
            setIsNewNumber(false);
        } else {
            setDisplay(display === '0' ? num.toString() : display + num);
        }
    };

    const handleOperator = (op) => {
        setEquation(display + ' ' + op + ' ');
        setIsNewNumber(true);
    };

    const handleEqual = () => {
        try {
            // Note: Using eval is generally unsafe, but for a simple local calculator with controlled input, it's acceptable.
            // Alternatively, we could write a simple parser.
            const result = eval((equation + display).replace('x', '*'));
            setDisplay(String(Number(result.toFixed(4)))); // Limit decimals
            setEquation('');
            setIsNewNumber(true);
        } catch (e) {
            setDisplay('Error');
            setIsNewNumber(true);
        }
    };

    const handleClear = () => {
        setDisplay('0');
        setEquation('');
        setIsNewNumber(true);
    };

    const handleBackspace = () => {
        if (display.length > 1) {
            setDisplay(display.slice(0, -1));
        } else {
            setDisplay('0');
            setIsNewNumber(true);
        }
    };

    const handleDecimal = () => {
        if (!display.includes('.')) {
            setDisplay(display + '.');
            setIsNewNumber(false);
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;

            if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
            if (e.key === '.') handleDecimal();
            if (e.key === '+' || e.key === '-') handleOperator(e.key);
            if (e.key === '*') handleOperator('*');
            if (e.key === '/') handleOperator('/');
            if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                handleEqual();
            }
            if (e.key === 'Escape') setIsOpen(false);
            if (e.key === 'Backspace') handleBackspace();
            if (e.key === 'c' || e.key === 'C') handleClear();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, display, equation, isNewNumber]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {/* Calculator Window */}
            {isOpen && (
                <div className="bg-surface border border-border rounded-3xl shadow-2xl w-72 mb-4 animate-in slide-in-from-bottom-10 fade-in duration-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-surface-hover p-3 flex justify-between items-center border-b border-border">
                        <div className="flex items-center gap-2 text-text-muted">
                            <CalcIcon size={18} />
                            <span className="font-bold text-sm">Calculator</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-text-muted hover:text-text transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Display */}
                    <div className="p-4 bg-bg/50 text-right">
                        <div className="text-xs text-text-muted h-4">{equation}</div>
                        <div className="text-3xl font-bold text-text truncate">{display}</div>
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-4 gap-1 p-2 bg-surface">
                        <button onClick={handleClear} className="col-span-2 p-3 rounded-xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors">AC</button>
                        <button onClick={handleBackspace} className="p-3 rounded-xl bg-surface-hover text-text hover:bg-border transition-colors"><Delete size={18} className="mx-auto" /></button>
                        <button onClick={() => handleOperator('/')} className="p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">÷</button>

                        <button onClick={() => handleNumber(7)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">7</button>
                        <button onClick={() => handleNumber(8)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">8</button>
                        <button onClick={() => handleNumber(9)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">9</button>
                        <button onClick={() => handleOperator('*')} className="p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">×</button>

                        <button onClick={() => handleNumber(4)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">4</button>
                        <button onClick={() => handleNumber(5)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">5</button>
                        <button onClick={() => handleNumber(6)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">6</button>
                        <button onClick={() => handleOperator('-')} className="p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">-</button>

                        <button onClick={() => handleNumber(1)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">1</button>
                        <button onClick={() => handleNumber(2)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">2</button>
                        <button onClick={() => handleNumber(3)} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">3</button>
                        <button onClick={() => handleOperator('+')} className="p-3 rounded-xl bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-colors">+</button>

                        <button onClick={() => handleNumber(0)} className="col-span-2 p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">0</button>
                        <button onClick={handleDecimal} className="p-3 rounded-xl bg-surface-hover text-text font-bold hover:bg-border transition-colors">.</button>
                        <button onClick={handleEqual} className="p-3 rounded-xl bg-primary text-bg font-bold hover:opacity-90 transition-opacity">=</button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-surface text-text-muted border border-border' : 'bg-surface border border-border text-text hover:border-primary hover:text-primary'
                    }`}
                title="Quick Calculator"
            >
                {isOpen ? <X size={24} /> : <CalcIcon size={24} />}
            </button>
        </div>
    );
};

export default Calculator;
