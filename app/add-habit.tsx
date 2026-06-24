import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

const ICONS = ['⭐', '💪', '📚', '🏃', '🧘', '💧', '🥗', '😴', '🎯', '✍️', '🎨', '🎵', '🧹', '💊', '☀️', '🌙', '🙏', '💡'];
const COLORS = [
  '#6C63FF', '#FF6584', '#43D9AD', '#FFB547',
  '#FF8A65', '#42A5F5', '#AB47BC', '#26C6DA',
  '#EC407A', '#66BB6A',
];
const FREQUENCIES = [
  { label: 'Every day', value: 'daily' },
  { label: 'Weekdays only', value: 'weekdays' },
  { label: 'Weekends only', value: 'weekends' },
  { label: 'Custom', value: 'custom' },
];
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AddHabitScreen() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [selectedColor, setSelectedColor] = useState('#6C63FF');
  const [frequency, setFrequency] = useState('daily');
  const [targetDays, setTargetDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [loading, setLoading] = useState(false);

  const toggleDay = (dayIndex: number) => {
    setTargetDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  };

  const handleFrequencyChange = (val: string) => {
    setFrequency(val);
    if (val === 'daily') setTargetDays([0, 1, 2, 3, 4, 5, 6]);
    else if (val === 'weekdays') setTargetDays([0, 1, 2, 3, 4]);
    else if (val === 'weekends') setTargetDays([5, 6]);
    else setTargetDays([0, 1, 2, 3, 4]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a habit name');
      return;
    }
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('habits').insert({
      user_id: user.id,
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
      frequency,
      target_days: targetDays,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', 'Could not save habit: ' + error.message);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Habit</Text>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, loading && styles.saveHeaderBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={[styles.preview, { borderColor: selectedColor + '50' }]}>
          <View style={[styles.previewIcon, { backgroundColor: selectedColor + '25' }]}>
            <Text style={styles.previewIconText}>{selectedIcon}</Text>
          </View>
          <Text style={styles.previewName}>{name || 'Your habit name'}</Text>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Habit Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning run, Read 20 mins"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        {/* Icon picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICONS.map((icon) => (
              <TouchableOpacity
                key={icon}
                style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]}
                onPress={() => setSelectedIcon(icon)}
              >
                <Text style={styles.iconOptionText}>{icon}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && <Text style={styles.colorCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.freqOption, frequency === f.value && styles.freqOptionSelected]}
                onPress={() => handleFrequencyChange(f.value)}
              >
                <Text
                  style={[
                    styles.freqOptionText,
                    frequency === f.value && styles.freqOptionTextSelected,
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom days */}
        {frequency === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.label}>Target Days</Text>
            <View style={styles.daysRow}>
              {WEEK_DAYS.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayOption,
                    targetDays.includes(index) && { backgroundColor: selectedColor },
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      targetDays.includes(index) && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  saveHeaderBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  saveHeaderBtnDisabled: {
    opacity: 0.6,
  },
  saveHeaderBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.md,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 60,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  previewIconText: {
    fontSize: 28,
  },
  previewName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textSecondary,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '20',
  },
  iconOptionText: {
    fontSize: 24,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.white,
  },
  colorCheck: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  freqOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  freqOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  freqOptionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  freqOptionTextSelected: {
    color: Colors.white,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dayOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dayTextSelected: {
    color: Colors.white,
  },
  bottomSpacer: {
    height: 40,
  },
});
