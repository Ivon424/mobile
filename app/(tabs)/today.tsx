import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { format, isToday } from 'date-fns';

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  target_days: number[];
  created_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  completed_at: string;
  notes: string;
}

interface HabitWithStatus extends Habit {
  completed: boolean;
  log_id?: string;
  streak: number;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function TodayScreen() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const today = new Date();
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (profileData) setProfile(profileData);

      // Fetch habits
      const { data: habitsData, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch selected day's logs
      const { data: logsData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', selectedDateStr + 'T00:00:00')
        .lte('completed_at', selectedDateStr + 'T23:59:59');

      // Calculate streaks and merge
      const habitsWithStatus: HabitWithStatus[] = await Promise.all(
        (habitsData || []).map(async (habit) => {
          const log = logsData?.find((l) => l.habit_id === habit.id);

          // Calculate streak
          const { data: allLogs } = await supabase
            .from('habit_logs')
            .select('completed_at')
            .eq('habit_id', habit.id)
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(30);

          let streak = 0;
          if (allLogs && allLogs.length > 0) {
            let checkDate = new Date();
            for (let i = 0; i < 30; i++) {
              const dateStr = format(checkDate, 'yyyy-MM-dd');
              const hasLog = allLogs.some((l) =>
                l.completed_at.startsWith(dateStr)
              );
              if (hasLog) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          }

          return {
            ...habit,
            completed: !!log,
            log_id: log?.id,
            streak,
          };
        })
      );

      setHabits(habitsWithStatus);
    } catch (err) {
      console.error('Error fetching habits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user, selectedDate])
  );

  const toggleHabit = async (habit: HabitWithStatus) => {
    if (!user) return;

    if (habit.completed && habit.log_id) {
      // Unmark
      const { error } = await supabase
        .from('habit_logs')
        .delete()
        .eq('id', habit.log_id);
      if (!error) {
        fetchData();
      }
    } else {
      // Mark complete on the selected date, keeping the current time of day
      const completedAt = new Date(selectedDate);
      const now = new Date();
      completedAt.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      const { error } = await supabase
        .from('habit_logs')
        .insert({
          habit_id: habit.id,
          user_id: user.id,
          completed_at: completedAt.toISOString(),
          notes: '',
        })
        .select()
        .single();
      if (!error) {
        fetchData();
      }
    }
  };

  const deleteHabit = async (habitId: string) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('habit_logs').delete().eq('habit_id', habitId);
          await supabase.from('habits').delete().eq('id', habitId);
          setHabits((prev) => prev.filter((h) => h.id !== habitId));
        },
      },
    ]);
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const totalCount = habits.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your habits...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-habit')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Date strip */}
      <View style={styles.dateStrip}>
        {[-3, -2, -1, 0, 1, 2, 3].map((offset) => {
          const date = new Date();
          date.setDate(today.getDate() + offset);
          const isSelectedDay = format(date, 'yyyy-MM-dd') === selectedDateStr;
          return (
            <TouchableOpacity
              key={offset}
              style={[styles.dateItem, isSelectedDay && styles.dateItemActive]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dateDayLabel, isSelectedDay && styles.dateDayLabelActive]}>
                {DAYS[date.getDay()]}
              </Text>
              <Text style={[styles.dateNumber, isSelectedDay && styles.dateNumberActive]}>
                {date.getDate()}
              </Text>
              {isSelectedDay && <View style={styles.dateDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Progress card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>
            {isToday(selectedDate) ? "Today's Progress" : `${format(selectedDate, 'MMM d')} Progress`}
          </Text>
          <Text style={styles.progressPct}>{completionPct}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
        </View>
        <Text style={styles.progressSub}>
          {completedCount} of {totalCount} habits completed
        </Text>
      </View>

      {/* Habits list */}
      <Text style={styles.sectionTitle}>
        {format(selectedDate, 'EEEE, MMMM d')}
      </Text>

      {habits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>Tap "+ Add" to create your first habit</Text>
        </View>
      ) : (
        habits.map((habit) => (
          <TouchableOpacity
            key={habit.id}
            style={[styles.habitCard, habit.completed && styles.habitCardCompleted]}
            onLongPress={() => deleteHabit(habit.id)}
            activeOpacity={0.85}
          >
            <TouchableOpacity
              style={[styles.checkbox, habit.completed && styles.checkboxCompleted, { borderColor: habit.color || Colors.primary }]}
              onPress={() => toggleHabit(habit)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {habit.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.habitInfo}>
              <View style={styles.habitRow}>
                <Text style={styles.habitIcon}>{habit.icon || '⭐'}</Text>
                <Text style={[styles.habitName, habit.completed && styles.habitNameCompleted]}>
                  {habit.name}
                </Text>
              </View>
              {habit.streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {habit.streak} day streak</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.habitDetailBtn}
              onPress={() => router.push(`/habit/${habit.id}`)}
            >
              <Text style={styles.habitDetailIcon}>›</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateItem: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 36,
  },
  dateItemActive: {
    backgroundColor: Colors.primary,
  },
  dateDayLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  dateDayLabelActive: {
    color: Colors.white,
  },
  dateNumber: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  dateNumberActive: {
    color: Colors.white,
  },
  dateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.white,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  progressPct: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitCardCompleted: {
    opacity: 0.75,
    borderColor: Colors.accent + '50',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  checkboxCompleted: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  checkmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  habitInfo: {
    flex: 1,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  habitName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  streakBadge: {
    marginTop: 4,
  },
  streakText: {
    fontSize: FontSize.xs,
    color: Colors.warning,
    fontWeight: '600',
  },
  habitDetailBtn: {
    paddingLeft: Spacing.sm,
  },
  habitDetailIcon: {
    fontSize: 22,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  bottomSpacer: {
    height: 20,
  },
});