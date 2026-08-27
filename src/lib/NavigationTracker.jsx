import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();

    // Store the last visited clubId so pages like Feedback can show the correct nav
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const clubId = params.get('clubId');
        if (clubId) {
            localStorage.setItem('lastClubId', clubId);
        }
    }, [location]);
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            base44.appLogs.logUserInApp(pageName).catch(() => {
                // Silently fail - logging shouldn't break the app
            });
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    // Track club logins once per user per club per calendar day (fire and forget, fail silently)
    useEffect(() => {
        if (!isAuthenticated || !user?.email) return;
        const params = new URLSearchParams(location.search);
        const clubId = params.get('clubId') || localStorage.getItem('lastClubId');
        if (!clubId) return;
        const today = new Date().toISOString().slice(0, 10);
        const key = `loginLogged_${clubId}_${today}`;
        if (localStorage.getItem(key)) return;
        base44.functions.invoke('logClubLogin', { club_id: clubId, user_email: user.email })
            .then(() => localStorage.setItem(key, '1'))
            .catch(() => { /* silently fail - logging shouldn't break the app */ });
    }, [isAuthenticated, user, location]);

    return null;
}