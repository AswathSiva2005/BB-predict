import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setEmail(user?.email ?? '');
  }, [user]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setProfileMessage('');
    setLoadingProfile(true);

    try {
      const response = await authApi.updateProfile({ full_name: fullName, email });
      updateProfile({
        ...response.data,
        token: user?.token,
        remember: user?.remember,
      });
      setProfileMessage('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to update profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError('');
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPasswordMessage(response.data.detail);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to change password.');
    } finally {
      setLoadingPassword(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = window.confirm('Delete this account permanently? This will remove your history and cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await authApi.deleteAccount();
      logout();
      navigate('/register', { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail ?? 'Unable to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-[32px] p-7">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-200">Profile</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-white">Account profile and security.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Update your name, email, password, and account settings from one secure panel.</p>
      </motion.div>

      {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel rounded-[32px] p-7">
          <h2 className="font-display text-2xl font-semibold text-white">Account</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <p><span className="text-slate-500">Full name</span><br />{user?.full_name ?? 'Unknown'}</p>
            <p><span className="text-slate-500">Email</span><br />{user?.email ?? 'Unknown'}</p>
            <p><span className="text-slate-500">Session type</span><br />{user?.remember ? 'Remembered on this device' : 'Session only'}</p>
            <p><span className="text-slate-500">Auth status</span><br />{user ? 'Authenticated with JWT' : 'Signed out'}</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => navigator.clipboard?.writeText(user?.email ?? '')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
              Copy email
            </button>
            <button type="button" onClick={() => navigate('/history')} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
              Open history
            </button>
          </div>
        </section>

        <div className="space-y-6">
          <section className="glass-panel rounded-[32px] p-7">
            <h2 className="font-display text-2xl font-semibold text-white">Edit profile</h2>
            <form className="mt-5 space-y-4" onSubmit={saveProfile}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Full name</span>
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Email</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400" />
              </label>
              {profileMessage ? <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{profileMessage}</p> : null}
              <button type="submit" disabled={loadingProfile} className="w-full rounded-2xl bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
                {loadingProfile ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>

          <section className="glass-panel rounded-[32px] p-7">
            <h2 className="font-display text-2xl font-semibold text-white">Change password</h2>
            <form className="mt-5 space-y-4" onSubmit={changePassword}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Current password</span>
                <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">New password</span>
                <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Confirm new password</span>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-teal-400" />
              </label>
              {passwordMessage ? <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{passwordMessage}</p> : null}
              <button type="submit" disabled={loadingPassword} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                {loadingPassword ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </section>

          <section className="glass-panel rounded-[32px] p-7">
            <h2 className="font-display text-2xl font-semibold text-white">Danger zone</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">Delete your account and all associated prediction history permanently.</p>
            <button type="button" disabled={deleting} onClick={deleteAccount} className="mt-5 w-full rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60">
              {deleting ? 'Deleting...' : 'Delete account'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}