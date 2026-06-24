import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { format } from 'date-fns';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalHabits: 0, totalLogs: 0, memberSince: '' });

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setEditName(data.full_name || '');
    } else {
      setProfile({ full_name: user.user_metadata?.full_name || '', email: user.email || '' });
      setEditName(user.user_metadata?.full_name || '');
    }

    // Stats
    const { count: habitCount } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: logCount } = await supabase
      .from('habit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    setStats({
      totalHabits: habitCount || 0,
      totalLogs: logCount || 0,
      memberSince: format(new Date(user.created_at), 'MMMM yyyy'),
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [user])
  );

  const saveProfile = async () => {
    if (!user || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: editName.trim(), email: user.email });
    setSaving(false);
    if (!error) {
      setProfile((p) => p ? { ...p, full_name: editName.trim() } : p);
      setEditing(false);
    } else {
      Alert.alert('Error', 'Could not save profile');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = (profile?.full_name || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
              <Text style={styles.cancelBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Text style={styles.profileName}>{profile?.full_name || 'Your Name'} ✏️</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <Text style={styles.memberSince}>Member since {stats.memberSince}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.totalHabits}</Text>
          <Text style={styles.statLabel}>Active Habits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>{stats.totalLogs}</Text>
          <Text style={styles.statLabel}>Total Check-ins</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/report')}>
          <Text style={styles.menuIcon}>📄</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Generate Report</Text>
            <Text style={styles.menuSub}>Export your habit activity as PDF</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/stats')}>
          <Text style={styles.menuIcon}>📊</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Weekly Statistics</Text>
            <Text style={styles.menuSub}>View your progress over time</Text>
          </View>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>📧</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuLabel}>Email</Text>
            <Text style={styles.menuSub}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  nameInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.primary,
    minWidth: 160,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  saveBtnText: {
    color: Colors.background,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  memberSince: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: Spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  menuSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuArrow: {
    fontSize: FontSize.xl,
    color: Colors.textMuted,
    fontWeight: '300',
  },
  signOutBtn: {
    backgroundColor: Colors.error + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    marginTop: Spacing.md,
  },
  signOutText: {
    color: Colors.error,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});
