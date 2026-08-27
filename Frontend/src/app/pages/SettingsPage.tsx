import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { motion } from 'motion/react';
import { getEmail } from '../api/auth';

export function SettingsPage() {
  // Hardware Specs
  const [ratedPower, setRatedPower] = useState('540');
  const [avgSunHours, setAvgSunHours] = useState('6.5');

  // Financial
  const [electricityTariff, setElectricityTariff] = useState('0.18');
  const [cleaningCost, setCleaningCost] = useState('8');
  const [repairCost, setRepairCost] = useState('200');

  // AI Logic Thresholds
  const [criticalHotspotLimit, setCriticalHotspotLimit] = useState('15');

  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      const email = getEmail();
      if (!email) return;
      try {
        const response = await fetch(`http://localhost:5000/settings?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          const s = data.settings || {};
          if (s.ratedPower) setRatedPower(s.ratedPower);
          if (s.avgSunHours) setAvgSunHours(s.avgSunHours);
          if (s.electricityTariff) setElectricityTariff(s.electricityTariff);
          if (s.cleaningCost) setCleaningCost(s.cleaningCost);
          if (s.repairCost) setRepairCost(s.repairCost);
          if (s.criticalHotspotLimit) setCriticalHotspotLimit(s.criticalHotspotLimit);
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
      // Fallback to localStorage if backend has no settings
      const local = JSON.parse(localStorage.getItem('solarops_settings') || '{}');
      if (local.ratedPower) setRatedPower(local.ratedPower);
      if (local.avgSunHours) setAvgSunHours(local.avgSunHours);
      if (local.electricityTariff) setElectricityTariff(local.electricityTariff);
      if (local.cleaningCost) setCleaningCost(local.cleaningCost);
      if (local.repairCost) setRepairCost(local.repairCost);
      if (local.criticalHotspotLimit) setCriticalHotspotLimit(local.criticalHotspotLimit);
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ratedPower || !avgSunHours || !electricityTariff || !cleaningCost || !repairCost || !criticalHotspotLimit) {
      setAlert({ type: 'error', message: 'All fields are required' });
      return;
    }

    const settings = {
      ratedPower,
      avgSunHours,
      electricityTariff,
      cleaningCost,
      repairCost,
      criticalHotspotLimit,
    };

    const email = getEmail();
    if (email) {
      try {
        await fetch('http://localhost:5000/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, settings }),
        });
      } catch (e) {
        console.error('Failed to save settings to backend:', e);
      }
    }

    localStorage.setItem('solarops_settings', JSON.stringify(settings));

    setAlert({ type: 'success', message: 'Settings saved successfully' });
    setTimeout(() => setAlert(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[var(--solar-bg)]">
      <Navbar />

      <div className="max-w-[1440px] mx-auto px-6 py-8">
        <h1 className="text-3xl font-semibold text-[var(--solar-navy)] mb-2">Settings</h1>
        <p className="text-[var(--solar-text-muted)] mb-8">
          Configure system parameters for accurate loss estimation and maintenance planning
        </p>

        <div className="max-w-3xl">
          {alert && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Alert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            </motion.div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Card 1: Hardware Specs */}
            <motion.div
              className="bg-white rounded-lg border border-[var(--solar-border)] shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
            >
              <div className="p-6 border-b border-[var(--solar-border)]">
                <h3 className="font-semibold text-[var(--solar-navy)]">Hardware Specs</h3>
                <p className="text-sm text-[var(--solar-text-muted)] mt-1">
                  Technical specifications of your solar panels
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Rated Power (W)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ratedPower}
                    onChange={(e) => setRatedPower(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 540"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Average Sun Hours
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={avgSunHours}
                    onChange={(e) => setAvgSunHours(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 6.5"
                  />
                  <p className="text-xs text-[var(--solar-text-muted)] mt-1">Saudi Arabia average: 6-7 hours/day</p>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Financial */}
            <motion.div
              className="bg-white rounded-lg border border-[var(--solar-border)] shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="p-6 border-b border-[var(--solar-border)]">
                <h3 className="font-semibold text-[var(--solar-navy)]">Financial</h3>
                <p className="text-sm text-[var(--solar-text-muted)] mt-1">
                  Cost parameters for loss and maintenance estimation
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Electricity Tariff (SAR/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={electricityTariff}
                    onChange={(e) => setElectricityTariff(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 0.18"
                  />
                  <p className="text-xs text-[var(--solar-text-muted)] mt-1">Saudi Arabia residential/commercial rate</p>
                </div>

                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Cleaning Cost/Panel (SAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cleaningCost}
                    onChange={(e) => setCleaningCost(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 8"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Repair Cost/Panel (SAR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 200"
                  />
                </div>
              </div>
            </motion.div>

            {/* Card 3: AI Logic Thresholds */}
            <motion.div
              className="bg-white rounded-lg border border-[var(--solar-border)] shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-6 border-b border-[var(--solar-border)]">
                <h3 className="font-semibold text-[var(--solar-navy)]">AI Logic Thresholds</h3>
                <p className="text-sm text-[var(--solar-text-muted)] mt-1">
                  Configure AI detection parameters
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block font-medium text-[var(--solar-navy)] mb-2">
                    Critical Hotspot Limit (ΔT)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={criticalHotspotLimit}
                    onChange={(e) => setCriticalHotspotLimit(e.target.value)}
                    className="w-full px-4 py-2 border border-[var(--solar-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--solar-navy)] focus:border-transparent"
                    placeholder="e.g., 15"
                  />
                  <p className="text-sm text-[var(--solar-text-muted)] mt-1">
                    Temperature difference that triggers a fire risk warning
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button type="submit">
                Save All Settings
              </Button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
}
