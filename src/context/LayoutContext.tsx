'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id?: string;
    username?: string;
    name?: string;
    avatar?: string;
    user?: {
        type: number;
    };
}

interface LayoutContextType {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    isMobile: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
    };

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);

        // Load user from server httpOnly cookie
        // const loadUser = async () => {
        //     const userData = await getServerUserData();
        //     if (userData?.user) {
        //         setUser({
        //             id: userData.user.id,
        //             name: `${userData.user.firstName} ${userData.user.lastName}`,
        //             avatar: userData.user.profilePictureURL,
        //         });
        //     }
        // };
        // loadUser();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <LayoutContext.Provider
            value={{
                sidebarOpen,
                setSidebarOpen,
                isMobile,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
