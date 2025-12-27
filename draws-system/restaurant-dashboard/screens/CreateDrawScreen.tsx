import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { getDrawsApi } from '../services/drawsApi';

interface CreateDrawScreenProps {
  navigation: any;
  route?: any;
}

export const CreateDrawScreen: React.FC<CreateDrawScreenProps> = ({ navigation, route }) => {
  const [prizeName, setPrizeName] = useState('');
  const [prizeDescription, setPrizeDescription] = useState('');
  const [drawType, setDrawType] = useState<'fixed_date' | 'conditional'>('fixed_date');
  const [drawDate, setDrawDate] = useState('');
  const [triggerThreshold, setTriggerThreshold] = useState('');
  const [winProbability, setWinProbability] = useState('');
  const [useDefaultTerms, setUseDefaultTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Valider le formulaire
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!prizeName || prizeName.length < 5 || prizeName.length > 200) {
      newErrors.prizeName = 'Le nom du lot doit contenir entre 5 et 200 caractères';
    }

    if (drawType === 'fixed_date') {
      if (!drawDate) {
        newErrors.drawDate = 'La date du tirage est requise';
      } else if (new Date(drawDate) <= new Date()) {
        newErrors.drawDate = 'La date doit être dans le futur';
      }
    }

    if (drawType === 'conditional') {
      const threshold = parseInt(triggerThreshold, 10);
      if (!triggerThreshold || threshold <= 0) {
        newErrors.triggerThreshold = 'Le seuil doit être supérieur à 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Créer le tirage
  const handleCreateDraw = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const api = getDrawsApi();

      const drawData = {
        prize_name: prizeName,
        prize_description: prizeDescription || undefined,
        draw_type: drawType,
        draw_date: drawType === 'fixed_date' ? drawDate : undefined,
        trigger_threshold: drawType === 'conditional' ? parseInt(triggerThreshold, 10) : undefined,
        win_probability: winProbability || undefined,
        use_default_terms: useDefaultTerms,
      };

      const newDraw = await api.createDraw(drawData);

      Alert.alert('Succès', 'Tirage créé avec succès', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('DrawDetails', { drawId: newDraw.id });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de créer le tirage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Nom du lot */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nom du lot *</Text>
          <TextInput
            style={[styles.input, errors.prizeName && styles.inputError]}
            placeholder="Ex: Dîner pour 2"
            value={prizeName}
            onChangeText={setPrizeName}
            maxLength={200}
          />
          {errors.prizeName && <Text style={styles.errorText}>{errors.prizeName}</Text>}
          <Text style={styles.helperText}>{prizeName.length}/200</Text>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez le lot..."
            value={prizeDescription}
            onChangeText={setPrizeDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Type de tirage */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Type de tirage *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setDrawType('fixed_date')}
            >
              <View
                style={[
                  styles.radioCircle,
                  drawType === 'fixed_date' && styles.radioCircleActive,
                ]}
              />
              <Text style={styles.radioLabel}>Date fixe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioButton}
              onPress={() => setDrawType('conditional')}
            >
              <View
                style={[
                  styles.radioCircle,
                  drawType === 'conditional' && styles.radioCircleActive,
                ]}
              />
              <Text style={styles.radioLabel}>Conditionnel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date du tirage (si fixed_date) */}
        {drawType === 'fixed_date' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Date du tirage *</Text>
            <TextInput
              style={[styles.input, errors.drawDate && styles.inputError]}
              placeholder="YYYY-MM-DD HH:mm"
              value={drawDate}
              onChangeText={setDrawDate}
            />
            {errors.drawDate && <Text style={styles.errorText}>{errors.drawDate}</Text>}
          </View>
        )}

        {/* Seuil (si conditional) */}
        {drawType === 'conditional' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Seuil de participants *</Text>
            <TextInput
              style={[styles.input, errors.triggerThreshold && styles.inputError]}
              placeholder="Ex: 100"
              value={triggerThreshold}
              onChangeText={setTriggerThreshold}
              keyboardType="number-pad"
            />
            {errors.triggerThreshold && (
              <Text style={styles.errorText}>{errors.triggerThreshold}</Text>
            )}
          </View>
        )}

        {/* Probabilité de gain */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Probabilité de gain</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 1 chance sur 10000"
            value={winProbability}
            onChangeText={setWinProbability}
          />
        </View>

        {/* Utiliser CGU par défaut */}
        <View style={styles.fieldGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Utiliser les CGU par défaut</Text>
            <Switch
              value={useDefaultTerms}
              onValueChange={setUseDefaultTerms}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={useDefaultTerms ? '#10B981' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Bouton de création */}
        <TouchableOpacity
          style={[styles.createButton, !validateForm() && styles.createButtonDisabled]}
          onPress={handleCreateDraw}
          disabled={loading || !validateForm()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Créer le tirage</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#3E56CD',
    backgroundColor: '#3E56CD',
  },
  radioLabel: {
    fontSize: 14,
    color: '#111827',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#3E56CD',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
