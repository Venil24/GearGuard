import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, seedDatabase } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Wrench, Loader2, Database } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiLogin(email, password);
      login(response.data.access_token, response.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const response = await seedDatabase();
      toast.success('Database seeded! Use admin@gearguard.com / admin123');
      console.log('Seed credentials:', response.data.credentials);
    } catch (error) {
      if (error.response?.data?.message === 'Database already seeded') {
        toast.info('Database already contains data');
      } else {
        toast.error('Failed to seed database');
      }
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-industrial-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/20 rounded-lg mb-4">
            <Wrench className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white tracking-tight">
            GearGuard
          </h1>
          <p className="text-slate-400 mt-2">Maintenance Management System</p>
        </div>

        {/* Login Card */}
        <Card className="border-white/10 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@gearguard.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="font-mono"
                  data-testid="login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="login-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-center text-slate-400 mb-3">
                Don't have an account?{' '}
                <Link to="/register" className="text-emerald-400 hover:underline">
                  Register
                </Link>
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSeed}
                disabled={seeding}
                data-testid="seed-database-btn"
              >
                {seeding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Demo Data
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-slate-500 mt-2">
                Creates sample teams, equipment, and users
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <div className="text-center space-y-1">
          <p className="text-xs text-slate-500">Demo Credentials (after seeding):</p>
          <p className="font-mono text-xs text-slate-400">
            admin@gearguard.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
};
