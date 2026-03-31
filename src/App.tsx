import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Building2, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Plus, 
  Search, 
  Filter, 
  Download,
  MoreVertical,
  TrendingUp,
  UserCheck,
  Calendar as CalendarIcon,
  Bell
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { Role, User, Church, Branch, Department, Member, Attendance, Report } from './types';

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  toast.error(`Database error: ${errInfo.error}`);
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg",
      active 
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
    )}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

const StatCard = ({ label, value, trend, icon: Icon, color }: { label: string, value: string | number, trend?: string, icon: any, color: string }) => (
  <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
        {trend && (
          <p className="mt-1 text-xs font-medium text-green-600">
            <TrendingUp className="inline w-3 h-3 mr-1" />
            {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data States
  const [churches, setChurches] = useState<Church[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Fetch or create user profile
        const userDoc = await getDoc(doc(db, 'users', fUser.uid));
        if (userDoc.exists()) {
          setUser({ id: fUser.uid, ...userDoc.data() } as User);
        } else {
          // Create default user profile for first-time login
          const newUser: Partial<User> = {
            fullName: fUser.displayName || 'New User',
            email: fUser.email || '',
            role: fUser.email === 'kuteyioluwaloyevincent291@gmail.com' ? 'SUPER_ADMIN' : 'STEWARD',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', fUser.uid), newUser);
          setUser({ id: fUser.uid, ...newUser } as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user) return;

    const qChurches = query(collection(db, 'churches'));
    const unsubChurches = onSnapshot(qChurches, (s) => {
      setChurches(s.docs.map(d => ({ id: d.id, ...d.data() } as Church)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'churches'));

    const qBranches = query(collection(db, 'branches'));
    const unsubBranches = onSnapshot(qBranches, (s) => {
      setBranches(s.docs.map(d => ({ id: d.id, ...d.data() } as Branch)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'branches'));

    const qDepts = query(collection(db, 'departments'));
    const unsubDepts = onSnapshot(qDepts, (s) => {
      setDepartments(s.docs.map(d => ({ id: d.id, ...d.data() } as Department)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'departments'));

    const qMembers = query(collection(db, 'members'));
    const unsubMembers = onSnapshot(qMembers, (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'members'));

    return () => {
      unsubChurches();
      unsubBranches();
      unsubDepts();
      unsubMembers();
    };
  }, [user]);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign in');
    }
  };

  const logout = async () => {
    await signOut(auth);
    toast.success('Signed out');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-black">
        <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-black">
        <div className="w-full max-w-md p-8 bg-white shadow-2xl rounded-3xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-blue-600 rounded-2xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">Stewardly</h1>
          <p className="mt-2 text-center text-gray-500 dark:text-gray-400">Enterprise Church CRM & Management</p>
          
          <button
            onClick={signIn}
            className="flex items-center justify-center w-full gap-3 px-6 py-4 mt-10 font-semibold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
          
          <p className="mt-8 text-xs text-center text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    const data = [
      { name: 'Week 1', attendance: 420 },
      { name: 'Week 2', attendance: 450 },
      { name: 'Week 3', attendance: 480 },
      { name: 'Week 4', attendance: 510 },
    ];

    const deptData = [
      { name: 'Stewards', value: 45 },
      { name: 'Choir', value: 30 },
      { name: 'Media', value: 15 },
      { name: 'Ushers', value: 25 },
    ];

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
            <p className="text-gray-500 dark:text-gray-400">Welcome back, {user.fullName}</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              New Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Members" value={members.length} trend="+12% from last month" icon={Users} color="bg-blue-500" />
          <StatCard label="Total Branches" value={branches.length} icon={MapPin} color="bg-emerald-500" />
          <StatCard label="Active Stewards" value={members.filter(m => m.memberType === 'STEWARD').length} trend="+5% this week" icon={UserCheck} color="bg-amber-500" />
          <StatCard label="Avg Attendance" value="465" trend="+8% vs last month" icon={CalendarIcon} color="bg-indigo-500" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800 lg:col-span-2">
            <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">Attendance Trends</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="attendance" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
            <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">Department Health</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {deptData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMembers = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Members</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your church population and stewards</p>
        </div>
        <button 
          onClick={async () => {
            const name = prompt('Full Name:');
            if (name) {
              await addDoc(collection(db, 'members'), {
                fullName: name,
                churchId: user.churchId || 'default',
                branchId: user.branchId || 'default',
                memberType: 'MEMBER',
                status: 'ACTIVE',
                gender: 'MALE',
                createdAt: new Date().toISOString()
              });
              toast.success('Member added');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search members..." 
              className="w-full py-2 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="pb-4 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="pb-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="pb-4 text-xs font-semibold text-gray-500 uppercase">Branch</th>
                <th className="pb-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="pb-4 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((member) => (
                <tr key={member.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 font-bold text-blue-600 bg-blue-100 rounded-full dark:bg-blue-900/30">
                        {member.fullName[0]}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      member.memberType === 'STEWARD' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {member.memberType}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-gray-600 dark:text-gray-400">
                    {branches.find(b => b.id === member.branchId)?.name || 'Main'}
                  </td>
                  <td className="py-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black font-sans">
      <Toaster position="top-right" richColors />
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 dark:bg-gray-900 dark:border-gray-800 transition-transform lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Stewardly</h1>
          </div>

          <nav className="flex-1 space-y-1">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={Users} label="Members" active={activeTab === 'members'} onClick={() => setActiveTab('members')} />
            <SidebarItem icon={MapPin} label="Branches" active={activeTab === 'branches'} onClick={() => setActiveTab('branches')} />
            <SidebarItem icon={Building2} label="Departments" active={activeTab === 'departments'} onClick={() => setActiveTab('departments')} />
            <SidebarItem icon={ClipboardList} label="Attendance" active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} />
            <SidebarItem icon={TrendingUp} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          </nav>

          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <SidebarItem icon={Settings} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <button
              onClick={logout}
              className="flex items-center w-full gap-3 px-4 py-3 mt-1 text-sm font-medium text-red-600 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 dark:bg-gray-900/80 dark:border-gray-800">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden">
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="flex items-center gap-6 ml-auto">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100 dark:border-gray-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 dark:text-white">{user.fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.fullName[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'members' && renderMembers()}
              {activeTab === 'branches' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Branches</h2>
                      <p className="text-gray-500 dark:text-gray-400">Manage church locations and parishes</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const name = prompt('Branch Name:');
                        if (name) {
                          await addDoc(collection(db, 'branches'), {
                            name,
                            churchId: user.churchId || 'default',
                            status: 'ACTIVE',
                            createdAt: new Date().toISOString()
                          });
                          toast.success('Branch added');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Branch
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {branches.map(branch => (
                      <div key={branch.id} className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 bg-blue-50 rounded-xl dark:bg-blue-900/20">
                            <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                            {branch.status}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{branch.pastorName || 'No Pastor Assigned'}</p>
                        <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-400 uppercase font-bold">Members</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {members.filter(m => m.branchId === branch.id).length}
                            </p>
                          </div>
                          <div className="text-center flex-1">
                            <p className="text-xs text-gray-400 uppercase font-bold">Depts</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {departments.filter(d => d.branchId === branch.id).length}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'departments' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Departments</h2>
                      <p className="text-gray-500 dark:text-gray-400">Manage workforce units and stewards</p>
                    </div>
                    <button 
                      onClick={async () => {
                        const name = prompt('Department Name:');
                        const branchId = prompt('Branch ID (or leave blank for default):') || 'default';
                        if (name) {
                          await addDoc(collection(db, 'departments'), {
                            name,
                            branchId,
                            churchId: user.churchId || 'default',
                            createdAt: new Date().toISOString()
                          });
                          toast.success('Department added');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Department
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {departments.map(dept => (
                      <div key={dept.id} className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {branches.find(b => b.id === dept.branchId)?.name || 'Main Branch'}
                        </p>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-600">
                            {members.filter(m => m.departmentId === dept.id).length} Stewards
                          </span>
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'reports' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h2>
                      <p className="text-gray-500 dark:text-gray-400">Analytics and growth insights</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      <Download className="w-4 h-4" />
                      Generate PDF
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                      <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">Monthly Growth</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { month: 'Jan', members: 400 },
                            { month: 'Feb', members: 420 },
                            { month: 'Mar', members: 450 },
                            { month: 'Apr', members: 480 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="members" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                      <h3 className="mb-6 text-lg font-bold text-gray-900 dark:text-white">Branch Comparison</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={branches.map(b => ({ 
                            name: b.name, 
                            members: members.filter(m => m.branchId === b.id).length 
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="members" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'settings' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>
                    <p className="text-gray-500 dark:text-gray-400">Manage your account and church profile</p>
                  </div>
                  <div className="max-w-2xl space-y-6">
                    <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Church Profile</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Church Name</label>
                          <input type="text" defaultValue="My Church" className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">HQ Address</label>
                          <textarea className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white" rows={3}></textarea>
                        </div>
                        <button className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save Changes</button>
                      </div>
                    </div>
                    <div className="p-6 bg-white border border-gray-100 rounded-2xl dark:bg-gray-900 dark:border-gray-800">
                      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">User Preferences</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Dark Mode</p>
                          <p className="text-sm text-gray-500">Enable dark theme for the interface</p>
                        </div>
                        <button 
                          onClick={() => document.documentElement.classList.toggle('dark')}
                          className="w-12 h-6 bg-gray-200 rounded-full relative transition-colors dark:bg-blue-600"
                        >
                          <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform dark:translate-x-6"></div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
