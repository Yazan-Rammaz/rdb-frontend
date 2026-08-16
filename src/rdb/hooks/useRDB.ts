import { RDBProps } from '@/rdb/types/RDBProps';

export const useRDB = ({ onReceivedAuthToken }: RDBProps) => {
    const handleSplashComplete = () => {
        if (onReceivedAuthToken) {
            onReceivedAuthToken();
        }
    };

    return {
        handleSplashComplete,
    };
};
