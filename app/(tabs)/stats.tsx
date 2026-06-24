import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { format, startOfWeek, addDays, subWeeks } from 'date-fns';

interface WeeklyData {
  date: string;
  dayLabel: string;
  completed: number;
  total: number;
}

interface HabitStats {
  habit: { id: string; name: string; icon: string; color: string };
  completedDays: number;
  streak: number;
  totalLogs: number;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [habitStats, setHabitStats] = useState<HabitStats[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overallRate, setOverallRate] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
      const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

      // Fetch all habits
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

      const totalHabits = habits?.length || 0;

      // Fetch logs for the week
      const weekStartStr = format(weekDays[0], 'yyyy-MM-dd');
      const weekEndStr = format(weekDays[6], 'yyyy-MM-dd');

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', weekStartStr + 'T00:00:00')
        .lte('completed_at', weekEndStr + 'T23:59:59');

      // Build weekly data
      const weekly: WeeklyData[] = weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayLogs = logs?.filter((l) => l.completed_at.startsWith(dateStr)) || [];
        return {
          date: dateStr,
          dayLabel: format(day, 'EEE'),
          completed: dayLogs.length,
          total: totalHabits,
        };
      });
      setWeeklyData(weekly);

      // Total completed this week
      const weekCompleted = weekly.reduce((sum, d) => sum + d.completed, 0);
      setTotalCompleted(weekCompleted);

      // Overall rate
      const maxPossible = totalHabits * 7;
      setOverallRate(maxPossible > 0 ? Math.round((weekCompleted / maxPossible) * 100) : 0);

      // Per-habit stats
      const statsArr: HabitStats[] = await Promise.all(
        (habits || []).map(async (habit) => {
          const { data: allLogs } = await supabase
            .from('habit_logs')
            .select('completed_at')
            .eq('habit_id', habit.id)
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false });

          // Week completions
          const weekLogs = (allLogs || []).filter((l) =>
            l.completed_at >= weekStartStr + 'T00:00:00' &&
            l.completed_at <= weekEndStr + 'T23:59:59'
          );

          // Streak
          let streak = 0;
          let checkDate = new Date();
          for (let i = 0; i < 30; i++) {
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            if ((allLogs || []).some((l) => l.completed_at.startsWith(dateStr))) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else break;
          }

          return {
            habit,
            completedDays: weekLogs.length,
            streak,
            totalLogs: allLogs?.length || 0,
          };
        })
      );
      setHabitStats(statsArr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [user, weekOffset])
  );

  const maxBarValue = Math.max(...weeklyData.map((d) => d.total), 1);
  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Weekly Stats</Text>

      {/* Week selector */}
      <View style={styles.weekSelector}>
        <TouchableOpacity
          style={styles.weekBtn}
          onPress={() => setWeekOffset((o) => o + 1)}
        >
          <Text style={styles.weekBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity
          style={[styles.weekBtn, weekOffset === 0 && styles.weekBtnDisabled]}
          onPress={() => weekOffset > 0 && setWeekOffset((o) => o - 1)}
          disabled={weekOffset === 0}
        >
          <Text style={[styles.weekBtnText, weekOffset === 0 && styles.weekBtnTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: Colors.primary + '50' }]}>
          <Text style={styles.summaryNumber}>{overallRate}%</Text>
          <Text style={styles.summaryLabel}>Completion Rate</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.accent + '50' }]}>
          <Text style={[styles.summaryNumber, { color: Colors.accent }]}>{totalCompleted}</Text>
          <Text style={styles.summaryLabel}>Completions</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: Colors.warning + '50' }]}>
          <Text style={[styles.summaryNumber, { color: Colors.warning }]}>
            {habitStats.reduce((m, s) => Math.max(m, s.streak), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Best Streak</Text>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Completions</Text>
        <View style={styles.chart}>
          {weeklyData.map((day, index) => {
            const pct = day.total > 0 ? day.completed / day.total : 0;
            const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
            return (
              <View key={index} style={styles.barContainer}>
                <Text style={styles.barValue}>{day.completed}</Text>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${Math.max(pct * 100, 4)}%`,
                        backgroundColor: isToday ? Colors.primary : Colors.primary + '60',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, isToday && { color: Colors.primary }]}>
                  {day.dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Per-habit breakdown */}
      <Text style={styles.sectionTitle}>Habit Breakdown</Text>
      {habitStats.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No habits tracked yet</Text>
        </View>
      ) : (
        habitStats.map((stat) => (
          <View key={stat.habit.id} style={styles.habitStatCard}>
            <View style={styles.habitStatHeader}>
              <Text style={styles.habitStatIcon}>{stat.habit.icon || '⭐'}</Text>
              <Text style={styles.habitStatName}>{stat.habit.name}</Text>
              <Text style={styles.habitStatDays}>{stat.completedDays}/7 days</Text>
            </View>
            <View style={styles.habitStatBar}>
              <View
                style={[
                  styles.habitStatFill,
                  {
                    width: `${(stat.completedDays / 7) * 100}%`,
                    backgroundColor: stat.habit.color || Colors.primary,
                  },
                ]}
              />
            </View>
            <View style={styles.habitStatMeta}>
              <Text style={styles.habitStatMetaText}>🔥 {stat.streak} day streak</Text>
              <Text style={styles.habitStatMetaText}>📊 {stat.totalLogs} total</Text>
            </View>
          </View>
        ))
      )}

      {/* Export Report Button */}
      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() => router.push('/report')}
      >
        <Text style={styles.exportBtnText}>📄 Generate Activity Report</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weekBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekBtnDisabled: {
    opacity: 0.4,
  },
  weekBtnText: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '300',
  },
  weekBtnTextDisabled: {
    color: Colors.textMuted,
  },
  weekLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryNumber: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: Spacing.sm,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  barBackground: {
    flex: 1,
    width: '70%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    maxHeight: 120,
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  habitStatCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  habitStatIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  habitStatName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  habitStatDays: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  habitStatBar: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  habitStatFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  habitStatMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  habitStatMetaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  exportBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});
