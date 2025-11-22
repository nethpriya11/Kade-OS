import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Loader } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
    const { user, loading, initialize } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        initialize();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg text-primary">
                <Loader className="animate-spin" size={40} />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
