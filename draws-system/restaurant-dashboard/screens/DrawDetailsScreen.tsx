import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import { getDrawsApi } from '../services/drawsApi';

interface DrawDetailsScreenProps {
  navigation: any;
  route: any;
}

interface Participant {
  id: string;
  user_name: string;
  user_email: string;
  participated_at: string;
}

export const DrawDetailsScreen: React.FC<DrawDetailsScreenProps> = ({ navigation, route }) => {
  const { drawId } = route.params;
  const [draw, setDraw] = useState<any>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantLoading, setParticipantLoading] = useState(false);
  const [totalParticipants, setTotalParticipants] = useState(0);

  // Charger les détails du tirage
  useEffect(() => {
    loadDrawDetails();
  }, [drawId]);

  const loadDrawDetails = async () => {
    try {
      setLoading(true);
      const api = getDrawsApi();
      const detail = await api.getDrawDetail(drawId);
      setDraw(detail);

      // Charger les participants
      if (detail.participant_count > 0) {
        const participantsData = await api.getParticipants(drawId, 50, 0);
        setParticipants(participantsData.participants);
        setTotalParticipants(participantsData.total);
      }
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger les détails');
    } finally {
      setLoading(false);
    }
  };

  // Charger plus de participants
  const loadMoreParticipants = async () => {
    if (participantLoading || participants.length >= totalParticipants) {
      return;
    }

    try {
      setParticipantLoading(true);
      const api = getDrawsApi();
      const participantsData = await api.getParticipants(drawId, 50, participants.length);
      setParticipants([...participants, ...participantsData.participants]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger plus de participants');
    } finally {
      setParticipantLoading(false);
    }
  };

  // Supprimer le tirage
  const handleDeleteDraw = () => {
    Alert.alert(
      'Supprimer le tirage',
      'Êtes-vous sûr de vouloir supprimer ce tirage ?',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const api = getDrawsApi();
              await api.deleteDraw(drawId);
              Alert.alert('Succès', 'Tirage supprimé', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de supprimer');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3E56CD" />
      </View>
    );
  }

  if (!draw) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tirage non trouvé</Text>
      </View>
    );
  }

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

  const canModify = draw.participant_count === 0;

  return (
    <ScrollView style={styles.container}>
      {/* En-tête avec image */}
      <Image
        source={{ uri: 'https://via.placeholder.com/400x200' }}
        style={styles.headerImage}
      />

      <View style={styles.content}>
        {/* Nom et statut */}
        <View style={styles.header}>
          <View>
            <Text style={styles.prizeName}>{draw.prize_name}</Text>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColors[draw.status] },
                ]}
              />
              <Text style={styles.statusText}>{statusLabels[draw.status]}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {draw.prize_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{draw.prize_description}</Text>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{draw.participant_count}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {draw.draw_type === 'fixed_date' ? 'Date fixe' : 'Conditionnel'}
            </Text>
            <Text style={styles.statLabel}>Type</Text>
          </View>
        </View>

        {/* Informations du tirage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          {draw.draw_type === 'fixed_date' && draw.draw_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date du tirage</Text>
              <Text style={styles.infoValue}>
                {new Date(draw.draw_date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}

          {draw.draw_type === 'conditional' && draw.trigger_threshold && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Seuil de participants</Text>
              <Text style={styles.infoValue}>{draw.trigger_threshold}</Text>
            </View>
          )}

          {draw.win_probability && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Probabilité</Text>
              <Text style={styles.infoValue}>{draw.win_probability}</Text>
            </View>
          )}
        </View>

        {/* Liste des participants */}
        {draw.participant_count > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Participants ({totalParticipants})</Text>
            <FlatList
              data={participants}
              renderItem={({ item }) => (
                <View style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>{item.user_name}</Text>
                    <Text style={styles.participantEmail}>{item.user_email}</Text>
                    <Text style={styles.participantDate}>
                      {new Date(item.participated_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              onEndReached={loadMoreParticipants}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                participantLoading ? <ActivityIndicator color="#3E56CD" /> : null
              }
            />
          </View>
        )}

        {/* Actions */}
        {canModify && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('CreateDraw', { drawId })}
            >
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteDraw}
            >
              <Text style={styles.deleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!canModify && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Impossible de modifier ou supprimer un tirage avec des participants
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E7EB',
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  prizeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3E56CD',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  participantRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  participantEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  participantDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#3E56CD',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
  },
});
