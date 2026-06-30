import { type ReactNode } from 'react';

interface GlassPanelProps {
    children: ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}

const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

const GlassPanel = ({ children, className = '', padding = 'md' }: GlassPanelProps) => (
    <div className={`glass ${paddingClasses[padding]} rounded-3xl ${className}`}>
        {children}
    </div>
);

export default GlassPanel;

