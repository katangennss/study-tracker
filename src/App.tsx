import { Routes, Route } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import Homework from "./pages/Homework";
import Gpa from "./pages/Gpa";
import Materials from "./pages/Materials";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import ProfileNotifications from "./pages/ProfileNotifications";
import ProfileSettings from "./pages/ProfileSettings";
import ProfileHelp from "./pages/ProfileHelp";
import ProfileAbout from "./pages/ProfileAbout";
import ProfileAddClass from "./pages/ProfileAddClass";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoster from "./pages/AdminRoster";
import AdminHomework from "./pages/AdminHomework";
import AdminSettings from "./pages/AdminSettings";
import AddTask from "./pages/AddTask";
import AddMaterial from "./pages/AddMaterial";
import Login from "./pages/Login";
import SetupNeeded from "./pages/SetupNeeded";
import { useAuth } from "./lib/auth";
import { isSupabaseConfigured } from "./lib/supabase";

export default function App() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="app">
        <SetupNeeded />
      </div>
    );
  }

  if (loading) {
    return <div className="app" />;
  }

  if (!session) {
    return (
      <div className="app">
        <Login />
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/homework" element={<Homework />} />
        <Route path="/gpa" element={<Gpa />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/materials/add" element={<AddMaterial />} />
        <Route path="/homework/add" element={<AddTask />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/notifications" element={<ProfileNotifications />} />
        <Route path="/profile/settings" element={<ProfileSettings />} />
        <Route path="/profile/help" element={<ProfileHelp />} />
        <Route path="/profile/about" element={<ProfileAbout />} />
        <Route path="/profile/add-class" element={<ProfileAddClass />} />
        <Route path="/admin/:groupId" element={<AdminDashboard />} />
        <Route path="/admin/:groupId/roster" element={<AdminRoster />} />
        <Route path="/admin/:groupId/homework" element={<AdminHomework />} />
        <Route path="/admin/:groupId/settings" element={<AdminSettings />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
