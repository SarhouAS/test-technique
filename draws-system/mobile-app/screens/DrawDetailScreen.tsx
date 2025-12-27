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
  Modal,
  CheckBox,
} from 'react-native';
import { getMobileDrawsApi, DrawDetail } from '../services/drawsApi';

interface DrawDetailScreenProps {
  navigation: any;
  route: any;
}

export const DrawDetailScreen: React.FC<DrawDetailScreenProps> = ({ navigation, route }) => {
  const { drawId } = route.params;
  const [drawDetail, setDrawDetail] = useState<DrawDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Charger les détails du tirage
  useEffect(() => {
    loadDrawDetail();
  }, [drawId]);

  const loadDrawDetail = async () => {
    try {
      setLoading(true);
      const api = getMobileDrawsApi();
      const detail = await api.getDrawDetail(drawId);
      setDrawDetail(detail);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de charger le tirage');
    } finally {
      setLoading(false);
    }
  };

  // Participer au tirage
  const handleParticipate = async () => {
    if (!acceptedTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les CGU pour participer');
      return;
    }

    try {
      setParticipating(true);
      const api = getMobileDrawsApi();
      await api.participate(drawId, true);

      setShowModal(false);
      setAcceptedTerms(false);

      Alert.alert('Succès', 'Vous participez maintenant au tirage !', [
        {
          text: 'OK',
          onPress: () => {
            loadDrawDetail();
          },
        },
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la participation';
      const code = (error as any).code;
      const status = (error as any).status;

      if (code === 'ALREADY_PARTICIPATED' || status === 409) {
        Alert.alert('Info', 'Vous participez déjà à ce tirage');
      } else if (status === 400) {
        Alert.alert('Info', 'Ce tirage n\'est pas disponible');
      } else {
        Alert.alert('Erreur', errorMessage);
      }
    } finally {
      setParticipating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3E56CD" />
      </View>
    );
  }

  if (!drawDetail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tirage non trouvé</Text>
      </View>
    );
  }

  const { draw, business, participant_count, user_has_participated } = drawDetail;

  const isParticipateDisabled =
    draw.status !== 'active' || user_has_participated;

  const participateButtonColor = isParticipateDisabled ? '#D1D5DB' : '#3E56CD';

  let participateButtonLabel = 'Je participe';
  if (user_has_participated) {
    participateButtonLabel = 'Vous participez déjà';
  } else if (draw.status !== 'active') {
    participateButtonLabel = 'Tirage terminé';
  }

  return (
    <ScrollView style={styles.container}>
      {/* Image du lot */}
      <Image
        source={{ uri: 'https://via.placeholder.com/400x250' }}
        style={styles.image}
      />

      <View style={styles.content}>
        {/* Nom du commerce */}
        <TouchableOpacity>
          <Text style={styles.businessName}>{business.name}</Text>
        </TouchableOpacity>

        {business.city && (
          <Text style={styles.businessCity}>{business.city}</Text>
        )}

        {/* Nom du lot */}
        <Text style={styles.prizeName}>{draw.prize_name}</Text>

        {/* Description */}
        {draw.prize_description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{draw.prize_description}</Text>
          </View>
        )}

        {/* Informations du tirage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails du tirage</Text>

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
              <Text style={styles.infoLabel}>Probabilité de gain</Text>
              <Text style={styles.infoValue}>{draw.win_probability}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Participants</Text>
            <Text style={styles.infoValue}>{participant_count}</Text>
          </View>
        </View>

        {/* Bouton de participation */}
        <TouchableOpacity
          style={[
            styles.participateButton,
            { backgroundColor: participateButtonColor },
            isParticipateDisabled && styles.participateButtonDisabled,
          ]}
          onPress={() => setShowModal(true)}
          disabled={isParticipateDisabled}
        >
          <Text style={styles.participateButtonText}>{participateButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de confirmation */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmer votre participation</Text>

            <View style={styles.termsContainer}>
              <View style={styles.checkboxRow}>
                <CheckBox
                  value={acceptedTerms}
                  onValueChange={setAcceptedTerms}
                  style={styles.checkbox}
                />
                <Text style={styles.termsText}>
                  J'accepte les conditions générales d'utilisation
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  setAcceptedTerms(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !acceptedTerms && styles.confirmButtonDisabled,
                ]}
                onPress={handleParticipate}
                disabled={!acceptedTerms || participating}
              >
                {participating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E7EB',
  },
  content: {
    padding: 16,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3E56CD',
    marginBottom: 4,
  },
  businessCity: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  prizeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  participateButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  participateButtonDisabled: {
    opacity: 0.6,
  },
  participateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  termsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3E56CD',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
