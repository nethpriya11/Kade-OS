import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

interface POSCartBarProps {
    cartCount: number;
    totalAmount: number;
    onOpen: () => void;
}

const POSCartBar = ({ cartCount, totalAmount, onOpen }: POSCartBarProps) => (
    <AnimatePresence>
        {cartCount > 0 && (
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                className="fixed bottom-6 left-4 right-4 md:left-72 md:right-8 z-30"
            >
                <button
                    onClick={onOpen}
                    className="w-full bg-primary text-bg p-4 rounded-2xl shadow-2xl shadow-primary/30 flex justify-between items-center"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-bg/20 p-2 rounded-lg">
                            <ShoppingBag size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-lg">{cartCount} Items</div>
                            <div className="text-sm opacity-80">View Order</div>
                        </div>
                    </div>
                    <div className="font-bold text-xl">
                        LKR {totalAmount.toLocaleString()}
                    </div>
                </button>
            </motion.div>
        )}
    </AnimatePresence>
);

export default POSCartBar;

