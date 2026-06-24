import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { format, subDays } from 'date-fns';

interface Log {
  id: string;
  completed_at: string;
  notes: string;
}

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  created_at: string;
}

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [calendarData, setCalendarData] = useState<{ date: string; completed: boolean }[]>([]);

  useEffect(() => {
    if (!id || !user) return;
    fetchHabitData();
  }, [id, user]);

  const fetchHabitData = async () => {
    const { data: habitData } = await supabase
      .from('habits')
      .select('*')
      .eq('id', id)
      .single();
    if (habitData) setHabit(habitData);

    const { data: logsData } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('habit_id', id)
      .eq('user_id', user!.id)
      .order('completed_at', { ascending: false })
      .limit(30);

    if (logsData) setLogs(logsData);

    // Build 30-day calendar
    const cal = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const completed = (logsData || []).some((l) => l.completed_at.startsWith(dateStr));
      return { date: dateStr, completed };
    });
    setCalendarData(cal);
  };

  const deleteHabit = () => {
    Alert.alert('Delete Habit', `Delete "${habit?.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('habit_logs').delete().eq('habit_id', id);
          await supabase.from('habits').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  const completedDays = calendarData.filter((d) => d.completed).length;
  const completionRate = Math.round((completedDays / 30) * 100);

  // Calculate current streak
  let streak = 0;
  for (let i = calendarData.length - 1; i >= 0; i--) {
    if (calendarData[i].completed) streak++;
    else break;
  }

  if (!habit) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={deleteHabit} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Habit info */}
        <View style={[styles.habitHeader, { borderColor: habit.color + '40' }]}>
          <View style={[styles.habitIconCircle, { backgroundColor: habit.color + '20' }]}>
            <Text style={styles.habitIcon}>{habit.icon}</Text>
          </View>
          <View>
            <Text style={styles.habitName}>{habit.name}</Text>
            <Text style={styles.habitFreq}>
              {habit.frequency === 'daily' ? 'Every day' :
               habit.frequency === 'weekdays' ? 'Weekdays' :
               habit.frequency === 'weekends' ? 'Weekends' : 'Custom schedule'}
            </Text>
            <Text style={styles.habitSince}>Since {format(new Date(habit.created_at), 'MMM d, yyyy')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: habit.color }]}>{streak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.accent }]}>{completedDays}</Text>
            <Text style={styles.statLabel}>Days (30d)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{completionRate}%</Text>
            <Text style={styles.statLabel}>Rate (30d)</Text>
          </View>
        </View>

        {/* Calendar heatmap */}
        <View style={styles.calCard}>
          <Text style={styles.sectionTitle}>Last 30 Days</Text>
          <View style={styles.calGrid}>
            {calendarData.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.calCell,
                  day.completed
                    ? { backgroundColor: habit.color }
                    : { backgroundColor: Colors.surfaceLight },
                ]}
              />
            ))}
          </View>
          <View style={styles.calLegend}>
            <Text style={styles.calLegendText}>Less</Text>
            <View style={[styles.calCell, { backgroundColor: Colors.surfaceLight }]} />
            <View style={[styles.calCell, { backgroundColor: habit.color + '60' }]} />
            <View style={[styles.calCell, { backgroundColor: habit.color }]} />
            <Text style={styles.calLegendText}>More</Text>
          </View>
        </View>

        {/* Recent logs */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {logs.length === 0 ? (
          <View style={styles.emptyLogs}>
            <Text style={styles.emptyText}>No completions yet — keep going!</Text>
          </View>
        ) : (
          logs.slice(0, 10).map((log) => (
            <View key={log.id} style={styles.logItem}>
              <View style={[styles.logDot, { backgroundColor: habit.color }]} />
              <Text style={styles.logDate}>
                {format(new Date(log.completed_at), 'EEEE, MMM d · h:mm a')}
              </Text>
              <Text style={styles.logCheck}>✓</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    paddingVertical: Spacing.sm,
  },
  backBtnText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  deleteBtnText: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 80,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitIcon: {
    fontSize: 32,
  },
  habitName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  habitFreq: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  habitSince: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  calCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  calCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  calLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    justifyContent: 'flex-end',
  },
  calLegendText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  emptyLogs: {
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
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  logDate: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  logCheck: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
