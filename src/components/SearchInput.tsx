import { Search } from 'lucide-react';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}

const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }: SearchInputProps) => (
    <div className={`relative flex-1 md:w-64 ${className}`}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-bg border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:border-primary focus:outline-none"
        />
    </div>
);

export default SearchInput;

