import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search } from 'lucide-react';

export interface POSMenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
    large_price: number;
    has_portions: boolean;
    image_url: string | null;
    is_available: boolean;
}

interface POSMenuGridProps {
    items: POSMenuItem[];
    categories: string[];
    selectedCategory: string;
    onCategoryChange: (cat: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    loading: boolean;
    onAddItem: (item: POSMenuItem) => void;
    onSelectPortion: (item: POSMenuItem) => void;
}

const POSMenuGrid = ({ items, categories, selectedCategory, onCategoryChange, searchQuery, onSearchChange, loading, onAddItem, onSelectPortion }: POSMenuGridProps) => {
    const filteredItems = items.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="h-full overflow-y-auto pb-24 px-4 md:px-0">
            <motion.header
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 md:mb-8 sticky top-0 bg-bg z-20 pt-4 pb-2"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-text mb-2">New Order</h1>
                        <p className="text-text-muted text-lg">Select items to build the bowl.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-text focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => onCategoryChange(category)}
                            className={`
                                px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all
                                ${selectedCategory === category
                                    ? 'bg-primary text-bg shadow-lg shadow-primary/25'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-text border border-border'}
                            `}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </motion.header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center text-text-muted py-20">
                    <p className="text-xl">No items found.</p>
                    <p className="text-sm">Try adjusting your search or category.</p>
                </div>
            ) : (
                <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredItems.map(item => (
                            <motion.button
                                layout
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    if (item.has_portions) {
                                        onSelectPortion(item);
                                    } else {
                                        onAddItem(item);
                                    }
                                }}
                                className="glass rounded-2xl hover:bg-surface-hover hover:border-primary/50 transition-all text-left group relative overflow-hidden h-full flex flex-col justify-between"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {item.image_url && (
                                    <div className="h-28 w-full overflow-hidden relative">
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                )}
                                <div className="p-4 md:p-5 relative z-10 w-full flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-bold text-base text-text group-hover:text-primary leading-tight truncate">{item.name}</div>
                                            {item.category && !item.image_url && (
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted bg-bg/50 px-2 py-1 rounded-md">
                                                    {item.category}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm text-text-muted font-medium">LKR {item.price}</div>
                                    </div>
                                    <div className="relative z-10 mt-3 flex justify-between items-center">
                                        {item.category && item.image_url ? (
                                            <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted bg-bg/50 px-2 py-0.5 rounded-md">
                                                {item.category}
                                            </span>
                                        ) : <div />}
                                        <div className="bg-surface p-2 rounded-full text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
};

export default POSMenuGrid;

