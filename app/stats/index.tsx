import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stats } from '../../components/Stats';
import { Storage, Badge } from '../../types/storage';
import { getStorageData, getLevelTitle } from '../../utils/storage';
import { useTheme } from '../../context/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function StatsScreen() {
  const [storage, setStorage] = useState<Storage | null>(null);
  const { isDark } = useTheme();
  const router = useRouter();

  // Load data when the component mounts
  useEffect(() => {
    loadData();
  }, []);

  // Also load data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Stats screen focused - reloading data');
      loadData();
      return () => {}; // cleanup function
    }, [])
  );

  async function loadData() {
    try {
      // Get fresh data directly from AsyncStorage to ensure no cache issues
      const data = await getStorageData();
      console.log('Stats page - loaded data:', {
        streak: data.stats.streak,
        freezeTokens: data.stats.freezeTokens,
        xp: data.stats.xp, 
        level: data.stats.level
      });
      
      // Explicitly setting the storage with the fresh data
      setStorage(data);
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  }

  if (!storage) {
    return null;
  }

  const { stats } = storage;
  const levelTitle = getLevelTitle(stats.level);
  
  // Get earned and locked badges
  const earnedBadges = stats.badges.filter(badge => badge.earned);
  const lockedBadges = stats.badges.filter(badge => !badge.earned);

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: isDark ? '#1A1A1A' : '#E2E8F0' }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>←</Text>
        </Pressable>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Your Progress</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <Stats stats={stats} />
        
        <View style={[styles.card, { 
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          borderColor: isDark ? '#2A2A2A' : '#E2E8F0'
        }]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Current Level</Text>
          <Text style={styles.levelTitle}>
            Level {stats.level}: {levelTitle}
          </Text>
          <Text style={[styles.description, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Keep completing your daily tasks to earn XP and level up!
          </Text>
        </View>
        
        <View style={[styles.card, { 
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          borderColor: isDark ? '#2A2A2A' : '#E2E8F0'
        }]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>Streak</Text>
          <Text style={styles.streakCount}>
            {stats.streak} {stats.streak >= 3 ? '🔥' : ''}
          </Text>
          <Text style={[styles.description, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {stats.streak === 0
              ? "Start your streak by completing today's tasks!"
              : `You've been productive for ${stats.streak} day${
                  stats.streak === 1 ? '' : 's'
                } in a row!`}
          </Text>
        </View>
        
        {/* Achievements Section */}
        <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Achievements
        </Text>
        
        {earnedBadges.length > 0 && (
          <View style={[styles.card, { 
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderColor: isDark ? '#2A2A2A' : '#E2E8F0'
          }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
              Earned Badges
            </Text>
            <View style={styles.badgesContainer}>
              {earnedBadges.map(badge => (
                <BadgeItem 
                  key={badge.id} 
                  badge={badge} 
                  isDark={isDark}
                  isLocked={false}
                />
              ))}
            </View>
          </View>
        )}
        
        {lockedBadges.length > 0 && (
          <View style={[styles.card, { 
            backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
            borderColor: isDark ? '#2A2A2A' : '#E2E8F0'
          }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]}>
              Badges to Unlock
            </Text>
            <View style={styles.badgesContainer}>
              {lockedBadges.map(badge => (
                <BadgeItem 
                  key={badge.id} 
                  badge={badge} 
                  isDark={isDark}
                  isLocked={true}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Badge component
function BadgeItem({ badge, isDark, isLocked }: { badge: Badge, isDark: boolean, isLocked: boolean }) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <View style={[
      styles.badgeItem, 
      { 
        backgroundColor: isDark ? (isLocked ? '#2A2A2A' : '#333333') : (isLocked ? '#F1F5F9' : '#E2E8F0'),
        opacity: isLocked ? 0.7 : 1
      }
    ]}>
      <View style={styles.badgeIconContainer}>
        <Text style={styles.badgeIcon}>
          {isLocked ? '🔒' : badge.emoji}
        </Text>
      </View>
      <View style={styles.badgeContent}>
        <Text style={[
          styles.badgeTitle, 
          { color: isDark ? '#FFFFFF' : '#000000', opacity: isLocked ? 0.7 : 1 }
        ]}>
          {badge.title}
        </Text>
        <Text style={[
          styles.badgeDescription, 
          { color: isDark ? '#94A3B8' : '#64748B', opacity: isLocked ? 0.7 : 1 }
        ]}>
          {badge.description}
        </Text>
        {badge.earned && badge.earnedAt && (
          <Text style={[styles.badgeEarnedDate, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Earned on {formatDate(badge.earnedAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 36,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  badgesContainer: {
    gap: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  badgeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeContent: {
    flex: 1,
  },
  badgeTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  badgeEarnedDate: {
    fontSize: 12,
    marginTop: 4,
  },
}); 