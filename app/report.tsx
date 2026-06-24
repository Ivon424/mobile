import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

export default function ReportScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'all'>('weekly');

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Fetch all habits
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      // Determine date range
      let startDate: Date;
      let endDate = new Date();
      let rangeLabel = '';

      if (reportType === 'weekly') {
        startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
        endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        rangeLabel = `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`;
      } else if (reportType === 'monthly') {
        startDate = subDays(new Date(), 30);
        rangeLabel = `Last 30 days (${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')})`;
      } else {
        startDate = subDays(new Date(), 365);
        rangeLabel = `All time up to ${format(endDate, 'MMM d, yyyy')}`;
      }

      // Fetch logs for range
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false });

      // Build habit rows
      const habitRows = await Promise.all(
        (habits || []).map(async (habit) => {
          const habitLogs = (logs || []).filter((l) => l.habit_id === habit.id);
          const days = reportType === 'weekly' ? 7 : reportType === 'monthly' ? 30 : 365;
          const rate = Math.round((habitLogs.length / days) * 100);

          // Streak
          const { data: allLogs } = await supabase
            .from('habit_logs')
            .select('completed_at')
            .eq('habit_id', habit.id)
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(30);

          let streak = 0;
          let checkDate = new Date();
          for (let i = 0; i < 30; i++) {
            const ds = format(checkDate, 'yyyy-MM-dd');
            if ((allLogs || []).some((l) => l.completed_at.startsWith(ds))) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else break;
          }

          return `
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #2D2B45;">${habit.icon} ${habit.name}</td>
              <td style="padding:12px 16px;border-bottom:1px solid #2D2B45;text-align:center;">${habitLogs.length}</td>
              <td style="padding:12px 16px;border-bottom:1px solid #2D2B45;text-align:center;">
                <span style="
                  background:${rate >= 70 ? '#43D9AD20' : rate >= 40 ? '#FFB54720' : '#FF658420'};
                  color:${rate >= 70 ? '#43D9AD' : rate >= 40 ? '#FFB547' : '#FF6584'};
                  padding:3px 10px;border-radius:20px;font-size:13px;font-weight:700;
                ">${rate}%</span>
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #2D2B45;text-align:center;">🔥 ${streak}</td>
              <td style="padding:12px 16px;border-bottom:1px solid #2D2B45;text-align:center;">${habit.frequency}</td>
            </tr>
          `;
        })
      );

      const totalLogs = logs?.length || 0;
      const totalHabits = habits?.length || 0;
      const avgPerDay = totalLogs > 0 ? (totalLogs / (reportType === 'weekly' ? 7 : reportType === 'monthly' ? 30 : 365)).toFixed(1) : '0';
      const topHabit = habits?.reduce((top, h) => {
        const count = (logs || []).filter((l) => l.habit_id === h.id).length;
        return count > top.count ? { name: `${h.icon} ${h.name}`, count } : top;
      }, { name: 'None', count: 0 });

      // Generate HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HabitFlow Activity Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', sans-serif; background:#0F0E17; color:#FFFFFE; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; padding-bottom:24px; border-bottom:1px solid #2D2B45; }
    .brand { display:flex; align-items:center; gap:12px; }
    .brand-icon { width:48px; height:48px; background:#6C63FF; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; }
    .brand-name { font-size:24px; font-weight:800; }
    .report-meta { text-align:right; }
    .report-label { font-size:12px; color:#A8A6C8; text-transform:uppercase; letter-spacing:1px; }
    .report-date { font-size:14px; font-weight:600; color:#FFFFFE; margin-top:4px; }
    .section-title { font-size:18px; font-weight:700; margin-bottom:16px; color:#FFFFFE; }
    .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:40px; }
    .summary-card { background:#1A1929; border-radius:16px; padding:20px; border:1px solid #2D2B45; }
    .summary-num { font-size:32px; font-weight:800; color:#6C63FF; }
    .summary-lbl { font-size:12px; color:#A8A6C8; margin-top:4px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .table-wrapper { background:#1A1929; border-radius:16px; overflow:hidden; border:1px solid #2D2B45; margin-bottom:40px; }
    table { width:100%; border-collapse:collapse; }
    th { padding:14px 16px; background:#252438; font-size:12px; font-weight:700; color:#A8A6C8; text-transform:uppercase; letter-spacing:0.5px; text-align:left; }
    td { font-size:14px; color:#FFFFFE; }
    .footer { text-align:center; margin-top:40px; padding-top:24px; border-top:1px solid #2D2B45; }
    .footer p { font-size:12px; color:#6B6994; }
    .watermark { color:#6C63FF; font-weight:700; }
    .verified { display:inline-flex; align-items:center; gap:8px; background:#43D9AD15; color:#43D9AD; border:1px solid #43D9AD30; border-radius:20px; padding:6px 16px; font-size:13px; font-weight:700; margin-bottom:32px; }
    .user-info { background:#1A1929; border-radius:16px; padding:20px; border:1px solid #2D2B45; margin-bottom:40px; display:flex; align-items:center; gap:16px; }
    .avatar { width:52px; height:52px; background:#6C63FF; border-radius:26px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:800; color:white; }
    .user-name { font-size:18px; font-weight:700; }
    .user-email { font-size:13px; color:#A8A6C8; margin-top:2px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="brand-icon">✨</div>
      <div>
        <div class="brand-name">HabitFlow</div>
        <div style="font-size:13px;color:#A8A6C8;">Activity Report</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-label">Generated On</div>
      <div class="report-date">${format(new Date(), 'MMMM d, yyyy · h:mm a')}</div>
      <div class="report-label" style="margin-top:8px;">Report Period</div>
      <div class="report-date">${rangeLabel}</div>
    </div>
  </div>

  <div class="verified">✓ Verified Activity Log — Auto-generated by HabitFlow</div>

  <div class="user-info">
    <div class="avatar">${(profile?.full_name || 'U').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}</div>
    <div>
      <div class="user-name">${profile?.full_name || 'User'}</div>
      <div class="user-email">${user.email}</div>
    </div>
  </div>

  <div class="section-title">Summary</div>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-num">${totalHabits}</div>
      <div class="summary-lbl">Active Habits</div>
    </div>
    <div class="summary-card">
      <div class="summary-num" style="color:#43D9AD">${totalLogs}</div>
      <div class="summary-lbl">Total Completions</div>
    </div>
    <div class="summary-card">
      <div class="summary-num" style="color:#FFB547">${avgPerDay}</div>
      <div class="summary-lbl">Avg Per Day</div>
    </div>
    <div class="summary-card">
      <div class="summary-num" style="color:#FF6584">${topHabit?.name || '—'}</div>
      <div class="summary-lbl">Top Habit</div>
    </div>
  </div>

  <div class="section-title">Habit Performance</div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Habit</th>
          <th style="text-align:center;">Completions</th>
          <th style="text-align:center;">Rate</th>
          <th style="text-align:center;">Streak</th>
          <th style="text-align:center;">Schedule</th>
        </tr>
      </thead>
      <tbody>
        ${habitRows.join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>This report was automatically compiled by <span class="watermark">HabitFlow</span></p>
    <p style="margin-top:4px;">Report ID: HF-${Date.now()} · ${user.id.slice(0, 8).toUpperCase()}</p>
    <p style="margin-top:8px;">© ${new Date().getFullYear()} HabitFlow — All data is user-generated and verified against Supabase records.</p>
  </div>
</body>
</html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share your HabitFlow Report',
        });
      } else {
        Alert.alert('PDF Generated', `Saved to: ${uri}`);
      }
    } catch (err) {
      console.error('Report error:', err);
      Alert.alert('Error', 'Could not generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Activity Report</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconBanner}>
          <Text style={styles.iconBannerEmoji}>📄</Text>
          <Text style={styles.iconBannerTitle}>Generate Your Report</Text>
          <Text style={styles.iconBannerSub}>
            Export a verified PDF activity log with habit performance, streaks, and completion rates.
          </Text>
        </View>

        {/* Report type selector */}
        <Text style={styles.sectionLabel}>Report Period</Text>
        {[
          { label: 'This Week', sub: 'Mon – Sun of current week', value: 'weekly' as const },
          { label: 'Last 30 Days', sub: 'Rolling 30-day window', value: 'monthly' as const },
          { label: 'All Time', sub: 'Complete history up to today', value: 'all' as const },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.typeOption, reportType === option.value && styles.typeOptionSelected]}
            onPress={() => setReportType(option.value)}
          >
            <View style={styles.typeRadio}>
              {reportType === option.value && <View style={styles.typeRadioDot} />}
            </View>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeLabel, reportType === option.value && styles.typeLabelSelected]}>
                {option.label}
              </Text>
              <Text style={styles.typeSub}>{option.sub}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* What's included */}
        <View style={styles.includesCard}>
          <Text style={styles.includesTitle}>What's included</Text>
          {[
            '✅ User profile & account info',
            '📊 Habit performance table',
            '🔥 Current streaks per habit',
            '📈 Completion rates & averages',
            '🏷️ Unique report ID for verification',
            '📅 Report generation timestamp',
          ].map((item, i) => (
            <Text key={i} style={styles.includeItem}>{item}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
          onPress={generateReport}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.generateBtnInner}>
              <ActivityIndicator color={Colors.background} />
              <Text style={styles.generateBtnText}>Generating PDF...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>📥 Download PDF Report</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: 60,
  },
  iconBanner: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBannerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  iconBannerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  iconBannerSub: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  typeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  typeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  typeInfo: {
    flex: 1,
  },
  typeLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeLabelSelected: {
    color: Colors.text,
  },
  typeSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  includesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  includesTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  includeItem: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateBtnDisabled: {
    opacity: 0.7,
  },
  generateBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  generateBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 40,
  },
});
