import React from 'react';
import { Shield, Key, Lock, Clock, Smartphone } from 'lucide-react';

export function SecuritySettings() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Security</h1>
        <p className="text-textSecondary mt-1">Manage authentication policies and secure your enterprise data.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        
        <div className="p-6 border-b border-border flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-textPrimary">Password Policy</h3>
            <p className="text-sm text-textSecondary mt-1">Enforce strong passwords across all user accounts.</p>
            
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-textPrimary">Require uppercase and lowercase letters</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="rounded border-border text-primary focus:ring-primary" />
                <span className="text-sm text-textPrimary">Require numbers and special characters</span>
              </label>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-textPrimary">Minimum password length:</span>
                <input type="number" defaultValue={8} min={6} max={32} className="w-20 bg-background border border-border rounded p-1 text-center text-sm" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-border flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-textPrimary">Two-Factor Authentication (2FA)</h3>
              <p className="text-sm text-textSecondary mt-1">Require users to verify their identity with an authenticator app.</p>
            </div>
            <button className="px-4 py-2 border border-border bg-background rounded-lg text-sm font-medium hover:bg-secondary/10 transition-colors">
              Configure 2FA
            </button>
          </div>
        </div>

        <div className="p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-textPrimary">Session Timeout</h3>
            <p className="text-sm text-textSecondary mt-1">Automatically log out inactive users to prevent unauthorized access.</p>
            
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-textPrimary">Timeout after:</span>
              <select className="bg-background border border-border rounded-lg p-2 text-sm text-textPrimary">
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="never">Never</option>
              </select>
              <span className="text-sm text-textSecondary">of inactivity</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
