import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { getDrawsApi } from '../services/drawsApi';

interface Draw {
  id: string;
  prize_name: string;
  status: 'active' | 'completed' | 'cancelled';
  participant_count: number;
  draw_date?: string;
  created_at: string;
}

interface DrawsScreenProps {
  navigation: any;
}

export const DrawsScreen: React.FC<DrawsScreenProps> = ({ navigation }) => {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  // Charger les tirages
  const loadDraws = useCallback(async () => {
    try {
      setLoading(true);
      const api = getDrawsApi();
      const data = await api.getDraws(activeTab);
      setDraws(data);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger les tirages');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Charger les tirages au montage et quand l'onglet change
  useEffect(() => {
    loadDraws();
  }, [loadDraws]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDraws();
    setRefreshing(false);
  }, [loadDraws]);

  // Rendu d'une carte de tirage
  const renderDrawCard = ({ item }: { item: Draw }) => {
    const statusColors = {
      active: '#10B981',
      completed: '#6B7280',
      cancelled: '#EF4444',
    };

    const statusLabels = {
      active: 'Actif',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DrawDetails', { drawId: item.id })}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardImage}>
            <Image
              source={{ uri: 'https://via.placeholder.com/80' }}
              style={styles.image}
            />
          </View>

          <View style={styles.cardInfo}>
            <Text style={styles.prizeName}>{item.prize_name}</Text>

            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColors[item.status] },
                ]}
              />
              <Text style={styles.statusText}>{statusLabels[item.status]}</Text>
            </View>

            <Text style={styles.participantCount}>
              {item.participant_count} participant{item.participant_count !== 1 ? 's' : ''}
            </Text>

            {item.draw_date && (
              <Text style={styles.drawDate}>
                {new Date(item.draw_date).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // État vide
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Aucun tirage {activeTab}</Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateDraw')}
      >
        <Text style={styles.createButtonText}>Créer un tirage</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {(['active', 'completed', 'cancelled'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab === 'active' ? 'Actifs' : tab === 'completed' ? 'Terminés' : 'Annulés'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste des tirages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3E56CD" />
        </View>
      ) : (
        <FlatList
          data={draws}
          renderItem={renderDrawCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Bouton FAB pour créer un tirage */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateDraw')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3E56CD',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3E56CD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  cardImage: {
    marginRight: 12,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  cardInfo: {
    flex: 1,
  },
  prizeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  participantCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  drawDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#3E56CD',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3E56CD',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
