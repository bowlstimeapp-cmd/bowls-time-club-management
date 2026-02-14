/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminBookings from './pages/AdminBookings';
import BookRink from './pages/BookRink';
import ClubAdmin from './pages/ClubAdmin';
import ClubSelector from './pages/ClubSelector';
import MyBookings from './pages/MyBookings';
import PlatformAdmin from './pages/PlatformAdmin';
import ProfileSetup from './pages/ProfileSetup';
import Selection from './pages/Selection';
import SelectionEditor from './pages/SelectionEditor';
import SelectionView from './pages/SelectionView';
import Profile from './pages/Profile';
import ClubSettings from './pages/ClubSettings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBookings": AdminBookings,
    "BookRink": BookRink,
    "ClubAdmin": ClubAdmin,
    "ClubSelector": ClubSelector,
    "MyBookings": MyBookings,
    "PlatformAdmin": PlatformAdmin,
    "ProfileSetup": ProfileSetup,
    "Selection": Selection,
    "SelectionEditor": SelectionEditor,
    "SelectionView": SelectionView,
    "Profile": Profile,
    "ClubSettings": ClubSettings,
}

export const pagesConfig = {
    mainPage: "BookRink",
    Pages: PAGES,
    Layout: __Layout,
};